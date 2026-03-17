'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Flame,
  Award,
  Cake,
  Star,
  X,
  Loader2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { celebrationColors, celebrationEmojis, type CelebrationLevel } from '@/lib/milestone-constants'
import { ShareAchievementButton } from './shareable/ShareAchievementButton'

interface ContextData {
  milestoneType: string
  value: number
  unit?: string
  previousBest?: number
  improvement?: number
  celebrationLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
}

interface Notification {
  id: string
  notificationType: string
  priority: string
  title: string
  message: string
  icon?: string
  contextData: ContextData
  triggeredBy?: string | null
  readAt?: string
  createdAt: string
}

const milestoneIcons: Record<string, React.ReactNode> = {
  PERSONAL_RECORD: <Trophy className="h-6 w-6" />,
  CONSISTENCY_STREAK: <Flame className="h-6 w-6" />,
  WORKOUT_COUNT: <Award className="h-6 w-6" />,
  TRAINING_ANNIVERSARY: <Cake className="h-6 w-6" />,
  FIRST_WORKOUT: <Star className="h-6 w-6" />,
  COMEBACK: <Zap className="h-6 w-6" />,
  PROGRAM_COMPLETED: <Trophy className="h-6 w-6" />,
}

export function MilestoneCelebrationCard() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/athlete/notifications')
        if (response.ok) {
          const data = await response.json()
          // Filter for milestone notifications
          const milestoneNotifications = (data.notifications || []).filter(
            (n: Notification) => n.notificationType === 'MILESTONE'
          )
          const todaysMilestones = dedupeMilestoneNotifications(milestoneNotifications).filter(
            (notification) => isSameLocalDay(notification.createdAt, new Date())
          )
          setNotifications(todaysMilestones)

          // Mark as read
          for (const n of milestoneNotifications) {
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

  async function handleDismiss(notification: Notification) {
    const relatedNotifications = notifications.filter((candidate) => (
      getMilestoneNotificationKey(candidate) === getMilestoneNotificationKey(notification)
    ))
    const idsToDismiss = relatedNotifications.map((candidate) => candidate.id)
    setDismissingId(notification.id)

    try {
      await Promise.all(idsToDismiss.map((id) => (
        fetch(`/api/athlete/notifications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dismiss' }),
        })
      )))
      setNotifications((prev) => prev.filter((candidate) => !idsToDismiss.includes(candidate.id)))
    } catch (error) {
      console.error('Error dismissing notification:', error)
    } finally {
      setDismissingId(null)
    }
  }

  // Don't render if loading or no notifications
  if (isLoading || notifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => {
        const context = notification.contextData as ContextData
        const level = context?.celebrationLevel || 'BRONZE'
        const colors = celebrationColors[level]
        const icon = milestoneIcons[context?.milestoneType] || <Star className="h-6 w-6" />
        const emoji = celebrationEmojis[level]

        return (
          <Card
            key={notification.id}
            className={cn(
              'bg-gradient-to-br overflow-hidden relative',
              colors.gradient,
              colors.border
            )}
          >
            {/* Sparkle decorations for higher levels */}
            {(level === 'GOLD' || level === 'PLATINUM') && (
              <>
                <Sparkles className="absolute top-2 right-12 h-4 w-4 text-yellow-400 opacity-60 animate-pulse" />
                <Sparkles className="absolute top-8 right-4 h-3 w-3 text-yellow-400 opacity-40 animate-pulse delay-300" />
                <Sparkles className="absolute bottom-4 left-4 h-3 w-3 text-yellow-400 opacity-50 animate-pulse delay-150" />
              </>
            )}

            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-3 rounded-xl', colors.iconBg, colors.iconColor)}>
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={cn('font-bold text-lg', colors.textColor)}>
                        {notification.title}
                      </h3>
                      <span className="text-2xl">{emoji}</span>
                    </div>
                    <p className={cn('text-sm opacity-80', colors.textColor)}>
                      {notification.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ShareAchievementButton
                    type="MILESTONE"
                    title={notification.title}
                    description={notification.message}
                    contextData={context}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8 hover:bg-white/50', colors.textColor)}
                    onClick={() => handleDismiss(notification)}
                    disabled={dismissingId === notification.id}
                  >
                    {dismissingId === notification.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Value display */}
                  {context?.value && (
                    <Badge className={cn('text-sm font-bold px-3 py-1', colors.badgeBg)}>
                      {context.value} {context.unit || ''}
                    </Badge>
                  )}

                  {/* Improvement indicator */}
                  {context?.improvement && context.improvement > 0 && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      <span>+{context.improvement}%</span>
                    </div>
                  )}

                  {/* Previous best */}
                  {context?.previousBest && (
                    <span className={cn('text-xs opacity-60', colors.textColor)}>
                      Tidigare: {context.previousBest} {context.unit}
                    </span>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function dedupeMilestoneNotifications(notifications: Notification[]): Notification[] {
  const deduped = new Map<string, Notification>()

  notifications.forEach((notification) => {
    const key = getMilestoneNotificationKey(notification)
    const existing = deduped.get(key)
    if (!existing || new Date(notification.createdAt) > new Date(existing.createdAt)) {
      deduped.set(key, notification)
    }
  })

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function getMilestoneNotificationKey(notification: Notification): string {
  if (notification.triggeredBy) return notification.triggeredBy

  const context = notification.contextData
  return `${context?.milestoneType || notification.title}:${context?.value || ''}`
}

function isSameLocalDay(dateString: string, targetDate: Date): boolean {
  const date = new Date(dateString)
  return (
    date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth() &&
    date.getDate() === targetDate.getDate()
  )
}
