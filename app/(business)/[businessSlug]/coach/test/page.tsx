import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound } from 'next/navigation'
import { TestPageContent } from '@/components/test/TestPageContent'

interface BusinessTestPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessTestPage({ params }: BusinessTestPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  return (
    <TestPageContent
      businessSlug={businessSlug}
      organizationName={membership.business.name}
    />
  )
}
