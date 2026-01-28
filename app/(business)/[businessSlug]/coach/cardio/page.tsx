// app/(business)/[businessSlug]/coach/cardio/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { CardioDashboard } from '@/components/coach/cardio/CardioDashboard'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessCardioPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <CardioDashboard />
    </Suspense>
  )
}
