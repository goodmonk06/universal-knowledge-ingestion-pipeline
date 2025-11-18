import { z } from 'zod';
import { JobStatus } from '../types';

/**
 * Create job schema
 */
export const CreateJobSchema = z.object({
  sourceType: z.enum(['pdf', 'text', 'web', 'batch']),
  collection: z.string().min(1, 'Collection is required'),
  sourcePath: z.string().optional(),
  sourceUrl: z.string().url('Valid URL required').optional(),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => {
    if (data.sourceType === 'web') {
      return !!data.sourceUrl;
    }
    return !!data.sourcePath;
  },
  {
    message: 'web requires sourceUrl, other types require sourcePath',
  }
);

/**
 * List jobs query schema
 */
export const ListJobsSchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  collection: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

/**
 * Job ID parameter schema
 */
export const JobIdSchema = z.object({
  id: z.string().uuid('Valid job ID required'),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type ListJobsInput = z.infer<typeof ListJobsSchema>;
export type JobIdInput = z.infer<typeof JobIdSchema>;
