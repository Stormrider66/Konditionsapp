// app/(business)/[businessSlug]/layout.tsx
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { resolveBusinessBranding } from '@/lib/branding/resolve-branding'
import { PLATFORM_NAME } from '@/lib/branding/types'
import { getBusinessFaviconUrl } from '@/lib/branding/favicon'
import { DynamicFontLoader } from '@/components/branding/DynamicFontLoader'

interface BusinessLayoutProps {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}): Promise<Metadata> {
  const { businessSlug } = await params
  const branding = await resolveBusinessBranding(businessSlug)

  const title = branding?.hasWhiteLabel && branding.pageTitle
    ? branding.pageTitle
    : PLATFORM_NAME

  const iconUrl = branding?.faviconUrl ?? getBusinessFaviconUrl(businessSlug)

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    icons: [{ url: iconUrl, sizes: '32x32' }],
  }
}

export default async function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { businessSlug } = await params

  // Get current user
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/login?redirect=/${businessSlug}/coach/dashboard`)
  }

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    // User is not a member of this business or business doesn't exist
    notFound()
  }

  // Load custom font if branding specifies one
  const fontFamily = membership.business.fontFamily

  return (
    <>
      {fontFamily && <DynamicFontLoader fontFamily={fontFamily} />}
      {children}
    </>
  )
}
