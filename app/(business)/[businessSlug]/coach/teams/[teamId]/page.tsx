// app/(business)/[businessSlug]/coach/teams/[teamId]/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Users,
  Calendar,
  TrendingUp,
  Dumbbell,
  Heart,
  Zap,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { TeamDashboardClient } from '@/components/coach/teams/TeamDashboardClient'
import { TeamLeaderboard } from '@/components/coach/leaderboards'
import { AddPlayersDialog } from '@/components/coach/teams/AddPlayersDialog'
import { TeamRosterTable } from '@/components/coach/teams/TeamRosterTable'
import { AssignmentStatus } from '@prisma/client'

interface TeamPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

const sportTypeLabels: Record<string, string> = {
  TEAM_FOOTBALL: 'Fotboll',
  TEAM_ICE_HOCKEY: 'Ishockey',
  TEAM_HANDBALL: 'Handboll',
  TEAM_FLOORBALL: 'Innebandy',
  RUNNING: 'Löpning',
  CYCLING: 'Cykling',
  SKIING: 'Skidåkning',
  SWIMMING: 'Simning',
  TRIATHLON: 'Triathlon',
  HYROX: 'HYROX',
  GENERAL_FITNESS: 'Allmän träning',
  STRENGTH: 'Styrka',
}

function PilotReadinessItem({
  label,
  ready,
  detail,
}: {
  label: string
  ready: boolean
  detail: string
}) {
  return (
    <div className="rounded-md border bg-background/70 p-3 dark:bg-slate-950/40 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium dark:text-slate-100">{label}</p>
        <Badge variant={ready ? 'default' : 'secondary'} className="text-[10px]">
          {ready ? 'Redo' : 'Kvar'}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export default async function BusinessTeamDashboardPage({ params }: TeamPageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach/teams`

  // Verify team access inside the business workspace
  const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!accessibleTeam) {
    notFound()
  }

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          birthDate: true,
          height: true,
          weight: true,
          jerseyNumber: true,
          position: true,
          photoUrl: true,
          athleteAccount: { select: { id: true } },
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!team) {
    notFound()
  }

  // Fetch dashboard data (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const broadcasts = await prisma.teamWorkoutBroadcast.findMany({
    where: {
      teamId,
      assignedDate: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      strengthSession: {
        select: { id: true, name: true },
      },
      cardioSession: {
        select: { id: true, name: true },
      },
      hybridWorkout: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      assignedDate: 'desc',
    },
    take: 10,
  })

  const hockeyTestCount = await prisma.hockeyPhysicalTest.count({
    where: { teamId },
  })

  const memberIds = team.members.map((member) => member.id)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const upcomingUntil = new Date(today)
  upcomingUntil.setDate(upcomingUntil.getDate() + 7)
  const activeAssignmentStatuses = [
    AssignmentStatus.PENDING,
    AssignmentStatus.SCHEDULED,
    AssignmentStatus.MODIFIED,
  ]

  const [
    strengthToday,
    cardioToday,
    hybridToday,
    strengthUpcoming,
    cardioUpcoming,
    hybridUpcoming,
    activeInjuries,
    activeRestrictions,
  ] = await Promise.all([
    prisma.strengthSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lt: tomorrow },
      },
      _count: { id: true },
    }),
    prisma.cardioSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lt: tomorrow },
      },
      _count: { id: true },
    }),
    prisma.hybridWorkoutAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lt: tomorrow },
      },
      _count: { id: true },
    }),
    prisma.strengthSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lte: upcomingUntil },
      },
      _count: { id: true },
    }),
    prisma.cardioSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lte: upcomingUntil },
      },
      _count: { id: true },
    }),
    prisma.hybridWorkoutAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lte: upcomingUntil },
      },
      _count: { id: true },
    }),
    prisma.injuryAssessment.groupBy({
      by: ['clientId'],
      where: {
        clientId: { in: memberIds },
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
      _count: { id: true },
    }),
    prisma.trainingRestriction.findMany({
      where: {
        clientId: { in: memberIds },
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: {
        clientId: true,
        type: true,
        severity: true,
        source: true,
        bodyParts: true,
        reason: true,
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  const todayWorkoutCounts = new Map<string, number>()
  const upcomingWorkoutCounts = new Map<string, number>()
  const addAssignmentCounts = (
    target: Map<string, number>,
    rows: Array<{ athleteId: string; _count: { id: number } }>
  ) => {
    rows.forEach((row) => {
      target.set(row.athleteId, (target.get(row.athleteId) ?? 0) + row._count.id)
    })
  }
  addAssignmentCounts(todayWorkoutCounts, strengthToday)
  addAssignmentCounts(todayWorkoutCounts, cardioToday)
  addAssignmentCounts(todayWorkoutCounts, hybridToday)
  addAssignmentCounts(upcomingWorkoutCounts, strengthUpcoming)
  addAssignmentCounts(upcomingWorkoutCounts, cardioUpcoming)
  addAssignmentCounts(upcomingWorkoutCounts, hybridUpcoming)

  const injuryCounts = new Map<string, number>()
  activeInjuries.forEach((injury) => {
    injuryCounts.set(injury.clientId, injury._count.id)
  })

  const restrictionSummaries = new Map<
    string,
    Array<{
      type: string
      severity: string
      source: string
      bodyParts: string[]
      reason: string | null
    }>
  >()
  activeRestrictions.forEach((restriction) => {
    const current = restrictionSummaries.get(restriction.clientId) ?? []
    current.push({
      type: restriction.type,
      severity: restriction.severity,
      source: restriction.source,
      bodyParts: restriction.bodyParts,
      reason: restriction.reason,
    })
    restrictionSummaries.set(restriction.clientId, current)
  })

  const membersWithRosterStatus = team.members.map((member) => ({
    ...member,
    todayWorkoutCount: todayWorkoutCounts.get(member.id) ?? 0,
    upcomingWorkoutCount: upcomingWorkoutCounts.get(member.id) ?? 0,
    activeInjuryCount: injuryCounts.get(member.id) ?? 0,
    activeRestrictionCount: restrictionSummaries.get(member.id)?.length ?? 0,
    restrictionSummaries: restrictionSummaries.get(member.id) ?? [],
  }))

  // Calculate completion stats for broadcasts
  const recentBroadcasts = await Promise.all(
    broadcasts.map(async (broadcast) => {
      let completedCount = 0

      if (broadcast.strengthSessionId) {
        completedCount = await prisma.strengthSessionAssignment.count({
          where: {
            teamBroadcastId: broadcast.id,
            status: 'COMPLETED',
          },
        })
      } else if (broadcast.cardioSessionId) {
        completedCount = await prisma.cardioSessionAssignment.count({
          where: {
            teamBroadcastId: broadcast.id,
            status: 'COMPLETED',
          },
        })
      } else if (broadcast.hybridWorkoutId) {
        completedCount = await prisma.hybridWorkoutAssignment.count({
          where: {
            teamBroadcastId: broadcast.id,
            status: 'COMPLETED',
          },
        })
      }

      const workoutName =
        broadcast.strengthSession?.name ||
        broadcast.cardioSession?.name ||
        broadcast.hybridWorkout?.name ||
        'Okänt pass'

      const workoutType = broadcast.strengthSessionId
        ? 'strength'
        : broadcast.cardioSessionId
          ? 'cardio'
          : 'hybrid'

      return {
        id: broadcast.id,
        assignedDate: broadcast.assignedDate,
        workoutName,
        workoutType,
        totalAssigned: broadcast.totalAssigned,
        totalCompleted: completedCount,
        completionRate:
          broadcast.totalAssigned > 0
            ? Math.round((completedCount / broadcast.totalAssigned) * 100)
            : 0,
      }
    })
  )

  // Calculate member stats
  const memberStats = await Promise.all(
    team.members.map(async (member) => {
      const strengthAssigned = await prisma.strengthSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
        },
      })
      const strengthCompleted = await prisma.strengthSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      })

      const cardioAssigned = await prisma.cardioSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
        },
      })
      const cardioCompleted = await prisma.cardioSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      })

      const hybridAssigned = await prisma.hybridWorkoutAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
        },
      })
      const hybridCompleted = await prisma.hybridWorkoutAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      })

      const totalAssigned = strengthAssigned + cardioAssigned + hybridAssigned
      const totalCompleted = strengthCompleted + cardioCompleted + hybridCompleted

      return {
        athleteId: member.id,
        name: member.name,
        email: member.email,
        assignedCount: totalAssigned,
        completedCount: totalCompleted,
        completionRate:
          totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
      }
    })
  )

  memberStats.sort((a, b) => b.completionRate - a.completionRate)

  const totalWorkoutsAssigned = memberStats.reduce((sum, m) => sum + m.assignedCount, 0)
  const totalWorkoutsCompleted = memberStats.reduce((sum, m) => sum + m.completedCount, 0)
  const overallCompletionRate =
    totalWorkoutsAssigned > 0
      ? Math.round((totalWorkoutsCompleted / totalWorkoutsAssigned) * 100)
      : 0

  const missingProfileCount = team.members.filter(
    (member) =>
      !member.email ||
      !member.position ||
      !member.birthDate ||
      !member.height ||
      !member.weight
  ).length
  const athleteAccountCount = team.members.filter((member) => member.athleteAccount).length
  const rosterReady = team.members.length > 0 && missingProfileCount === 0
  const athletePortalReady =
    team.members.length > 0 && athleteAccountCount === team.members.length

  const getWorkoutTypeIcon = (type: string) => {
    switch (type) {
      case 'strength':
        return <Dumbbell className="h-4 w-4" />
      case 'cardio':
        return <Heart className="h-4 w-4" />
      case 'hybrid':
        return <Zap className="h-4 w-4" />
      default:
        return <Dumbbell className="h-4 w-4" />
    }
  }

  const getWorkoutTypeBadge = (type: string) => {
    switch (type) {
      case 'strength':
        return (
          <Badge variant="outline" className="text-xs">
            Styrka
          </Badge>
        )
      case 'cardio':
        return (
          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
            Kondition
          </Badge>
        )
      case 'hybrid':
        return (
          <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
            Hybrid
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href={basePath}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till lag
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold dark:text-white">{team.name}</h1>
            {team.sportType && (
              <Badge variant="secondary" className="text-sm">
                {sportTypeLabels[team.sportType] || team.sportType}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {team.members.length} spelare
            </span>
            {team.organization && (
              <span className="flex items-center gap-1">
                <span className="text-sm">{team.organization.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AddPlayersDialog
            teamId={teamId}
            teamName={team.name}
            basePath={`/${businessSlug}/coach`}
            importPath={`/${businessSlug}/coach/teams/${teamId}/import`}
          />
          <TeamDashboardClient teamId={teamId} basePath={`/${businessSlug}`} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardDescription>Spelare</CardDescription>
            <CardTitle className="text-2xl dark:text-white">{team.members.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardDescription>Tilldelade pass (30 dagar)</CardDescription>
            <CardTitle className="text-2xl dark:text-white">{totalWorkoutsAssigned}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardDescription>Genomförda pass</CardDescription>
            <CardTitle className="text-2xl dark:text-white">{totalWorkoutsCompleted}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardDescription>Genomförandegrad</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 dark:text-white">
              {overallCompletionRate}%
              <Progress value={overallCompletionRate} className="w-16 h-2" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-8 border-cyan-200/80 bg-cyan-50/60 dark:bg-cyan-950/20 dark:border-cyan-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <CheckCircle2 className="h-5 w-5 text-cyan-600" />
            Pilotberedskap
          </CardTitle>
          <CardDescription>
            Snabb kontroll inför ett Skellefteå-liknande utvecklingspilot: roster, profiler, portal och testdata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PilotReadinessItem
              label="Roster"
              ready={team.members.length > 0}
              detail={`${team.members.length} spelare`}
            />
            <PilotReadinessItem
              label="Profiler"
              ready={rosterReady}
              detail={missingProfileCount === 0 ? 'Kompletta basfält' : `${missingProfileCount} behöver kompletteras`}
            />
            <PilotReadinessItem
              label="Atletportal"
              ready={athletePortalReady}
              detail={`${athleteAccountCount}/${team.members.length} konton`}
            />
            <PilotReadinessItem
              label="Testflöde"
              ready={hockeyTestCount > 0}
              detail={hockeyTestCount > 0 ? `${hockeyTestCount} hockeytester` : 'Kör första hockeytestet'}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mb-8">
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Users className="h-5 w-5" />
              Spelare ({team.members.length})
            </CardTitle>
            <CardDescription>
              Klicka på tröjnummer eller position för att redigera. Importera större listor via Excel/text/PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamRosterTable
              teamId={teamId}
              businessSlug={businessSlug}
              members={membersWithRosterStatus}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Calendar className="h-5 w-5" />
              Senaste lagpass
            </CardTitle>
            <CardDescription>Tilldelade pass de senaste 30 dagarna</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBroadcasts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inga lagpass har tilldelats ännu.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pass</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Genomfört</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBroadcasts.map((broadcast) => (
                    <TableRow key={broadcast.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getWorkoutTypeIcon(broadcast.workoutType)}
                          <span className="font-medium dark:text-slate-200">{broadcast.workoutName}</span>
                          {getWorkoutTypeBadge(broadcast.workoutType)}
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-slate-300">
                        {new Date(broadcast.assignedDate).toLocaleDateString('sv-SE')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm dark:text-slate-300">
                            {broadcast.totalCompleted}/{broadcast.totalAssigned}
                          </span>
                          <Badge
                            variant={broadcast.completionRate >= 80 ? 'default' : 'secondary'}
                            className="min-w-[48px] justify-center"
                          >
                            {broadcast.completionRate}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <TrendingUp className="h-5 w-5" />
              Spelarstatistik
            </CardTitle>
            <CardDescription>Genomförandegrad per spelare (30 dagar)</CardDescription>
          </CardHeader>
          <CardContent>
            {memberStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inga spelare i laget.
              </p>
            ) : (
              <div className="space-y-4">
                {memberStats.map((member) => (
                  <div key={member.athleteId} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate dark:text-slate-200">{member.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {member.completedCount}/{member.assignedCount}
                        </span>
                      </div>
                      <Progress value={member.completionRate} className="h-2" />
                    </div>
                    <div className="flex items-center gap-1 min-w-[60px] justify-end">
                      {member.completionRate >= 80 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : member.completionRate >= 50 ? (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      ) : null}
                      <span
                        className={`text-sm font-medium ${
                          member.completionRate >= 80
                            ? 'text-green-600'
                            : member.completionRate >= 50
                              ? 'text-yellow-600'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {member.completionRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <TeamLeaderboard teamId={teamId} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader>
            <CardTitle className="dark:text-white">Lagets analys</CardTitle>
            <CardDescription>
              Belastning, aktivitet och PRs per atlet — vem behöver uppmärksamhet idag?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${businessSlug}/coach/teams/${teamId}/analysis`}>
              <Button>Öppna lagets analys</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader>
            <CardTitle className="dark:text-white">Tester</CardTitle>
            <CardDescription>
              Logga ett testpass från en handskriven tabell — rader = atleter, kolumner = övningar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${businessSlug}/coach/teams/${teamId}/tests`}>
              <Button variant="outline">Öppna tester</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900/50 dark:border-white/10">
          <CardHeader>
            <CardTitle className="dark:text-white">Multivariat analys</CardTitle>
            <CardDescription>
              Hitta mönster med PCA och identifiera drivkrafter med PLS-regression
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${businessSlug}/coach/teams/${teamId}/multivariate`}>
              <Button variant="outline">Öppna multivariat analys</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
