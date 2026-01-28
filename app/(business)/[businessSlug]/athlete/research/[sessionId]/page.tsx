// app/(business)/[businessSlug]/athlete/research/[sessionId]/page.tsx
/**
 * Research Report View Page (Business Athlete Portal)
 *
 * Business-specific implementation with basePath.
 */

import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { SharedResearchView } from '@/components/athlete/SharedResearchView'

export const metadata = {
  title: 'Research Report | Athlete Portal',
  description: 'View shared research report',
}

interface BusinessResearchViewPageProps {
  params: Promise<{ businessSlug: string; sessionId: string }>
}

export default async function BusinessResearchViewPage({ params }: BusinessResearchViewPageProps) {
  const { businessSlug, sessionId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return <SharedResearchView sessionId={sessionId} basePath={basePath} />
}
