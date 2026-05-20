'use client'

import { useState, useEffect } from 'react'
import { GlassCard, GlassCardHeader, GlassCardContent } from '@/components/ui/GlassCard'
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
import { celebrationEmojis, type CelebrationLevel } from '@/lib/milestone-constants'
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
  PERSONAL_RECORD: <Trophy className="h-5 w-5" />,
  CONSISTENCY_STREAK: <Flame className="h-5 w-5" />,
  WORKOUT_COUNT: <Award className="h-5 w-5" />,
  TRAINING_ANNIVERSARY: <Cake className="h-5 w-5" />,
  FIRST_WORKOUT: <Star className="h-5 w-5" />,
  COMEBACK: <Zap className="h-5 w-5" />,
  PROGRAM_COMPLETED: <Trophy className="h-5 w-5" />,
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

  function getGlowColor(level: CelebrationLevel): 'amber' | 'slate' | 'purple' | 'none' {
    switch (level) {
      case 'PLATINUM':
        return 'purple'
      case 'GOLD':
        return 'amber'
      case 'SILVER':
        return 'slate'
      case 'BRONZE':
      default:
        return 'amber'
    }
  }

  function getBorderColorClass(level: CelebrationLevel) {
    switch (level) {
      case 'PLATINUM':
        return 'border-purple-200/40 dark:border-purple-800/30 hover:border-purple-500/30 dark:hover:border-purple-500/30'
      case 'GOLD':
        return 'border-yellow-200/40 dark:border-yellow-800/30 hover:border-yellow-500/30 dark:hover:border-yellow-500/30'
      case 'SILVER':
        return 'border-slate-200/40 dark:border-slate-800/30 hover:border-slate-500/30 dark:hover:border-slate-500/30'
      case 'BRONZE':
      default:
        return 'border-amber-200/40 dark:border-amber-800/30 hover:border-amber-500/30 dark:hover:border-amber-500/30'
    }
  }

  function getIconColorClass(level: CelebrationLevel) {
    switch (level) {
      case 'PLATINUM':
        return 'bg-purple-500/10 dark:bg-purple-400/10 border-purple-500/20 dark:border-purple-400/20 text-purple-600 dark:text-purple-400'
      case 'GOLD':
        return 'bg-yellow-500/10 dark:bg-yellow-400/10 border-yellow-500/20 dark:border-yellow-400/20 text-yellow-600 dark:text-yellow-400'
      case 'SILVER':
        return 'bg-slate-500/10 dark:bg-slate-400/10 border-slate-500/20 dark:border-slate-400/20 text-slate-600 dark:text-slate-400'
      case 'BRONZE':
      default:
        return 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/20 dark:border-amber-400/20 text-amber-600 dark:text-amber-400'
    }
  }

  function getBadgeColorClass(level: CelebrationLevel) {
    switch (level) {
      case 'PLATINUM':
        return 'bg-purple-500/10 text-purple-750 dark:text-purple-300 border border-purple-500/20'
      case 'GOLD':
        return 'bg-yellow-500/10 text-yellow-750 dark:text-yellow-300 border border-yellow-500/20'
      case 'SILVER':
        return 'bg-slate-500/10 text-slate-750 dark:text-slate-300 border border-slate-500/20'
      case 'BRONZE':
      default:
        return 'bg-amber-500/10 text-amber-750 dark:text-amber-300 border border-amber-500/20'
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
        const icon = milestoneIcons[context?.milestoneType] || <Star className="h-5 w-5" />
        const emoji = celebrationEmojis[level]

        return (
          <GlassCard
            key={notification.id}
            glow={getGlowColor(level)}
            gradient
            className={cn(
              'group overflow-hidden relative transition-all duration-300',
              getBorderColorClass(level)
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

            <GlassCardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-full border shadow-inner transition-all duration-300 group-hover:scale-110', getIconColorClass(level))}>
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                        {notification.title}
                      </h3>
                      <span className="text-2xl">{emoji}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-normal">
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
                    className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/50 rounded-full"
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
            </GlassCardHeader>

            <GlassCardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Value display */}
                  {context?.value && (
                    <Badge className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border', getBadgeColorClass(level))}>
                      {context.value} {context.unit || ''}
                    </Badge>
                  )}

                  {/* Improvement indicator */}
                  {context?.improvement && context.improvement > 0 && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4" />
                      <span>+{context.improvement}%</span>
                    </div>
                  )}

                  {/* Previous best */}
                  {context?.previousBest && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Tidigare: {context.previousBest} {context.unit}
                    </span>
                  )}
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
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
