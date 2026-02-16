// app/(business)/[businessSlug]/athlete/ergometer/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { ErgometerDashboard } from '@/components/athlete/ErgometerDashboard'

export const metadata = {
  title: 'Ergometer | Trainomics',
  description: 'Ergometertester, zoner och progression',
}

interface BusinessErgometerPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessErgometerPage({ params }: BusinessErgometerPageProps) {
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
        <h1 className="text-2xl font-bold">Ergometertester</h1>
        <p className="text-muted-foreground text-sm">
          Rodd, SkiErg, BikeErg, Wattbike och Air Bike
        </p>
      </div>

      <ErgometerDashboard clientId={clientId} />
    </div>
  )
}
