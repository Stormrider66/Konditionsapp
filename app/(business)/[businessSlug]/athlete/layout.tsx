// app/(business)/[businessSlug]/athlete/layout.tsx
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BusinessAthleteLayout } from '@/components/layouts/BusinessAthleteLayout'
import { resolveBusinessBranding } from '@/lib/branding/resolve-branding'

interface AthleteLayoutProps {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}

export default async function AthleteLayout({
  children,
  params,
}: AthleteLayoutProps) {
  const { businessSlug } = await params

  // Get current user
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/login?redirect=/${businessSlug}/athlete/dashboard`)
  }

  // Validate business membership and resolve branding in parallel
  const [membership, branding] = await Promise.all([
    validateBusinessMembership(user.id, businessSlug),
    resolveBusinessBranding(businessSlug),
  ])

  if (!membership) {
    // User is not a member of this business - show 404
    notFound()
  }

  // Pass business context to layout
  return (
    <BusinessAthleteLayout
      businessSlug={businessSlug}
      businessName={membership.business.name}
      businessLogo={membership.business.logoUrl}
      businessColor={membership.business.primaryColor}
      branding={branding}
    >
      {children}
    </BusinessAthleteLayout>
  )
}
