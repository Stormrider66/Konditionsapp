'use client'

/**
 * Voice Workout Confirmation
 *
 * Final confirmation:
 * - Workout summary
 * - Assignment list
 * - Calendar event preview
 * - Confirm/Cancel buttons
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Clock,
  Users,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Activity,
  Dumbbell,
  Heart,
  Send,
} from 'lucide-react'
import type { VoiceWorkoutPreview } from '@/types/voice-workout'

interface VoiceWorkoutConfirmationProps {
  preview: VoiceWorkoutPreview
  onConfirm: (options: {
    targetType: 'ATHLETE' | 'TEAM'
    targetId: string
    assignedDate: string
    createCalendarEvent?: boolean
    calendarEventTime?: string
  }) => void
  isSubmitting?: boolean
}

export function VoiceWorkoutConfirmation({
  preview,
  onConfirm,
  isSubmitting,
}: VoiceWorkoutConfirmationProps) {
  const { parsedIntent, generatedWorkout, targetInfo, calendarPreview, guardrailWarnings } =
    preview

  const [createCalendarEvent, setCreateCalendarEvent] = useState(true)
  const [calendarTime, setCalendarTime] = useState(
    parsedIntent.schedule.resolvedTime || ''
  )

  const getWorkoutTypeIcon = (type: string) => {
    switch (type) {
      case 'CARDIO':
        return <Heart className="h-5 w-5 text-red-500" />
      case 'STRENGTH':
        return <Dumbbell className="h-5 w-5 text-orange-500" />
      case 'HYBRID':
        return <Activity className="h-5 w-5 text-purple-500" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const handleConfirm = () => {
    if (!parsedIntent.target.resolvedId || !parsedIntent.schedule.resolvedDate) {
      return
    }

    onConfirm({
      targetType: parsedIntent.target.type,
      targetId: parsedIntent.target.resolvedId,
      assignedDate: parsedIntent.schedule.resolvedDate,
      createCalendarEvent,
      calendarEventTime: calendarTime || undefined,
    })
  }

  const canConfirm =
    parsedIntent.target.resolvedId && parsedIntent.schedule.resolvedDate && !isSubmitting

  return (
    <div className="space-y-4">
      {/* Workout Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {getWorkoutTypeIcon(generatedWorkout.type)}
            <div>
              <CardTitle>{generatedWorkout.name}</CardTitle>
              <CardDescription>
                {generatedWorkout.type}
                {parsedIntent.workout.duration && ` • ${parsedIntent.workout.duration} min`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {generatedWorkout.description && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{generatedWorkout.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Assignment Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {parsedIntent.target.type === 'TEAM' ? (
              <Users className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
            Tilldelas till
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Athletes list */}
          {targetInfo.athletes.length > 0 ? (
            <div className="space-y-2">
              {targetInfo.athletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {athlete.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <span className="font-medium text-sm">{athlete.name}</span>
                  </div>
                  {athlete.warnings && athlete.warnings.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {athlete.warnings.length} varning(ar)
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen mottagare vald</p>
          )}

          {/* Warnings */}
          {targetInfo.athletes.some((a) => a.warnings && a.warnings.length > 0) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="text-sm space-y-1">
                  {targetInfo.athletes
                    .filter((a) => a.warnings)
                    .flatMap((a) =>
                      a.warnings!.map((w, i) => (
                        <li key={`${a.id}-${i}`}>
                          <strong>{a.name}:</strong> {w}
                        </li>
                      ))
                    )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Date */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Datum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-semibold">
              {parsedIntent.schedule.resolvedDate
                ? new Date(parsedIntent.schedule.resolvedDate).toLocaleDateString('sv-SE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Ej angivet'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Event Option */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="calendar-event" className="font-medium">
                Skapa kalenderhändelse
              </Label>
              <p className="text-sm text-muted-foreground">
                Lägg till passet i atletens kalender
              </p>
            </div>
            <Switch
              id="calendar-event"
              checked={createCalendarEvent}
              onCheckedChange={setCreateCalendarEvent}
            />
          </div>

          {createCalendarEvent && (
            <div className="mt-4 pt-4 border-t">
              <Label htmlFor="event-time" className="text-sm">
                Tid (valfritt)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="event-time"
                  type="time"
                  value={calendarTime}
                  onChange={(e) => setCalendarTime(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guardrail warnings */}
      {guardrailWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Varningar att notera:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {guardrailWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <p className="font-medium">Sammanfattning</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Skapar {generatedWorkout.type.toLowerCase()}-pass: &ldquo;{generatedWorkout.name}&rdquo;
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Tilldelar till {targetInfo.athletes.length} atlet(er)
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Datum: {parsedIntent.schedule.resolvedDate}
          </li>
          {createCalendarEvent && (
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Skapar kalenderhändelse
              {calendarTime && ` kl ${calendarTime}`}
            </li>
          )}
        </ul>
      </div>

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Skapar pass...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Bekräfta och skapa pass
          </>
        )}
      </Button>

      {!canConfirm && !isSubmitting && (
        <p className="text-center text-sm text-muted-foreground">
          Välj mottagare och datum för att fortsätta
        </p>
      )}
    </div>
  )
}
