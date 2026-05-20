'use client'

/**
 * Post-Race Analysis Form
 *
 * Captures structured race outcome data for the Data Moat system.
 * Links race results to predictions for validation.
 */

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
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

type LocalizedLabel = {
  en: string
  sv: string
}

const text = (locale: string, labels: LocalizedLabel) => locale === 'sv' ? labels.sv : labels.en

const UI = {
  title: { en: 'Race analysis', sv: 'Tävlingsanalys' },
  time: { en: 'Time', sv: 'Tid' },
  goal: { en: 'Goal', sv: 'Mål' },
  linkPrediction: { en: 'Link to AI prediction', sv: 'Länka till AI-prediktion' },
  predictionPlaceholder: { en: 'Choose prediction...', sv: 'Välj prediktion...' },
  noPrediction: { en: 'No prediction', sv: 'Ingen prediktion' },
  confidence: { en: 'confidence', sv: 'konfidens' },
  linkPredictionHelp: {
    en: 'Link this race to an earlier prediction to validate AI accuracy',
    sv: 'Länka denna tävling till en tidigare prediktion för att validera AI-noggrannhet',
  },
  goalQuestion: { en: 'Did you reach your goal?', sv: 'Nådde du ditt mål?' },
  yes: { en: 'Yes', sv: 'Ja' },
  no: { en: 'No', sv: 'Nej' },
  satisfactionQuestion: {
    en: 'How satisfied are you with your performance?',
    sv: 'Hur nöjd är du med din prestation?',
  },
  conditionFactors: { en: 'Influencing factors', sv: 'Påverkande faktorer' },
  selected: { en: 'selected', sv: 'valda' },
  coachAnalysis: { en: 'Coach analysis', sv: 'Coachanalys' },
  pacing: { en: 'Pacing', sv: 'Tempo/Pacing' },
  pacingPlaceholder: { en: 'Notes about pacing...', sv: 'Kommentarer om tempohållning...' },
  tactical: { en: 'Tactics/strategy', sv: 'Taktik/Strategi' },
  tacticalPlaceholder: { en: 'Notes about tactics...', sv: 'Kommentarer om taktik...' },
  nutrition: { en: 'Nutrition/hydration', sv: 'Näring/Vätskeintag' },
  nutritionPlaceholder: { en: 'Notes about nutrition...', sv: 'Kommentarer om näring...' },
  mental: { en: 'Mental performance', sv: 'Mental prestation' },
  mentalPlaceholder: {
    en: 'Notes about mental performance...',
    sv: 'Kommentarer om mental prestation...',
  },
  keyLearnings: { en: 'Key learnings', sv: 'Viktiga lärdomar' },
  keyLearningsPlaceholder: {
    en: 'What should we take from this race?',
    sv: 'Vad tar vi med oss från denna tävling?',
  },
  recommendations: { en: 'Recommendations ahead', sv: 'Rekommendationer framåt' },
  recommendationsPlaceholder: {
    en: 'What should be prioritized before the next race?',
    sv: 'Vad bör fokuseras på inför nästa tävling?',
  },
  cancel: { en: 'Cancel', sv: 'Avbryt' },
  saving: { en: 'Saving...', sv: 'Sparar...' },
  save: { en: 'Save analysis', sv: 'Spara analys' },
} satisfies Record<string, LocalizedLabel>

const SATISFACTION_LABELS = [
  { value: 1, label: { en: 'Very dissatisfied', sv: 'Mycket missnöjd' }, emoji: '😞' },
  { value: 2, label: { en: 'Dissatisfied', sv: 'Missnöjd' }, emoji: '😕' },
  { value: 3, label: { en: 'Neutral', sv: 'Neutral' }, emoji: '😐' },
  { value: 4, label: { en: 'Satisfied', sv: 'Nöjd' }, emoji: '🙂' },
  { value: 5, label: { en: 'Very satisfied', sv: 'Mycket nöjd' }, emoji: '😄' },
]

const EXECUTION_OPTIONS = [
  { value: 'excellent', label: { en: 'Excellent', sv: 'Utmärkt' }, color: 'bg-green-100 text-green-800' },
  { value: 'good', label: { en: 'Good', sv: 'Bra' }, color: 'bg-blue-100 text-blue-800' },
  { value: 'fair', label: { en: 'Fair', sv: 'Okej' }, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'poor', label: { en: 'Poor', sv: 'Dålig' }, color: 'bg-red-100 text-red-800' },
]

const CONDITION_FACTORS = [
  { key: 'heat', label: { en: 'Heat', sv: 'Hetta' }, icon: ThermometerSun },
  { key: 'cold', label: { en: 'Cold', sv: 'Kyla' }, icon: ThermometerSun },
  { key: 'humidity', label: { en: 'Humidity', sv: 'Fuktighet' }, icon: ThermometerSun },
  { key: 'wind', label: { en: 'Wind', sv: 'Vind' }, icon: ThermometerSun },
  { key: 'altitude', label: { en: 'Altitude', sv: 'Höjd' }, icon: Mountain },
  { key: 'illness', label: { en: 'Illness', sv: 'Sjukdom' }, icon: HeartPulse },
  { key: 'injury', label: { en: 'Injury', sv: 'Skada' }, icon: HeartPulse },
  { key: 'travel', label: { en: 'Travel fatigue', sv: 'Reströtthet' }, icon: Timer },
  { key: 'poorSleep', label: { en: 'Poor sleep', sv: 'Dålig sömn' }, icon: Brain },
  { key: 'nutritionIssues', label: { en: 'Nutrition issues', sv: 'Näringsproblem' }, icon: Utensils },
  { key: 'mentalStress', label: { en: 'Mental stress', sv: 'Mental stress' }, icon: Brain },
  { key: 'courseConditions', label: { en: 'Course conditions', sv: 'Banförhållanden' }, icon: Mountain },
] as const

export function PostRaceAnalysisForm({
  open,
  onOpenChange,
  onSubmit,
  raceName,
  raceDate,
  actualTime,
  goalTime,
  linkedPredictions = [],
}: PostRaceAnalysisFormProps) {
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
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
            {text(locale, UI.title)}
          </DialogTitle>
          <DialogDescription>
            {raceName} - {new Date(raceDate).toLocaleDateString(dateLocale)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Race Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{text(locale, UI.time)}</p>
                  <p className="text-2xl font-bold">{actualTime}</p>
                </div>
                {goalTime && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{text(locale, UI.goal)}</p>
                    <p className="text-lg">{goalTime}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Link to Prediction */}
          {linkedPredictions.length > 0 && (
            <div className="space-y-2">
              <Label>{text(locale, UI.linkPrediction)}</Label>
              <Select value={linkedPredictionId} onValueChange={setLinkedPredictionId}>
                <SelectTrigger>
                  <SelectValue placeholder={text(locale, UI.predictionPlaceholder)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{text(locale, UI.noPrediction)}</SelectItem>
                  {linkedPredictions.map((pred) => (
                    <SelectItem key={pred.id} value={pred.id}>
                      {pred.predictedTime} ({Math.round(pred.confidenceScore * 100)}%{' '}
                      {text(locale, UI.confidence)}) -{' '}
                      {new Date(pred.createdAt).toLocaleDateString(dateLocale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {text(locale, UI.linkPredictionHelp)}
              </p>
            </div>
          )}

          <Separator />

          {/* Goal Achievement */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {text(locale, UI.goalQuestion)}
            </Label>
            <RadioGroup
              value={goalAchieved === null ? '' : goalAchieved ? 'yes' : 'no'}
              onValueChange={(v) => setGoalAchieved(v === 'yes')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="goal-yes" />
                <Label htmlFor="goal-yes" className="cursor-pointer">
                  {text(locale, UI.yes)}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="goal-no" />
                <Label htmlFor="goal-no" className="cursor-pointer">
                  {text(locale, UI.no)}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Satisfaction Score */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              {text(locale, UI.satisfactionQuestion)}
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
                  <span className="text-xs mt-1">{text(locale, item.label)}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Condition Factors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{text(locale, UI.conditionFactors)}</Label>
              {activeConditions > 0 && (
                <Badge variant="secondary">
                  {activeConditions} {text(locale, UI.selected)}
                </Badge>
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
                  <span className="text-sm">{text(locale, label)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Coach Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{text(locale, UI.coachAnalysis)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pacing */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  {text(locale, UI.pacing)}
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
                      {text(locale, opt.label)}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder={text(locale, UI.pacingPlaceholder)}
                  value={coachAnalysis.pacingNotes}
                  onChange={(e) => handleAnalysisChange('pacingNotes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Tactical */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  {text(locale, UI.tactical)}
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
                      {text(locale, opt.label)}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder={text(locale, UI.tacticalPlaceholder)}
                  value={coachAnalysis.tacticalNotes}
                  onChange={(e) => handleAnalysisChange('tacticalNotes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Nutrition */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  {text(locale, UI.nutrition)}
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
                      {text(locale, opt.label)}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder={text(locale, UI.nutritionPlaceholder)}
                  value={coachAnalysis.nutritionNotes}
                  onChange={(e) => handleAnalysisChange('nutritionNotes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Mental */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  {text(locale, UI.mental)}
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
                      {text(locale, opt.label)}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder={text(locale, UI.mentalPlaceholder)}
                  value={coachAnalysis.mentalNotes}
                  onChange={(e) => handleAnalysisChange('mentalNotes', e.target.value)}
                  rows={2}
                />
              </div>

              <Separator />

              {/* Key Learnings */}
              <div className="space-y-2">
                <Label>{text(locale, UI.keyLearnings)}</Label>
                <Textarea
                  placeholder={text(locale, UI.keyLearningsPlaceholder)}
                  value={coachAnalysis.keyLearnings}
                  onChange={(e) => handleAnalysisChange('keyLearnings', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <Label>{text(locale, UI.recommendations)}</Label>
                <Textarea
                  placeholder={text(locale, UI.recommendationsPlaceholder)}
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
            {text(locale, UI.cancel)}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={satisfactionScore === null || goalAchieved === null || isSubmitting}
          >
            {isSubmitting ? text(locale, UI.saving) : text(locale, UI.save)}
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
