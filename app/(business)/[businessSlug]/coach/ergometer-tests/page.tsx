// app/(business)/[businessSlug]/coach/ergometer-tests/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import ErgometerTestsPageClient from './ErgometerTestsClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessErgometerTestsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <ErgometerTestsPageClient />
}
