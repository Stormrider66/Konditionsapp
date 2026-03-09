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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  daysSinceLastActivity: number | null
  pendingFeedbackCount: number
  activeAlertCount: number
  highestAlertSeverity: string | null
  hasActiveProgram: boolean
  programName: string | null
  programEndDate: string | null
}

interface ClientStatusCardProps {
  client: PTClientStatus
  basePath: string
}

function getUrgencyBorder(client: PTClientStatus): string {
  const { readinessScore, acwrZone, highestAlertSeverity } = client
  // Red
  if (
    (readinessScore !== null && readinessScore < 40) ||
    acwrZone === 'DANGER' || acwrZone === 'CRITICAL' ||
    highestAlertSeverity === 'CRITICAL' || highestAlertSeverity === 'HIGH'
  ) {
    return 'border-l-4 border-l-red-500'
  }
  // Yellow
  if (
    (readinessScore !== null && readinessScore >= 40 && readinessScore < 60) ||
    acwrZone === 'CAUTION' ||
    highestAlertSeverity === 'MEDIUM'
  ) {
    return 'border-l-4 border-l-yellow-500'
  }
  return 'border-l-4 border-l-transparent'
}

function getReadinessColor(score: number | null): string {
  if (score === null) return 'bg-slate-300 dark:bg-slate-600'
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getAcwrBadge(zone: string | null): { color: string; label: string } {
  switch (zone) {
    case 'OPTIMAL': return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Optimal' }
    case 'CAUTION': return { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Varning' }
    case 'DANGER': return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Fara' }
    case 'CRITICAL': return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Kritisk' }
    default: return { color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', label: '-' }
  }
}

function formatLastActivity(days: number | null): string {
  if (days === null) return '-'
  if (days === 0) return 'Idag'
  if (days === 1) return 'Igår'
  if (days < 7) return `${days}d sedan`
  return `${Math.floor(days / 7)}v sedan`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const sportLabels: Record<string, string> = {
  RUNNING: 'Löpning',
  CYCLING: 'Cykling',
  SKIING: 'Skidor',
  SWIMMING: 'Simning',
  TRIATHLON: 'Triathlon',
  HYROX: 'HYROX',
  GENERAL_FITNESS: 'Fitness',
  FUNCTIONAL_FITNESS: 'Funktionell',
  STRENGTH: 'Styrka',
  FOOTBALL: 'Fotboll',
  ICE_HOCKEY: 'Hockey',
  HANDBALL: 'Handboll',
  FLOORBALL: 'Innebandy',
  BASKETBALL: 'Basket',
  VOLLEYBALL: 'Volleyboll',
  TENNIS: 'Tennis',
  PADEL: 'Padel',
}

export function ClientStatusCard({ client, basePath }: ClientStatusCardProps) {
  const urgencyBorder = getUrgencyBorder(client)
  const acwrBadge = getAcwrBadge(client.acwrZone)
  const compliancePct = client.weeklyCompliancePercent ?? (
    client.plannedWorkoutsThisWeek > 0
      ? Math.round((client.completedWorkoutsThisWeek / client.plannedWorkoutsThisWeek) * 100)
      : null
  )

  return (
    <div className={cn(
      'rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow',
      urgencyBorder,
    )}>
      <div className="p-4 space-y-3">
        {/* Header: Avatar + Name + Sport */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
            {getInitials(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate dark:text-slate-200">{client.name}</p>
          </div>
          {client.primarySport && (
            <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0">
              {sportLabels[client.primarySport] || client.primarySport}
            </Badge>
          )}
        </div>

        {/* Readiness bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Beredskap</span>
            <span className={cn(
              'font-semibold',
              client.readinessScore === null
                ? 'text-muted-foreground'
                : client.readinessScore >= 70
                  ? 'text-green-600 dark:text-green-400'
                  : client.readinessScore >= 40
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
            )}>
              {client.readinessScore !== null ? client.readinessScore : '-'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
            {client.readinessScore !== null && (
              <div
                className={cn('h-full rounded-full transition-all', getReadinessColor(client.readinessScore))}
                style={{ width: `${Math.min(100, Math.max(0, client.readinessScore))}%` }}
              />
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* ACWR */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">ACWR</p>
            <Badge className={cn('text-[10px] font-medium', acwrBadge.color)}>
              {client.acwr !== null ? client.acwr.toFixed(2) : acwrBadge.label}
            </Badge>
          </div>
          {/* Compliance */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Följsamhet</p>
            <p className="text-xs font-semibold dark:text-slate-200">
              {client.completedWorkoutsThisWeek}/{client.plannedWorkoutsThisWeek}
            </p>
            {compliancePct !== null && (
              <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700 mt-0.5">
                <div
                  className={cn(
                    'h-full rounded-full',
                    compliancePct >= 80 ? 'bg-green-500' : compliancePct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(100, compliancePct)}%` }}
                />
              </div>
            )}
          </div>
          {/* Injuries */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Skador</p>
            {client.injuryCount > 0 ? (
              <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                <HeartPulse className="h-3 w-3 mr-0.5" />
                {client.injuryCount}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
          {/* Last activity */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Senast</p>
            <p className={cn(
              'text-xs font-medium',
              client.daysSinceLastActivity !== null && client.daysSinceLastActivity <= 1
                ? 'text-green-600 dark:text-green-400'
                : client.daysSinceLastActivity !== null && client.daysSinceLastActivity > 5
                  ? 'text-red-600 dark:text-red-400'
                  : 'dark:text-slate-300'
            )}>
              {formatLastActivity(client.daysSinceLastActivity)}
            </p>
          </div>
        </div>

        {/* Status badges row */}
        <div className="flex flex-wrap gap-1.5">
          {client.activeAlertCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {client.activeAlertCount} {client.activeAlertCount === 1 ? 'alert' : 'alerts'}
            </Badge>
          )}
          {client.pendingFeedbackCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <MessageSquare className="h-3 w-3 mr-0.5" />
              {client.pendingFeedbackCount} feedback
            </Badge>
          )}
          {client.hasActiveProgram && client.programName && (
            <Badge variant="outline" className="text-[10px] h-5 text-slate-600 dark:text-slate-400">
              <FileText className="h-3 w-3 mr-0.5" />
              {client.programName.length > 20 ? client.programName.slice(0, 20) + '...' : client.programName}
            </Badge>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 pt-1">
          <Link href={`${basePath}/coach/athletes/${client.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs h-7">
              <User className="h-3 w-3 mr-1" />
              Visa profil
            </Button>
          </Link>
          {client.pendingFeedbackCount > 0 && (
            <Link href={`${basePath}/coach/athletes/${client.id}/logs`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-7 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <MessageSquare className="h-3 w-3 mr-1" />
                Ge feedback
              </Button>
            </Link>
          )}
          <Link href={`${basePath}/coach/athletes/${client.id}`}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
