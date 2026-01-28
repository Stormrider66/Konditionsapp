// app/(business)/[businessSlug]/coach/settings/page.tsx
import { CoachSettingsClient } from '@/app/coach/settings/CoachSettingsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessCoachSettingsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachSettingsPage({ params }: BusinessCoachSettingsPageProps) {
  const { businessSlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <CoachSettingsClient user={user} businessSlug={businessSlug} />
}
