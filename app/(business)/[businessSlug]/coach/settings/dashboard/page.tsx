// app/(business)/[businessSlug]/coach/settings/dashboard/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'
import CoachDashboardSettingsPage from '@/components/coach/settings/dashboard/CoachDashboardSettingsPage'

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachDashboardSettingsWrapper({ params }: Props) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <BasePathProvider basePath={basePath}>
      <CoachDashboardSettingsPage />
    </BasePathProvider>
  )
}
