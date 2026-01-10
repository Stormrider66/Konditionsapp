'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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

const patternLabels: Record<string, string> = {
  SLEEP_DEGRADATION: 'Sömnproblem',
  FATIGUE_ACCUMULATION: 'Ökande trötthet',
  SORENESS_BUILDUP: 'Muskelömhet',
  STRESS_ESCALATION: 'Ökande stress',
  MOOD_DECLINE: 'Humörförändring',
  MOTIVATION_DROP: 'Minskad motivation',
  OVERTRAINING_RISK: 'Överträningsrisk',
  RECOVERY_NEEDED: 'Vila behövs',
  POSITIVE_TREND: 'Positiv trend',
}

export function PatternAlertCard() {
  const router = useRouter()
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
              fetch(`/api/athlete/notifications/${n.id}`, {
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

    fetchNotifications()
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
      router.push(notification.actionUrl)
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
    }
  }

  function getCardGradient(urgency: string) {
    switch (urgency) {
      case 'high':
        return 'from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800'
      case 'medium':
        return 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800'
      default:
        return 'from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-200 dark:border-yellow-800'
    }
  }

  function getIconColor(urgency: string) {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
      case 'medium':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400'
    }
  }

  function getTextColor(urgency: string) {
    switch (urgency) {
      case 'high':
        return 'text-red-900 dark:text-red-100'
      case 'medium':
        return 'text-orange-900 dark:text-orange-100'
      default:
        return 'text-yellow-900 dark:text-yellow-100'
    }
  }

  // Don't render if loading or no notifications
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

        // Use different styling for positive trends
        const cardClass = hasPositiveTrend
          ? 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800'
          : getCardGradient(urgency)

        const iconClass = hasPositiveTrend
          ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
          : getIconColor(urgency)

        const textClass = hasPositiveTrend
          ? 'text-green-900 dark:text-green-100'
          : getTextColor(urgency)

        return (
          <Card
            key={notification.id}
            className={cn('bg-gradient-to-br overflow-hidden', cardClass)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('p-2 rounded-lg', iconClass)}>
                    {hasPositiveTrend ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className={cn('font-semibold', textClass)}>
                      {notification.title}
                    </h3>
                    <p className={cn('text-xs opacity-70', textClass)}>
                      Baserat på {patterns.length} mönster i din data
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 hover:bg-white/50 dark:hover:bg-black/20',
                    textClass
                  )}
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
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Main message */}
              <p className={cn('text-sm opacity-90', textClass)}>
                {notification.message}
              </p>

              {/* Pattern badges */}
              {patterns.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {patterns.slice(0, 3).map((pattern, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={cn('text-xs', getSeverityColor(pattern.severity))}
                    >
                      {patternIcons[pattern.type] || <Activity className="h-3 w-3 mr-1" />}
                      <span className="ml-1">{patternLabels[pattern.type] || pattern.type}</span>
                    </Badge>
                  ))}
                  {patterns.length > 3 && (
                    <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800">
                      +{patterns.length - 3} till
                    </Badge>
                  )}
                </div>
              )}

              {/* Recommendations (expandable) */}
              {recommendations.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                    className={cn(
                      'flex items-center gap-1 text-xs opacity-70 hover:opacity-100',
                      textClass
                    )}
                  >
                    <ChevronRight
                      className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
                    />
                    {isExpanded ? 'Dölj rekommendationer' : 'Visa rekommendationer'}
                  </button>
                  {isExpanded && (
                    <ul className="mt-2 space-y-1 pl-4">
                      {recommendations.map((rec, index) => (
                        <li
                          key={index}
                          className={cn('text-xs list-disc opacity-80', textClass)}
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
                    className={cn(
                      'h-8 text-xs bg-white/50 dark:bg-black/20',
                      hasPositiveTrend
                        ? 'border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/50'
                        : urgency === 'high'
                          ? 'border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/50'
                          : 'border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/50'
                    )}
                    onClick={() => handleAction(notification)}
                  >
                    {notification.actionLabel}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
