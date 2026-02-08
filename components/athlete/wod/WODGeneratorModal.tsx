'use client'

/**
 * WODGeneratorModal
 *
 * Multi-step modal for configuring and generating a Workout of the Day.
 * Steps: Mode Selection → Duration → Equipment → Generating → Preview
 */

import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Zap,
  Sparkles,
  Coffee,
  PartyPopper,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Timer,
  AlertTriangle,
  Bot,
  ChevronDown,
  Dumbbell,
  Heart,
  Shuffle,
  Target,
  MapPin,
} from 'lucide-react'
import type {
  WODMode,
  WODWorkoutType,
  WODEquipment,
  WODRequest,
  WODResponse,
} from '@/types/wod'
import { WOD_LABELS } from '@/types/wod'
import type { AIModelConfig } from '@/types/ai-models'
import { COST_TIER_LABELS, COST_TIER_COLORS } from '@/types/ai-models'
import { cn } from '@/lib/utils'

interface WODGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWODGenerated: (response: WODResponse) => void
  remainingWODs: number
  isUnlimited: boolean
}

type Step = 'workoutType' | 'mode' | 'duration' | 'equipment' | 'generating'

type GenerateWODRequestBody = WODRequest & {
  modelId?: string | null
  locationId?: string | null
}

// Workout type config
const WORKOUT_TYPE_ICONS: Record<WODWorkoutType, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Heart,
  mixed: Shuffle,
  core: Target,
}

const WORKOUT_TYPE_COLORS: Record<WODWorkoutType, string> = {
  strength: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 hover:border-blue-500/50',
  cardio: 'from-red-500/20 to-orange-500/20 border-red-500/30 hover:border-red-500/50',
  mixed: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500/50',
  core: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30 hover:border-teal-500/50',
}

const WORKOUT_TYPE_ACCENT: Record<WODWorkoutType, string> = {
  strength: 'ring-blue-500 bg-blue-500/20 text-blue-500',
  cardio: 'ring-red-500 bg-red-500/20 text-red-500',
  mixed: 'ring-purple-500 bg-purple-500/20 text-purple-500',
  core: 'ring-teal-500 bg-teal-500/20 text-teal-500',
}

// Equipment per workout type
const EQUIPMENT_BY_TYPE: Record<WODWorkoutType, { value: WODEquipment; label: string; icon: string }[]> = {
  strength: [
    { value: 'none', label: 'Ingen utrustning', icon: '🏃' },
    { value: 'dumbbells', label: 'Hantlar', icon: '🏋️' },
    { value: 'barbell', label: 'Skivstång', icon: '💪' },
    { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
    { value: 'resistance_band', label: 'Gummiband', icon: '〰️' },
    { value: 'pull_up_bar', label: 'Räcke', icon: '🔩' },
  ],
  cardio: [
    { value: 'none', label: 'Ingen utrustning', icon: '🏃' },
    { value: 'treadmill', label: 'Löpband', icon: '🏃‍♂️' },
    { value: 'rower', label: 'Roddmaskin', icon: '🚣' },
    { value: 'bike', label: 'Cykel', icon: '🚴' },
    { value: 'skierg', label: 'SkiErg', icon: '⛷️' },
    { value: 'airbike', label: 'Airbike', icon: '💨' },
    { value: 'crosstrainer', label: 'Crosstrainer', icon: '🔄' },
    { value: 'step_machine', label: 'Trappmaskin', icon: '🪜' },
    { value: 'jump_rope', label: 'Hopprep', icon: '🪢' },
  ],
  mixed: [
    { value: 'none', label: 'Ingen utrustning', icon: '🏃' },
    { value: 'dumbbells', label: 'Hantlar', icon: '🏋️' },
    { value: 'barbell', label: 'Skivstång', icon: '💪' },
    { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
    { value: 'resistance_band', label: 'Gummiband', icon: '〰️' },
    { value: 'pull_up_bar', label: 'Räcke', icon: '🔩' },
    { value: 'rower', label: 'Roddmaskin', icon: '🚣' },
    { value: 'bike', label: 'Cykel', icon: '🚴' },
    { value: 'skierg', label: 'SkiErg', icon: '⛷️' },
    { value: 'airbike', label: 'Airbike', icon: '💨' },
    { value: 'wall_ball', label: 'Wall Ball', icon: '⚽' },
    { value: 'box', label: 'Plyo-box', icon: '📦' },
    { value: 'sled', label: 'Släde', icon: '🛷' },
    { value: 'sandbag', label: 'Sandsäck', icon: '🎒' },
    { value: 'jump_rope', label: 'Hopprep', icon: '🪢' },
  ],
  core: [
    { value: 'none', label: 'Ingen utrustning', icon: '🏃' },
    { value: 'resistance_band', label: 'Gummiband', icon: '〰️' },
    { value: 'medicine_ball', label: 'Medicinboll', icon: '🏐' },
    { value: 'stability_ball', label: 'Pilatesboll', icon: '🔵' },
  ],
}

interface LocationOption {
  id: string
  name: string
  city: string | null
  address: string | null
  isPrimary: boolean
  equipmentCount: number
}

const MODE_ICONS: Record<WODMode, typeof Sparkles> = {
  structured: Sparkles,
  casual: Coffee,
  fun: PartyPopper,
}

const MODE_COLORS: Record<WODMode, string> = {
  structured: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 hover:border-blue-500/50',
  casual: 'from-green-500/20 to-emerald-500/20 border-green-500/30 hover:border-green-500/50',
  fun: 'from-pink-500/20 to-purple-500/20 border-pink-500/30 hover:border-pink-500/50',
}


export function WODGeneratorModal({
  open,
  onOpenChange,
  onWODGenerated,
  remainingWODs,
  isUnlimited,
}: WODGeneratorModalProps) {
  const [step, setStep] = useState<Step>('workoutType')
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WODWorkoutType>('strength')
  const [selectedMode, setSelectedMode] = useState<WODMode>('structured')
  const [duration, setDuration] = useState(45)
  const [selectedEquipment, setSelectedEquipment] = useState<WODEquipment[]>(['none'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gym location selector state
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [hasLocations, setHasLocations] = useState(false)
  const [loadingLocations, setLoadingLocations] = useState(false)

  // Model selection state
  const [availableModels, setAvailableModels] = useState<AIModelConfig[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Fetch available locations when modal opens
  useEffect(() => {
    if (open && !hasLocations && !loadingLocations) {
      setLoadingLocations(true)
      fetch('/api/athlete/settings/preferred-location')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.hasLocations) {
            setLocations(data.availableLocations)
            setHasLocations(true)
            if (data.preferredLocation) {
              setSelectedLocationId(data.preferredLocation.id)
            }
          }
        })
        .catch(() => {
          // No locations available - that's fine
        })
        .finally(() => {
          setLoadingLocations(false)
        })
    }
  }, [open, hasLocations, loadingLocations])

  // Fetch available models when modal opens
  useEffect(() => {
    if (open && availableModels.length === 0) {
      setLoadingModels(true)
      fetch('/api/ai/models')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.models) {
            setAvailableModels(data.models)
            if (data.defaultModelId) {
              setSelectedModelId(data.defaultModelId)
            } else if (data.models.length > 0) {
              setSelectedModelId(data.models[0].id)
            }
          }
        })
        .catch(err => {
          console.error('Failed to fetch models:', err)
        })
        .finally(() => {
          setLoadingModels(false)
        })
    }
  }, [open, availableModels.length])

  // Reset state when modal closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setStep('workoutType')
      setError(null)
      setIsGenerating(false)
      setShowModelSelector(false)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // Reset equipment when workout type changes
  useEffect(() => {
    setSelectedEquipment(['none'])
  }, [selectedWorkoutType])

  // Toggle equipment selection
  const toggleEquipment = (equipment: WODEquipment) => {
    setSelectedEquipment(prev => {
      if (equipment === 'none') {
        return ['none']
      }
      // Remove 'none' if selecting other equipment
      const withoutNone = prev.filter(e => e !== 'none')
      if (prev.includes(equipment)) {
        const newList = withoutNone.filter(e => e !== equipment)
        return newList.length === 0 ? ['none'] : newList
      }
      return [...withoutNone, equipment]
    })
  }

  // Get currently selected model info
  const selectedModel = availableModels.find(m => m.id === selectedModelId)

  // Generate WOD
  const generateWOD = async () => {
    setStep('generating')
    setIsGenerating(true)
    setError(null)

    try {
      const request: GenerateWODRequestBody = {
        mode: selectedMode,
        workoutType: selectedWorkoutType,
        duration,
        equipment: selectedEquipment,
        modelId: selectedModelId,
        locationId: selectedLocationId,
      }

      const response = await fetch('/api/ai/wod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || errorData.reason || 'Failed to generate WOD'
        throw new Error(errorMsg)
      }

      const data: WODResponse = await response.json()
      onWODGenerated(data)
      handleOpenChange(false)
    } catch (err) {
      console.error('WOD generation error:', err)
      setError(err instanceof Error ? err.message : 'Något gick fel')
      setStep('workoutType') // Go back to start
    } finally {
      setIsGenerating(false)
    }
  }

  // Navigation
  const goNext = () => {
    if (step === 'workoutType') setStep('mode')
    else if (step === 'mode') setStep('duration')
    else if (step === 'duration') setStep('equipment')
    else if (step === 'equipment') generateWOD()
  }

  const goBack = () => {
    if (step === 'mode') setStep('workoutType')
    else if (step === 'duration') setStep('mode')
    else if (step === 'equipment') setStep('duration')
  }

  const canProceed = step !== 'generating'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Skapa Dagens Pass
          </DialogTitle>
        </DialogHeader>

        {/* Remaining count badge */}
        {!isUnlimited && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs">
              {remainingWODs} pass kvar denna vecka
            </Badge>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Step: Workout Type Selection */}
        {step === 'workoutType' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Vilken typ av träning vill du göra?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(['strength', 'cardio', 'mixed', 'core'] as WODWorkoutType[]).map(type => {
                const Icon = WORKOUT_TYPE_ICONS[type]
                const isSelected = selectedWorkoutType === type
                const typeInfo = WOD_LABELS.workoutTypes[type]
                const accent = WORKOUT_TYPE_ACCENT[type]

                return (
                  <button
                    key={type}
                    onClick={() => setSelectedWorkoutType(type)}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all text-left',
                      'bg-gradient-to-br',
                      WORKOUT_TYPE_COLORS[type],
                      isSelected && `ring-2 ring-offset-2 ring-offset-background ${accent.split(' ')[0]}`
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <div className={cn('p-2 rounded-lg w-fit', accent.split(' ').slice(1).join(' '))}>
                        <Icon className={cn('h-5 w-5', accent.split(' ')[2])} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{typeInfo.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {typeInfo.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step: Mode Selection */}
        {step === 'mode' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Välj vilken typ av pass du vill ha
            </p>

            <div className="grid gap-3">
              {(['structured', 'casual', 'fun'] as WODMode[]).map(mode => {
                const Icon = MODE_ICONS[mode]
                const isSelected = selectedMode === mode
                const modeInfo = WOD_LABELS.modes[mode]

                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all text-left',
                      'bg-gradient-to-br',
                      MODE_COLORS[mode],
                      isSelected && 'ring-2 ring-offset-2 ring-offset-background',
                      isSelected && mode === 'structured' && 'ring-blue-500',
                      isSelected && mode === 'casual' && 'ring-green-500',
                      isSelected && mode === 'fun' && 'ring-pink-500'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        mode === 'structured' && 'bg-blue-500/20',
                        mode === 'casual' && 'bg-green-500/20',
                        mode === 'fun' && 'bg-pink-500/20'
                      )}>
                        <Icon className={cn(
                          'h-5 w-5',
                          mode === 'structured' && 'text-blue-500',
                          mode === 'casual' && 'text-green-500',
                          mode === 'fun' && 'text-pink-500'
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{modeInfo.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {modeInfo.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step: Duration */}
        {step === 'duration' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Hur lång tid har du?</p>
              <div className="flex items-center justify-center gap-2">
                <Timer className="h-5 w-5 text-orange-500" />
                <span className="text-4xl font-bold text-orange-600">{duration}</span>
                <span className="text-xl text-muted-foreground">min</span>
              </div>
            </div>

            <div className="px-4">
              <Slider
                value={[duration]}
                onValueChange={([value]) => setDuration(value)}
                min={15}
                max={90}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>15 min</span>
                <span>90 min</span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex justify-center gap-2">
              {[20, 30, 45, 60].map(mins => (
                <Button
                  key={mins}
                  variant={duration === mins ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDuration(mins)}
                >
                  {mins} min
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Equipment */}
        {step === 'equipment' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Vilken utrustning har du tillgång till?
            </p>

            {/* Gym Location Selector */}
            {hasLocations && locations.length > 0 && (
              <div className="pb-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Välj gym</span>
                </div>
                <Select
                  value={selectedLocationId || 'none'}
                  onValueChange={(value) => {
                    const locId = value === 'none' ? null : value
                    setSelectedLocationId(locId)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inget gym valt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Inget gym valt</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}{loc.city ? ` (${loc.city})` : ''} - {loc.equipmentCount} utr.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_BY_TYPE[selectedWorkoutType].map(({ value, label, icon }) => {
                const isSelected = selectedEquipment.includes(value)
                return (
                  <button
                    key={value}
                    onClick={() => toggleEquipment(value)}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all text-left',
                      'hover:border-orange-500/50',
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-border bg-background'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* AI Model Selector */}
            {availableModels.length > 1 && (
              <div className="pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>AI-modell: {selectedModel?.name || 'Standard'}</span>
                    {selectedModel && (
                      <Badge
                        variant="outline"
                        className={cn('text-xs', COST_TIER_COLORS[selectedModel.costTier])}
                      >
                        {COST_TIER_LABELS[selectedModel.costTier]}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      showModelSelector && 'rotate-180'
                    )}
                  />
                </button>

                {showModelSelector && (
                  <div className="mt-3 space-y-2">
                    <Select
                      value={selectedModelId || undefined}
                      onValueChange={setSelectedModelId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Välj AI-modell" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              <Badge
                                variant="outline"
                                className={cn('text-xs', COST_TIER_COLORS[model.costTier])}
                              >
                                {COST_TIER_LABELS[model.costTier]}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedModel && (
                      <p className="text-xs text-muted-foreground">
                        {selectedModel.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <Zap className="h-12 w-12 text-orange-500/30" />
              </div>
              <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Skapar ditt pass...</h3>
              <p className="text-sm text-muted-foreground">
                AI analyserar din profil och skapar ett perfekt anpassat pass
              </p>
              {selectedModel && (
                <p className="text-xs text-muted-foreground mt-2">
                  Använder {selectedModel.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        {step !== 'generating' && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 'workoutType'}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Tillbaka
            </Button>

            <Button
              onClick={goNext}
              disabled={!canProceed || (remainingWODs <= 0 && !isUnlimited)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {step === 'equipment' ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generera
                </>
              ) : (
                <>
                  Nästa
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
