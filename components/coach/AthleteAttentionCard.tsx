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
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
    label: 'Träning',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  PAIN_MENTION: {
    icon: MessageSquare,
    label: 'Smärta',
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
    label: 'Kritisk',
  },
  HIGH: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    label: 'Hög',
  },
  MEDIUM: {
    border: 'border-l-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    label: 'Medel',
  },
  LOW: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    label: 'Låg',
  },
}

export function AthleteAttentionCard({
  alert,
  onDismiss,
  onAction,
  onResolve,
}: AthleteAttentionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

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
    locale: sv,
  })

  // Extract context details for display
  const context = alert.contextData || {}
  const contextDetails: { label: string; value: string }[] = []

  if (alert.alertType === 'READINESS_DROP' && context.avgReadiness) {
    contextDetails.push({ label: 'Snitt', value: `${(context.avgReadiness as number).toFixed(1)}/10` })
    contextDetails.push({ label: 'Dagar', value: `${context.days}` })
  }

  if (alert.alertType === 'MISSED_CHECKINS' && context.daysSinceLastCheckIn) {
    contextDetails.push({ label: 'Dagar sedan', value: `${context.daysSinceLastCheckIn}` })
  }

  if (alert.alertType === 'MISSED_WORKOUTS' && context.missedCount) {
    contextDetails.push({ label: 'Missade pass', value: `${context.missedCount}` })
  }

  if (alert.alertType === 'HIGH_ACWR' && context.acwr) {
    contextDetails.push({ label: 'ACWR', value: `${(context.acwr as number).toFixed(2)}` })
    contextDetails.push({ label: 'Risk', value: `${context.injuryRisk}` })
  }

  return (
    <div
      className={cn(
        'border rounded-lg bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm overflow-hidden border-l-4 transition-all border-slate-200/50 dark:border-white/5',
        severity.border
      )}
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
                <span className="font-medium text-sm truncate">{alert.client.name}</span>
                <Badge variant="secondary" className={cn('text-xs', severity.badge)}>
                  {severity.label}
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
            {typeConfig.label}
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
        <div className="px-3 pb-3 pt-0 border-t">
          {/* Context details */}
          {contextDetails.length > 0 && (
            <div className="flex flex-wrap gap-3 py-2">
              {contextDetails.map((detail, i) => (
                <div key={i} className="text-xs">
                  <span className="text-muted-foreground">{detail.label}:</span>{' '}
                  <span className="font-medium">{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pain mention quote */}
          {alert.alertType === 'PAIN_MENTION' && typeof context.memoryContent === 'string' && (
            <div className="bg-muted/50 rounded p-2 my-2 text-xs italic">
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
              <Link href={`/clients/${alert.clientId}`}>
                <Eye className="h-3 w-3 mr-1" />
                Visa profil
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <Link href={`/coach/messages?to=${alert.clientId}`}>
                <MessageCircle className="h-3 w-3 mr-1" />
                Kontakta
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
              Avfärda
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
                  Hanterad
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
