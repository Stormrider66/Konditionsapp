// app/(business)/[businessSlug]/coach/injuries/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { InjuryAlertCenter } from '@/components/coach/injury/InjuryAlertCenter'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessInjuriesPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <InjuryAlertCenter />
    </div>
  )
}
