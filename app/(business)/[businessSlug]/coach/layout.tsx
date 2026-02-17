// app/(business)/[businessSlug]/coach/layout.tsx
import { BusinessCoachLayout } from '@/components/layouts/BusinessCoachLayout'
import { resolveBusinessBranding } from '@/lib/branding/resolve-branding'

interface CoachLayoutProps {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}

export default async function CoachLayout({
  children,
  params,
}: CoachLayoutProps) {
  const { businessSlug } = await params

  const branding = await resolveBusinessBranding(businessSlug)

  return (
    <BusinessCoachLayout businessSlug={businessSlug} branding={branding}>
      {children}
    </BusinessCoachLayout>
  )
}
