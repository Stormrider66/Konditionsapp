// app/(business)/[businessSlug]/athlete/my-coach/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { MyCoachClient } from '@/components/athlete/MyCoachClient'

export const metadata = {
  title: 'Min Coach | Atlet',
  description: 'Hantera din coachrelation',
}

interface BusinessMyCoachPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessMyCoachPage({ params }: BusinessMyCoachPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <MyCoachClient
      businessId={membership.business.id}
      businessSlug={businessSlug}
    />
  )
}

export const dynamic = 'force-dynamic'
