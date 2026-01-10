'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
          // Filter for pre-workout notifications only
          const preWorkoutNotifications = (data.notifications || []).filter(
            (n: Notification) => n.notificationType === 'PRE_WORKOUT'
          )
          setNotifications(preWorkoutNotifications)

          // Mark as read
          for (const n of preWorkoutNotifications) {
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
    // Mark action taken
    await fetch(`/api/athlete/notifications/${notification.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'action_taken' }),
    })

    // Navigate
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  function getTimeUntilWorkout(scheduledFor: string): string {
    const now = new Date()
    const scheduled = new Date(scheduledFor)
    const diffMs = scheduled.getTime() - now.getTime()

    if (diffMs <= 0) return 'Nu'

    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    if (hours > 0) {
      return `${hours}h ${minutes}min`
    }
    return `${minutes} min`
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
  if (isLoading) {
    return null
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => {
        const context = notification.contextData as ContextData
        const isExpanded = expandedId === notification.id
        const timeUntil = getTimeUntilWorkout(context?.scheduledFor || notification.createdAt)

        return (
          <Card
            key={notification.id}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 overflow-hidden"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    {getWorkoutTypeIcon(context?.workoutType)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                      <Timer className="h-3 w-3" />
                      <span>Om {timeUntil}</span>
                      {context?.workoutName && (
                        <>
                          <span className="text-blue-400">•</span>
                          <span>{context.workoutName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50"
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
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {notification.message}
              </p>

              {/* Suggested adjustment warning */}
              {context?.suggestedAdjustment && (
                <div className="flex items-start gap-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{context.suggestedAdjustment}</span>
                </div>
              )}

              {/* Tips (expandable) */}
              {context?.tips && context.tips.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <ChevronRight
                      className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
                    />
                    {isExpanded ? 'Dölj tips' : 'Visa förberedelsetips'}
                  </button>
                  {isExpanded && (
                    <ul className="mt-2 space-y-1 pl-4">
                      {context.tips.map((tip, index) => (
                        <li
                          key={index}
                          className="text-xs text-blue-700 dark:text-blue-300 list-disc"
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
                      className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 text-xs"
                    >
                      Hög prioritet
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {timeUntil}
                  </Badge>
                </div>

                {notification.actionLabel && notification.actionUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white/50 dark:bg-black/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    onClick={() => handleAction(notification)}
                  >
                    {notification.actionLabel}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
