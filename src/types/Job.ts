export type JobStatus = 'waiting' | 'processing' | 'engine_complete' | 'completed' | 'failed';

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  queue_position: number | null;
  progress: number | null;
  message: string | null;
  created_at: number;
}



