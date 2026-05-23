import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

function formatEnum(value: string | null | undefined) {
  if (!value) return '-'
  return value.replace(/_/g, ' ').toLowerCase()
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export default async function TeamMedicalBoardPage({ params }: PageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!accessibleTeam) notFound()

  const now = new Date()
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      members: {
        orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          position: true,
          jerseyNumber: true,
          injuryAssessments: {
            where: {
              resolved: false,
              status: { in: ['ACTIVE', 'MONITORING'] },
            },
            orderBy: { date: 'desc' },
            take: 3,
            select: {
              id: true,
              injuryType: true,
              bodyPart: true,
              side: true,
              painLevel: true,
              phase: true,
              date: true,
            },
          },
          trainingRestrictions: {
            where: {
              isActive: true,
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
            take: 3,
            select: {
              id: true,
              type: true,
              severity: true,
              bodyParts: true,
              endDate: true,
              reason: true,
            },
          },
          rehabPrograms: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: {
              id: true,
              name: true,
              currentPhase: true,
              estimatedEndDate: true,
              _count: { select: { exercises: true, progressLogs: true } },
            },
          },
          acuteInjuryReports: {
            where: { status: { in: ['PENDING_REVIEW', 'REVIEWED', 'IN_TREATMENT'] } },
            orderBy: [{ urgency: 'asc' }, { reportDate: 'desc' }],
            take: 3,
            select: {
              id: true,
              bodyPart: true,
              urgency: true,
              status: true,
              incidentDate: true,
            },
          },
          dailyMetrics: {
            orderBy: { date: 'desc' },
            take: 1,
            select: {
              date: true,
              injuryPain: true,
              readinessLevel: true,
              physioContactReason: true,
              requestPhysioContact: true,
            },
          },
        },
      },
    },
  })

  if (!team) notFound()

  const rows = team.members.map((member) => {
    const latestCheckIn = member.dailyMetrics[0] ?? null
    const hasInjury = member.injuryAssessments.length > 0
    const hasRestriction = member.trainingRestrictions.length > 0
    const hasProgram = member.rehabPrograms.length > 0
    const hasPendingReport = member.acuteInjuryReports.some((report) => report.status === 'PENDING_REVIEW')
    const needsProgram = hasInjury && !hasProgram
    const isAvailable = !hasInjury && !hasRestriction && !hasPendingReport

    return {
      ...member,
      latestCheckIn,
      hasInjury,
      hasRestriction,
      hasProgram,
      hasPendingReport,
      needsProgram,
      isAvailable,
    }
  })

  const injuredCount = rows.filter((row) => row.hasInjury).length
  const restrictedCount = rows.filter((row) => row.hasRestriction).length
  const needsProgramCount = rows.filter((row) => row.needsProgram).length
  const rehabCount = rows.filter((row) => row.hasProgram).length
  const pendingReportsCount = rows.reduce(
    (sum, row) => sum + row.acuteInjuryReports.filter((report) => report.status === 'PENDING_REVIEW').length,
    0
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6">
        <Link href={`/${businessSlug}/coach/teams/${teamId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till laget
        </Link>
      </Button>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Medical board
            </h1>
          </div>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            {team.name}: skador, restriktioner, rehabstatus och spelare som behöver uppföljning.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${businessSlug}/coach/teams/${teamId}/calendar`}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Öppna lagkalender
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Skadade</p>
              <p className="text-3xl font-bold">{injuredCount}</p>
            </div>
            <HeartPulse className="h-7 w-7 text-red-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Restriktioner</p>
              <p className="text-3xl font-bold">{restrictedCount}</p>
            </div>
            <Ban className="h-7 w-7 text-orange-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Behöver program</p>
              <p className="text-3xl font-bold">{needsProgramCount}</p>
            </div>
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">I rehab</p>
              <p className="text-3xl font-bold">{rehabCount}</p>
            </div>
            <Stethoscope className="h-7 w-7 text-blue-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Nya rapporter</p>
              <p className="text-3xl font-bold">{pendingReportsCount}</p>
            </div>
            <ClipboardList className="h-7 w-7 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spelarstatus</CardTitle>
          <CardDescription>
            En enkel överblick för fys, huvudtränare och assisterande tränare innan pass tilldelas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spelare</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Skada / rapport</TableHead>
                <TableHead>Restriktion</TableHead>
                <TableHead>Rehab</TableHead>
                <TableHead>Senaste check-in</TableHead>
                <TableHead className="text-right">Åtgärd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const injury = row.injuryAssessments[0]
                const restriction = row.trainingRestrictions[0]
                const program = row.rehabPrograms[0]
                const report = row.acuteInjuryReports[0]

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.jerseyNumber ? `#${row.jerseyNumber} · ` : ''}
                            {row.position || row.email || '-'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {row.isAvailable && (
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Tillgänglig
                          </Badge>
                        )}
                        {row.hasInjury && <Badge variant="destructive">Skadad</Badge>}
                        {row.hasRestriction && (
                          <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300">
                            Restriktion
                          </Badge>
                        )}
                        {row.needsProgram && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                            Behöver program
                          </Badge>
                        )}
                        {row.hasProgram && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                            I rehab
                          </Badge>
                        )}
                        {row.hasPendingReport && (
                          <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                            Ny rapport
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {injury ? (
                        <div className="text-sm">
                          <p className="font-medium">{formatEnum(injury.injuryType || injury.bodyPart)}</p>
                          <p className="text-muted-foreground">
                            {formatEnum(injury.bodyPart)} · smärta {injury.painLevel}/10
                          </p>
                        </div>
                      ) : report ? (
                        <div className="text-sm">
                          <p className="font-medium">{formatEnum(report.bodyPart)}</p>
                          <p className="text-muted-foreground">
                            {formatEnum(report.urgency)} · {formatDate(report.incidentDate)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {restriction ? (
                        <div className="text-sm">
                          <p className="font-medium">{formatEnum(restriction.type)}</p>
                          <p className="text-muted-foreground">
                            {formatEnum(restriction.severity)}
                            {restriction.endDate ? ` · till ${formatDate(restriction.endDate)}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {program ? (
                        <div className="text-sm">
                          <p className="font-medium">{program.name}</p>
                          <p className="text-muted-foreground">
                            {formatEnum(program.currentPhase)} · {program._count.exercises} övningar
                          </p>
                        </div>
                      ) : row.needsProgram ? (
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-300">
                          Saknas
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.latestCheckIn ? (
                        <div className="text-sm">
                          <p>{formatDate(row.latestCheckIn.date)}</p>
                          <p className="text-muted-foreground">
                            Smärta {row.latestCheckIn.injuryPain ?? 0}/10
                            {row.latestCheckIn.requestPhysioContact ? ' · vill ha kontakt' : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${businessSlug}/coach/clients/${row.id}`}>
                          Öppna
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
