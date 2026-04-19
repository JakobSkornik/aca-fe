import React from 'react'
import JobView from '@/components/JobView'
import { useRouter } from 'next/router'

const JobPage = () => {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-secondary text-text-secondary">
        Invalid Job ID
      </div>
    )
  }

  return <JobView jobId={id} />
}

export default JobPage
