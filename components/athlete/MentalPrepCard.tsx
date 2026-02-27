'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  X,
  Loader2,
  Target,
  Eye,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MENTAL_PREP_CHAT_EVENT, type MentalPrepChatEvent } from '@/lib/events/mental-prep-chat'

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
    description: 'Guidad mental bild av ditt lopp',
  },
  RACE_PLAN: {
    icon: Target,
    label: 'Tävlingsplan',
    description: 'Strategi och pacing för loppet',
  },
  AFFIRMATIONS: {
    icon: Sparkles,
    label: 'Affirmationer',
    description: 'Styrka och självförtroende inför start',
  },
}

const DISTANCE_LABELS: Record<string, string> = {
  '5K': '5 km',
  '10K': '10 km',
  HALF: 'Halvmaraton',
  MARATHON: 'Maraton',
}

export function MentalPrepCard() {
  const [notification, setNotification] = useState<MentalPrepNotification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => {
    async function fetchMentalPrep() {
      try {
        const response = await fetch('/api/athlete/notifications?type=MENTAL_PREP&limit=1')
        if (response.ok) {
          const data = await response.json()
          if (data.notifications && data.notifications.length > 0) {
            const notif = data.notifications[0]
            const contextData = notif.contextData as Record<string, unknown>

            // Calculate daysUntilRace from raceDate if missing or invalid
            let daysUntilRace = contextData.daysUntilRace as number
            if (daysUntilRace == null || isNaN(daysUntilRace)) {
              const raceDate = contextData.raceDate as string
              if (raceDate) {
                const raceDateObj = new Date(raceDate)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                raceDateObj.setHours(0, 0, 0, 0)
                daysUntilRace = Math.max(0, Math.ceil(
                  (raceDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                ))
              } else {
                daysUntilRace = 0
              }
            }

            setNotification({
              id: notif.id,
              prepType: contextData.prepType as MentalPrepNotification['prepType'],
              raceId: contextData.raceId as string,
              raceName: contextData.raceName as string,
              raceDate: contextData.raceDate as string,
              distance: contextData.distance as string,
              targetTime: contextData.targetTime as string | null,
              daysUntilRace,
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

  function handleStartMentalPrep() {
    if (!notification) return

    // Mark as read
    fetch(`/api/athlete/notifications/${notification.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read' }),
    }).catch(() => {})

    // Dispatch event to open floating chat with mental prep context
    const detail: MentalPrepChatEvent = {
      prepType: notification.prepType,
      raceName: notification.raceName,
      raceDate: notification.raceDate,
      distance: notification.distance,
      targetTime: notification.targetTime,
      daysUntilRace: notification.daysUntilRace,
    }

    window.dispatchEvent(new CustomEvent(MENTAL_PREP_CHAT_EVENT, { detail }))
  }

  if (isLoading || !notification) {
    return null
  }

  const config = PREP_TYPE_CONFIG[notification.prepType] || PREP_TYPE_CONFIG.VISUALIZATION
  const Icon = config.icon
  const distanceLabel = DISTANCE_LABELS[notification.distance] || notification.distance
  const dayNumber = Math.max(1, Math.min(3, 4 - notification.daysUntilRace))

  const progressDots = [
    { active: notification.daysUntilRace <= 3 },
    { active: notification.daysUntilRace <= 2 },
    { active: notification.daysUntilRace <= 1 },
  ]

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="shrink-0 p-2.5 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
            <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                Mental förberedelse
              </h3>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] px-1.5 py-0"
              >
                {distanceLabel}
              </Badge>
            </div>

            <p className="text-xs text-purple-700 dark:text-purple-300 truncate">
              {notification.raceName} — {notification.daysUntilRace === 1
                ? 'imorgon'
                : `${notification.daysUntilRace} dagar kvar`}
            </p>

            {/* Prep type + progress */}
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                <Icon className="h-3 w-3" />
                <span>{config.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {progressDots.map((dot, index) => (
                  <div
                    key={index}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      dot.active
                        ? 'bg-purple-600 dark:bg-purple-400'
                        : 'bg-purple-200 dark:bg-purple-700'
                    )}
                  />
                ))}
                <span className="text-[10px] text-purple-500 dark:text-purple-400 ml-0.5">
                  {dayNumber}/3
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs"
              onClick={handleStartMentalPrep}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Starta
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              onClick={handleDismiss}
              disabled={isDismissing}
            >
              {isDismissing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
