import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound, redirect } from 'next/navigation'
import { BusinessAdminClient } from './BusinessAdminClient'

interface BusinessAdminPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAdminPage({ params }: BusinessAdminPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  // Check if user is OWNER or ADMIN
  if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
    // Redirect to dashboard if not an admin
    redirect(`/${businessSlug}/coach/dashboard`)
  }

  return (
    <BusinessAdminClient
      businessName={membership.business.name}
      businessRole={membership.role as 'OWNER' | 'ADMIN'}
      businessSlug={businessSlug}
    />
  )
}
