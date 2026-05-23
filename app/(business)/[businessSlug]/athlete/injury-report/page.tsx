import { notFound, redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
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

  return (
    <InjuryReportForm
      clientId={athlete.id}
      athleteName={athlete.name}
      basePath={`/${businessSlug}`}
    />
  )
}
