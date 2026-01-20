// app/(business)/[businessSlug]/coach/layout.tsx
import { BusinessCoachLayout } from '@/components/layouts/BusinessCoachLayout'

interface CoachLayoutProps {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}

export default async function CoachLayout({
  children,
  params,
}: CoachLayoutProps) {
  const { businessSlug } = await params

  return (
    <BusinessCoachLayout businessSlug={businessSlug}>
      {children}
    </BusinessCoachLayout>
  )
}
