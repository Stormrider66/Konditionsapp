'use client'

/**
 * Workout Intent Preview
 *
 * Displays parsed intent with edit capability:
 * - Target (athlete/team) with dropdown to change
 * - Date/time pickers for correction
 * - Workout type and structure preview
 * - Confidence indicators
 * - Ambiguity warnings
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  User,
  Calendar,
  Clock,
  Activity,
  Dumbbell,
  Heart,
  AlertTriangle,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { TargetSelector } from './TargetSelector'
import type { VoiceWorkoutPreview, VoiceWorkoutIntent } from '@/types/voice-workout'
import { cn } from '@/lib/utils'

interface WorkoutIntentPreviewProps {
  preview: VoiceWorkoutPreview
  onUpdate: (updates: Partial<VoiceWorkoutIntent>) => void
}

export function WorkoutIntentPreview({ preview, onUpdate }: WorkoutIntentPreviewProps) {
  const { parsedIntent, generatedWorkout, guardrailWarnings, targetInfo } = preview
  const [isEditingTarget, setIsEditingTarget] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [editDate, setEditDate] = useState(parsedIntent.schedule.resolvedDate || '')
  const [editTime, setEditTime] = useState(parsedIntent.schedule.resolvedTime || '')

  const handleTargetSelect = (type: 'ATHLETE' | 'TEAM', id: string, name: string) => {
    onUpdate({
      target: {
        ...parsedIntent.target,
        type,
        resolvedId: id,
        name,
        confidence: 1,
      },
    })
    setIsEditingTarget(false)
  }

  const handleDateSave = () => {
    onUpdate({
      schedule: {
        ...parsedIntent.schedule,
        resolvedDate: editDate || undefined,
        resolvedTime: editTime || undefined,
      },
    })
    setIsEditingDate(false)
  }

  const getWorkoutTypeIcon = (type: string) => {
    switch (type) {
      case 'CARDIO':
        return <Heart className="h-4 w-4" />
      case 'STRENGTH':
        return <Dumbbell className="h-4 w-4" />
      case 'HYBRID':
        return <Activity className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-green-500">Hög säkerhet</Badge>
    }
    if (confidence >= 0.5) {
      return <Badge variant="secondary" className="bg-yellow-500">Medel säkerhet</Badge>
    }
    return <Badge variant="destructive">Låg säkerhet</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Transcription */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transkription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm italic">&ldquo;{parsedIntent.transcription}&rdquo;</p>
        </CardContent>
      </Card>

      {/* Target */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {parsedIntent.target.type === 'TEAM' ? (
                <Users className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              Mottagare
            </CardTitle>
            {!isEditingTarget && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingTarget(true)}>
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingTarget ? (
            <div className="space-y-3">
              <TargetSelector
                onSelect={handleTargetSelect}
                selectedType={parsedIntent.target.type}
                selectedId={parsedIntent.target.resolvedId}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTarget(false)}
              >
                <X className="h-3 w-3 mr-1" /> Avbryt
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {parsedIntent.target.resolvedId
                    ? targetInfo.athletes[0]?.name || parsedIntent.target.name
                    : parsedIntent.target.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {parsedIntent.target.type === 'TEAM'
                    ? `Lag (${targetInfo.athletes.length} atleter)`
                    : 'Enskild atlet'}
                </p>
              </div>
              {getConfidenceBadge(parsedIntent.target.confidence)}
            </div>
          )}

          {/* Show alternatives if low confidence */}
          {!isEditingTarget &&
            parsedIntent.target.confidence < 0.7 &&
            parsedIntent.target.alternatives && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Menade du kanske:</p>
                <div className="flex flex-wrap gap-2">
                  {parsedIntent.target.alternatives.slice(0, 4).map((alt) => (
                    <Button
                      key={alt.id}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleTargetSelect(parsedIntent.target.type, alt.id, alt.name)
                      }
                    >
                      {alt.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Date/Time */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datum & Tid
            </CardTitle>
            {!isEditingDate && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingDate(true)}>
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingDate ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date" className="text-xs">
                    Datum
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="time" className="text-xs">
                    Tid (valfritt)
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDateSave}>
                  <Check className="h-3 w-3 mr-1" /> Spara
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingDate(false)}
                >
                  <X className="h-3 w-3 mr-1" /> Avbryt
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">
                  {parsedIntent.schedule.resolvedDate || 'Ej angivet'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {parsedIntent.schedule.dateText}
                </p>
              </div>
              {parsedIntent.schedule.resolvedTime && (
                <>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{parsedIntent.schedule.resolvedTime}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workout */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {getWorkoutTypeIcon(parsedIntent.workout.type)}
            Träningspass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{generatedWorkout.name}</p>
              <p className="text-sm text-muted-foreground">
                {parsedIntent.workout.subtype && `${parsedIntent.workout.subtype} • `}
                {parsedIntent.workout.type}
                {parsedIntent.workout.duration && ` • ${parsedIntent.workout.duration} min`}
              </p>
            </div>
            <Badge variant="outline">{parsedIntent.workout.type}</Badge>
          </div>

          {/* Structure preview */}
          {parsedIntent.workout.structure.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Struktur:</p>
              <div className="space-y-1">
                {parsedIntent.workout.structure.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded"
                  >
                    <Badge variant="outline" className="text-xs">
                      {item.type === 'warmup' && 'Uppvärmning'}
                      {item.type === 'main' && 'Huvudpass'}
                      {item.type === 'cooldown' && 'Nedvarvning'}
                      {item.type === 'interval' && 'Intervall'}
                      {item.type === 'exercise' && 'Övning'}
                      {item.type === 'rest' && 'Vila'}
                    </Badge>
                    <span className="flex-1">
                      {item.exerciseName ||
                        (item.duration && `${item.duration} min`) ||
                        (item.reps && `${item.reps}x`) ||
                        item.description}
                    </span>
                    {item.zone && (
                      <Badge variant="secondary" className="text-xs">
                        Zon {item.zone}
                      </Badge>
                    )}
                    {item.sets && item.repsCount && (
                      <span className="text-xs text-muted-foreground">
                        {item.sets}x{item.repsCount}
                      </span>
                    )}
                  </div>
                ))}
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
            <p className="font-medium mb-1">Varningar:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {guardrailWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Ambiguities */}
      {parsedIntent.ambiguities.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Behöver förtydligas:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {parsedIntent.ambiguities.map((ambiguity, i) => (
                <li key={i}>{ambiguity}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Issues blocking save */}
      {preview.issues && preview.issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Måste åtgärdas:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {preview.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Overall confidence */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">Total säkerhet i tolkning</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                parsedIntent.confidence >= 0.8
                  ? 'bg-green-500'
                  : parsedIntent.confidence >= 0.5
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              style={{ width: `${parsedIntent.confidence * 100}%` }}
            />
          </div>
          <span className="text-sm font-mono">
            {Math.round(parsedIntent.confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
