// app/(business)/[businessSlug]/coach/settings/ai-kostnader/page.tsx
import { AICostInfoClient } from '@/app/coach/settings/ai-kostnader/AICostInfoClient'
import { requireCoach } from '@/lib/auth-utils'
import { notFound } from 'next/navigation'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessCoachAICostPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachAICostPage({ params }: BusinessCoachAICostPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <AICostInfoClient businessSlug={businessSlug} />
}
