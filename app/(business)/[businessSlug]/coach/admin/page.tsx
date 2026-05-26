import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound, redirect } from 'next/navigation'
import { BusinessAdminClient } from './BusinessAdminClient'

interface BusinessAdminPageProps {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{ tab?: string }>
}

const adminTabs = new Set([
  'overview',
  'locations',
  'members',
  'assignments',
  'branding',
  'ai-keys',
  'api-keys',
  'referrals',
  'settings',
])

export default async function BusinessAdminPage({ params, searchParams }: BusinessAdminPageProps) {
  const { businessSlug } = await params
  const { tab } = await searchParams
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
      businessId={membership.business.id}
      businessName={membership.business.name}
      businessRole={membership.role as 'OWNER' | 'ADMIN'}
      businessSlug={businessSlug}
      isPlatformAdmin={!!user.adminRole}
      initialTab={tab && adminTabs.has(tab) ? tab : undefined}
    />
  )
}
