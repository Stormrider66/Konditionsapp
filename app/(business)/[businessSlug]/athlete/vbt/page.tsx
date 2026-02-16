// app/(business)/[businessSlug]/athlete/vbt/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { VBTDashboard } from '@/components/athlete/VBTDashboard'

export const metadata = {
  title: 'VBT Data | Trainomics',
  description: 'Velocity-Based Training data och analys',
}

interface BusinessVBTPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessVBTPage({ params }: BusinessVBTPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">VBT Data</h1>
        <p className="text-muted-foreground text-sm">
          Velocity-Based Training - hastighetsbaserad styrketräning
        </p>
      </div>

      <VBTDashboard clientId={clientId} />
    </div>
  )
}
