/**
 * ============================================================================
 * SCHEDULER REGISTRY
 * ============================================================================
 * 
 * Registers all scheduled jobs using node-cron
 * 
 * Cron expression format: * * * * * *
 * ┬ ┬ ┬ ┬ ┬ ┬
 * │ │ │ │ │ |
 * │ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
 * │ │ │ │ └───── month (1 - 12)
 * │ │ │ └────────── day of month (1 - 31)
 * │ │ └─────────────── hour (0 - 23)
 * │ └──────────────────── minute (0 - 59)
 * └───────────────────────── second (0 - 59, optional)
 * 
 * ============================================================================
 */

import cron from 'node-cron';
import { dailyRiskEvaluationJob } from './dailyRiskEvaluation';
import { dailyBlacklistExpiryJob } from './dailyBlacklistExpiry';
import { dailyQualificationExpiryJob } from './dailyQualificationExpiry';

interface ScheduledJob {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  enabled?: boolean;
}

const jobs: ScheduledJob[] = [
  {
    ...dailyRiskEvaluationJob,
    enabled: true,
  },
  {
    ...dailyBlacklistExpiryJob,
    enabled: true,
  },
  {
    ...dailyQualificationExpiryJob,
    enabled: true,
  },
];

/**
 * Initialize and start all scheduled jobs
 */
export function initializeSchedulers() {
  console.log('[Schedulers] Initializing scheduled jobs...');

  jobs.forEach((job) => {
    if (!job.enabled) {
      console.log(`[Schedulers] Skipping disabled job: ${job.name}`);
      return;
    }

    if (!cron.validate(job.schedule)) {
      console.error(`[Schedulers] Invalid cron expression for job ${job.name}: ${job.schedule}`);
      return;
    }

    cron.schedule(job.schedule, async () => {
      console.log(`[Schedulers] Running job: ${job.name}`);
      try {
        await job.handler();
        console.log(`[Schedulers] Job completed: ${job.name}`);
      } catch (error) {
        console.error(`[Schedulers] Job failed: ${job.name}`, error);
      }
    });

    console.log(`[Schedulers] Registered job: ${job.name} (schedule: ${job.schedule})`);
  });

  console.log(`[Schedulers] ${jobs.filter(j => j.enabled).length} jobs registered`);
}

/**
 * Run a specific job manually (for testing)
 */
export async function runJobManually(jobName: string) {
  const job = jobs.find(j => j.name === jobName);
  if (!job) {
    throw new Error(`Job not found: ${jobName}`);
  }

  console.log(`[Schedulers] Manually running job: ${jobName}`);
  await job.handler();
  console.log(`[Schedulers] Manual job completed: ${jobName}`);
}
