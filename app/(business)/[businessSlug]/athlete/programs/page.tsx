// app/(business)/[businessSlug]/athlete/programs/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteProgramsView } from '@/app/athlete/programs/programs-view'

interface BusinessProgramsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteProgramsPage({ params }: BusinessProgramsPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <AthleteProgramsView
      clientId={clientId}
      basePath={`/${businessSlug}`}
      showImport
    />
  )
}
