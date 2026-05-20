'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Heart,
  AlertTriangle,
  Moon,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  HeartPulse,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'
import type { PTClientStatus } from '@/components/coach/dashboard/ClientStatusCard'

// --- Types ---

interface DailyMetric {
  date: string
  hrvRMSSD: number | null
  hrvStatus: string | null
  hrvTrend: string | null
  restingHR: number | null
  restingHRStatus: string | null
  sleepQuality: number | null
  sleepHours: number | null
  readinessScore: number | null
  readinessLevel: string | null
  energyLevel: number | null
  mood: number | null
  stress: number | null
  muscleSoreness: number | null
}

interface WeeklySummary {
  weekStart: string
  weekNumber: number
  totalDistance: number
  totalDuration: number
  totalTSS: number
  workoutCount: number
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
  zone4Minutes: number
  zone5Minutes: number
  polarizationRatio: number | null
  acwrAtWeekEnd: number | null
}

interface RecentActivity {
  id: string
  source: 'strava' | 'garmin'
  name: string
  type: string
  startDate: string
  distance: number | null
  duration: number | null
  avgHR: number | null
  maxHR: number | null
  avgSpeed: number | null
  avgCadence: number | null
  avgWatts: number | null
  elevationGain: number | null
}

interface Alert {
  id: string
  alertType: string
  severity: string
  title: string
  message: string
  createdAt: string
}

interface Injury {
  id: string
  bodyPart: string | null
  side: string | null
  painLevel: number
  phase: string | null
  status: string
}

interface ClientDetailData {
  clientId: string
  name: string
  primarySport: string | null
  dailyMetrics: DailyMetric[]
  weeklySummaries: WeeklySummary[]
  currentZoneDistribution: {
    zone1Minutes: number
    zone2Minutes: number
    zone3Minutes: number
    zone4Minutes: number
    zone5Minutes: number
    totalMinutes: number
    polarizationRatio: number | null
  } | null
  recentActivities: RecentActivity[]
  alerts: Alert[]
  injuries: Injury[]
}

// --- Helpers ---

type SportCategory = 'endurance' | 'power_endurance' | 'strength' | 'team' | 'mixed'

function getSportCategory(sport: string | null): SportCategory {
  switch (sport) {
    case 'RUNNING':
    case 'SKIING':
    case 'SWIMMING':
    case 'TRIATHLON':
      return 'endurance'
    case 'CYCLING':
      return 'power_endurance'
    case 'STRENGTH':
    case 'FUNCTIONAL_FITNESS':
      return 'strength'
    case 'FOOTBALL':
    case 'ICE_HOCKEY':
    case 'HANDBALL':
    case 'FLOORBALL':
    case 'BASKETBALL':
    case 'VOLLEYBALL':
      return 'team'
    default:
      return 'mixed'
  }
}

const zoneColors = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444']

function formatPace(speedMs: number | null): string {
  if (!speedMs || speedMs <= 0) return '-'
  const paceSeconds = 1000 / speedMs
  const mins = Math.floor(paceSeconds / 60)
  const secs = Math.round(paceSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}/km`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDistance(meters: number | null): string {
  if (!meters) return '-'
  const km = meters / 1000
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'short' })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

// --- Sparkline Component ---

function Sparkline({ data, dataKey, emptyText, color = '#3b82f6', height = 40 }: {
  data: unknown[]
  dataKey: string
  emptyText: string
  color?: string
  height?: number
}) {
  const filtered = data.filter((d): d is Record<string, unknown> => {
    if (typeof d !== 'object' || d === null) return false
    return (d as Record<string, unknown>)[dataKey] != null
  })
  if (filtered.length < 2) return <span className="text-xs text-muted-foreground italic">{emptyText}</span>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={filtered} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={1.5} dot={false} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// --- Zone Distribution Bar ---

type AthleteDetailTranslator = ReturnType<typeof useTranslations>

function ZoneBar({ zones, totalMinutes, t }: {
  zones: { zone1Minutes: number; zone2Minutes: number; zone3Minutes: number; zone4Minutes: number; zone5Minutes: number }
  totalMinutes: number
  t: AthleteDetailTranslator
}) {
  if (totalMinutes === 0) return <span className="text-xs text-muted-foreground italic">{t('empty.noZoneData')}</span>
  const values = [zones.zone1Minutes, zones.zone2Minutes, zones.zone3Minutes, zones.zone4Minutes, zones.zone5Minutes]
  const zoneLabels = [
    t('zones.zone1'),
    t('zones.zone2'),
    t('zones.zone3'),
    t('zones.zone4'),
    t('zones.zone5'),
  ]
  return (
    <div className="space-y-1.5">
      <div className="flex h-3 rounded-full overflow-hidden">
        {values.map((v, i) => (
          v > 0 && (
            <div
              key={i}
              className="h-full"
              style={{ width: `${(v / totalMinutes) * 100}%`, backgroundColor: zoneColors[i] }}
              title={`${zoneLabels[i]}: ${v}m (${Math.round((v / totalMinutes) * 100)}%)`}
            />
          )
        ))}
      </div>
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        {values.map((v, i) => (
          v > 0 && (
            <span key={i} className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zoneColors[i] }} />
              {zoneLabels[i]} {v}m
            </span>
          )
        ))}
      </div>
    </div>
  )
}

// --- Main Component ---

interface AthleteDetailSheetProps {
  clientId: string | null
  clientSummary: PTClientStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
  basePath: string
}

export function AthleteDetailSheet({ clientId, clientSummary, open, onOpenChange, basePath: _basePath }: AthleteDetailSheetProps) {
  const t = useTranslations('components.athleteDetailSheet')
  const locale = useLocale()
  const [data, setData] = useState<ClientDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef(new Map<string, ClientDetailData>())
  const sportLabels: Record<string, string> = {
    RUNNING: t('sports.running'),
    CYCLING: t('sports.cycling'),
    SKIING: t('sports.skiing'),
    SWIMMING: t('sports.swimming'),
    TRIATHLON: t('sports.triathlon'),
    HYROX: t('sports.hyrox'),
    GENERAL_FITNESS: t('sports.generalFitness'),
    FUNCTIONAL_FITNESS: t('sports.functionalFitness'),
    STRENGTH: t('sports.strength'),
    FOOTBALL: t('sports.football'),
    ICE_HOCKEY: t('sports.iceHockey'),
    HANDBALL: t('sports.handball'),
    FLOORBALL: t('sports.floorball'),
    BASKETBALL: t('sports.basketball'),
    VOLLEYBALL: t('sports.volleyball'),
    TENNIS: t('sports.tennis'),
    PADEL: t('sports.padel'),
  }

  useEffect(() => {
    if (!clientId || !open) return

    // Check cache
    const cached = cacheRef.current.get(clientId)
    if (cached) {
      setData(cached)
      return
    }

    setLoading(true)
    setData(null)

    const controller = new AbortController()
    fetch(`/api/coach/client-detail?clientId=${clientId}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(result => {
        if (result) {
          cacheRef.current.set(clientId, result)
          setData(result)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [clientId, open])

  const sportCategory = getSportCategory(data?.primarySport ?? clientSummary?.primarySport ?? null)
  const alertCount = (data?.alerts.length ?? 0) + (data?.injuries.length ?? 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
              {getInitials(clientSummary?.name || data?.name || '?')}
            </div>
            <div>
              <SheetTitle className="text-lg">{clientSummary?.name || data?.name}</SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {(data?.primarySport || clientSummary?.primarySport) && (
                  <span>{sportLabels[data?.primarySport || clientSummary?.primarySport || ''] || data?.primarySport}</span>
                )}
                {clientSummary?.hasStravaConnected && <span title="Strava">🟧</span>}
                {clientSummary?.hasGarminConnected && <span title="Garmin">🔵</span>}
              </div>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">{t('errors.loadData')}</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="pt-2">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview" className="text-xs">{t('tabs.overview')}</TabsTrigger>
              <TabsTrigger value="health" className="text-xs">{t('tabs.health')}</TabsTrigger>
              <TabsTrigger value="training" className="text-xs">{t('tabs.training')}</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs relative">
                {t('tabs.alerts')}
                {alertCount > 0 && (
                  <Badge className="ml-1 h-4 px-1 text-[10px] bg-red-500 text-white">{alertCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* === ÖVERSIKT === */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Readiness */}
              <MetricRow
                icon={<Zap className="h-4 w-4 text-yellow-500" />}
                label={t('metrics.readiness')}
                value={data.dailyMetrics.length > 0 ? data.dailyMetrics[data.dailyMetrics.length - 1]?.readinessScore?.toFixed(1) ?? '-' : '-'}
                suffix="/10"
              >
                <Sparkline data={data.dailyMetrics} dataKey="readinessScore" emptyText={t('empty.insufficientData')} color="#eab308" />
              </MetricRow>

              {/* HRV */}
              <MetricRow
                icon={<HeartPulse className="h-4 w-4 text-purple-500" />}
                label="HRV"
                value={data.dailyMetrics.length > 0 ? data.dailyMetrics[data.dailyMetrics.length - 1]?.hrvRMSSD?.toFixed(0) ?? '-' : '-'}
                suffix="ms"
                trend={data.dailyMetrics.length > 0 ? data.dailyMetrics[data.dailyMetrics.length - 1]?.hrvTrend ?? null : null}
              >
                <Sparkline data={data.dailyMetrics} dataKey="hrvRMSSD" emptyText={t('empty.insufficientData')} color="#a855f7" />
              </MetricRow>

              {/* Resting HR */}
              <MetricRow
                icon={<Heart className="h-4 w-4 text-red-500" />}
                label={t('metrics.restingHr')}
                value={data.dailyMetrics.length > 0 ? data.dailyMetrics[data.dailyMetrics.length - 1]?.restingHR?.toFixed(0) ?? '-' : '-'}
                suffix="bpm"
              >
                <Sparkline data={data.dailyMetrics} dataKey="restingHR" emptyText={t('empty.insufficientData')} color="#ef4444" />
              </MetricRow>

              {/* Sleep */}
              <MetricRow
                icon={<Moon className="h-4 w-4 text-blue-500" />}
                label={t('metrics.sleep')}
                value={data.dailyMetrics.length > 0 ? data.dailyMetrics[data.dailyMetrics.length - 1]?.sleepHours?.toFixed(1) ?? '-' : '-'}
                suffix="h"
              >
                <Sparkline data={data.dailyMetrics} dataKey="sleepHours" emptyText={t('empty.insufficientData')} color="#3b82f6" />
              </MetricRow>

              {/* Zone Distribution */}
              {sportCategory !== 'strength' && data.currentZoneDistribution && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('sections.trainingZonesThisWeek')}</p>
                  <ZoneBar
                    zones={data.currentZoneDistribution}
                    totalMinutes={data.currentZoneDistribution.totalMinutes}
                    t={t}
                  />
                </div>
              )}

              {/* Last 3 activities */}
              {data.recentActivities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('sections.recentActivities')}</p>
                  {data.recentActivities.slice(0, 3).map(a => (
                    <ActivityRow key={a.id} activity={a} sportCategory={sportCategory} locale={locale} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* === HÄLSA === */}
            <TabsContent value="health" className="space-y-5 mt-4">
              {data.dailyMetrics.length === 0 ? (
                <EmptyState text={t('empty.noHealthData')} />
              ) : (
                <>
                  <ChartSection label="HRV (RMSSD)" color="#a855f7" data={data.dailyMetrics} dataKey="hrvRMSSD" unit="ms" locale={locale} />
                  <ChartSection label={t('metrics.restingHr')} color="#ef4444" data={data.dailyMetrics} dataKey="restingHR" unit="bpm" locale={locale} />
                  <ChartSection label={t('metrics.sleepHours')} color="#3b82f6" data={data.dailyMetrics} dataKey="sleepHours" unit="h" locale={locale} />
                  <ChartSection label={t('metrics.sleepQuality')} color="#6366f1" data={data.dailyMetrics} dataKey="sleepQuality" unit="/10" locale={locale} />

                  {/* Wellness grid */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t('sections.wellbeing')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <WellnessItem label={t('metrics.energy')} data={data.dailyMetrics} dataKey="energyLevel" color="#22c55e" emptyText={t('empty.insufficientData')} />
                      <WellnessItem label={t('metrics.mood')} data={data.dailyMetrics} dataKey="mood" color="#eab308" emptyText={t('empty.insufficientData')} />
                      <WellnessItem label="Stress" data={data.dailyMetrics} dataKey="stress" color="#f97316" emptyText={t('empty.insufficientData')} inverted />
                      <WellnessItem label={t('metrics.muscleSoreness')} data={data.dailyMetrics} dataKey="muscleSoreness" color="#ef4444" emptyText={t('empty.insufficientData')} inverted />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* === TRÄNING === */}
            <TabsContent value="training" className="space-y-5 mt-4">
              {/* Sport-specific content */}
              {sportCategory !== 'strength' && data.currentZoneDistribution && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('sections.trainingZonesThisWeek')}</p>
                  <ZoneBar zones={data.currentZoneDistribution} totalMinutes={data.currentZoneDistribution.totalMinutes} t={t} />
                  {data.currentZoneDistribution.polarizationRatio !== null && (
                    <p className="text-xs text-muted-foreground">
                      {t('polarization.label', { percent: (data.currentZoneDistribution.polarizationRatio * 100).toFixed(0) })}
                      {data.currentZoneDistribution.polarizationRatio >= 0.75
                        ? t('polarization.good')
                        : data.currentZoneDistribution.polarizationRatio >= 0.6
                          ? t('polarization.ok')
                          : t('polarization.tooIntense')}
                    </p>
                  )}
                </div>
              )}

              {/* Weekly volume — endurance/power sports get distance, others get session count */}
              {data.weeklySummaries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {sportCategory === 'endurance' || sportCategory === 'power_endurance'
                      ? t('sections.weeklyVolumeDistance')
                      : t('sections.weeklyVolumeWorkouts')}
                  </p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={data.weeklySummaries} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <XAxis dataKey="weekNumber" tickFormatter={v => `v${v}`} tick={{ fontSize: 10 }} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: number) =>
                          sportCategory === 'endurance' || sportCategory === 'power_endurance'
                            ? [`${value.toFixed(1)} km`, t('tooltip.distance')]
                            : [`${value}`, t('tooltip.workouts')]
                        }
                        labelFormatter={l => t('tooltip.week', { week: l })}
                      />
                      <Bar
                        dataKey={sportCategory === 'endurance' || sportCategory === 'power_endurance' ? 'totalDistance' : 'workoutCount'}
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Endurance-specific: pace trend */}
              {(sportCategory === 'endurance') && data.recentActivities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('sections.paceTrend')}</p>
                  <div className="space-y-1">
                    {data.recentActivities
                      .filter(a => a.avgSpeed && a.distance && a.distance > 1000)
                      .slice(0, 5)
                      .map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-white/5">
                          <span className="text-muted-foreground">{formatDate(a.startDate, locale)}</span>
                          <span className="font-medium">{formatPace(a.avgSpeed)}</span>
                          <span className="text-muted-foreground">{formatDistance(a.distance)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Power-specific: watts trend */}
              {sportCategory === 'power_endurance' && data.recentActivities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('sections.powerTrend')}</p>
                  <div className="space-y-1">
                    {data.recentActivities
                      .filter(a => a.avgWatts)
                      .slice(0, 5)
                      .map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-white/5">
                          <span className="text-muted-foreground">{formatDate(a.startDate, locale)}</span>
                          <span className="font-medium">{a.avgWatts}W</span>
                          <span className="text-muted-foreground">{formatDistance(a.distance)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Strength-specific: session count + wellness */}
              {sportCategory === 'strength' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('sections.completedWorkouts')}</p>
                  {data.weeklySummaries.length > 0 ? (
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={data.weeklySummaries} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <XAxis dataKey="weekNumber" tickFormatter={v => `v${v}`} tick={{ fontSize: 10 }} />
                        <YAxis hide />
                        <Bar dataKey="workoutCount" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text={t('empty.noTrainingData')} />
                  )}
                </div>
              )}

              {/* All activities list */}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('sections.activities')}</p>
                {data.recentActivities.length === 0 ? (
                  <EmptyState text={t('empty.noActivities')} />
                ) : (
                  data.recentActivities.map(a => (
                    <ActivityRow key={a.id} activity={a} sportCategory={sportCategory} locale={locale} />
                  ))
                )}
              </div>
            </TabsContent>

            {/* === VARNINGAR === */}
            <TabsContent value="alerts" className="space-y-4 mt-4">
              {data.alerts.length === 0 && data.injuries.length === 0 ? (
                <EmptyState text={t('empty.noActiveAlerts')} />
              ) : (
                <>
                  {data.alerts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('sections.alerts')}</p>
                      {data.alerts.map(alert => (
                        <div key={alert.id} className="p-3 rounded-lg border border-slate-200 dark:border-white/10 space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-sm font-medium">{alert.title}</span>
                            <Badge className={cn('text-[10px]', severityColors[alert.severity] || severityColors.LOW)}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(alert.createdAt, locale)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {data.injuries.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('sections.activeInjuries')}</p>
                      {data.injuries.map(injury => (
                        <div key={injury.id} className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10">
                          <HeartPulse className="h-4 w-4 text-red-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {injury.bodyPart || t('injuries.unknown')}{injury.side ? ` (${t(injury.side === 'LEFT' ? 'injuries.left' : injury.side === 'RIGHT' ? 'injuries.right' : 'injuries.both')})` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('injuries.pain', { pain: injury.painLevel })}{injury.phase ? ` • ${t('injuries.phase', { phase: injury.phase })}` : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{injury.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}

// --- Sub-components ---

function MetricRow({ icon, label, value, suffix, trend, children }: {
  icon: React.ReactNode
  label: string
  value: string
  suffix?: string
  trend?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-24">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-lg font-bold">{value}</span>
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
          {trend && (
            trend === 'IMPROVING' ? <TrendingUp className="h-3 w-3 text-green-500" /> :
            trend === 'DECLINING' ? <TrendingDown className="h-3 w-3 text-red-500" /> :
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ChartSection({ label, color, data, dataKey, unit, locale }: {
  label: string
  color: string
  data: DailyMetric[]
  dataKey: keyof DailyMetric
  unit: string
  locale: string
}) {
  const filtered = data.filter(d => d[dataKey] != null)
  if (filtered.length < 2) return null

  const latest = filtered[filtered.length - 1]?.[dataKey]

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm font-bold">{typeof latest === 'number' ? latest.toFixed(1) : '-'} {unit}</p>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={filtered} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={`chart-${dataKey as string}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickFormatter={v => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}` }} tick={{ fontSize: 9 }} />
          <YAxis hide />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)} ${unit}`, label]}
            labelFormatter={l => formatDate(l as string, locale)}
          />
          <Area type="monotone" dataKey={dataKey as string} stroke={color} fill={`url(#chart-${dataKey as string})`} strokeWidth={1.5} dot={false} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function WellnessItem({ label, data, dataKey, color, emptyText, inverted }: {
  label: string
  data: DailyMetric[]
  dataKey: keyof DailyMetric
  color: string
  emptyText: string
  inverted?: boolean
}) {
  const filtered = data.filter(d => d[dataKey] != null)
  const latest = filtered.length > 0 ? filtered[filtered.length - 1]?.[dataKey] : null

  return (
    <div className="p-2 rounded-lg bg-muted/30 dark:bg-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('text-sm font-bold', inverted
          ? (typeof latest === 'number' && latest > 6 ? 'text-red-500' : 'text-green-500')
          : (typeof latest === 'number' && latest >= 7 ? 'text-green-500' : typeof latest === 'number' && latest >= 4 ? 'text-yellow-500' : 'text-red-500')
        )}>
          {typeof latest === 'number' ? latest : '-'}/10
        </span>
      </div>
      <Sparkline data={filtered} dataKey={dataKey as string} emptyText={emptyText} color={color} height={30} />
    </div>
  )
}

function ActivityRow({ activity: a, sportCategory, locale }: { activity: RecentActivity; sportCategory: SportCategory; locale: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className="flex-shrink-0">
        <span className="text-[10px]">{a.source === 'strava' ? '🟧' : '🔵'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{a.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatDate(a.startDate, locale)}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-right flex-shrink-0">
        {a.distance && a.distance > 100 && (
          <span>{formatDistance(a.distance)}</span>
        )}
        {(sportCategory === 'endurance') && a.avgSpeed && a.avgSpeed > 0 && (
          <span className="text-muted-foreground">{formatPace(a.avgSpeed)}</span>
        )}
        {sportCategory === 'power_endurance' && a.avgWatts && (
          <span className="text-muted-foreground">{a.avgWatts}W</span>
        )}
        {a.duration && (
          <span className="text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {formatDuration(a.duration)}
          </span>
        )}
        {a.avgHR && (
          <span className="text-muted-foreground flex items-center gap-0.5">
            <Heart className="h-3 w-3" />
            {a.avgHR}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-6 text-muted-foreground">
      <p className="text-sm italic">{text}</p>
    </div>
  )
}
