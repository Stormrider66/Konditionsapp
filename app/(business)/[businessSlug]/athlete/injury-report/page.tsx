import { notFound, redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { canClientReportInjuryToTeamPhysio } from '@/lib/medical/care-team-recipients'
import { InjuryReportForm } from '@/components/athlete/injury/InjuryReportForm'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteInjuryReportPage({ params }: PageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  const athlete = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
    },
  })

  if (!athlete) {
    redirect(`/${businessSlug}/athlete/onboarding`)
  }

  const canReportToTeamPhysio = await canClientReportInjuryToTeamPhysio(athlete.id)
  if (!canReportToTeamPhysio) {
    redirect(`/${businessSlug}/athlete/dashboard`)
  }

  return (
    <InjuryReportForm
      clientId={athlete.id}
      athleteName={athlete.name}
      basePath={`/${businessSlug}`}
    />
  )
}
