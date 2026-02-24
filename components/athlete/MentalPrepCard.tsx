'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  X,
  ChevronRight,
  MessageSquare,
  Check,
  Loader2,
  Target,
  Eye,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface MentalPrepContent {
  title: string
  subtitle: string
  mainContent: string
  preview: string
  bulletPoints: string[]
}

interface MentalPrepNotification {
  id: string
  prepType: 'VISUALIZATION' | 'RACE_PLAN' | 'AFFIRMATIONS'
  raceId: string
  raceName: string
  raceDate: string
  distance: string
  targetTime: string | null
  daysUntilRace: number
  content: MentalPrepContent
  readAt?: string
  dismissedAt?: string
  createdAt: string
}

const PREP_TYPE_CONFIG = {
  VISUALIZATION: {
    icon: Eye,
    label: 'Visualisering',
    dayLabel: 'Dag 1',
    color: 'purple',
  },
  RACE_PLAN: {
    icon: Target,
    label: 'Tävlingsplan',
    dayLabel: 'Dag 2',
    color: 'purple',
  },
  AFFIRMATIONS: {
    icon: Sparkles,
    label: 'Affirmationer',
    dayLabel: 'Dag 3',
    color: 'purple',
  },
}

const DISTANCE_LABELS: Record<string, string> = {
  '5K': '5 km',
  '10K': '10 km',
  HALF: 'Halvmaraton',
  MARATHON: 'Maraton',
}

export function MentalPrepCard() {
  const router = useRouter()
  const [notification, setNotification] = useState<MentalPrepNotification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function fetchMentalPrep() {
      try {
        const response = await fetch('/api/athlete/notifications?type=MENTAL_PREP&limit=1')
        if (response.ok) {
          const data = await response.json()
          if (data.notifications && data.notifications.length > 0) {
            const notif = data.notifications[0]
            // Parse contextData
            const contextData = notif.contextData as Record<string, unknown>
            setNotification({
              id: notif.id,
              prepType: contextData.prepType as MentalPrepNotification['prepType'],
              raceId: contextData.raceId as string,
              raceName: contextData.raceName as string,
              raceDate: contextData.raceDate as string,
              distance: contextData.distance as string,
              targetTime: contextData.targetTime as string | null,
              daysUntilRace: contextData.daysUntilRace as number,
              content: contextData.content as MentalPrepContent,
              readAt: notif.readAt,
              dismissedAt: notif.dismissedAt,
              createdAt: notif.createdAt,
            })
          }
        }
      } catch (error) {
        console.error('Error fetching mental prep notification:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMentalPrep()
  }, [])

  async function handleDismiss() {
    if (!notification) return
    setIsDismissing(true)

    try {
      await fetch(`/api/athlete/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      setNotification(null)
    } catch (error) {
      console.error('Error dismissing notification:', error)
    } finally {
      setIsDismissing(false)
    }
  }

  async function handleMarkRead() {
    if (!notification || notification.readAt) return
    setIsMarkingRead(true)

    try {
      await fetch(`/api/athlete/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      })
      setNotification({ ...notification, readAt: new Date().toISOString() })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setIsMarkingRead(false)
    }
  }

  function handleChatWithAI() {
    router.push('/athlete/chat')
  }

  // Don't render if loading or no notification
  if (isLoading) {
    return null
  }

  if (!notification) {
    return null
  }

  const config = PREP_TYPE_CONFIG[notification.prepType] || PREP_TYPE_CONFIG.VISUALIZATION
  const Icon = config.icon
  const distanceLabel = DISTANCE_LABELS[notification.distance] || notification.distance

  // Calculate progress dots (1, 2, or 3 based on days until race)
  const progressDots = [
    { active: notification.daysUntilRace <= 3, label: 'Visualisering' },
    { active: notification.daysUntilRace <= 2, label: 'Tävlingsplan' },
    { active: notification.daysUntilRace <= 1, label: 'Affirmationer' },
  ]

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                Mental förberedelse
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                {notification.daysUntilRace === 1
                  ? 'Imorgon'
                  : `${notification.daysUntilRace} dagar kvar`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/50"
            onClick={handleDismiss}
            disabled={isDismissing}
          >
            {isDismissing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Race info */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-purple-900 dark:text-purple-100">
            {notification.raceName}
          </span>
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
          >
            {distanceLabel}
          </Badge>
          {notification.targetTime && (
            <span className="text-sm text-purple-600 dark:text-purple-400">
              Mål: {notification.targetTime}
            </span>
          )}
        </div>

        {/* Prep type card */}
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-sm text-purple-900 dark:text-purple-100">
              {config.label}
            </span>
          </div>

          {/* Preview or full content */}
          <p className="text-sm text-purple-800 dark:text-purple-200">
            {isExpanded ? notification.content.mainContent : notification.content.preview}
          </p>

          {/* Bullet points when expanded */}
          {isExpanded && notification.content.bulletPoints.length > 0 && (
            <ul className="mt-2 space-y-1 pl-4">
              {notification.content.bulletPoints.map((point, index) => (
                <li
                  key={index}
                  className="text-xs text-purple-700 dark:text-purple-300 list-disc"
                >
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* Expand/collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
            />
            {isExpanded ? 'Visa mindre' : 'Läs hela'}
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {progressDots.map((dot, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  dot.active
                    ? 'bg-purple-600 dark:bg-purple-400'
                    : 'bg-purple-200 dark:bg-purple-700'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-purple-600 dark:text-purple-400">
            Dag {4 - notification.daysUntilRace} av 3
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!notification.readAt && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white/50 dark:bg-black/20 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              onClick={handleMarkRead}
              disabled={isMarkingRead}
            >
              {isMarkingRead ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Markera som läst
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-white/50 dark:bg-black/20 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50"
            onClick={handleChatWithAI}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chatta med AI
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
