// app/(business)/[businessSlug]/athlete/profile/page.tsx
import { redirect, notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { fetchAthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { AthleteProfileClient } from '@/components/athlete-profile/AthleteProfileClient'

interface BusinessProfilePageProps {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function BusinessAthleteProfilePage({ params, searchParams }: BusinessProfilePageProps) {
  const { businessSlug } = await params
  const { tab = 'physiology' } = await searchParams

  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Fetch all profile data in parallel
  const data = await fetchAthleteProfileData(clientId)

  // Handle client not found
  if (!data.identity.client) {
    redirect(`${basePath}/athlete/dashboard`)
  }

  return (
    <AthleteProfileClient
      data={data}
      viewMode="athlete"
      initialTab={tab}
      currentUserId={user.id}
      basePath={basePath}
    />
  )
}

export const dynamic = 'force-dynamic'
