'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  ClipboardCheck,
  X,
  ChevronRight,
  Send,
  Loader2,
  Sparkles,
  Zap,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextData {
  workoutId: string
  workoutType: string
  workoutName: string
  completedAt: string
  duration?: number
  questions: string[]
  recoveryTip: string
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

const feelingEmojis = ['😫', '😔', '😐', '🙂', '😊', '😄', '🤩', '💪', '🔥', '⭐']
const energyLabels = ['Utmattad', '', '', '', 'Normal', '', '', '', '', 'Energisk']
const difficultyLabels = ['Lätt', '', '', '', 'Som planerat', '', '', '', '', 'Extremt tungt']

export function PostWorkoutCheckCard() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Feedback form state (per notification)
  const [feedbackState, setFeedbackState] = useState<
    Record<
      string,
      {
        overallFeeling: number
        energyLevel: number
        difficulty: number
        painOrDiscomfort: string
        notes: string
      }
    >
  >({})

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/athlete/notifications')
        if (response.ok) {
          const data = await response.json()
          // Filter for post-workout check notifications
          const postWorkoutNotifications = (data.notifications || []).filter(
            (n: Notification) => n.notificationType === 'POST_WORKOUT_CHECK'
          )
          setNotifications(postWorkoutNotifications)

          // Initialize feedback state for each notification
          const initialState: typeof feedbackState = {}
          for (const n of postWorkoutNotifications) {
            initialState[n.id] = {
              overallFeeling: 7,
              energyLevel: 5,
              difficulty: 5,
              painOrDiscomfort: '',
              notes: '',
            }

            // Mark as read
            if (!n.readAt) {
              fetch(`/api/athlete/notifications/${n.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'read' }),
              })
            }
          }
          setFeedbackState(initialState)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  function updateFeedback(
    notificationId: string,
    field: string,
    value: number | string
  ) {
    setFeedbackState((prev) => ({
      ...prev,
      [notificationId]: {
        ...prev[notificationId],
        [field]: value,
      },
    }))
  }

  async function handleSubmit(notification: Notification) {
    const feedback = feedbackState[notification.id]
    if (!feedback) return

    setSubmittingId(notification.id)

    try {
      const response = await fetch('/api/athlete/workout-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: notification.id,
          overallFeeling: feedback.overallFeeling,
          energyLevel: feedback.energyLevel,
          difficulty: feedback.difficulty,
          painOrDiscomfort: feedback.painOrDiscomfort || undefined,
          notes: feedback.notes || undefined,
        }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmittingId(null)
    }
  }

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

  function getTimeSinceCompletion(completedAt: string): string {
    const completed = new Date(completedAt)
    const now = new Date()
    const diffMs = now.getTime() - completed.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)

    if (diffHours >= 1) {
      return `${diffHours}h sedan`
    }
    return `${diffMins} min sedan`
  }

  // Don't render if loading or no notifications
  if (isLoading || notifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => {
        const context = notification.contextData as ContextData
        const isExpanded = expandedId === notification.id
        const feedback = feedbackState[notification.id]
        const timeSince = getTimeSinceCompletion(context?.completedAt || notification.createdAt)

        return (
          <Card
            key={notification.id}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 overflow-hidden"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                      <span>{context?.workoutName}</span>
                      <span className="text-emerald-400">•</span>
                      <span>{timeSince}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
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

            <CardContent className="space-y-4">
              {/* Greeting message */}
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                {notification.message}
              </p>

              {/* Expand to show feedback form */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200"
              >
                <ChevronRight
                  className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
                />
                {isExpanded ? 'Dölj formulär' : 'Ge feedback'}
              </button>

              {isExpanded && feedback && (
                <div className="space-y-4 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                  {/* Overall Feeling */}
                  <div className="space-y-2">
                    <Label className="text-sm text-emerald-800 dark:text-emerald-200">
                      Hur kändes passet överlag?
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{feelingEmojis[feedback.overallFeeling - 1]}</span>
                      <Slider
                        value={[feedback.overallFeeling]}
                        onValueChange={([v]) => updateFeedback(notification.id, 'overallFeeling', v)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 w-6">
                        {feedback.overallFeeling}
                      </span>
                    </div>
                  </div>

                  {/* Energy Level */}
                  <div className="space-y-2">
                    <Label className="text-sm text-emerald-800 dark:text-emerald-200">
                      Energinivå under passet?
                    </Label>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-emerald-500" />
                      <Slider
                        value={[feedback.energyLevel]}
                        onValueChange={([v]) => updateFeedback(notification.id, 'energyLevel', v)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 w-16 text-right">
                        {energyLabels[feedback.energyLevel - 1] || feedback.energyLevel}
                      </span>
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <Label className="text-sm text-emerald-800 dark:text-emerald-200">
                      Hur tungt kändes det?
                    </Label>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-emerald-500" />
                      <Slider
                        value={[feedback.difficulty]}
                        onValueChange={([v]) => updateFeedback(notification.id, 'difficulty', v)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 w-24 text-right">
                        {difficultyLabels[feedback.difficulty - 1] || feedback.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Pain/Discomfort */}
                  <div className="space-y-2">
                    <Label className="text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Smärta eller obehag? (valfritt)
                    </Label>
                    <Textarea
                      value={feedback.painOrDiscomfort}
                      onChange={(e) =>
                        updateFeedback(notification.id, 'painOrDiscomfort', e.target.value)
                      }
                      placeholder="Beskriv eventuell smärta eller obehag..."
                      className="min-h-[60px] bg-white/50 dark:bg-black/20 border-emerald-200 dark:border-emerald-700"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm text-emerald-800 dark:text-emerald-200">
                      Övriga anteckningar (valfritt)
                    </Label>
                    <Textarea
                      value={feedback.notes}
                      onChange={(e) => updateFeedback(notification.id, 'notes', e.target.value)}
                      placeholder="Något annat du vill notera..."
                      className="min-h-[60px] bg-white/50 dark:bg-black/20 border-emerald-200 dark:border-emerald-700"
                    />
                  </div>

                  {/* Recovery Tip */}
                  {context?.recoveryTip && (
                    <div className="flex items-start gap-2 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {context.recoveryTip}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={() => handleSubmit(notification)}
                    disabled={submittingId === notification.id}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submittingId === notification.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Skickar...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Skicka feedback
                      </>
                    )}
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
