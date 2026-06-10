import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { loadLatestModel } from '@/lib/mva/model-storage'
import { getLocale } from '@/i18n/server'
import { AthleteMVAProfileCard } from '@/components/mva/AthleteMVAProfileCard'

interface TeamProfilePageProps {
  params: Promise<{ businessSlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function AthleteTeamProfilePage({ params }: TeamProfilePageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const locale = (await getLocale()) === 'sv' ? 'sv' : 'en'
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { teamId: true, team: { select: { id: true, name: true } } },
  })

  const emptyState = (message: string) => (
    <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-bold dark:text-white">{t('Min lagprofil', 'My team profile')}</h1>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )

  if (!client?.teamId || !client.team) {
    return emptyState(
      t(
        'Du är inte kopplad till ett lag med multivariat analys ännu. Din coach lägger till dig i ett lag och kör analysen.',
        'You are not yet part of a team with multivariate analysis. Your coach adds you to a team and runs the analysis.'
      )
    )
  }

  const model = await loadLatestModel(client.team.id, locale)
  const myScore = model?.athleteScores.find((s) => s.clientId === clientId)

  if (!model || !myScore) {
    return emptyState(
      t(
        'Det finns ingen färdig lagprofil för dig ännu. Den visas här när din coach har kört en analys som inkluderar dina tester.',
        'There is no team profile for you yet. It appears here once your coach has run an analysis that includes your tests.'
      )
    )
  }

  return (
    <AthleteMVAProfileCard
      teamName={client.team.name}
      modelDate={model.createdAt.toISOString()}
      myScore={{
        clientName: myScore.clientName,
        scores: myScore.scores,
        hotellingT2: myScore.hotellingT2,
        dmodx: myScore.dmodx,
        isOutlierT2: myScore.isOutlierT2,
        isOutlierDModX: myScore.isOutlierDModX,
        topContributors: myScore.topContributors,
      }}
    />
  )
}
