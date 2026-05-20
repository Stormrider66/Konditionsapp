'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from '@/i18n/client'
import { GlassCard, GlassCardHeader, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingDown,
  TrendingUp,
  X,
  ChevronRight,
  AlertTriangle,
  Moon,
  Battery,
  Heart,
  Brain,
  Zap,
  Activity,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/contexts/BasePathContext'

interface PatternData {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
}

interface ContextData {
  patterns: PatternData[]
  recommendations: string[]
  urgency: 'low' | 'medium' | 'high'
}

interface Notification {
  id: string
  notificationType: string
  priority: string
  title: string
  message: string
  icon?: string
  actionUrl?: string
  actionLabel?: string
  contextData: ContextData
  readAt?: string
  createdAt: string
  expiresAt?: string
}

const patternIcons: Record<string, React.ReactNode> = {
  SLEEP_DEGRADATION: <Moon className="h-4 w-4" />,
  FATIGUE_ACCUMULATION: <Battery className="h-4 w-4" />,
  SORENESS_BUILDUP: <Activity className="h-4 w-4" />,
  STRESS_ESCALATION: <Brain className="h-4 w-4" />,
  MOOD_DECLINE: <Heart className="h-4 w-4" />,
  MOTIVATION_DROP: <Zap className="h-4 w-4" />,
  OVERTRAINING_RISK: <AlertTriangle className="h-4 w-4" />,
  RECOVERY_NEEDED: <TrendingDown className="h-4 w-4" />,
  POSITIVE_TREND: <TrendingUp className="h-4 w-4" />,
}

export function PatternAlertCard() {
  const t = useTranslations('components.patternAlertCard')
  const router = useRouter()
  const basePath = useBasePath()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/athlete/notifications')
        if (response.ok) {
          const data = await response.json()
          // Filter for pattern alert notifications
          const patternAlerts = (data.notifications || []).filter(
            (n: Notification) => n.notificationType === 'PATTERN_ALERT'
          )
          setNotifications(patternAlerts)

          // Mark as read
          for (const n of patternAlerts) {
            if (!n.readAt) {
              void fetch(`/api/athlete/notifications/${n.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'read' }),
              })
            }
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchNotifications()
  }, [])

  async function handleDismiss(id: string) {
    setDismissingId(id)

    try {
      await fetch(`/api/athlete/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error('Error dismissing notification:', error)
    } finally {
      setDismissingId(null)
    }
  }

  async function handleAction(notification: Notification) {
    await fetch(`/api/athlete/notifications/${notification.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'action_taken' }),
    })

    if (notification.actionUrl) {
      router.push(`${basePath}${notification.actionUrl}`)
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
      case 'MEDIUM':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20'
      default:
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
    }
  }

  function getGlowColor(urgency: string, hasPositiveTrend: boolean): 'red' | 'amber' | 'emerald' | 'none' {
    if (hasPositiveTrend) return 'emerald'
    switch (urgency) {
      case 'high':
        return 'red'
      case 'medium':
        return 'amber'
      default:
        return 'amber'
    }
  }

  function getCardBorderClass(urgency: string, hasPositiveTrend: boolean) {
    if (hasPositiveTrend) {
      return 'border-green-200/30 dark:border-green-800/20 hover:border-green-500/30 dark:hover:border-green-500/30'
    }
    switch (urgency) {
      case 'high':
        return 'border-red-200/30 dark:border-red-800/20 hover:border-red-500/30 dark:hover:border-red-500/30'
      case 'medium':
        return 'border-orange-200/30 dark:border-orange-800/20 hover:border-orange-500/30 dark:hover:border-orange-500/30'
      default:
        return 'border-yellow-200/30 dark:border-yellow-800/20 hover:border-yellow-500/30 dark:hover:border-yellow-500/30'
    }
  }

  function getIconColorClass(urgency: string, hasPositiveTrend: boolean) {
    if (hasPositiveTrend) {
      return 'bg-emerald-500/10 dark:bg-emerald-400/10 border-emerald-500/20 dark:border-emerald-400/20 text-emerald-600 dark:text-emerald-400'
    }
    switch (urgency) {
      case 'high':
        return 'bg-red-500/10 dark:bg-red-400/10 border-red-500/20 dark:border-red-400/20 text-red-600 dark:text-red-400'
      case 'medium':
        return 'bg-orange-500/10 dark:bg-orange-400/10 border-orange-500/20 dark:border-orange-400/20 text-orange-600 dark:text-orange-400'
      default:
        return 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/20 dark:border-amber-400/20 text-amber-600 dark:text-amber-400'
    }
  }

  function getPatternLabel(type: string) {
    switch (type) {
      case 'SLEEP_DEGRADATION':
        return t('patterns.sleepDegradation')
      case 'FATIGUE_ACCUMULATION':
        return t('patterns.fatigueAccumulation')
      case 'SORENESS_BUILDUP':
        return t('patterns.sorenessBuildUp')
      case 'STRESS_ESCALATION':
        return t('patterns.stressEscalation')
      case 'MOOD_DECLINE':
        return t('patterns.moodDecline')
      case 'MOTIVATION_DROP':
        return t('patterns.motivationDrop')
      case 'OVERTRAINING_RISK':
        return t('patterns.overtrainingRisk')
      case 'RECOVERY_NEEDED':
        return t('patterns.recoveryNeeded')
      case 'POSITIVE_TREND':
        return t('patterns.positiveTrend')
      default:
        return type
    }
  }

  if (isLoading || notifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => {
        const context = notification.contextData as ContextData
        const isExpanded = expandedId === notification.id
        const urgency = context?.urgency || 'low'
        const patterns = context?.patterns || []
        const recommendations = context?.recommendations || []
        const hasPositiveTrend = patterns.some((p) => p.type === 'POSITIVE_TREND')

        return (
          <GlassCard
            key={notification.id}
            glow={getGlowColor(urgency, hasPositiveTrend)}
            gradient
            className={cn('group transition-all duration-300', getCardBorderClass(urgency, hasPositiveTrend))}
          >
            <GlassCardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-full border shadow-inner transition-all duration-300 group-hover:scale-110', getIconColorClass(urgency, hasPositiveTrend))}>
                    {hasPositiveTrend ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                      {notification.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {t('patternCount', { count: patterns.length })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/50 rounded-full"
                  onClick={() => handleDismiss(notification.id)}
                  disabled={dismissingId === notification.id}
                >
                  {dismissingId === notification.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </GlassCardHeader>

            <GlassCardContent className="space-y-4">
              {/* Main message */}
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {notification.message}
              </p>

              {/* Pattern badges */}
              {patterns.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {patterns.slice(0, 3).map((pattern, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', getSeverityColor(pattern.severity))}
                    >
                      {patternIcons[pattern.type] || <Activity className="h-3.5 w-3.5 mr-1" />}
                      <span className="ml-1">{getPatternLabel(pattern.type)}</span>
                    </Badge>
                  ))}
                  {patterns.length > 3 && (
                    <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                      {t('morePatterns', { count: patterns.length - 3 })}
                    </Badge>
                  )}
                </div>
              )}

              {/* Recommendations (expandable) */}
              {recommendations.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                  >
                    <ChevronRight
                      className={cn('h-3.5 w-3.5 transition-transform duration-250', isExpanded && 'rotate-90')}
                    />
                    {isExpanded ? t('actions.hideRecommendations') : t('actions.showRecommendations')}
                  </button>
                  {isExpanded && (
                    <ul className="mt-2 space-y-1.5 pl-5 list-disc">
                      {recommendations.map((rec, index) => (
                        <li
                          key={index}
                          className="text-xs text-slate-600 dark:text-slate-400 leading-normal"
                        >
                          {rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Action button */}
              {notification.actionLabel && notification.actionUrl && (
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs rounded-full bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200 shadow-sm hover:shadow"
                    onClick={() => handleAction(notification)}
                  >
                    {notification.actionLabel}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        )
      })}
    </div>
  )
}
