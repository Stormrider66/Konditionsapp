'use client'

// components/agility-studio/AgilityWorkoutBuilder.tsx
// Multi-step workout builder dialog

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Zap
} from 'lucide-react'
import type {
  AgilityDrill,
  AgilityWorkout,
  AgilityWorkoutFormat,
  DevelopmentStage,
  SportType
} from '@/types'

interface AgilityWorkoutBuilderProps {
  drills: AgilityDrill[]
  initialWorkout?: AgilityWorkout
  onSave: (workout: AgilityWorkout) => void
  onClose: () => void
}

interface SelectedDrill {
  drill: AgilityDrill
  order: number
  sectionType: 'WARMUP' | 'MAIN' | 'COOLDOWN'
  sets?: number
  reps?: number
  duration?: number
  restSeconds?: number
  notes?: string
}

const formatOptions: { value: AgilityWorkoutFormat; label: string; description: string }[] = [
  { value: 'CIRCUIT', label: 'Circuit', description: 'Multiple drills performed in sequence' },
  { value: 'STATION_ROTATION', label: 'Station Rotation', description: 'Teams rotate through different stations' },
  { value: 'INTERVAL', label: 'Interval', description: 'Work/rest intervals with specific timing' },
  { value: 'PROGRESSIVE', label: 'Progressive', description: 'Drills increase in difficulty/intensity' },
  { value: 'REACTIVE', label: 'Reactive', description: 'Random order based on signals/cues' },
  { value: 'TESTING', label: 'Testing', description: 'Standardized testing session' }
]

const stageOptions: { value: DevelopmentStage; label: string }[] = [
  { value: 'FUNDAMENTALS', label: 'Fundamentals (6-9)' },
  { value: 'LEARNING_TO_TRAIN', label: 'Learning to Train (9-12)' },
  { value: 'TRAINING_TO_TRAIN', label: 'Training to Train (12-16)' },
  { value: 'TRAINING_TO_COMPETE', label: 'Training to Compete (16-18)' },
  { value: 'TRAINING_TO_WIN', label: 'Training to Win (18+)' },
  { value: 'ELITE', label: 'Elite' }
]

const sportOptions: { value: SportType; label: string }[] = [
  { value: 'TEAM_FOOTBALL', label: 'Football' },
  { value: 'TEAM_BASKETBALL', label: 'Basketball' },
  { value: 'TEAM_HANDBALL', label: 'Handball' },
  { value: 'TEAM_FLOORBALL', label: 'Floorball' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ice Hockey' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyball' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'PADEL', label: 'Padel' },
  { value: 'RUNNING', label: 'Running' }
]

export function AgilityWorkoutBuilder({
  drills,
  initialWorkout,
  onSave,
  onClose
}: AgilityWorkoutBuilderProps) {
  const t = useTranslations('agilityStudio')
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Format
  const [format, setFormat] = useState<AgilityWorkoutFormat>(
    initialWorkout?.format || 'CIRCUIT'
  )

  // Step 2: Target Audience
  const [developmentStage, setDevelopmentStage] = useState<DevelopmentStage | undefined>(
    initialWorkout?.developmentStage || undefined
  )
  const [targetSports, setTargetSports] = useState<SportType[]>(
    initialWorkout?.targetSports || []
  )
  const [totalDuration, setTotalDuration] = useState<number | undefined>(
    initialWorkout?.totalDuration || undefined
  )
  const [restBetweenDrills, setRestBetweenDrills] = useState<number | undefined>(
    initialWorkout?.restBetweenDrills || 30
  )

  // Step 3: Drills
  const [selectedDrills, setSelectedDrills] = useState<SelectedDrill[]>([])
  const [drillSearchQuery, setDrillSearchQuery] = useState('')

  // Step 4: Review
  const [name, setName] = useState(initialWorkout?.name || '')
  const [description, setDescription] = useState(initialWorkout?.description || '')
  const [isTemplate, setIsTemplate] = useState(initialWorkout?.isTemplate || false)

  const filteredDrills = drills.filter(drill => {
    if (!drillSearchQuery) return true
    const query = drillSearchQuery.toLowerCase()
    return (
      drill.name.toLowerCase().includes(query) ||
      drill.nameSv?.toLowerCase().includes(query)
    )
  })

  const addDrill = (drill: AgilityDrill) => {
    setSelectedDrills(prev => [
      ...prev,
      {
        drill,
        order: prev.length,
        sectionType: 'MAIN',
        sets: drill.defaultSets || undefined,
        reps: drill.defaultReps || undefined,
        duration: drill.durationSeconds || undefined,
        restSeconds: drill.restSeconds || restBetweenDrills
      }
    ])
  }

  const removeDrill = (index: number) => {
    setSelectedDrills(prev => {
      const newDrills = prev.filter((_, i) => i !== index)
      return newDrills.map((d, i) => ({ ...d, order: i }))
    })
  }

  const updateDrill = (index: number, updates: Partial<SelectedDrill>) => {
    setSelectedDrills(prev =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    )
  }

  const moveDrill = (fromIndex: number, toIndex: number) => {
    setSelectedDrills(prev => {
      const newDrills = [...prev]
      const [removed] = newDrills.splice(fromIndex, 1)
      newDrills.splice(toIndex, 0, removed)
      return newDrills.map((d, i) => ({ ...d, order: i }))
    })
  }

  const toggleSport = (sport: SportType) => {
    setTargetSports(prev =>
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    )
  }

  const handleSubmit = async () => {
    if (!name || selectedDrills.length === 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/agility-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          format,
          totalDuration,
          restBetweenDrills,
          developmentStage,
          targetSports,
          isTemplate,
          drills: selectedDrills.map(d => ({
            drillId: d.drill.id,
            order: d.order,
            sectionType: d.sectionType,
            sets: d.sets,
            reps: d.reps,
            duration: d.duration,
            restSeconds: d.restSeconds,
            notes: d.notes
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to create workout')

      const workout = await response.json()
      onSave(workout)
    } catch (error) {
      console.error('Error creating workout:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!format
      case 2:
        return true // Optional step
      case 3:
        return selectedDrills.length > 0
      case 4:
        return !!name
      default:
        return false
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t('builder.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`w-12 h-0.5 ${
                    s < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Step 1: Format Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t('builder.chooseFormat')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { value: 'CIRCUIT' as AgilityWorkoutFormat, key: 'Circuit' },
                  { value: 'STATION_ROTATION' as AgilityWorkoutFormat, key: 'Station' },
                  { value: 'INTERVAL' as AgilityWorkoutFormat, key: 'Interval' },
                  { value: 'PROGRESSIVE' as AgilityWorkoutFormat, key: 'Progressive' },
                  { value: 'REACTIVE' as AgilityWorkoutFormat, key: 'Reactive' },
                  { value: 'TESTING' as AgilityWorkoutFormat, key: 'Testing' }
                ]).map((option) => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-colors ${
                      format === option.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setFormat(option.value)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium">{t(`builder.format${option.key}`)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t(`builder.format${option.key}Desc`)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Target Audience */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>{t('builder.developmentStage')}</Label>
                <Select
                  value={developmentStage}
                  onValueChange={(v) => setDevelopmentStage(v as DevelopmentStage)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('builder.selectStage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {([
                      { value: 'FUNDAMENTALS' as DevelopmentStage, key: 'fundamentals' },
                      { value: 'LEARNING_TO_TRAIN' as DevelopmentStage, key: 'learningToTrain' },
                      { value: 'TRAINING_TO_TRAIN' as DevelopmentStage, key: 'trainingToTrain' },
                      { value: 'TRAINING_TO_COMPETE' as DevelopmentStage, key: 'trainingToCompete' },
                      { value: 'TRAINING_TO_WIN' as DevelopmentStage, key: 'trainingToWin' },
                      { value: 'ELITE' as DevelopmentStage, key: 'elite' }
                    ]).map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {t(`stages.${stage.key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('builder.targetSports')}</Label>
                <div className="flex flex-wrap gap-2">
                  {(['TEAM_FOOTBALL', 'TEAM_BASKETBALL', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_ICE_HOCKEY', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL', 'RUNNING'] as SportType[]).map((sport) => (
                    <Badge
                      key={sport}
                      variant={targetSports.includes(sport) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSport(sport)}
                    >
                      {t(`sports.${sport}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('builder.totalDuration')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={totalDuration || ''}
                    onChange={(e) => setTotalDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('builder.restBetweenDrills')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={restBetweenDrills || ''}
                    onChange={(e) => setRestBetweenDrills(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Add Drills */}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
              {/* Drill Picker */}
              <div className="border rounded-lg p-4 overflow-hidden flex flex-col">
                <h4 className="font-medium mb-2">{t('builder.availableDrills')}</h4>
                <Input
                  placeholder={t('builder.searchDrills')}
                  value={drillSearchQuery}
                  onChange={(e) => setDrillSearchQuery(e.target.value)}
                  className="mb-2"
                />
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredDrills.map((drill) => (
                    <div
                      key={drill.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-muted"
                    >
                      <div>
                        <p className="text-sm font-medium">{drill.nameSv || drill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(`categories.${drill.category}`)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => addDrill(drill)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Drills */}
              <div className="border rounded-lg p-4 overflow-hidden flex flex-col">
                <h4 className="font-medium mb-2">
                  {t('builder.selectedDrills')} ({selectedDrills.length})
                </h4>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {selectedDrills.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('builder.addDrillsHint')}
                    </p>
                  ) : (
                    selectedDrills.map((item, index) => (
                      <div
                        key={`${item.drill.id}-${index}`}
                        className="flex items-start gap-2 p-2 border rounded"
                      >
                        <GripVertical className="h-4 w-4 mt-1 text-muted-foreground cursor-grab" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{item.drill.nameSv || item.drill.name}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDrill(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Select
                              value={item.sectionType}
                              onValueChange={(v) =>
                                updateDrill(index, {
                                  sectionType: v as 'WARMUP' | 'MAIN' | 'COOLDOWN'
                                })
                              }
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="WARMUP">{t('builder.sectionWarmup')}</SelectItem>
                                <SelectItem value="MAIN">{t('builder.sectionMain')}</SelectItem>
                                <SelectItem value="COOLDOWN">{t('builder.sectionCooldown')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder={t('builder.sets')}
                              className="h-7 w-16 text-xs"
                              value={item.sets || ''}
                              onChange={(e) =>
                                updateDrill(index, {
                                  sets: e.target.value ? parseInt(e.target.value) : undefined
                                })
                              }
                            />
                            <Input
                              type="number"
                              placeholder={t('builder.reps')}
                              className="h-7 w-16 text-xs"
                              value={item.reps || ''}
                              onChange={(e) =>
                                updateDrill(index, {
                                  reps: e.target.value ? parseInt(e.target.value) : undefined
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Save */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('builder.workoutNameRequired')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('builder.workoutNamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('workout.description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('builder.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="template"
                  checked={isTemplate}
                  onCheckedChange={(checked) => setIsTemplate(checked as boolean)}
                />
                <label
                  htmlFor="template"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {t('builder.saveAsTemplate')}
                </label>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{t('builder.summary')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>{t('builder.format')}: {t(`workout.formats.${format}`)}</div>
                  <div>{t('builder.selectedDrills')}: {selectedDrills.length}</div>
                  {totalDuration && <div>{t('builder.duration')}: {totalDuration} min</div>}
                  {developmentStage && (
                    <div>{t('builder.stage')}: {t(`stages.${developmentStage === 'FUNDAMENTALS' ? 'fundamentals' : developmentStage === 'LEARNING_TO_TRAIN' ? 'learningToTrain' : developmentStage === 'TRAINING_TO_TRAIN' ? 'trainingToTrain' : developmentStage === 'TRAINING_TO_COMPETE' ? 'trainingToCompete' : developmentStage === 'TRAINING_TO_WIN' ? 'trainingToWin' : 'elite'}`)}</div>
                  )}
                </div>
                {targetSports.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm">{t('builder.sports')}:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {targetSports.map((sport) => (
                        <Badge key={sport} variant="secondary" className="text-xs">
                          {t(`sports.${sport}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step > 1 ? t('builder.back') : t('builder.cancel')}
          </Button>
          <Button
            onClick={() => (step < 4 ? setStep(step + 1) : handleSubmit())}
            disabled={!canProceed() || isSubmitting}
          >
            {step < 4 ? (
              <>
                {t('builder.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : isSubmitting ? (
              t('builder.creating')
            ) : (
              t('builder.createWorkout')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
