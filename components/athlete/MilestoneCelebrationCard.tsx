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
  Share2,
  Loader2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  readAt?: string
  createdAt: string
}

const celebrationColors = {
  BRONZE: {
    gradient: 'from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    iconBg: 'bg-amber-200 dark:bg-amber-900/50',
    iconColor: 'text-amber-700 dark:text-amber-400',
    textColor: 'text-amber-900 dark:text-amber-100',
    badgeBg: 'bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  SILVER: {
    gradient: 'from-slate-100 to-gray-200 dark:from-slate-950/30 dark:to-gray-900/30',
    border: 'border-slate-300 dark:border-slate-600',
    iconBg: 'bg-slate-200 dark:bg-slate-800/50',
    iconColor: 'text-slate-700 dark:text-slate-300',
    textColor: 'text-slate-900 dark:text-slate-100',
    badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-800/50 dark:text-slate-200',
  },
  GOLD: {
    gradient: 'from-yellow-100 to-amber-100 dark:from-yellow-950/30 dark:to-amber-950/30',
    border: 'border-yellow-400 dark:border-yellow-600',
    iconBg: 'bg-yellow-200 dark:bg-yellow-900/50',
    iconColor: 'text-yellow-700 dark:text-yellow-400',
    textColor: 'text-yellow-900 dark:text-yellow-100',
    badgeBg: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  },
  PLATINUM: {
    gradient: 'from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30',
    border: 'border-purple-400 dark:border-purple-600',
    iconBg: 'bg-purple-200 dark:bg-purple-900/50',
    iconColor: 'text-purple-700 dark:text-purple-400',
    textColor: 'text-purple-900 dark:text-purple-100',
    badgeBg: 'bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  },
}

const milestoneIcons: Record<string, React.ReactNode> = {
  PERSONAL_RECORD: <Trophy className="h-6 w-6" />,
  CONSISTENCY_STREAK: <Flame className="h-6 w-6" />,
  WORKOUT_COUNT: <Award className="h-6 w-6" />,
  TRAINING_ANNIVERSARY: <Cake className="h-6 w-6" />,
  FIRST_WORKOUT: <Star className="h-6 w-6" />,
  COMEBACK: <Zap className="h-6 w-6" />,
}

const celebrationEmojis = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
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
          setNotifications(milestoneNotifications)

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
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8 hover:bg-white/50', colors.textColor)}
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

                {/* Share button (future feature) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-8 opacity-60 hover:opacity-100', colors.textColor)}
                  onClick={() => {
                    // Future: implement sharing
                    console.log('Share milestone:', notification.title)
                  }}
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Dela
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
