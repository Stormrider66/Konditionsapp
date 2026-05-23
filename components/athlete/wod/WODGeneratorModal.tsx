'use client'

/**
 * WODGeneratorModal
 *
 * Multi-step modal for configuring and generating a Workout of the Day.
 * Steps: Mode Selection → Duration → Equipment → Generating → Preview
 */

import { useState, useCallback, useEffect, useRef } from 'react'
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
import type { ModelIntent } from '@/types/ai-models'
import { cn } from '@/lib/utils'
import {
  type AiAllowanceExhaustedError,
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { emitWorkoutLogged } from '@/lib/events/workout-events'
import { AiAllowanceBlockedAction, type AiAllowanceAction } from '@/components/athlete/ai/AiAllowanceBlockedAction'
import { useLocale } from '@/i18n/client'

interface WODGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWODGenerated: (response: WODResponse) => void
  remainingWODs: number
  isUnlimited: boolean
}

type Step = 'workoutType' | 'mode' | 'duration' | 'equipment' | 'generating'
type AppLocale = 'en' | 'sv'

type GenerateWODRequestBody = WODRequest & {
  intent?: string
  locationId?: string | null
}

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const WORKOUT_TYPE_LABELS: Record<WODWorkoutType, Record<AppLocale, { title: string; description: string }>> = {
  strength: {
    en: {
      title: 'Strength',
      description: 'Strength training focused on muscle building and power',
    },
    sv: {
      title: 'Styrka',
      description: 'Styrketräning med fokus på muskeluppbyggnad och kraft',
    },
  },
  cardio: {
    en: {
      title: 'Cardio',
      description: 'Cardio training with intervals or steady state',
    },
    sv: {
      title: 'Kondition',
      description: 'Konditionsträning med intervaller eller steady-state',
    },
  },
  mixed: {
    en: {
      title: 'Mixed',
      description: 'CrossFit/HYROX style with both strength and cardio',
    },
    sv: {
      title: 'Mixat',
      description: 'CrossFit/HYROX-stil med både styrka och kondition',
    },
  },
  core: {
    en: {
      title: 'Core',
      description: 'Stability, trunk strength, and functional core training',
    },
    sv: {
      title: 'Core',
      description: 'Stabilitet, bålstyrka och funktionell core-träning',
    },
  },
}

const MODE_LABELS: Record<WODMode, Record<AppLocale, { title: string; description: string }>> = {
  structured: {
    en: {
      title: 'Structured',
      description: 'Science-based workout adapted to your training plan',
    },
    sv: {
      title: 'Strukturerat',
      description: 'Vetenskapligt baserat pass anpassat efter din träningsplan',
    },
  },
  casual: {
    en: {
      title: 'Casual',
      description: 'Flexible session with no pressure, just show up and move',
    },
    sv: {
      title: 'Avslappnat',
      description: 'Flexibelt pass utan press - bara visa upp och rör dig',
    },
  },
  fun: {
    en: {
      title: 'Just for fun!',
      description: 'Surprising and varied for days when you want a change',
    },
    sv: {
      title: 'Bara kul!',
      description: 'Överraskande och varierat - för dig som vill ha omväxling',
    },
  },
}

const INTENT_LABELS: Record<ModelIntent, Record<AppLocale, { label: string; description: string }>> = {
  fast: {
    en: {
      label: 'Fast',
      description: 'Fast answers, ideal for simple questions and daily help.',
    },
    sv: {
      label: 'Snabb',
      description: 'Snabba svar, perfekt för enkla frågor och daglig hjälp.',
    },
  },
  balanced: {
    en: {
      label: 'Balanced',
      description: 'Good quality and speed. Recommended for most tasks.',
    },
    sv: {
      label: 'Balanserad',
      description: 'Bra kvalitet och hastighet. Rekommenderas för de flesta uppgifter.',
    },
  },
  powerful: {
    en: {
      label: 'Powerful',
      description: 'Best quality. Ideal for training programs and deep analysis.',
    },
    sv: {
      label: 'Kraftfull',
      description: 'Bästa kvalitet. Perfekt för träningsprogram och djup analys.',
    },
  },
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
const EQUIPMENT_BY_TYPE: Record<WODWorkoutType, { value: WODEquipment; label: Record<AppLocale, string>; icon: string }[]> = {
  strength: [
    { value: 'none', label: { en: 'No equipment', sv: 'Ingen utrustning' }, icon: '🏃' },
    { value: 'dumbbells', label: { en: 'Dumbbells', sv: 'Hantlar' }, icon: '🏋️' },
    { value: 'barbell', label: { en: 'Barbell', sv: 'Skivstång' }, icon: '💪' },
    { value: 'kettlebell', label: { en: 'Kettlebell', sv: 'Kettlebell' }, icon: '🔔' },
    { value: 'cable_machine', label: { en: 'Cable machine', sv: 'Kabelmaskin' }, icon: '🔧' },
    { value: 'ez_curl_bar', label: { en: 'EZ curl bar', sv: 'EZ-stång' }, icon: '🏋️' },
    { value: 'resistance_band', label: { en: 'Resistance band', sv: 'Gummiband' }, icon: '〰️' },
    { value: 'pull_up_bar', label: { en: 'Pull-up bar', sv: 'Räcke' }, icon: '🔩' },
    { value: 'rings', label: { en: 'Rings', sv: 'Ringar' }, icon: '⭕' },
  ],
  cardio: [
    { value: 'none', label: { en: 'No equipment', sv: 'Ingen utrustning' }, icon: '🏃' },
    { value: 'treadmill', label: { en: 'Treadmill', sv: 'Löpband' }, icon: '🏃‍♂️' },
    { value: 'rower', label: { en: 'Rower', sv: 'Roddmaskin' }, icon: '🚣' },
    { value: 'bike', label: { en: 'Bike', sv: 'Cykel' }, icon: '🚴' },
    { value: 'skierg', label: { en: 'SkiErg', sv: 'SkiErg' }, icon: '⛷️' },
    { value: 'airbike', label: { en: 'Airbike', sv: 'Airbike' }, icon: '💨' },
    { value: 'crosstrainer', label: { en: 'Crosstrainer', sv: 'Crosstrainer' }, icon: '🔄' },
    { value: 'step_machine', label: { en: 'Stair machine', sv: 'Trappmaskin' }, icon: '🪜' },
    { value: 'jump_rope', label: { en: 'Jump rope', sv: 'Hopprep' }, icon: '🪢' },
  ],
  mixed: [
    { value: 'none', label: { en: 'No equipment', sv: 'Ingen utrustning' }, icon: '🏃' },
    { value: 'dumbbells', label: { en: 'Dumbbells', sv: 'Hantlar' }, icon: '🏋️' },
    { value: 'barbell', label: { en: 'Barbell', sv: 'Skivstång' }, icon: '💪' },
    { value: 'kettlebell', label: { en: 'Kettlebell', sv: 'Kettlebell' }, icon: '🔔' },
    { value: 'cable_machine', label: { en: 'Cable machine', sv: 'Kabelmaskin' }, icon: '🔧' },
    { value: 'resistance_band', label: { en: 'Resistance band', sv: 'Gummiband' }, icon: '〰️' },
    { value: 'pull_up_bar', label: { en: 'Pull-up bar', sv: 'Räcke' }, icon: '🔩' },
    { value: 'rings', label: { en: 'Rings', sv: 'Ringar' }, icon: '⭕' },
    { value: 'rower', label: { en: 'Rower', sv: 'Roddmaskin' }, icon: '🚣' },
    { value: 'bike', label: { en: 'Bike', sv: 'Cykel' }, icon: '🚴' },
    { value: 'skierg', label: { en: 'SkiErg', sv: 'SkiErg' }, icon: '⛷️' },
    { value: 'airbike', label: { en: 'Airbike', sv: 'Airbike' }, icon: '💨' },
    { value: 'wall_ball', label: { en: 'Wall ball', sv: 'Wall Ball' }, icon: '⚽' },
    { value: 'box', label: { en: 'Plyo box', sv: 'Plyo-box' }, icon: '📦' },
    { value: 'sled', label: { en: 'Sled', sv: 'Släde' }, icon: '🛷' },
    { value: 'sandbag', label: { en: 'Sandbag', sv: 'Sandsäck' }, icon: '🎒' },
    { value: 'jump_rope', label: { en: 'Jump rope', sv: 'Hopprep' }, icon: '🪢' },
  ],
  core: [
    { value: 'none', label: { en: 'No equipment', sv: 'Ingen utrustning' }, icon: '🏃' },
    { value: 'resistance_band', label: { en: 'Resistance band', sv: 'Gummiband' }, icon: '〰️' },
    { value: 'medicine_ball', label: { en: 'Medicine ball', sv: 'Medicinboll' }, icon: '🏐' },
    { value: 'stability_ball', label: { en: 'Stability ball', sv: 'Pilatesboll' }, icon: '🔵' },
  ],
}

// Map equipment catalog names (English) to WODEquipment values
const CATALOG_TO_WOD_EQUIPMENT: Record<string, WODEquipment> = {
  'dumbbells': 'dumbbells',
  'olympic barbell': 'barbell',
  'barbell': 'barbell',
  'kettlebells': 'kettlebell',
  'kettlebell': 'kettlebell',
  'cable machine': 'cable_machine',
  'ez curl bar': 'ez_curl_bar',
  'resistance bands': 'resistance_band',
  'pull-up rig': 'pull_up_bar',
  'pull-up bar': 'pull_up_bar',
  'gymnastics rings': 'rings',
  'treadmill': 'treadmill',
  'assault bike': 'airbike',
  'air bike': 'airbike',
  'concept2 rower': 'rower',
  'rower': 'rower',
  'concept2 skierg': 'skierg',
  'skierg': 'skierg',
  'concept2 bikeerg': 'bike',
  'wattbike': 'bike',
  'bike': 'bike',
  'elliptical': 'crosstrainer',
  'stairmaster': 'step_machine',
  'jump rope': 'jump_rope',
  'wall balls': 'wall_ball',
  'plyo boxes': 'box',
  'sled': 'sled',
  'sandbag': 'sandbag',
  'd-ball': 'sandbag',
  'medicine ball': 'medicine_ball',
  'stability ball': 'stability_ball',
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
  const locale = getAppLocale(useLocale())
  const [step, setStep] = useState<Step>('workoutType')
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WODWorkoutType>('strength')
  const [selectedMode, setSelectedMode] = useState<WODMode>('structured')
  const [duration, setDuration] = useState(45)
  const [selectedEquipment, setSelectedEquipment] = useState<WODEquipment[]>(['none'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiAllowanceAction, setAiAllowanceAction] = useState<AiAllowanceAction | null>(null)

  // Gym location selector state
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [hasLocations, setHasLocations] = useState(false)
  const [loadingLocations, setLoadingLocations] = useState(false)
  const hasLoadedLocationsRef = useRef(false)

  // Intent tier selection state
  const [availableIntents, setAvailableIntents] = useState<ModelIntent[]>([])
  const [selectedIntent, setSelectedIntent] = useState<ModelIntent>('balanced')
  const [showIntentSelector, setShowIntentSelector] = useState(false)
  const [loadingIntents, setLoadingIntents] = useState(false)
  const hasLoadedIntentsRef = useRef(false)

  const loadPreferredLocations = useCallback(async () => {
    hasLoadedLocationsRef.current = true
    setLoadingLocations(true)
    try {
      const res = await fetch('/api/athlete/settings/preferred-location')
      const data = await res.json()
      if (data.success && data.hasLocations) {
        setLocations(data.availableLocations)
        setHasLocations(true)
        if (data.preferredLocation) {
          setSelectedLocationId(data.preferredLocation.id)
        }
      }
    } catch {
      // No locations available - that's fine
    } finally {
      setLoadingLocations(false)
    }
  }, [])

  // Fetch available locations when modal opens
  useEffect(() => {
    if (open && !hasLoadedLocationsRef.current && !loadingLocations) {
      void loadPreferredLocations()
    }
  }, [open, loadingLocations, loadPreferredLocations])

  const loadAvailableIntents = useCallback(async () => {
    hasLoadedIntentsRef.current = true
    setLoadingIntents(true)
    try {
      const res = await fetch('/api/ai/models')
      const data = await res.json()
      if (data.success && data.mode === 'intent' && data.tiers) {
        const intents = data.tiers.map((tier: { intent: ModelIntent }) => tier.intent)
        setAvailableIntents(intents)
        if (data.defaultIntent) {
          setSelectedIntent(data.defaultIntent)
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI tiers:', err)
    } finally {
      setLoadingIntents(false)
    }
  }, [])

  // Fetch available intent tiers when modal opens
  useEffect(() => {
    if (open && !hasLoadedIntentsRef.current && availableIntents.length === 0) {
      void loadAvailableIntents()
    }
  }, [open, availableIntents.length, loadAvailableIntents])

  // Reset state when modal closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setStep('workoutType')
      setError(null)
      setAiAllowanceAction(null)
      setIsGenerating(false)
      setShowIntentSelector(false)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  const showAiAllowanceError = useCallback((allowanceError: AiAllowanceExhaustedError) => {
    setError(`${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`)
    setAiAllowanceAction({
      label: allowanceError.actionLabel,
      url: allowanceError.actionUrl,
    })
  }, [])

  const selectWorkoutType = useCallback((type: WODWorkoutType) => {
    setSelectedWorkoutType(type)
    setSelectedEquipment(['none'])
  }, [])

  // Auto-populate equipment when location is selected
  useEffect(() => {
    if (!selectedLocationId) return

    async function fetchLocationEquipment() {
      try {
        const res = await fetch(`/api/locations/${selectedLocationId}/equipment`)
        if (!res.ok) return
        const data = await res.json()
        const equipment = data.equipment || []

        // Map catalog names to WODEquipment types
        const wodEquipment = new Set<WODEquipment>()
        for (const item of equipment) {
          const name = (item.name || '').toLowerCase()
          const mapped = CATALOG_TO_WOD_EQUIPMENT[name]
          if (mapped) {
            wodEquipment.add(mapped)
          }
        }

        if (wodEquipment.size > 0) {
          // Only select equipment that's available in the current workout type
          const availableInType = new Set(
            EQUIPMENT_BY_TYPE[selectedWorkoutType].map(e => e.value)
          )
          const matchedEquipment = [...wodEquipment].filter(e => availableInType.has(e))
          if (matchedEquipment.length > 0) {
            setSelectedEquipment(matchedEquipment)
          }
        }
      } catch {
        // Failed to fetch - keep current selection
      }
    }
    void fetchLocationEquipment()
  }, [selectedLocationId, selectedWorkoutType])

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

  // Generate WOD
  const generateWOD = async () => {
    setStep('generating')
    setIsGenerating(true)
    setError(null)
    setAiAllowanceAction(null)

    try {
      const request: GenerateWODRequestBody = {
        mode: selectedMode,
        workoutType: selectedWorkoutType,
        duration,
        equipment: selectedEquipment,
        intent: selectedIntent,
        locationId: selectedLocationId,
      }

      const response = await fetch('/api/ai/wod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const allowanceError = parseAiAllowanceError(errorData)
        if (allowanceError) throw allowanceError
        const errorMsg = errorData?.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData?.error || errorData?.reason || 'Failed to generate WOD'
        throw new Error(errorMsg)
      }

      const data: WODResponse = await response.json()
      emitWorkoutLogged()
      onWODGenerated(data)
      handleOpenChange(false)
    } catch (err) {
      console.error('WOD generation error:', err)
      const message = err instanceof Error ? err.message : text(locale, 'Something went wrong', 'Något gick fel')
      if (isAiAllowanceExhaustedError(err)) {
        showAiAllowanceError(err)
      } else {
        setError(message)
        setAiAllowanceAction(null)
      }
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
    else if (step === 'equipment') void generateWOD()
  }

  const goBack = () => {
    if (step === 'mode') setStep('workoutType')
    else if (step === 'duration') setStep('mode')
    else if (step === 'equipment') setStep('duration')
  }

  const canProceed = step !== 'generating' && !isGenerating

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            {text(locale, 'Create Daily Workout', 'Skapa Dagens Pass')}
          </DialogTitle>
        </DialogHeader>

        {/* Remaining count badge */}
        {!isUnlimited && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs">
              {text(locale, `${remainingWODs} free workouts left today`, `${remainingWODs} kostnadsfria pass kvar idag`)}
            </Badge>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p>{error}</p>
              <AiAllowanceBlockedAction action={aiAllowanceAction} tone="red" />
            </div>
          </div>
        )}

        {/* Step: Workout Type Selection */}
        {step === 'workoutType' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1.5">
              {text(locale, 'What type of training do you want to do?', 'Vilken typ av träning vill du göra?')} <InfoTooltip conceptKey="wodFormats" />
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(['strength', 'cardio', 'mixed', 'core'] as WODWorkoutType[]).map(type => {
                const Icon = WORKOUT_TYPE_ICONS[type]
                const isSelected = selectedWorkoutType === type
                const typeInfo = WORKOUT_TYPE_LABELS[type][locale]
                const accent = WORKOUT_TYPE_ACCENT[type]

                return (
                  <button
                    key={type}
                    onClick={() => selectWorkoutType(type)}
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
              {text(locale, 'Choose the type of session you want', 'Välj vilken typ av pass du vill ha')}
            </p>

            <div className="grid gap-3">
              {(['structured', 'casual', 'fun'] as WODMode[]).map(mode => {
                const Icon = MODE_ICONS[mode]
                const isSelected = selectedMode === mode
                const modeInfo = MODE_LABELS[mode][locale]

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
              <p className="text-sm text-muted-foreground mb-2">{text(locale, 'How much time do you have?', 'Hur lång tid har du?')}</p>
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
              {text(locale, 'What equipment do you have access to?', 'Vilken utrustning har du tillgång till?')}
            </p>

            {/* Gym Location Selector */}
            {hasLocations && locations.length > 0 && (
              <div className="pb-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{text(locale, 'Select gym', 'Välj gym')}</span>
                </div>
                <Select
                  value={selectedLocationId || 'none'}
                  onValueChange={(value) => {
                    const locId = value === 'none' ? null : value
                    setSelectedLocationId(locId)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={text(locale, 'No gym selected', 'Inget gym valt')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{text(locale, 'No gym selected', 'Inget gym valt')}</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}{loc.city ? ` (${loc.city})` : ''} - {text(locale, `${loc.equipmentCount} items`, `${loc.equipmentCount} utr.`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
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
                      <span className="text-sm font-medium">{label[locale]}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* AI Quality Tier Selector */}
            {loadingIntents && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                {text(locale, 'Loading AI quality options...', 'Laddar AI-kvalitet...')}
              </div>
            )}
            {availableIntents.length > 1 && (
              <div className="pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowIntentSelector(!showIntentSelector)}
                  className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>
                      {text(locale, 'AI quality', 'AI-kvalitet')}: {INTENT_LABELS[selectedIntent]?.[locale].label || INTENT_LABELS.balanced[locale].label}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      showIntentSelector && 'rotate-180'
                    )}
                  />
                </button>

                {showIntentSelector && (
                  <div className="mt-3 space-y-2">
                    <Select
                      value={selectedIntent}
                      onValueChange={(v) => setSelectedIntent(v as ModelIntent)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={text(locale, 'Select quality level', 'Välj kvalitetsnivå')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIntents.map(intent => (
                          <SelectItem key={intent} value={intent}>
                            <div className="flex items-center gap-2">
                              <span>{INTENT_LABELS[intent][locale].label}</span>
                              {intent === 'balanced' && (
                                <Badge variant="outline" className="text-xs">
                                  {text(locale, 'Recommended', 'Rekommenderad')}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {INTENT_LABELS[selectedIntent]?.[locale].description}
                    </p>
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
              <h3 className="font-semibold">{text(locale, 'Creating your session...', 'Skapar ditt pass...')}</h3>
              <p className="text-sm text-muted-foreground">
                {text(locale, 'AI is analyzing your profile and creating a tailored session', 'AI analyserar din profil och skapar ett perfekt anpassat pass')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {text(locale, 'Using', 'Använder')} {INTENT_LABELS[selectedIntent]?.[locale].label || INTENT_LABELS.balanced[locale].label}
              </p>
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
              className="text-slate-400 hover:bg-white/5 hover:text-slate-100 disabled:text-slate-500 disabled:opacity-80"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {text(locale, 'Back', 'Tillbaka')}
            </Button>

            <Button
              onClick={goNext}
              disabled={!canProceed || (remainingWODs <= 0 && !isUnlimited)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {step === 'equipment' ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  {text(locale, 'Generate', 'Generera')}
                </>
              ) : (
                <>
                  {text(locale, 'Next', 'Nästa')}
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
