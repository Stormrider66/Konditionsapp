'use client'

/**
 * Post-Race Analysis Form
 *
 * Captures structured race outcome data for the Data Moat system.
 * Links race results to predictions for validation.
 */

import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Star,
  Target,
  ThermometerSun,
  Mountain,
  HeartPulse,
  Brain,
  Utensils,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Condition factors that can affect race performance
export interface ConditionFactors {
  heat: boolean
  cold: boolean
  humidity: boolean
  wind: boolean
  altitude: boolean
  illness: boolean
  injury: boolean
  travel: boolean
  poorSleep: boolean
  nutritionIssues: boolean
  mentalStress: boolean
  courseConditions: boolean
}

// Structured coach analysis
export interface CoachAnalysis {
  pacingExecution: 'excellent' | 'good' | 'fair' | 'poor' | null
  pacingNotes: string
  tacticalExecution: 'excellent' | 'good' | 'fair' | 'poor' | null
  tacticalNotes: string
  nutritionExecution: 'excellent' | 'good' | 'fair' | 'poor' | null
  nutritionNotes: string
  mentalExecution: 'excellent' | 'good' | 'fair' | 'poor' | null
  mentalNotes: string
  keyLearnings: string
  recommendations: string
}

// Linked prediction info
export interface LinkedPrediction {
  id: string
  predictedTime: string
  confidenceScore: number
  createdAt: string
}

interface PostRaceAnalysisFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    satisfactionScore: number
    goalAchieved: boolean
    conditionFactors: ConditionFactors
    coachAnalysis: CoachAnalysis
    linkedPredictionId?: string
  }) => Promise<void>
  raceResultId: string
  raceName: string
  raceDate: string
  actualTime: string
  goalTime?: string
  linkedPredictions?: LinkedPrediction[]
}

const SATISFACTION_LABELS = [
  { value: 1, label: 'Mycket missnöjd', emoji: '😞' },
  { value: 2, label: 'Missnöjd', emoji: '😕' },
  { value: 3, label: 'Neutral', emoji: '😐' },
  { value: 4, label: 'Nöjd', emoji: '🙂' },
  { value: 5, label: 'Mycket nöjd', emoji: '😄' },
]

const EXECUTION_OPTIONS = [
  { value: 'excellent', label: 'Utmärkt', color: 'bg-green-100 text-green-800' },
  { value: 'good', label: 'Bra', color: 'bg-blue-100 text-blue-800' },
  { value: 'fair', label: 'Okej', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'poor', label: 'Dålig', color: 'bg-red-100 text-red-800' },
]

const CONDITION_FACTORS = [
  { key: 'heat', label: 'Hetta', icon: ThermometerSun },
  { key: 'cold', label: 'Kyla', icon: ThermometerSun },
  { key: 'humidity', label: 'Fuktighet', icon: ThermometerSun },
  { key: 'wind', label: 'Vind', icon: ThermometerSun },
  { key: 'altitude', label: 'Höjd', icon: Mountain },
  { key: 'illness', label: 'Sjukdom', icon: HeartPulse },
  { key: 'injury', label: 'Skada', icon: HeartPulse },
  { key: 'travel', label: 'Reströtthet', icon: Timer },
  { key: 'poorSleep', label: 'Dålig sömn', icon: Brain },
  { key: 'nutritionIssues', label: 'Näringsproblem', icon: Utensils },
  { key: 'mentalStress', label: 'Mental stress', icon: Brain },
  { key: 'courseConditions', label: 'Banförhållanden', icon: Mountain },
] as const

export function PostRaceAnalysisForm({
  open,
  onOpenChange,
  onSubmit,
  raceResultId,
  raceName,
  raceDate,
  actualTime,
  goalTime,
  linkedPredictions = [],
}: PostRaceAnalysisFormProps) {
  // Form state
  const [satisfactionScore, setSatisfactionScore] = useState<number | null>(null)
  const [goalAchieved, setGoalAchieved] = useState<boolean | null>(null)
  const [linkedPredictionId, setLinkedPredictionId] = useState<string>('')
  const [conditionFactors, setConditionFactors] = useState<ConditionFactors>({
    heat: false,
    cold: false,
    humidity: false,
    wind: false,
    altitude: false,
    illness: false,
    injury: false,
    travel: false,
    poorSleep: false,
    nutritionIssues: false,
    mentalStress: false,
    courseConditions: false,
  })
  const [coachAnalysis, setCoachAnalysis] = useState<CoachAnalysis>({
    pacingExecution: null,
    pacingNotes: '',
    tacticalExecution: null,
    tacticalNotes: '',
    nutritionExecution: null,
    nutritionNotes: '',
    mentalExecution: null,
    mentalNotes: '',
    keyLearnings: '',
    recommendations: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSatisfactionScore(null)
      setGoalAchieved(null)
      setLinkedPredictionId('')
      setConditionFactors({
        heat: false,
        cold: false,
        humidity: false,
        wind: false,
        altitude: false,
        illness: false,
        injury: false,
        travel: false,
        poorSleep: false,
        nutritionIssues: false,
        mentalStress: false,
        courseConditions: false,
      })
      setCoachAnalysis({
        pacingExecution: null,
        pacingNotes: '',
        tacticalExecution: null,
        tacticalNotes: '',
        nutritionExecution: null,
        nutritionNotes: '',
        mentalExecution: null,
        mentalNotes: '',
        keyLearnings: '',
        recommendations: '',
      })
    }
  }, [open])

  const handleConditionToggle = (key: keyof ConditionFactors) => {
    setConditionFactors((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAnalysisChange = <K extends keyof CoachAnalysis>(
    key: K,
    value: CoachAnalysis[K]
  ) => {
    setCoachAnalysis((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (satisfactionScore === null || goalAchieved === null) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        satisfactionScore,
        goalAchieved,
        conditionFactors,
        coachAnalysis,
        linkedPredictionId: linkedPredictionId || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to submit post-race analysis:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeConditions = Object.entries(conditionFactors).filter(([, v]) => v).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tävlingsanalys
          </DialogTitle>
          <DialogDescription>
            {raceName} - {new Date(raceDate).toLocaleDateString('sv-SE')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Race Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tid</p>
                  <p className="text-2xl font-bold">{actualTime}</p>
                </div>
                {goalTime && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Mål</p>
                    <p className="text-lg">{goalTime}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Link to Prediction */}
          {linkedPredictions.length > 0 && (
            <div className="space-y-2">
              <Label>Länka till AI-prediktion</Label>
              <Select value={linkedPredictionId} onValueChange={setLinkedPredictionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj prediktion..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ingen prediktion</SelectItem>
                  {linkedPredictions.map((pred) => (
                    <SelectItem key={pred.id} value={pred.id}>
                      {pred.predictedTime} ({Math.round(pred.confidenceScore * 100)}% konfidens) -{' '}
                      {new Date(pred.createdAt).toLocaleDateString('sv-SE')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Länka denna tävling till en tidigare prediktion för att validera AI-noggrannhet
              </p>
            </div>
          )}

          <Separator />

          {/* Goal Achievement */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Nådde du ditt mål?
            </Label>
            <RadioGroup
              value={goalAchieved === null ? '' : goalAchieved ? 'yes' : 'no'}
              onValueChange={(v) => setGoalAchieved(v === 'yes')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="goal-yes" />
                <Label htmlFor="goal-yes" className="cursor-pointer">
                  Ja
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="goal-no" />
                <Label htmlFor="goal-no" className="cursor-pointer">
                  Nej
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Satisfaction Score */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Hur nöjd är du med din prestation?
            </Label>
            <div className="flex gap-2">
              {SATISFACTION_LABELS.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={satisfactionScore === item.value ? 'default' : 'outline'}
                  className="flex-1 flex-col h-auto py-3"
                  onClick={() => setSatisfactionScore(item.value)}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-xs mt-1">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Condition Factors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Påverkande faktorer</Label>
              {activeConditions > 0 && (
                <Badge variant="secondary">{activeConditions} valda</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CONDITION_FACTORS.map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors',
                    conditionFactors[key]
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => handleConditionToggle(key)}
                >
                  <Checkbox
                    checked={conditionFactors[key]}
                    onCheckedChange={() => handleConditionToggle(key)}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Coach Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coachanalys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pacing */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Tempo/Pacing
                </Label>
                <div className="flex gap-2">
                  {EXECUTION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={coachAnalysis.pacingExecution === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAnalysisChange('pacingExecution', opt.value as CoachAnalysis['pacingExecution'])}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Kommentarer om tempohållning..."
                  value={coachAnalysis.pacingNotes}
                  onChange={(e) => handleAnalysisChange('pacingNotes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Tactical */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Taktik/Strategi
                </Label>
                <div className="flex gap-2">
                  {EXECUTION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={coachAnalysis.tacticalExecution === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAnalysisChange('tacticalExecution', opt.value as CoachAnalysis['tacticalExecution'])}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Kommentarer om taktik..."
                  value={coachAnalysis.tacticalNotes}
                  onChange={(e) => handleAnalysisChange('tacticalNotes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Nutrition */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Näring/Vätskeintag
                </Label>
                <div className="flex gap-2">
                  {EXECUTION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={coachAnalysis.nutritionExecution === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAnalysisChange('nutritionExecution', opt.value as CoachAnalysis['nutritionExecution'])}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Kommentarer om näring..."
                  value={coachAnalysis.nutritionNotes}
                  onChange={(e) => handleAnalysisChange('nutritionNotes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Mental */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Mental prestation
                </Label>
                <div className="flex gap-2">
                  {EXECUTION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={coachAnalysis.mentalExecution === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAnalysisChange('mentalExecution', opt.value as CoachAnalysis['mentalExecution'])}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Kommentarer om mental prestation..."
                  value={coachAnalysis.mentalNotes}
                  onChange={(e) => handleAnalysisChange('mentalNotes', e.target.value)}
                  rows={2}
                />
              </div>

              <Separator />

              {/* Key Learnings */}
              <div className="space-y-2">
                <Label>Viktiga lärdomar</Label>
                <Textarea
                  placeholder="Vad tar vi med oss från denna tävling?"
                  value={coachAnalysis.keyLearnings}
                  onChange={(e) => handleAnalysisChange('keyLearnings', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <Label>Rekommendationer framåt</Label>
                <Textarea
                  placeholder="Vad bör fokuseras på inför nästa tävling?"
                  value={coachAnalysis.recommendations}
                  onChange={(e) => handleAnalysisChange('recommendations', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={satisfactionScore === null || goalAchieved === null || isSubmitting}
          >
            {isSubmitting ? 'Sparar...' : 'Spara analys'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage post-race analysis state
export function usePostRaceAnalysis() {
  const [isOpen, setIsOpen] = useState(false)
  const [raceData, setRaceData] = useState<{
    raceResultId: string
    raceName: string
    raceDate: string
    actualTime: string
    goalTime?: string
    linkedPredictions?: LinkedPrediction[]
  } | null>(null)

  const openAnalysis = (data: NonNullable<typeof raceData>) => {
    setRaceData(data)
    setIsOpen(true)
  }

  const submitAnalysis = async (
    data: Parameters<PostRaceAnalysisFormProps['onSubmit']>[0]
  ) => {
    if (!raceData) throw new Error('No race data')

    const response = await fetch(`/api/race-results/${raceData.raceResultId}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to save analysis')
    }

    return response.json()
  }

  return {
    isOpen,
    setIsOpen,
    raceData,
    openAnalysis,
    submitAnalysis,
  }
}
