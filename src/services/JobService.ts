import { JobResponse } from '@/types/Job';
import { GameJson } from '@/types/GameJson';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function apiUrlToWsBase(apiUrl: string): string {
  if (apiUrl.startsWith('https://')) {
    return `wss://${apiUrl.slice('https://'.length)}`;
  }
  if (apiUrl.startsWith('http://')) {
    return `ws://${apiUrl.slice('http://'.length)}`;
  }
  return apiUrl;
}

class JobService {
  async submitJob(
    pgn: string,
    opts?: { llm_model?: string; llm_effort?: string }
  ): Promise<JobResponse> {
    const res = await fetch(`${API_URL}/jobs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pgn_string: pgn,
        llm_model: opts?.llm_model,
        llm_effort: opts?.llm_effort,
      }),
    });
    if (!res.ok) {
      throw new Error(`Submission failed: ${res.statusText}`);
    }
    return res.json();
  }

  async listJobs(limit = 20): Promise<JobResponse[]> {
    const res = await fetch(`${API_URL}/jobs?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to list jobs: ${res.statusText}`);
    }
    return res.json();
  }

  async retryJob(jobId: string): Promise<JobResponse> {
    const res = await fetch(`${API_URL}/jobs/${jobId}/retry`, { method: 'POST' });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || `Retry failed: ${res.statusText}`);
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

  /** WebSocket URL for streaming LLM commentary (`/jobs/{id}/ws`). */
  getCommentaryWsUrl(jobId: string): string {
    const wsBase =
      process.env.NEXT_PUBLIC_WS_URL || apiUrlToWsBase(API_URL);
    const base = wsBase.replace(/\/$/, '');
    return `${base}/jobs/${jobId}/ws`;
  }
}

export const jobService = new JobService();
