'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  HeartPulse,
  AlertTriangle,
  MessageSquare,
  FileText,
  User,
  ExternalLink,
  Activity,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

export interface PTClientStatus {
  id: string
  name: string
  primarySport: string | null
  readinessScore: number | null
  readinessLevel: string | null
  recommendedAction: string | null
  acwr: number | null
  acwrZone: string | null
  completedWorkoutsThisWeek: number
  plannedWorkoutsThisWeek: number
  weeklyCompliancePercent: number | null
  injuryCount: number
  lastActivityDate: string | null
  lastActivitySource: 'program' | 'strava' | 'garmin' | null
  daysSinceLastActivity: number | null
  totalActivitiesThisWeek: number
  pendingFeedbackCount: number
  activeAlertCount: number
  highestAlertSeverity: string | null
  hasActiveProgram: boolean
  programName: string | null
  programEndDate: string | null
  hasStravaConnected: boolean
  hasGarminConnected: boolean
  engagementLevel: 'ACTIVE' | 'MODERATE' | 'INACTIVE' | 'NEW'
}

interface ClientStatusCardProps {
  client: PTClientStatus
  basePath: string
  onExpand?: (clientId: string) => void
}

function getUrgencyBorder(client: PTClientStatus): string {
  const { readinessScore, acwrZone, highestAlertSeverity, engagementLevel } = client
  if (
    (readinessScore !== null && readinessScore < 40) ||
    acwrZone === 'DANGER' || acwrZone === 'CRITICAL' ||
    highestAlertSeverity === 'CRITICAL' || highestAlertSeverity === 'HIGH'
  ) {
    return 'border-l-4 border-l-red-500'
  }
  if (
    (readinessScore !== null && readinessScore >= 40 && readinessScore < 60) ||
    acwrZone === 'CAUTION' ||
    highestAlertSeverity === 'MEDIUM'
  ) {
    return 'border-l-4 border-l-yellow-500'
  }
  if (engagementLevel === 'INACTIVE') {
    return 'border-l-4 border-l-slate-300 dark:border-l-slate-600'
  }
  return 'border-l-4 border-l-transparent'
}

function getReadinessColor(score: number | null): string {
  if (score === null) return 'bg-slate-300 dark:bg-slate-600'
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getAcwrBadgeColor(zone: string | null): string {
  switch (zone) {
    case 'OPTIMAL': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'CAUTION': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'DANGER': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default: return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  }
}

type ClientStatusCardTranslator = ReturnType<typeof useTranslations>

function formatLastActivity(days: number | null, t: ClientStatusCardTranslator): string {
  if (days === null) return '-'
  if (days === 0) return t('dates.today')
  if (days === 1) return t('dates.yesterday')
  if (days < 7) return t('dates.daysAgo', { days })
  return t('dates.weeksAgo', { weeks: Math.floor(days / 7) })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getEngagementDot(level: PTClientStatus['engagementLevel'], t: ClientStatusCardTranslator): { color: string; label: string } {
  switch (level) {
    case 'ACTIVE': return { color: 'bg-green-500', label: t('engagement.active') }
    case 'MODERATE': return { color: 'bg-yellow-500', label: t('engagement.moderate') }
    case 'INACTIVE': return { color: 'bg-red-500', label: t('engagement.inactive') }
    case 'NEW': return { color: 'bg-slate-400', label: t('engagement.new') }
  }
}

export function ClientStatusCard({ client, basePath, onExpand }: ClientStatusCardProps) {
  const t = useTranslations('components.clientStatusCard')
  const urgencyBorder = getUrgencyBorder(client)
  const engagementDot = getEngagementDot(client.engagementLevel, t)
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

  // Determine which metrics to show (only those with actual data)
  const hasReadiness = client.readinessScore !== null
  const hasAcwr = client.acwr !== null && client.acwrZone !== null
  const hasCompliance = client.plannedWorkoutsThisWeek > 0
  const hasInjuries = client.injuryCount > 0
  const hasWeeklyActivity = client.totalActivitiesThisWeek > 0
  const hasAnyMetric = hasReadiness || hasAcwr || hasCompliance || hasInjuries || hasWeeklyActivity

  return (
    <div className={cn(
      'rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow',
      urgencyBorder,
    )}>
      <div className="p-4 space-y-3">
        {/* Header: Avatar + Name + Sport + Engagement */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
              {getInitials(client.name)}
            </div>
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
              engagementDot.color,
            )} title={engagementDot.label} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate dark:text-slate-200">{client.name}</p>
            <div className="flex items-center gap-1.5">
              {client.primarySport && (
                <span className="text-[10px] text-muted-foreground">
                  {sportLabels[client.primarySport] || client.primarySport}
                </span>
              )}
              {/* Integration icons */}
              {client.hasStravaConnected && (
                <span className="text-[10px]" title="Strava">🟧</span>
              )}
              {client.hasGarminConnected && (
                <span className="text-[10px]" title="Garmin Connect">🔵</span>
              )}
            </div>
          </div>
          {/* Last activity with source */}
          <div className="text-right flex-shrink-0">
            <p className={cn(
              'text-xs font-medium',
              client.daysSinceLastActivity !== null && client.daysSinceLastActivity <= 1
                ? 'text-green-600 dark:text-green-400'
                : client.daysSinceLastActivity !== null && client.daysSinceLastActivity > 7
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
            )}>
              {formatLastActivity(client.daysSinceLastActivity, t)}
            </p>
            {client.lastActivitySource && client.lastActivitySource !== 'program' && (
              <p className="text-[10px] text-muted-foreground">
                {t('source.via', { source: client.lastActivitySource === 'strava' ? 'Strava' : 'Garmin Connect' })}
              </p>
            )}
          </div>
        </div>

        {/* Readiness bar — show when available */}
        {hasReadiness && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('metrics.readiness')}</span>
              <span className={cn(
                'font-semibold',
                client.readinessScore! >= 70
                  ? 'text-green-600 dark:text-green-400'
                  : client.readinessScore! >= 40
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              )}>
                {client.readinessScore}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={cn('h-full rounded-full transition-all', getReadinessColor(client.readinessScore))}
                style={{ width: `${Math.min(100, Math.max(0, client.readinessScore!))}%` }}
              />
            </div>
          </div>
        )}

        {/* Adaptive metrics — only show what has data */}
        {hasAnyMetric && (
          <div className="flex flex-wrap gap-2">
            {hasAcwr && (() => {
              const acwrBadgeColor = getAcwrBadgeColor(client.acwrZone)
              return (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">ACWR</span>
                  <Badge className={cn('text-[10px] font-medium', acwrBadgeColor)}>
                    {client.acwr!.toFixed(2)}
                  </Badge>
                </div>
              )
            })()}
            {hasWeeklyActivity && (
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium dark:text-slate-300">
                  {t('metrics.workouts', { count: client.totalActivitiesThisWeek })}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('metrics.thisWeek')}</span>
              </div>
            )}
            {hasCompliance && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{t('metrics.compliance')}</span>
                <span className="text-xs font-semibold dark:text-slate-200">
                  {client.completedWorkoutsThisWeek}/{client.plannedWorkoutsThisWeek}
                </span>
              </div>
            )}
            {hasInjuries && (
              <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                <HeartPulse className="h-3 w-3 mr-0.5" />
                {t('badges.injuries', { count: client.injuryCount })}
              </Badge>
            )}
          </div>
        )}

        {/* Empty state for NEW athletes */}
        {!hasAnyMetric && client.engagementLevel === 'NEW' && (
          <div className="py-1">
            <p className="text-xs text-muted-foreground italic">
              {t('empty.newAthlete')}
            </p>
          </div>
        )}

        {/* Empty state for INACTIVE athletes without metrics */}
        {!hasAnyMetric && client.engagementLevel === 'INACTIVE' && (
          <div className="py-1">
            <p className="text-xs text-red-500 dark:text-red-400">
              {client.daysSinceLastActivity
                ? t('empty.inactiveWithDays', { days: client.daysSinceLastActivity })
                : t('empty.inactiveNoActivity')}
            </p>
          </div>
        )}

        {/* Status badges row */}
        <div className="flex flex-wrap gap-1.5">
          {client.activeAlertCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {t('badges.alerts', { count: client.activeAlertCount })}
            </Badge>
          )}
          {client.pendingFeedbackCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <MessageSquare className="h-3 w-3 mr-0.5" />
              {t('badges.feedback', { count: client.pendingFeedbackCount })}
            </Badge>
          )}
          {client.hasActiveProgram && client.programName && (
            <Badge variant="outline" className="text-[10px] h-5 text-slate-600 dark:text-slate-400">
              <FileText className="h-3 w-3 mr-0.5" />
              {client.programName.length > 20 ? client.programName.slice(0, 20) + '...' : client.programName}
            </Badge>
          )}
        </div>

        {/* Quick actions — contextual */}
        <div className="flex gap-2 pt-1">
          <Link href={`${basePath}/coach/clients/${client.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs h-7">
              <User className="h-3 w-3 mr-1" />
              {t('actions.viewProfile')}
            </Button>
          </Link>
          {client.pendingFeedbackCount > 0 && (
            <Link href={`${basePath}/coach/athletes/${client.id}/logs`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-7 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <MessageSquare className="h-3 w-3 mr-1" />
                {t('actions.giveFeedback')}
              </Button>
            </Link>
          )}
          {client.engagementLevel === 'NEW' && !client.hasActiveProgram && (
            <Link href={`${basePath}/coach/clients/${client.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-7 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20">
                <UserPlus className="h-3 w-3 mr-1" />
                {t('actions.getStarted')}
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onExpand?.(client.id)}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
