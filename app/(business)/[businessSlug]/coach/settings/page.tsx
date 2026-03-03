// app/(business)/[businessSlug]/coach/settings/page.tsx
import { CoachSettingsClient } from '@/app/coach/settings/CoachSettingsClient'
import { requireCoach } from '@/lib/auth-utils'
import { notFound } from 'next/navigation'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessCoachSettingsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachSettingsPage({ params }: BusinessCoachSettingsPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <CoachSettingsClient userEmail={user.email || ''} businessSlug={businessSlug} userName={user.name || ''} />
}
