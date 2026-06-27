import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
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
import { getLocale, getTranslations } from '@/i18n/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RolePageFrame, RolePageHeader, RolePanel, RoleStatCard } from '@/components/layouts/role-shell/RolePage'
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

function formatDate(date: Date | string | null | undefined, dateLocale: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
}

export default async function TeamMedicalBoardPage({ params }: PageProps) {
  const { businessSlug, teamId } = await params
  const t = await getTranslations('coach.pages.teamMedical')
  const locale = await getLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
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
    <RolePageFrame>
      <RolePageHeader
        eyebrow={team.name}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldAlert className="h-5 w-5" />
            </span>
            {t('title')}
          </span>
        )}
        description={t('description', { teamName: team.name })}
        actions={(
          <Button asChild>
            <Link href={`/${businessSlug}/coach/teams/${teamId}/calendar`}>
              <ClipboardList className="mr-2 h-4 w-4" />
              {t('openTeamCalendar')}
            </Link>
          </Button>
        )}
      />

      <div className="mb-8 grid gap-4 md:grid-cols-5">
        <RoleStatCard label={t('stats.injured')} value={injuredCount} icon={HeartPulse} tone="red" />
        <RoleStatCard label={t('stats.restrictions')} value={restrictedCount} icon={Ban} tone="amber" />
        <RoleStatCard label={t('stats.needsProgram')} value={needsProgramCount} icon={AlertTriangle} tone="amber" />
        <RoleStatCard label={t('stats.inRehab')} value={rehabCount} icon={Stethoscope} tone="blue" />
        <RoleStatCard label={t('stats.newReports')} value={pendingReportsCount} icon={ClipboardList} tone="violet" />
      </div>

      <RolePanel className="overflow-hidden">
        <div className="border-b border-zinc-200 p-5 dark:border-white/10 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('table.title')}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t('table.description')}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.headers.player')}</TableHead>
                <TableHead>{t('table.headers.status')}</TableHead>
                <TableHead>{t('table.headers.injury')}</TableHead>
                <TableHead>{t('table.headers.restriction')}</TableHead>
                <TableHead>{t('table.headers.rehab')}</TableHead>
                <TableHead>{t('table.headers.latestCheckIn')}</TableHead>
                <TableHead className="text-right">{t('table.headers.action')}</TableHead>
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
                            {t('badges.available')}
                          </Badge>
                        )}
                        {row.hasInjury && <Badge variant="destructive">{t('badges.injured')}</Badge>}
                        {row.hasRestriction && (
                          <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300">
                            {t('badges.restriction')}
                          </Badge>
                        )}
                        {row.needsProgram && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                            {t('badges.needsProgram')}
                          </Badge>
                        )}
                        {row.hasProgram && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                            {t('badges.inRehab')}
                          </Badge>
                        )}
                        {row.hasPendingReport && (
                          <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                            {t('badges.newReport')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {injury ? (
                        <div className="text-sm">
                          <p className="font-medium">{formatEnum(injury.injuryType || injury.bodyPart)}</p>
                          <p className="text-muted-foreground">
                            {formatEnum(injury.bodyPart)} · {t('labels.pain')} {injury.painLevel}/10
                          </p>
                        </div>
                      ) : report ? (
                        <div className="text-sm">
                          <p className="font-medium">{formatEnum(report.bodyPart)}</p>
                          <p className="text-muted-foreground">
                            {formatEnum(report.urgency)} · {formatDate(report.incidentDate, dateLocale)}
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
                            {restriction.endDate ? ` · ${t('labels.until')} ${formatDate(restriction.endDate, dateLocale)}` : ''}
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
                            {formatEnum(program.currentPhase)} · {t('labels.exercises', { count: program._count.exercises })}
                          </p>
                        </div>
                      ) : row.needsProgram ? (
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-300">
                          {t('labels.missing')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.latestCheckIn ? (
                        <div className="text-sm">
                          <p>{formatDate(row.latestCheckIn.date, dateLocale)}</p>
                          <p className="text-muted-foreground">
                            {t('labels.pain')} {row.latestCheckIn.injuryPain ?? 0}/10
                            {row.latestCheckIn.requestPhysioContact ? ` · ${t('labels.wantsContact')}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${businessSlug}/coach/clients/${row.id}`}>
                          {t('actions.open')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </RolePanel>
    </RolePageFrame>
  )
}
