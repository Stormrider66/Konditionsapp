// app/coach/teams/[teamId]/page.tsx
/**
 * Team Dashboard Page
 *
 * Shows team overview with:
 * - Team header (name, sport, member count)
 * - Quick assign workout button
 * - Recent broadcasts with completion stats
 * - Member performance grid
 */

import { notFound, redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
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
import { TeamDashboardClient } from './TeamDashboardClient'

interface TeamPageProps {
  params: Promise<{
    teamId: string
  }>
}

// Sport type labels in Swedish
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

export default async function TeamDashboardPage({ params }: TeamPageProps) {
  const user = await requireCoach()
  const { teamId } = await params

  // Verify team ownership
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      userId: user.id,
    },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
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
      // Count strength assignments
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

      // Count cardio assignments
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

      // Count hybrid assignments
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

  // Sort by completion rate
  memberStats.sort((a, b) => b.completionRate - a.completionRate)

  // Calculate overall stats
  const totalWorkoutsAssigned = memberStats.reduce((sum, m) => sum + m.assignedCount, 0)
  const totalWorkoutsCompleted = memberStats.reduce((sum, m) => sum + m.completedCount, 0)
  const overallCompletionRate =
    totalWorkoutsAssigned > 0
      ? Math.round((totalWorkoutsCompleted / totalWorkoutsAssigned) * 100)
      : 0

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
      {/* Back button */}
      <Link href="/teams">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till lag
        </Button>
      </Link>

      {/* Team Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{team.name}</h1>
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

        {/* Client component for assign button */}
        <TeamDashboardClient teamId={teamId} teamName={team.name} />
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spelare</CardDescription>
            <CardTitle className="text-2xl">{team.members.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tilldelade pass (30 dagar)</CardDescription>
            <CardTitle className="text-2xl">{totalWorkoutsAssigned}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Genomförda pass</CardDescription>
            <CardTitle className="text-2xl">{totalWorkoutsCompleted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Genomförandegrad</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {overallCompletionRate}%
              <Progress value={overallCompletionRate} className="w-16 h-2" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Broadcasts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                          <span className="font-medium">{broadcast.workoutName}</span>
                          {getWorkoutTypeBadge(broadcast.workoutType)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(broadcast.assignedDate).toLocaleDateString('sv-SE')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm">
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

        {/* Member Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                        <span className="font-medium truncate">{member.name}</span>
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
    </div>
  )
}
