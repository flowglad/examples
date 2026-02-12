'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PricingPage() {
  const router = useRouter()

  // Redirect pricing page to home with pricing view
  useEffect(() => {
    router.replace('/?view=pricing')
  }, [router])

  return null
}
