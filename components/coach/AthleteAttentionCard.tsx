'use client'

/**
 * Athlete Attention Card
 *
 * Individual card showing an AI-generated alert for an athlete needing attention.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingDown,
  Calendar,
  Activity,
  MessageSquare,
  AlertTriangle,
  X,
  Check,
  Eye,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'

interface CoachAlert {
  id: string
  coachId: string
  clientId: string
  alertType: 'READINESS_DROP' | 'MISSED_CHECKINS' | 'MISSED_WORKOUTS' | 'PAIN_MENTION' | 'HIGH_ACWR'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  contextData: Record<string, unknown>
  status: string
  createdAt: string
  client: {
    id: string
    name: string
    email?: string
    sportProfile?: {
      primarySport: string
    }
  }
}

interface AthleteAttentionCardProps {
  alert: CoachAlert
  onDismiss: () => void
  onAction: () => void
  onResolve: () => void
}

type AppLocale = 'en' | 'sv'

const labels: Record<AppLocale, {
  training: string
  pain: string
  critical: string
  high: string
  medium: string
  low: string
  average: string
  days: string
  daysSince: string
  missedWorkouts: string
  risk: string
  viewProfile: string
  contact: string
  dismiss: string
  handled: string
}> = {
  en: {
    training: 'Training',
    pain: 'Pain',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    average: 'Average',
    days: 'Days',
    daysSince: 'Days since',
    missedWorkouts: 'Missed workouts',
    risk: 'Risk',
    viewProfile: 'View profile',
    contact: 'Contact',
    dismiss: 'Dismiss',
    handled: 'Handled',
  },
  sv: {
    training: 'Träning',
    pain: 'Smärta',
    critical: 'Kritisk',
    high: 'Hög',
    medium: 'Medel',
    low: 'Låg',
    average: 'Snitt',
    days: 'Dagar',
    daysSince: 'Dagar sedan',
    missedWorkouts: 'Missade pass',
    risk: 'Risk',
    viewProfile: 'Visa profil',
    contact: 'Kontakta',
    dismiss: 'Avfärda',
    handled: 'Hanterad',
  },
}

const alertTypeConfig = {
  READINESS_DROP: {
    icon: TrendingDown,
    label: 'Readiness',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  MISSED_CHECKINS: {
    icon: Calendar,
    label: 'Check-in',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  MISSED_WORKOUTS: {
    icon: Activity,
    labelKey: 'training',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  PAIN_MENTION: {
    icon: MessageSquare,
    labelKey: 'pain',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  HIGH_ACWR: {
    icon: AlertTriangle,
    label: 'ACWR',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
}

const severityConfig = {
  CRITICAL: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    labelKey: 'critical',
  },
  HIGH: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    labelKey: 'high',
  },
  MEDIUM: {
    border: 'border-l-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    labelKey: 'medium',
  },
  LOW: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    labelKey: 'low',
  },
}

export function AthleteAttentionCard({
  alert,
  onDismiss,
  onAction,
  onResolve,
}: AthleteAttentionCardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = labels[locale]
  const dateLocale = locale === 'sv' ? sv : enUS
  const [isExpanded, setIsExpanded] = useState(false)
  const [isActioning, setIsActioning] = useState(false)
  const pathname = usePathname()
  // Extract business slug basePath from current URL (e.g. /star-by-thomson/coach/dashboard → /star-by-thomson)
  const slugMatch = pathname.match(/^\/([^/]+)\/coach/)
  const basePath = slugMatch ? `/${slugMatch[1]}` : ''

  const typeConfig = alertTypeConfig[alert.alertType]
  const severity = severityConfig[alert.severity]
  const Icon = typeConfig.icon

  const handleAction = async () => {
    setIsActioning(true)
    await onAction()
    setIsActioning(false)
  }

  const timeAgo = formatDistanceToNow(new Date(alert.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  })

  // Extract context details for display
  const context = alert.contextData || {}
  const contextDetails: { label: string; value: string }[] = []

  if (alert.alertType === 'READINESS_DROP' && context.avgReadiness) {
    contextDetails.push({ label: copy.average, value: `${(context.avgReadiness as number).toFixed(1)}/10` })
    contextDetails.push({ label: copy.days, value: `${context.days}` })
  }

  if (alert.alertType === 'MISSED_CHECKINS' && context.daysSinceLastCheckIn) {
    contextDetails.push({ label: copy.daysSince, value: `${context.daysSinceLastCheckIn}` })
  }

  if (alert.alertType === 'MISSED_WORKOUTS' && context.missedCount) {
    contextDetails.push({ label: copy.missedWorkouts, value: `${context.missedCount}` })
  }

  if (alert.alertType === 'HIGH_ACWR' && context.acwr) {
    contextDetails.push({ label: 'ACWR', value: `${(context.acwr as number).toFixed(2)}` })
    contextDetails.push({ label: copy.risk, value: `${context.injuryRisk}` })
  }

  const alertGlow = alert.severity === 'CRITICAL' ? 'red' : alert.severity === 'HIGH' ? 'amber' : alert.severity === 'MEDIUM' ? 'amber' : 'blue'

  return (
    <GlassCard
      className={cn(
        'border-l-4 overflow-hidden rounded-xl border border-slate-200/50 dark:border-white/5',
        severity.border
      )}
      glow={alertGlow}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={cn('p-1.5 rounded-md flex-shrink-0', typeConfig.bg)}>
              <Icon className={cn('h-4 w-4', typeConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate text-slate-900 dark:text-white">{alert.client.name}</span>
                <Badge variant="secondary" className={cn('text-xs', severity.badge)}>
                  {copy[severity.labelKey as keyof typeof copy]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {alert.message}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Time and type */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs font-normal">
            {'labelKey' in typeConfig ? copy[typeConfig.labelKey as keyof typeof copy] : typeConfig.label}
          </Badge>
          <span>{timeAgo}</span>
          {alert.client.sportProfile?.primarySport && (
            <>
              <span>•</span>
              <span>{alert.client.sportProfile.primarySport}</span>
            </>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-200/50 dark:border-white/5">
          {/* Context details */}
          {contextDetails.length > 0 && (
            <div className="flex flex-wrap gap-3 py-2">
              {contextDetails.map((detail, i) => (
                <div key={i} className="text-xs">
                  <span className="text-muted-foreground">{detail.label}:</span>{' '}
                  <span className="font-medium text-slate-900 dark:text-white">{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pain mention quote */}
          {alert.alertType === 'PAIN_MENTION' && typeof context.memoryContent === 'string' && (
            <div className="bg-slate-100/50 dark:bg-white/5 rounded p-2 my-2 text-xs italic text-slate-700 dark:text-slate-300">
              &ldquo;{context.memoryContent}&rdquo;
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <Link href={`${basePath}/coach/clients/${alert.clientId}`}>
                <Eye className="h-3 w-3 mr-1" />
                {copy.viewProfile}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <Link href={`${basePath}/coach/messages?to=${alert.clientId}`}>
                <MessageCircle className="h-3 w-3 mr-1" />
                {copy.contact}
              </Link>
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="h-3 w-3 mr-1" />
              {copy.dismiss}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAction}
              disabled={isActioning}
            >
              {isActioning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  {copy.handled}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
