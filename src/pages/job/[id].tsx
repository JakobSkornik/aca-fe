import React from 'react';
import { useRouter } from 'next/router';
import JobView from '@/components/JobView';

const JobPage = () => {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return <div className="text-darkest-gray">Invalid Job ID</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-gray">
      <div className="bg-lightest-gray p-8 rounded-lg shadow-md w-full max-w-lg">
        <JobView jobId={id} />
      </div>
    </div>
  );
};

export default JobPage;
