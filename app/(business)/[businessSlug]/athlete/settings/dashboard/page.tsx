// app/(business)/[businessSlug]/athlete/settings/dashboard/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'
import DashboardSettingsPage from '@/app/athlete/settings/dashboard/page'

interface BusinessDashboardSettingsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessDashboardSettingsWrapper({
  params,
}: BusinessDashboardSettingsPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <BasePathProvider basePath={basePath}>
      <DashboardSettingsPage />
    </BasePathProvider>
  )
}
