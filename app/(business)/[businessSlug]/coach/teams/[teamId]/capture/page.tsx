import { notFound } from 'next/navigation'

import { TeamCaptureLauncher } from '@/components/coach/team-capture/TeamCaptureLauncher'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { listTeamCaptureWorkoutOptions, loadTeamCaptureWorkoutOption } from '@/lib/team-capture/workout-template'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
  searchParams: Promise<{
    date?: string
    teamEventId?: string
    workoutType?: string
    workoutId?: string
  }>
}

function dayBounds(dateParam?: string) {
  const dayStart = dateParam ? new Date(dateParam) : new Date()
  if (Number.isNaN(dayStart.getTime())) return null
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  return { dayStart, dayEnd }
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

  const bounds = dayBounds(query.date)
  const plannedEvent = query.teamEventId
    ? await prisma.teamEvent.findFirst({
        where: {
          id: query.teamEventId,
          teamId,
          linkedWorkoutType: { in: ['CARDIO', 'HYBRID'] },
          linkedWorkoutId: { not: null },
        },
        select: {
          id: true,
          linkedWorkoutType: true,
          linkedWorkoutId: true,
          linkedWorkoutName: true,
        },
      })
    : bounds
      ? await prisma.teamEvent.findFirst({
          where: {
            teamId,
            startDate: { gte: bounds.dayStart, lt: bounds.dayEnd },
            linkedWorkoutType: { in: ['CARDIO', 'HYBRID'] },
            linkedWorkoutId: { not: null },
          },
          orderBy: { startDate: 'asc' },
          select: {
            id: true,
            linkedWorkoutType: true,
            linkedWorkoutId: true,
            linkedWorkoutName: true,
          },
        })
      : null

  const initialWorkoutType = query.workoutType ?? plannedEvent?.linkedWorkoutType ?? undefined
  const initialWorkoutId = query.workoutId ?? plannedEvent?.linkedWorkoutId ?? undefined
  const initialTeamEventId = query.teamEventId ?? plannedEvent?.id ?? undefined

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
  const plannedOption = initialWorkoutType && initialWorkoutId
    ? await loadTeamCaptureWorkoutOption({
        coachId: user.id,
        teamId,
        businessId: membership.businessId,
        workoutType: initialWorkoutType,
        workoutId: initialWorkoutId,
      })
    : null
  const normalizedWorkoutOptions = plannedOption &&
    !workoutOptions.some((option) => option.id === plannedOption.id && option.type === plannedOption.type)
    ? [plannedOption, ...workoutOptions]
    : workoutOptions

  return (
    <TeamCaptureLauncher
      businessSlug={businessSlug}
      teamId={teamId}
      teamName={team.name}
      locale={locale}
      members={members}
      existingSessions={serialize(existingSessions)}
      workoutOptions={serialize(normalizedWorkoutOptions)}
      initialWorkoutType={initialWorkoutType}
      initialWorkoutId={initialWorkoutId}
      initialTeamEventId={initialTeamEventId}
      plannedWorkoutRequested={Boolean(initialWorkoutType && initialWorkoutId)}
    />
  )
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
