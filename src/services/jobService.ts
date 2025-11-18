import { IngestionJob, JobStatus, PipelineConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';
import { eventBus, EventTypes } from '../lib/events';
import { metrics, MetricNames } from '../lib/metrics';
import { IngestPipeline } from '../pipelines';
import { RecursiveCharacterTextSplitter } from '../splitters';
import { OpenAIEmbeddings } from '../embeddings';
import { PGVectorStore } from '../vectorstores';

/**
 * In-memory job store (production would use database)
 */
class JobService {
  private jobs: Map<string, IngestionJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;

  /**
   * Create a new ingestion job
   */
  async createJob(config: PipelineConfig & { metadata?: Record<string, any> }): Promise<IngestionJob> {
    const job: IngestionJob = {
      id: uuidv4(),
      status: JobStatus.PENDING,
      sourceType: config.sourceType,
      sourcePath: config.sourcePath,
      sourceUrl: config.sourceUrl,
      collection: config.collection,
      progress: {
        total: 0,
        processed: 0,
        failed: 0,
      },
      metadata: config.metadata,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);

    logger.info(`Job created: ${job.id}`, { job });
    await eventBus.emit(EventTypes.JOB_CREATED, { jobId: job.id, config });
    metrics.recordCounter(MetricNames.JOBS_CREATED, 1, {
      sourceType: job.sourceType,
      collection: job.collection,
    });

    // Start job if capacity available
    if (this.activeJobs.size < this.maxConcurrentJobs) {
      this.startJob(job.id).catch(error => {
        logger.error(`Failed to start job ${job.id}`, error);
      });
    }

    return job;
  }

  /**
   * Start processing a job
   */
  private async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.PENDING) {
      return;
    }

    this.activeJobs.add(jobId);
    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();

    this.jobs.set(jobId, job);

    logger.info(`Job started: ${jobId}`);
    await eventBus.emit(EventTypes.JOB_STARTED, { jobId });

    const startTime = Date.now();

    try {
      // Initialize components
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const embeddingClient = new OpenAIEmbeddings(
        apiKey,
        process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
      );

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
      });

      const vectorStore = new PGVectorStore(
        {
          host: process.env.PGVECTOR_HOST || 'localhost',
          port: parseInt(process.env.PGVECTOR_PORT || '5432', 10),
          database: process.env.PGVECTOR_DATABASE || 'vector_db',
          user: process.env.PGVECTOR_USER || 'postgres',
          password: process.env.PGVECTOR_PASSWORD || '',
          tableName: 'documents',
        },
        embeddingClient,
        parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10)
      );

      const pipeline = new IngestPipeline(textSplitter, vectorStore);

      // Run pipeline
      await pipeline.run({
        sourceType: job.sourceType as any,
        collection: job.collection,
        sourcePath: job.sourcePath,
        sourceUrl: job.sourceUrl,
      });

      // Mark as completed
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      job.result = {
        documentsCreated: 1,
        chunksCreated: 0, // Would track this in enhanced pipeline
        errors: [],
      };

      textSplitter.free();
      await vectorStore.close();

      const duration = Date.now() - startTime;
      metrics.recordHistogram(MetricNames.JOB_DURATION, duration, {
        status: 'completed',
        sourceType: job.sourceType,
      });
      metrics.recordCounter(MetricNames.JOBS_COMPLETED, 1);

      logger.info(`Job completed: ${jobId}`, { duration });
      await eventBus.emit(EventTypes.JOB_COMPLETED, { jobId, result: job.result });
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : String(error);

      const duration = Date.now() - startTime;
      metrics.recordHistogram(MetricNames.JOB_DURATION, duration, {
        status: 'failed',
        sourceType: job.sourceType,
      });
      metrics.recordCounter(MetricNames.JOBS_FAILED, 1);

      logger.error(`Job failed: ${jobId}`, error as Error);
      await eventBus.emit(EventTypes.JOB_FAILED, { jobId, error: job.error });
    } finally {
      this.activeJobs.delete(jobId);
      this.jobs.set(jobId, job);

      // Start next pending job
      this.startNextPendingJob();
    }
  }

  /**
   * Start next pending job if capacity available
   */
  private startNextPendingJob(): void {
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    const pendingJob = Array.from(this.jobs.values()).find(
      job => job.status === JobStatus.PENDING
    );

    if (pendingJob) {
      this.startJob(pendingJob.id).catch(error => {
        logger.error(`Failed to start next job ${pendingJob.id}`, error);
      });
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): IngestionJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * List all jobs
   */
  listJobs(options?: {
    status?: JobStatus;
    collection?: string;
    limit?: number;
    offset?: number;
  }): { jobs: IngestionJob[]; total: number } {
    let jobs = Array.from(this.jobs.values());

    // Filter by status
    if (options?.status) {
      jobs = jobs.filter(job => job.status === options.status);
    }

    // Filter by collection
    if (options?.collection) {
      jobs = jobs.filter(job => job.collection === options.collection);
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = jobs.length;

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    jobs = jobs.slice(offset, offset + limit);

    return { jobs, total };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return false;
    }

    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.PROCESSING) {
      return false;
    }

    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();
    this.jobs.set(jobId, job);
    this.activeJobs.delete(jobId);

    logger.info(`Job cancelled: ${jobId}`);
    await eventBus.emit(EventTypes.JOB_CANCELLED, { jobId });

    // Start next pending job
    this.startNextPendingJob();

    return true;
  }

  /**
   * Get job statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === JobStatus.PENDING).length,
      processing: jobs.filter(j => j.status === JobStatus.PROCESSING).length,
      completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: jobs.filter(j => j.status === JobStatus.FAILED).length,
      cancelled: jobs.filter(j => j.status === JobStatus.CANCELLED).length,
    };
  }

  /**
   * Clean up old jobs
   */
  cleanup(olderThanDays: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleaned = 0;
    for (const [id, job] of this.jobs.entries()) {
      if (
        job.status !== JobStatus.PENDING &&
        job.status !== JobStatus.PROCESSING &&
        job.createdAt < cutoffDate
      ) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    logger.info(`Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }
}

/**
 * Global job service instance
 */
export const jobService = new JobService();
