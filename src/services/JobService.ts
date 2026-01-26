import { JobResponse } from '@/types/Job';
import { GameJson } from '@/types/GameJson';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class JobService {
  async submitJob(pgn: string): Promise<JobResponse> {
    const res = await fetch(`${API_URL}/jobs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pgn_string: pgn }),
    });
    if (!res.ok) {
      throw new Error(`Submission failed: ${res.statusText}`);
    }
    return res.json();
  }

  async getJobStatus(jobId: string): Promise<JobResponse> {
    const res = await fetch(`${API_URL}/jobs/${jobId}/status`);
    if (!res.ok) {
      throw new Error(`Failed to get status: ${res.statusText}`);
    }
    return res.json();
  }

  async getGameJson(jobId: string): Promise<GameJson> {
    const res = await fetch(`${API_URL}/jobs/${jobId}/game`);
    if (!res.ok) {
      throw new Error(`Failed to get game JSON: ${res.statusText}`);
    }
    return res.json();
  }
}

export const jobService = new JobService();



