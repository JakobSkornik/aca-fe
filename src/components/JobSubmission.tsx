import React, { useState } from 'react';
import { jobService } from '@/services/JobService';
import { useRouter } from 'next/router';
import { useGameState } from '@/contexts/GameStateContext';
import BackendHealthIndicator from './BackendHealthIndicator';
import Dropdown from './ui/Dropdown';
import { useBackendHealth } from '@/hooks/useBackendHealth';

const JobSubmission: React.FC = () => {
  const backendOk = useBackendHealth();
  const [pgn, setPgn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { manager } = useGameState();

  const staticPgns = [
    { value: '', label: 'Select Example PGN' },
    { value: '/data/example1.pgn', label: 'Example 1' },
    { value: '/data/2759.pgn', label: '2759 elo' },
    { value: '/data/2000.pgn', label: '2000 elo' },
    { value: '/data/short.pgn', label: 'Test' },
  ];

  const handleDropdownSelection = async (value: string) => {
    if (!value) return;
    try {
      const response = await fetch(value);
      const text = await response.text();
      setPgn(text);
    } catch (e) {
      console.error('Failed to load example PGN', e);
    }
  };

  const handleSubmit = async () => {
    if (!pgn.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const mp = manager.getModelParams();
      const job = await jobService.submitJob(pgn, {
        llm_provider: mp.provider,
        llm_effort: mp.effort,
      });
      router.push(`/job/${job.job_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <div className="w-full">
        <Dropdown
          options={staticPgns}
          onChange={handleDropdownSelection}
          placeholder="Select Example PGN"
        />
      </div>

      <textarea
        className="w-full h-48 p-2 border border-dark-gray rounded-md font-mono text-sm bg-light-gray text-darkest-gray focus:outline-none focus:ring-2 focus:ring-orange"
        placeholder="Paste PGN here..."
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        onClick={handleSubmit}
        disabled={loading || !pgn.trim()}
        className="px-4 py-2 bg-darkest-gray text-white rounded-md hover:bg-dark-gray disabled:opacity-50 transition-colors"
      >
        {loading ? 'Submitting...' : 'Analyze Game'}
      </button>

      <div className="flex justify-end border-t border-gray-200/80 pt-2">
        <BackendHealthIndicator backendOk={backendOk} />
      </div>
    </div>
  );
};

export default JobSubmission;
