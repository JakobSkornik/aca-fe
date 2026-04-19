import React from 'react'
import TopBar from '@/components/ui/TopBar'
import BackendHealthIndicator from '@/components/BackendHealthIndicator'
import LandingNewAnalysis from '@/components/LandingNewAnalysis'
import RecentJobsSidebar from '@/components/RecentJobsSidebar'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import { useRouter } from 'next/router'

const Home = () => {
  const backendOk = useBackendHealth()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background-secondary text-text-primary">
      <div className="mx-auto max-w-[900px] px-4 py-6 pb-12">
        <TopBar
          subtitle="Automatic game analysis"
          onLogoClick={() => router.push('/')}
          right={<BackendHealthIndicator backendOk={backendOk} />}
        />

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-[1fr_300px] md:items-start">
          <div>
            <LandingNewAnalysis />
          </div>
          <div className="flex flex-col gap-3.5">
            <RecentJobsSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
