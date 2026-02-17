// app/(business)/[businessSlug]/layout.tsx
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { resolveBusinessBranding } from '@/lib/branding/resolve-branding'
import { PLATFORM_NAME } from '@/lib/branding/types'
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

  const icons = branding?.faviconUrl
    ? [{ url: branding.faviconUrl, sizes: '32x32' }]
    : undefined

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    ...(icons ? { icons } : {}),
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
