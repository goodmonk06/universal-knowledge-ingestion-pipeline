import { Request, Response } from 'express';
import { jobService } from '../services/jobService';
import { AppError, SuccessResponse } from '../middleware/errorHandler';
import { CreateJobInput, ListJobsInput } from '../schemas/job.schema';

/**
 * Create a new ingestion job
 */
export const createJob = async (req: Request, res: Response) => {
  const input = req.body as CreateJobInput;

  const job = await jobService.createJob(input);

  const response: SuccessResponse = {
    success: true,
    data: job,
  };

  res.status(201).json(response);
};

/**
 * List all jobs
 */
export const listJobs = async (req: Request, res: Response) => {
  const query = req.query as any as ListJobsInput;

  const { jobs, total } = jobService.listJobs(query);

  const response: SuccessResponse = {
    success: true,
    data: jobs,
    meta: {
      total,
      count: jobs.length,
      page: Math.floor(query.offset / query.limit) + 1,
    },
  };

  res.json(response);
};

/**
 * Get job by ID
 */
export const getJobById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = jobService.getJob(id);

  if (!job) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  const response: SuccessResponse = {
    success: true,
    data: job,
  };

  res.json(response);
};

/**
 * Cancel a job
 */
export const cancelJob = async (req: Request, res: Response) => {
  const { id } = req.params;

  const cancelled = await jobService.cancelJob(id);

  if (!cancelled) {
    throw new AppError(
      'Job not found or cannot be cancelled',
      400,
      'CANNOT_CANCEL'
    );
  }

  const response: SuccessResponse = {
    success: true,
    data: {
      message: 'Job cancelled successfully',
      jobId: id,
    },
  };

  res.json(response);
};

/**
 * Get job statistics
 */
export const getJobStats = async (req: Request, res: Response) => {
  const stats = jobService.getStats();

  const response: SuccessResponse = {
    success: true,
    data: stats,
  };

  res.json(response);
};
