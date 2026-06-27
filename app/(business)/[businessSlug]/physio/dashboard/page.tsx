'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  Ban,
  ChevronRight,
  Clock,
  MessageSquare,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RolePageFrame,
  RolePageHeader,
  RolePanel,
  RoleStatCard,
} from '@/components/layouts/role-shell/RolePage'

interface DashboardStats {
  totalAthletes: number
  athletesWithActiveInjuries: number
  activeRehabPrograms: number
  pendingAcuteReports: number
  activeRestrictions: number
  unreadMessages: number
}

interface Athlete {
  id: string
  name: string
  email: string
  currentInjury: {
    injuryType: string
    bodyPart: string
    painLevel: number
  } | null
  stats?: {
    activeInjuries: number
    activeRestrictions: number
  }
}

interface AcuteReport {
  id: string
  client: { name: string }
  bodyPart: string
  urgency: string
  incidentDate: string
  status: string
}

interface AthletesResponse {
  athletes?: Athlete[]
  total?: number
}

interface AcuteReportsResponse {
  reports?: AcuteReport[]
}

interface CountResponse {
  total?: number
}

interface CareThreadsResponse {
  threads?: Array<{ unreadCount?: number | null }>
}

const urgencyColors: Record<string, string> = {
  EMERGENCY: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  URGENT: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  MODERATE: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-300',
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
}

const actionTileClass = 'h-20 flex-col gap-2 rounded-lg border-zinc-200 bg-white text-zinc-700 hover:scale-100 hover:bg-zinc-50 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-white/5'

export default function BusinessPhysioDashboardPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/physio`

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [acuteReports, setAcuteReports] = useState<AcuteReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const athletesRes = await fetch('/api/physio/athletes?hasActiveInjury=true&limit=5')
        if (athletesRes.ok) {
          const data = (await athletesRes.json()) as AthletesResponse
          setAthletes(data.athletes ?? [])
        }

        const reportsRes = await fetch('/api/injury/acute-report?status=PENDING_REVIEW&limit=5')
        let reportsData: AcuteReport[] = []
        if (reportsRes.ok) {
          const data = (await reportsRes.json()) as AcuteReportsResponse
          reportsData = data.reports ?? []
          setAcuteReports(reportsData)
        }

        const allAthletesRes = await fetch('/api/physio/athletes')
        const restrictionsRes = await fetch('/api/physio/restrictions?activeOnly=true')
        const programsRes = await fetch('/api/physio/rehab-programs?status=ACTIVE')
        const threadsRes = await fetch('/api/care-team/threads')

        const [allAthletes, restrictions, programs, threads]: [
          AthletesResponse,
          CountResponse,
          CountResponse,
          CareThreadsResponse,
        ] = await Promise.all([
          allAthletesRes.ok ? allAthletesRes.json() : { total: 0, athletes: [] },
          restrictionsRes.ok ? restrictionsRes.json() : { total: 0 },
          programsRes.ok ? programsRes.json() : { total: 0 },
          threadsRes.ok ? threadsRes.json() : { threads: [] },
        ])

        const unreadCount = threads.threads?.reduce(
          (sum, thread) => sum + (thread.unreadCount ?? 0),
          0
        ) ?? 0

        setStats({
          totalAthletes: allAthletes.total ?? 0,
          athletesWithActiveInjuries: allAthletes.athletes?.filter(
            (athlete) => (athlete.stats?.activeInjuries ?? 0) > 0
          ).length ?? 0,
          activeRehabPrograms: programs.total ?? 0,
          pendingAcuteReports: reportsData.length,
          activeRestrictions: restrictions.total ?? 0,
          unreadMessages: unreadCount,
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <RolePageFrame maxWidth="wide">
        <div className="space-y-6">
          <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
            <Skeleton className="h-3 w-28 bg-zinc-200/80 dark:bg-white/10" />
            <Skeleton className="mt-3 h-8 w-72 bg-zinc-200/80 dark:bg-white/10" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl bg-zinc-200/80 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 bg-zinc-200/80 dark:bg-white/10" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Skeleton className="h-96 bg-zinc-200/80 dark:bg-white/10" />
            <Skeleton className="h-96 bg-zinc-200/80 dark:bg-white/10" />
          </div>
        </div>
      </RolePageFrame>
    )
  }

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Care desk"
        title="Physio Dashboard"
        description="Manage acute reports, athlete care, restrictions, and rehab follow-up."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`${basePath}/acute-reports`}>
                <AlertTriangle className="h-4 w-4" />
                Acute reports
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`${basePath}/treatments/new`}>
                <Stethoscope className="h-4 w-4" />
                New treatment
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RoleStatCard
          icon={Users}
          tone="emerald"
          label="Total Athletes"
          value={stats?.totalAthletes ?? 0}
          description="Available in your care network"
        />
        <RoleStatCard
          icon={AlertTriangle}
          tone="red"
          label="Active Injuries"
          value={stats?.athletesWithActiveInjuries ?? 0}
          description="Currently flagged for follow-up"
        />
        <RoleStatCard
          icon={Activity}
          tone="blue"
          label="Active Rehab Programs"
          value={stats?.activeRehabPrograms ?? 0}
          description="Programs running right now"
        />
        <RoleStatCard
          icon={Ban}
          tone="amber"
          label="Active Restrictions"
          value={stats?.activeRestrictions ?? 0}
          description="Training limits still in effect"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RolePanel>
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-white/10">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Pending Acute Reports
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Injuries requiring your attention
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
              <Link href={`${basePath}/acute-reports`}>
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="p-5">
            {acuteReports.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <AlertTriangle className="mx-auto mb-4 h-10 w-10 opacity-50" />
                <p className="text-sm font-medium">No pending acute reports</p>
              </div>
            ) : (
              <div className="space-y-3">
                {acuteReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`${basePath}/acute-reports/${report.id}`}
                    className="group block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-red-200 hover:bg-red-50/40 dark:border-white/10 dark:bg-zinc-950/40 dark:hover:border-red-900/60 dark:hover:bg-red-950/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{report.client.name}</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{report.bodyPart}</p>
                      </div>
                      <Badge variant="outline" className={urgencyColors[report.urgency] ?? urgencyColors.LOW}>
                        {report.urgency}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(report.incidentDate).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </RolePanel>

        <RolePanel>
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-white/10">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                <Users className="h-5 w-5 text-emerald-500" />
                Athletes with Injuries
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Athletes currently in your care
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
              <Link href={`${basePath}/athletes`}>
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="p-5">
            {athletes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <Users className="mx-auto mb-4 h-10 w-10 opacity-50" />
                <p className="text-sm font-medium">No athletes with active injuries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {athletes.map((athlete) => (
                  <Link
                    key={athlete.id}
                    href={`${basePath}/athletes/${athlete.id}`}
                    className="group block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-white/10 dark:bg-zinc-950/40 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{athlete.name}</p>
                        {athlete.currentInjury && (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {athlete.currentInjury.injuryType} - {athlete.currentInjury.bodyPart}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        {(athlete.stats?.activeInjuries ?? 0) > 0 && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            {athlete.stats?.activeInjuries ?? 0} injury
                          </Badge>
                        )}
                        {(athlete.stats?.activeRestrictions ?? 0) > 0 && (
                          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                            {athlete.stats?.activeRestrictions ?? 0} restriction
                          </Badge>
                        )}
                      </div>
                    </div>
                    {athlete.currentInjury && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">Pain Level:</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500"
                            style={{ width: `${athlete.currentInjury.painLevel * 10}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {athlete.currentInjury.painLevel}/10
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </RolePanel>

        <RolePanel>
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <Button asChild variant="outline" className={`${actionTileClass} hover:border-emerald-200 dark:hover:border-emerald-900/60`}>
              <Link href={`${basePath}/treatments/new`}>
                <Stethoscope className="h-6 w-6 text-emerald-500" />
                <span className="text-sm font-medium">New Treatment</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className={`${actionTileClass} hover:border-blue-200 dark:hover:border-blue-900/60`}>
              <Link href={`${basePath}/rehab-programs/new`}>
                <Activity className="h-6 w-6 text-blue-500" />
                <span className="text-sm font-medium">New Rehab Program</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className={`${actionTileClass} hover:border-orange-200 dark:hover:border-orange-900/60`}>
              <Link href={`${basePath}/restrictions/new`}>
                <TrendingUp className="h-6 w-6 text-orange-500" />
                <span className="text-sm font-medium">New Restriction</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className={`${actionTileClass} hover:border-violet-200 dark:hover:border-violet-900/60`}>
              <Link href={`${basePath}/messages`}>
                <MessageSquare className="h-6 w-6 text-violet-500" />
                <span className="text-sm font-medium">Care Team Chat</span>
              </Link>
            </Button>
          </div>
        </RolePanel>

        {(stats?.unreadMessages ?? 0) > 0 && (
          <RolePanel className="border-violet-200 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/20">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-white text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-950 dark:text-zinc-50">Unread Messages</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    You have {stats?.unreadMessages} unread care team messages
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href={`${basePath}/messages`}>View Messages</Link>
              </Button>
            </div>
          </RolePanel>
        )}
      </div>
    </RolePageFrame>
  )
}
