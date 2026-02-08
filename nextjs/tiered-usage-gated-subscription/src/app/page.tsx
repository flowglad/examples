import { Suspense } from 'react'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { HomeClient } from './home-client'

export default async function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeClient />
    </Suspense>
  )
}
