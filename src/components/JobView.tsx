import React, { useEffect, useState } from 'react';
import { jobService } from '@/services/JobService';
import { JobResponse } from '@/types/Job';
import { useRouter } from 'next/router';

interface JobViewProps {
  jobId: string;
}

const JobView: React.FC<JobViewProps> = ({ jobId }) => {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const status = await jobService.getJobStatus(jobId);
        setJob(status);

        if (status.status === 'completed') {
          // Redirect to game view after a brief pause
          setTimeout(() => {
            router.push(`/game/${jobId}`);
          }, 1000);
        }
      } catch (e) {
        console.error(e); // Log error for debugging
        setError('Failed to fetch job status');
      }
    };

    pollStatus();
    const intervalId = setInterval(pollStatus, 2000); // Poll every 2 seconds

    return () => clearInterval(intervalId);
  }, [jobId, router]);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (!job) {
    return <div className="p-4 text-darkest-gray">Loading job status...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <h2 className="text-2xl font-bold text-darkest-gray">Analysis Status</h2>
      
      <div className="text-lg font-semibold capitalize text-darkest-gray">
        Status: <span className={getStatusColor(job.status)}>{job.status}</span>
      </div>

      {job.message && <p className="text-dark-gray">{job.message}</p>}

      <div className="w-full max-w-md bg-light-gray rounded-full h-4 overflow-hidden border border-dark-gray">
        <div 
          className="bg-orange h-4 rounded-full transition-all duration-500" 
          style={{ width: `${job.progress || 0}%` }}
        ></div>
      </div>
      <div className="text-sm text-dark-gray">{Math.round(job.progress || 0)}%</div>

      {job.status === 'completed' && (
         <button 
           onClick={() => router.push(`/game/${jobId}`)}
           className="mt-4 px-4 py-2 bg-darkest-gray text-white rounded hover:bg-dark-gray"
         >
           View Game
         </button>
      )}
       {job.status === 'failed' && (
         <div className="text-red-600">Analysis Failed. Please try again.</div>
      )}
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'waiting': return 'text-yellow-600';
    case 'processing': return 'text-blue-600';
    case 'completed': return 'text-green-600';
    case 'failed': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export default JobView;
