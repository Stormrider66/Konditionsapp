import { notFound } from 'next/navigation'

import { TeamCaptureLauncher } from '@/components/coach/team-capture/TeamCaptureLauncher'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { listTeamCaptureWorkoutOptions } from '@/lib/team-capture/workout-template'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
  searchParams: Promise<{
    workoutType?: string
    workoutId?: string
  }>
}

export default async function TeamCapturePage({ params, searchParams }: PageProps) {
  const { businessSlug, teamId } = await params
  const query = await searchParams
  const user = await requireCoach()
  const locale: 'en' | 'sv' = user.language === 'sv' ? 'sv' : 'en'

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!team) notFound()

  const [members, existingSessions, workoutOptions] = await Promise.all([
    prisma.client.findMany({
      where: { teamId },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
      },
    }),
    prisma.teamCaptureSession.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        masterStartedAt: true,
        _count: { select: { participants: true } },
      },
    }),
    listTeamCaptureWorkoutOptions({
      coachId: user.id,
      teamId,
      businessId: membership.businessId,
      take: 16,
    }),
  ])

  return (
    <TeamCaptureLauncher
      businessSlug={businessSlug}
      teamId={teamId}
      teamName={team.name}
      locale={locale}
      members={members}
      existingSessions={serialize(existingSessions)}
      workoutOptions={serialize(workoutOptions)}
      initialWorkoutType={query.workoutType}
      initialWorkoutId={query.workoutId}
    />
  )
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
