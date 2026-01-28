'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Brain, Activity, Moon, Heart } from 'lucide-react'

// Types for the modal
export type AISuggestionType =
  | 'WORKOUT'
  | 'ZONE_CALCULATION'
  | 'PROGRAM_PERIODIZATION'
  | 'RECOVERY_RECOMMENDATION'
  | 'LOAD_ADJUSTMENT'
  | 'EXERCISE_SELECTION'
  | 'INTENSITY_PRESCRIPTION'
  | 'VOLUME_PRESCRIPTION'
  | 'TAPER_PLAN'
  | 'OTHER'

export type DecisionReason =
  | 'ATHLETE_FEEDBACK'
  | 'FATIGUE_OBSERVED'
  | 'HRV_LOW'
  | 'SLEEP_POOR'
  | 'INJURY_CONCERN'
  | 'SCHEDULE_CONFLICT'
  | 'PROGRESSION_ADJUSTMENT'
  | 'WEATHER_CONDITIONS'
  | 'EQUIPMENT_UNAVAILABLE'
  | 'COACH_INTUITION'
  | 'ATHLETE_PREFERENCE'
  | 'TECHNIQUE_FOCUS'
  | 'MENTAL_FRESHNESS'
  | 'TRAVEL_FATIGUE'
  | 'ILLNESS_RECOVERY'
  | 'COMPETITION_PROXIMITY'
  | 'OTHER'

export interface AthleteContext {
  hrv?: number
  hrvTrend?: 'improving' | 'stable' | 'declining'
  sleepScore?: number
  fatigueLevel?: number
  readinessScore?: number
  recentInjury?: string
  lastWorkoutRPE?: number
}

export interface CoachDecisionData {
  athleteId: string
  aiSuggestionType: AISuggestionType
  aiSuggestionData: Record<string, unknown>
  aiConfidence?: number
  modificationData: Record<string, unknown>
  modificationMagnitude?: number
  reasonCategory: DecisionReason
  reasonNotes?: string
  coachConfidence?: number
  athleteContext?: AthleteContext
  workoutId?: string
  programId?: string
}

interface CoachDecisionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CoachDecisionData) => Promise<void>
  onSkip?: () => void
  athleteId: string
  athleteName: string
  aiSuggestionType: AISuggestionType
  aiSuggestionData: Record<string, unknown>
  modificationData: Record<string, unknown>
  aiConfidence?: number
  athleteContext?: AthleteContext
  workoutId?: string
  programId?: string
  suggestionSummary?: string // Human-readable summary of what AI suggested
  modificationSummary?: string // Human-readable summary of what was changed
}

const REASON_LABELS: Record<DecisionReason, string> = {
  ATHLETE_FEEDBACK: 'Athlete Feedback',
  FATIGUE_OBSERVED: 'Observed Fatigue',
  HRV_LOW: 'Low HRV Reading',
  SLEEP_POOR: 'Poor Sleep Quality',
  INJURY_CONCERN: 'Injury Concern',
  SCHEDULE_CONFLICT: 'Schedule Conflict',
  PROGRESSION_ADJUSTMENT: 'Progression Adjustment',
  WEATHER_CONDITIONS: 'Weather Conditions',
  EQUIPMENT_UNAVAILABLE: 'Equipment Unavailable',
  COACH_INTUITION: 'Coach Intuition',
  ATHLETE_PREFERENCE: 'Athlete Preference',
  TECHNIQUE_FOCUS: 'Technique Focus',
  MENTAL_FRESHNESS: 'Mental Freshness',
  TRAVEL_FATIGUE: 'Travel Fatigue',
  ILLNESS_RECOVERY: 'Illness Recovery',
  COMPETITION_PROXIMITY: 'Competition Proximity',
  OTHER: 'Other',
}

const SUGGESTION_TYPE_LABELS: Record<AISuggestionType, string> = {
  WORKOUT: 'Workout',
  ZONE_CALCULATION: 'Zone Calculation',
  PROGRAM_PERIODIZATION: 'Program Periodization',
  RECOVERY_RECOMMENDATION: 'Recovery Recommendation',
  LOAD_ADJUSTMENT: 'Load Adjustment',
  EXERCISE_SELECTION: 'Exercise Selection',
  INTENSITY_PRESCRIPTION: 'Intensity Prescription',
  VOLUME_PRESCRIPTION: 'Volume Prescription',
  TAPER_PLAN: 'Taper Plan',
  OTHER: 'Other',
}

export function CoachDecisionModal({
  open,
  onOpenChange,
  onSubmit,
  onSkip,
  athleteId,
  athleteName,
  aiSuggestionType,
  aiSuggestionData,
  modificationData,
  aiConfidence,
  athleteContext,
  workoutId,
  programId,
  suggestionSummary,
  modificationSummary,
}: CoachDecisionModalProps) {
  const [reasonCategory, setReasonCategory] = useState<DecisionReason | ''>('')
  const [reasonNotes, setReasonNotes] = useState('')
  const [coachConfidence, setCoachConfidence] = useState<number[]>([0.7])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reasonCategory) return

    setIsSubmitting(true)
    try {
      // Calculate modification magnitude (simple heuristic based on object key differences)
      const aiKeys = Object.keys(aiSuggestionData)
      const modKeys = Object.keys(modificationData)
      const changedKeys = modKeys.filter(
        (k) => JSON.stringify(aiSuggestionData[k]) !== JSON.stringify(modificationData[k])
      )
      const magnitude = aiKeys.length > 0 ? changedKeys.length / Math.max(aiKeys.length, modKeys.length) : 0.5

      await onSubmit({
        athleteId,
        aiSuggestionType,
        aiSuggestionData,
        aiConfidence,
        modificationData,
        modificationMagnitude: magnitude,
        reasonCategory,
        reasonNotes: reasonNotes || undefined,
        coachConfidence: coachConfidence[0],
        athleteContext,
        workoutId,
        programId,
      })

      // Reset form
      setReasonCategory('')
      setReasonNotes('')
      setCoachConfidence([0.7])
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save coach decision:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    setReasonCategory('')
    setReasonNotes('')
    setCoachConfidence([0.7])
    onOpenChange(false)
    onSkip?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Help Improve AI Suggestions</DialogTitle>
          <DialogDescription>
            You modified the AI-generated {SUGGESTION_TYPE_LABELS[aiSuggestionType].toLowerCase()} for {athleteName}.
            Sharing your reasoning helps our AI learn from your expertise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Modification Summary */}
          {(suggestionSummary || modificationSummary) && (
            <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
              {suggestionSummary && (
                <div>
                  <span className="font-medium text-muted-foreground">AI suggested: </span>
                  <span>{suggestionSummary}</span>
                </div>
              )}
              {modificationSummary && (
                <div>
                  <span className="font-medium text-muted-foreground">You changed to: </span>
                  <span>{modificationSummary}</span>
                </div>
              )}
            </div>
          )}

          {/* Athlete Context (if available) */}
          {athleteContext && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Current Athlete Status</Label>
              <div className="flex flex-wrap gap-2">
                {athleteContext.hrv !== undefined && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    HRV: {athleteContext.hrv}
                    {athleteContext.hrvTrend && (
                      <span className={
                        athleteContext.hrvTrend === 'improving' ? 'text-green-500' :
                        athleteContext.hrvTrend === 'declining' ? 'text-red-500' : ''
                      }>
                        ({athleteContext.hrvTrend})
                      </span>
                    )}
                  </Badge>
                )}
                {athleteContext.sleepScore !== undefined && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Moon className="h-3 w-3" />
                    Sleep: {athleteContext.sleepScore}%
                  </Badge>
                )}
                {athleteContext.fatigueLevel !== undefined && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Fatigue: {athleteContext.fatigueLevel}/10
                  </Badge>
                )}
                {athleteContext.readinessScore !== undefined && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    Readiness: {athleteContext.readinessScore}%
                  </Badge>
                )}
                {athleteContext.recentInjury && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {athleteContext.recentInjury}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Why did you make this change?</Label>
            <Select
              value={reasonCategory}
              onValueChange={(value) => setReasonCategory(value as DecisionReason)}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context that might help..."
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Coach Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Your confidence in this change</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(coachConfidence[0] * 100)}%
              </span>
            </div>
            <Slider
              value={coachConfidence}
              onValueChange={setCoachConfidence}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uncertain</span>
              <span>Very confident</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} disabled={isSubmitting}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reasonCategory || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage coach decision state
export function useCoachDecision() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingDecision, setPendingDecision] = useState<{
    athleteId: string
    athleteName: string
    aiSuggestionType: AISuggestionType
    aiSuggestionData: Record<string, unknown>
    modificationData: Record<string, unknown>
    aiConfidence?: number
    athleteContext?: AthleteContext
    workoutId?: string
    programId?: string
    suggestionSummary?: string
    modificationSummary?: string
  } | null>(null)

  const triggerDecisionModal = (data: NonNullable<typeof pendingDecision>) => {
    setPendingDecision(data)
    setIsOpen(true)
  }

  const submitDecision = async (data: CoachDecisionData) => {
    const response = await fetch('/api/data-moat/coach-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to save decision')
    }

    return response.json()
  }

  return {
    isOpen,
    setIsOpen,
    pendingDecision,
    triggerDecisionModal,
    submitDecision,
  }
}
