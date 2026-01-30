import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound } from 'next/navigation'
import { CoachCalendarSettingsClient } from './CoachCalendarSettingsClient'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachCalendarSettingsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <CoachCalendarSettingsClient basePath={`/${businessSlug}`} />
}
