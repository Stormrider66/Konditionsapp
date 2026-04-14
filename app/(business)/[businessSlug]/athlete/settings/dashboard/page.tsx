// app/(business)/[businessSlug]/athlete/settings/dashboard/page.tsx
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'
import { prisma } from '@/lib/prisma'
import type { SportType } from '@prisma/client'
import DashboardSettingsPage from '@/app/athlete/settings/dashboard/page'

interface BusinessDashboardSettingsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessDashboardSettingsWrapper({
  params,
}: BusinessDashboardSettingsPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  // Determine the athlete's current active sport (cookie override > primary).
  const sportProfile = await prisma.sportProfile.findUnique({
    where: { clientId },
    select: { primarySport: true, secondarySports: true },
  })
  const cookieStore = await cookies()
  const activeSportCookie = cookieStore.get('activeSport')?.value as SportType | undefined
  const availableSports = sportProfile
    ? [sportProfile.primarySport, ...(sportProfile.secondarySports || [])]
    : []
  const currentSport: SportType | null =
    (activeSportCookie && availableSports.includes(activeSportCookie)
      ? activeSportCookie
      : sportProfile?.primarySport) ?? null

  const basePath = `/${businessSlug}`

  return (
    <BasePathProvider basePath={basePath}>
      <DashboardSettingsPage currentSport={currentSport} />
    </BasePathProvider>
  )
}
