// app/(business)/[businessSlug]/coach/analytics/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AnalyticsDashboardClient } from '@/app/coach/analytics/AnalyticsDashboardClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessAnalyticsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <AnalyticsDashboardClient
      userId={user.id}
      userName={user.name || 'Coach'}
    />
  )
}
