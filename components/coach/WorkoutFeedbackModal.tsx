// components/coach/WorkoutFeedbackModal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { Card, CardContent } from '@/components/ui/card'
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

const feedbackSchema = z.object({
  coachFeedback: z
    .string()
    .min(1, 'Feedback får inte vara tom')
    .max(500, 'Feedback får max vara 500 tecken'),
})

type FeedbackFormData = z.infer<typeof feedbackSchema>

interface WorkoutFeedbackModalProps {
  log: any
  workout: any
  athleteId?: string
}

export function WorkoutFeedbackModal({ log, workout, athleteId }: WorkoutFeedbackModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      coachFeedback: log.coachFeedback || '',
    },
  })

  const charCount = form.watch('coachFeedback')?.length || 0

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
        throw new Error(result.error || 'Misslyckades med att spara feedback')
      }

      toast({
        title: 'Feedback sparad!',
        description: 'Din feedback har sparats och kommer synas för atleten.',
      })

      setOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error('Error saving feedback:', error)
      toast({
        title: 'Något gick fel',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function sendMessageToAthlete() {
    if (!athleteId) {
      toast({
        title: 'Kunde inte skicka meddelande',
        description: 'Atlet-ID saknas',
        variant: 'destructive',
      })
      return
    }

    setSendingMessage(true)

    try {
      const messageContent = `Angående träningspass: ${workout.name}\n\n${form.getValues('coachFeedback') || 'Vill diskutera detta träningspass med dig.'}`

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
        throw new Error(result.error || 'Misslyckades med att skicka meddelande')
      }

      toast({
        title: 'Meddelande skickat!',
        description: 'Ditt meddelande har skickats till atleten.',
      })

      router.push('/coach/messages')
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: 'Kunde inte skicka meddelande',
        description: error.message,
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
              Redigera
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Lägg till feedback
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {log.coachFeedback ? 'Redigera feedback' : 'Lägg till feedback'}
          </DialogTitle>
          <DialogDescription>
            Ge feedback till atleten om detta träningspass
          </DialogDescription>
        </DialogHeader>

        {/* Workout Summary */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 space-y-3">
            <div>
              <h3 className="font-semibold text-lg mb-1">{workout.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{formatWorkoutType(workout.type)}</Badge>
                <Badge variant="outline">{formatIntensity(workout.intensity)}</Badge>
              </div>
            </div>

            {/* Performance Data */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground mb-2 font-medium">
                  Planerat
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
                  Faktiskt
                </p>
                {log.duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{log.duration} min</span>
                    {workout.duration && (
                      <span
                        className={
                          log.duration >= workout.duration
                            ? 'text-green-600'
                            : 'text-orange-600'
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
                            ? 'text-green-600'
                            : 'text-orange-600'
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
                    <span className="text-muted-foreground">Tempo:</span>
                    <span>{log.avgPace}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subjective Data */}
            {(log.perceivedEffort || log.avgHR || log.maxHR) && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2 font-medium">
                  Upplevelse & Data
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
                        Snitt-puls: <strong>{log.avgHR} bpm</strong>
                      </span>
                    </div>
                  )}
                  {log.maxHR && (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">
                        Max-puls: <strong>{log.maxHR} bpm</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Athlete Notes */}
            {(log.feeling || log.notes) && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1 font-medium">
                  Atlets anteckningar
                </p>
                {log.feeling && (
                  <p className="text-sm mb-1">
                    <span className="text-muted-foreground">Känsla:</span>{' '}
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
                  <FormLabel>Din feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Skriv din feedback till atleten här..."
                      rows={6}
                      className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>Ge konstruktiv feedback om passet och prestationen</span>
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
                        Skickar...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Skicka meddelande
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
                  Avbryt
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Spara feedback
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
function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    CORE: 'Core',
    PLYOMETRIC: 'Plyometri',
    RECOVERY: 'Återhämtning',
    SKIING: 'Skidåkning',
    OTHER: 'Annat',
  }
  return types[type] || type
}

function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}
