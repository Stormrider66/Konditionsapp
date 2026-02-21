// app/(business)/[businessSlug]/coach/settings/ai-kostnader/page.tsx
import { AICostInfoClient } from '@/app/coach/settings/ai-kostnader/AICostInfoClient'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessCoachAICostPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachAICostPage({ params }: BusinessCoachAICostPageProps) {
  const { businessSlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <AICostInfoClient businessSlug={businessSlug} />
}
