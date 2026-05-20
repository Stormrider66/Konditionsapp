'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from '@/i18n/client'
import { GlassCard, GlassCardHeader, GlassCardContent } from '@/components/ui/GlassCard'
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

export function PostWorkoutCheckCard() {
  const t = useTranslations('components.postWorkoutCheckCard')
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
              void fetch(`/api/athlete/notifications/${n.id}`, {
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

    void fetchNotifications()
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
      return t('time.hoursAgo', { count: diffHours })
    }
    return t('time.minutesAgo', { count: diffMins })
  }

  function getEnergyLabel(value: number) {
    if (value === 1) return t('scales.energy.exhausted')
    if (value === 5) return t('scales.energy.normal')
    if (value === 10) return t('scales.energy.energized')
    return value
  }

  function getDifficultyLabel(value: number) {
    if (value === 1) return t('scales.difficulty.easy')
    if (value === 5) return t('scales.difficulty.planned')
    if (value === 10) return t('scales.difficulty.extremelyHeavy')
    return value
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
          <GlassCard
            key={notification.id}
            glow="emerald"
            gradient
            className="group border-emerald-200/30 dark:border-emerald-800/20 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300"
          >
            <GlassCardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20 rounded-full shadow-inner transition-all duration-300 group-hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>{context?.workoutName}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>{timeSince}</span>
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
              {/* Greeting message */}
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {notification.message}
              </p>

              {/* Expand to show feedback form */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <ChevronRight
                  className={cn('h-4 w-4 transition-transform duration-250', isExpanded && 'rotate-90')}
                />
                {isExpanded ? t('actions.hideForm') : t('actions.giveFeedback')}
              </button>

              {isExpanded && feedback && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800/60">
                  {/* Overall Feeling */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t('fields.overallFeeling')}
                    </Label>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/35 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                      <span className="text-2xl w-8 text-center">{feelingEmojis[feedback.overallFeeling - 1]}</span>
                      <Slider
                        value={[feedback.overallFeeling]}
                        onValueChange={([v]) => updateFeedback(notification.id, 'overallFeeling', v)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 w-6 text-right">
                        {feedback.overallFeeling}
                      </span>
                    </div>
                  </div>

                  {/* Energy Level */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t('fields.energy')}
                    </Label>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/35 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                      <Zap className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <Slider
                        value={[feedback.energyLevel]}
                        onValueChange={([v]) => updateFeedback(notification.id, 'energyLevel', v)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-16 text-right">
                        {getEnergyLabel(feedback.energyLevel)}
                      </span>
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t('fields.difficulty')}
                    </Label>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/35 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                      <ThumbsUp className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <Slider
                        value={[feedback.difficulty]}
                        onValueChange={([v]) => updateFeedback(notification.id, 'difficulty', v)}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-20 text-right">
                        {getDifficultyLabel(feedback.difficulty)}
                      </span>
                    </div>
                  </div>

                  {/* Pain/Discomfort */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-emerald-500" />
                      {t('fields.pain')}
                    </Label>
                    <Textarea
                      value={feedback.painOrDiscomfort}
                      onChange={(e) =>
                        updateFeedback(notification.id, 'painOrDiscomfort', e.target.value)
                      }
                      placeholder={t('placeholders.pain')}
                      className="min-h-[60px] bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 text-slate-900 dark:text-white rounded-xl focus-visible:ring-emerald-500/30 transition-all"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t('fields.notes')}
                    </Label>
                    <Textarea
                      value={feedback.notes}
                      onChange={(e) => updateFeedback(notification.id, 'notes', e.target.value)}
                      placeholder={t('placeholders.notes')}
                      className="min-h-[60px] bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 text-slate-900 dark:text-white rounded-xl focus-visible:ring-emerald-500/30 transition-all"
                    />
                  </div>

                  {/* Recovery Tip */}
                  {context?.recoveryTip && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/30 bg-emerald-500/5 text-xs text-slate-700 dark:text-slate-300 transition-all duration-300">
                      <Sparkles className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="leading-normal">{context.recoveryTip}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={() => handleSubmit(notification)}
                    disabled={submittingId === notification.id}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold shadow-sm hover:shadow transition-all duration-200"
                  >
                    {submittingId === notification.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('actions.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t('actions.submit')}
                      </>
                    )}
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
