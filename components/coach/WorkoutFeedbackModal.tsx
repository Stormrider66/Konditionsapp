// components/coach/WorkoutFeedbackModal.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from '@/i18n/client'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
} from '@/components/layouts/role-shell/RolePage'
import { useToast } from '@/hooks/use-toast'
import {
  MessageSquare,
  Loader2,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  Edit,
  Plus,
  Mail,
} from 'lucide-react'

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function createFeedbackSchema(locale: AppLocale) {
  return z.object({
    coachFeedback: z
      .string()
      .min(1, copy(locale, 'Feedback cannot be empty', 'Feedback får inte vara tom'))
      .max(500, copy(locale, 'Feedback can be at most 500 characters', 'Feedback får max vara 500 tecken')),
  })
}

type FeedbackFormData = {
  coachFeedback: string
}

interface IntervalRep {
  repNumber: number
  pace?: string | null
  avgPower?: number | null
  avgHR?: number | null
  maxHR?: number | null
  duration?: number | null
  distance?: number | null
}

interface IntervalSegment {
  segmentLabel: string
  reps?: IntervalRep[]
}

interface WorkoutLog {
  id: string
  coachFeedback?: string | null
  duration?: number | null
  distance?: number | null
  avgPace?: string | null
  perceivedEffort?: number | null
  avgHR?: number | null
  maxHR?: number | null
  intervalResults?: unknown
  feeling?: string | null
  notes?: string | null
}

interface WorkoutSummary {
  id: string
  name: string
  type: string
  intensity: string
  duration?: number | null
  distance?: number | null
}

interface WorkoutFeedbackModalProps {
  log: WorkoutLog
  workout: WorkoutSummary
  athleteId?: string
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function WorkoutFeedbackModal({ log, workout, athleteId }: WorkoutFeedbackModalProps) {
  const router = useRouter()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const feedbackSchema = useMemo(() => createFeedbackSchema(locale), [locale])

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      coachFeedback: log.coachFeedback || '',
    },
  })

  const feedbackValue = useWatch({ control: form.control, name: 'coachFeedback' })
  const charCount = feedbackValue?.length || 0
  const intervalResults = Array.isArray(log.intervalResults)
    ? (log.intervalResults as IntervalSegment[])
    : []

  async function onSubmit(data: FeedbackFormData) {
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `/api/workouts/${workout.id}/logs/${log.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || copy(locale, 'Failed to save feedback', 'Misslyckades med att spara feedback'))
      }

      toast({
        title: copy(locale, 'Feedback saved!', 'Feedback sparad!'),
        description: copy(locale, 'Your feedback has been saved and will be visible to the athlete.', 'Din feedback har sparats och kommer synas för atleten.'),
      })

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving feedback:', error)
      toast({
        title: copy(locale, 'Something went wrong', 'Något gick fel'),
        description: errorMessage(error, copy(locale, 'Try again.', 'Försök igen.')),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function sendMessageToAthlete() {
    if (!athleteId) {
      toast({
        title: copy(locale, 'Could not send message', 'Kunde inte skicka meddelande'),
        description: copy(locale, 'Athlete ID is missing', 'Atlet-ID saknas'),
        variant: 'destructive',
      })
      return
    }

    setSendingMessage(true)

    try {
      const messageContent = `${copy(locale, 'Regarding workout:', 'Angående träningspass:')} ${workout.name}\n\n${form.getValues('coachFeedback') || copy(locale, 'I would like to discuss this workout with you.', 'Vill diskutera detta träningspass med dig.')}`

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: athleteId,
          content: messageContent,
          workoutId: workout.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || copy(locale, 'Failed to send message', 'Misslyckades med att skicka meddelande'))
      }

      toast({
        title: copy(locale, 'Message sent!', 'Meddelande skickat!'),
        description: copy(locale, 'Your message has been sent to the athlete.', 'Ditt meddelande har skickats till atleten.'),
      })

      router.push(`${basePath}/coach/messages`)
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: copy(locale, 'Could not send message', 'Kunde inte skicka meddelande'),
        description: errorMessage(error, copy(locale, 'Try again.', 'Försök igen.')),
        variant: 'destructive',
      })
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={log.coachFeedback ? 'outline' : 'default'} size="sm">
          {log.coachFeedback ? (
            <>
              <Edit className="h-4 w-4 mr-1" />
              {copy(locale, 'Edit', 'Redigera')}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              {copy(locale, 'Add feedback', 'Lägg till feedback')}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {log.coachFeedback
              ? copy(locale, 'Edit feedback', 'Redigera feedback')
              : copy(locale, 'Add feedback', 'Lägg till feedback')}
          </DialogTitle>
          <DialogDescription>
            {copy(locale, 'Give the athlete feedback about this workout', 'Ge feedback till atleten om detta träningspass')}
          </DialogDescription>
        </DialogHeader>

        {/* Workout Summary */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 space-y-3">
            <div>
              <h3 className="font-semibold text-lg mb-1">{workout.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{formatWorkoutType(workout.type, locale)}</Badge>
                <Badge variant="outline">{formatIntensity(workout.intensity, locale)}</Badge>
              </div>
            </div>

            {/* Performance Data */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground mb-2 font-medium">
                  {copy(locale, 'Planned', 'Planerat')}
                </p>
                {workout.duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{workout.duration} min</span>
                  </div>
                )}
                {workout.distance && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span>{workout.distance} km</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2 font-medium">
                  {copy(locale, 'Actual', 'Faktiskt')}
                </p>
                {log.duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{log.duration} min</span>
                    {workout.duration && (
                      <span
                        className={
                          log.duration >= workout.duration
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        ({log.duration >= workout.duration ? '+' : ''}
                        {log.duration - workout.duration})
                      </span>
                    )}
                  </div>
                )}
                {log.distance && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span>{log.distance} km</span>
                    {workout.distance && (
                      <span
                        className={
                          log.distance >= workout.distance
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        ({log.distance >= workout.distance ? '+' : ''}
                        {(log.distance - workout.distance).toFixed(1)})
                      </span>
                    )}
                  </div>
                )}
                {log.avgPace && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{copy(locale, 'Pace:', 'Tempo:')}</span>
                    <span>{log.avgPace}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subjective Data */}
            {(log.perceivedEffort || log.avgHR || log.maxHR) && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2 font-medium">
                  {copy(locale, 'Experience & data', 'Upplevelse & Data')}
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  {log.perceivedEffort && (
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm">
                        RPE: <strong>{log.perceivedEffort}/10</strong>
                      </span>
                    </div>
                  )}
                  {log.avgHR && (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">
                        {copy(locale, 'Avg HR:', 'Snitt-puls:')} <strong>{log.avgHR} bpm</strong>
                      </span>
                    </div>
                  )}
                  {log.maxHR && (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">
                        {copy(locale, 'Max HR:', 'Max-puls:')} <strong>{log.maxHR} bpm</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interval Results */}
            {intervalResults.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2 font-medium">
                  {copy(locale, 'Interval results', 'Intervallresultat')}
                </p>
                <div className="space-y-3">
                  {intervalResults.map((segment, segIdx) => (
                    <div key={segIdx} className="space-y-1">
                      <Badge variant="secondary" className="text-xs mb-1">
                        {segment.segmentLabel}
                      </Badge>
                      <div className="space-y-1">
                        {segment.reps?.map((rep, repIdx) => (
                          <div
                            key={repIdx}
                            className="flex items-center gap-3 text-sm pl-2"
                          >
                            <span className="text-muted-foreground font-mono w-5">#{rep.repNumber}</span>
                            <div className="flex items-center gap-3 flex-wrap">
                              {rep.pace && (
                                <span>{copy(locale, 'Pace:', 'Tempo:')} <strong>{rep.pace}</strong></span>
                              )}
                              {rep.avgPower && (
                                <span>{copy(locale, 'Power:', 'Effekt:')} <strong>{rep.avgPower}W</strong></span>
                              )}
                              {rep.avgHR && (
                                <span>
                                  <Heart className="inline h-3 w-3 mr-0.5" />
                                  <strong>{rep.avgHR}</strong>
                                  {rep.maxHR && (
                                    <span className="text-muted-foreground"> (max {rep.maxHR})</span>
                                  )}
                                </span>
                              )}
                              {!rep.avgHR && rep.maxHR && (
                                <span>
                                  <Heart className="inline h-3 w-3 mr-0.5 text-red-500" />
                                  {copy(locale, 'max', 'max')} <strong>{rep.maxHR}</strong>
                                </span>
                              )}
                              {rep.duration && (
                                <span className="text-muted-foreground">{rep.duration}s</span>
                              )}
                              {rep.distance && (
                                <span className="text-muted-foreground">{rep.distance} km</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Athlete Notes */}
            {(log.feeling || log.notes) && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1 font-medium">
                  {copy(locale, 'Athlete notes', 'Atlets anteckningar')}
                </p>
                {log.feeling && (
                  <p className="text-sm mb-1">
                    <span className="text-muted-foreground">{copy(locale, 'Feeling:', 'Känsla:')}</span>{' '}
                    <span className="font-medium">{log.feeling}</span>
                  </p>
                )}
                {log.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    &quot;{log.notes}&quot;
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="coachFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy(locale, 'Your feedback', 'Din feedback')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={copy(locale, 'Write your feedback to the athlete here...', 'Skriv din feedback till atleten här...')}
                      rows={6}
                      className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>{copy(locale, 'Give constructive feedback about the session and performance', 'Ge konstruktiv feedback om passet och prestationen')}</span>
                    <span
                      className={charCount > 500 ? 'text-destructive' : ''}
                    >
                      {charCount}/500
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                {athleteId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendMessageToAthlete}
                    disabled={isSubmitting || sendingMessage}
                    className="flex-1 sm:flex-initial"
                  >
                    {sendingMessage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {copy(locale, 'Sending...', 'Skickar...')}
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {copy(locale, 'Send message', 'Skicka meddelande')}
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  {copy(locale, 'Cancel', 'Avbryt')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {copy(locale, 'Save feedback', 'Spara feedback')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions
function formatWorkoutType(type: string, locale: AppLocale): string {
  const types: Record<string, Record<AppLocale, string>> = {
    RUNNING: { en: 'Running', sv: 'Löpning' },
    CYCLING: { en: 'Cycling', sv: 'Cykling' },
    STRENGTH: { en: 'Strength', sv: 'Styrka' },
    CORE: { en: 'Core', sv: 'Core' },
    PLYOMETRIC: { en: 'Plyometrics', sv: 'Plyometri' },
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    SKIING: { en: 'Skiing', sv: 'Skidåkning' },
    OTHER: { en: 'Other', sv: 'Annat' },
  }
  return types[type]?.[locale] || type
}

function formatIntensity(intensity: string, locale: AppLocale): string {
  const intensities: Record<string, Record<AppLocale, string>> = {
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    EASY: { en: 'Easy', sv: 'Lätt' },
    MODERATE: { en: 'Moderate', sv: 'Måttlig' },
    THRESHOLD: { en: 'Threshold', sv: 'Tröskel' },
    INTERVAL: { en: 'Interval', sv: 'Intervall' },
    MAX: { en: 'Max', sv: 'Max' },
  }
  return intensities[intensity]?.[locale] || intensity
}
