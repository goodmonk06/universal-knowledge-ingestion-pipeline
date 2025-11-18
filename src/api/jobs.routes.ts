import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import {
  CreateJobSchema,
  ListJobsSchema,
  JobIdSchema,
} from '../schemas/job.schema';
import * as jobsController from './jobs.controller';

const router = Router();

/**
 * POST /api/jobs
 * Create a new ingestion job
 */
router.post(
  '/',
  validateBody(CreateJobSchema),
  asyncHandler(jobsController.createJob)
);

/**
 * GET /api/jobs
 * List all jobs
 */
router.get(
  '/',
  validateQuery(ListJobsSchema),
  asyncHandler(jobsController.listJobs)
);

/**
 * GET /api/jobs/stats
 * Get job statistics
 */
router.get(
  '/stats',
  asyncHandler(jobsController.getJobStats)
);

/**
 * GET /api/jobs/:id
 * Get job by ID
 */
router.get(
  '/:id',
  validateParams(JobIdSchema),
  asyncHandler(jobsController.getJobById)
);

/**
 * POST /api/jobs/:id/cancel
 * Cancel a job
 */
router.post(
  '/:id/cancel',
  validateParams(JobIdSchema),
  asyncHandler(jobsController.cancelJob)
);

export default router;
