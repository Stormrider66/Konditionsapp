import { notFound } from 'next/navigation'
import { AICanvasClient } from '@/components/ai-canvas/AICanvasClient'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessAICanvasPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  return <AICanvasClient businessSlug={businessSlug} />
}
