import { useState, useEffect } from 'react'
import { GlassCard, GlassCardHeader, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dumbbell,
  X,
  ChevronRight,
  Clock,
  Zap,
  AlertTriangle,
  Loader2,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useTranslations } from '@/i18n/client'

interface ContextData {
  workoutId: string
  workoutType: string
  workoutName: string
  scheduledFor: string
  tips: string[]
  suggestedAdjustment?: string
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

export function PreWorkoutNudgeCard() {
  const t = useTranslations('components.preWorkoutNudgeCard')
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
          // Filter for pre-workout notifications only
          const preWorkoutNotifications = (data.notifications || []).filter(
            (n: Notification) => n.notificationType === 'PRE_WORKOUT'
          )
          setNotifications(preWorkoutNotifications)

          // Mark as read
          for (const n of preWorkoutNotifications) {
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
    // Mark action taken
    await fetch(`/api/athlete/notifications/${notification.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'action_taken' }),
    })

    // Navigate (prepend basePath for business-scoped routes)
    if (notification.actionUrl) {
      router.push(`${basePath}${notification.actionUrl}`)
    }
  }

  function getTimeUntilWorkout(scheduledFor: string): string {
    const now = new Date()
    const scheduled = new Date(scheduledFor)
    const diffMs = scheduled.getTime() - now.getTime()

    if (diffMs <= 0) return t('time.now')

    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    if (hours > 0) {
      return t('time.hoursMinutes', { hours, minutes })
    }
    return t('time.minutes', { minutes })
  }

  function getWorkoutTypeIcon(type: string) {
    switch (type?.toLowerCase()) {
      case 'strength':
        return <Dumbbell className="h-4 w-4" />
      case 'cardio':
      case 'running':
      case 'cycling':
        return <Zap className="h-4 w-4" />
      default:
        return <Dumbbell className="h-4 w-4" />
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
        const timeUntil = getTimeUntilWorkout(context?.scheduledFor || notification.createdAt)

        return (
          <GlassCard
            key={notification.id}
            glow="blue"
            gradient
            className="group border-blue-200/30 dark:border-blue-800/20 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300"
          >
            <GlassCardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 rounded-full shadow-inner transition-all duration-300 group-hover:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    {getWorkoutTypeIcon(context?.workoutType)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <Timer className="h-3.5 w-3.5 text-blue-500" />
                      <span>{t('timeUntil', { time: timeUntil })}</span>
                      {context?.workoutName && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span>{context.workoutName}</span>
                        </>
                      )}
                    </div>
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

              {/* Suggested adjustment warning */}
              {context?.suggestedAdjustment && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/30 bg-amber-500/5 border-l-4 border-l-amber-500 text-xs text-slate-700 dark:text-slate-300 transition-all duration-300">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <span>{context.suggestedAdjustment}</span>
                </div>
              )}

              {/* Tips (expandable) */}
              {context?.tips && context.tips.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <ChevronRight
                      className={cn('h-3.5 w-3.5 transition-transform duration-250', isExpanded && 'rotate-90')}
                    />
                    {isExpanded ? t('tips.hide') : t('tips.show')}
                  </button>
                  {isExpanded && (
                    <ul className="mt-2 space-y-1.5 pl-5 list-disc">
                      {context.tips.map((tip, index) => (
                        <li
                          key={index}
                          className="text-xs text-slate-600 dark:text-slate-400 leading-normal"
                        >
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Priority badge and action button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {notification.priority === 'HIGH' && (
                    <Badge
                      variant="secondary"
                      className="bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 text-xs font-semibold px-2 py-0.5 rounded-full"
                    >
                      {t('priority.high')}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-semibold px-2 py-0.5 rounded-full"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {timeUntil}
                  </Badge>
                </div>

                {notification.actionLabel && notification.actionUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs rounded-full bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200 shadow-sm hover:shadow"
                    onClick={() => handleAction(notification)}
                  >
                    {notification.actionLabel}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        )
      })}
    </div>
  )
}
