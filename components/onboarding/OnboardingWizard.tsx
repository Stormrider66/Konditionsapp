'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { SportSelector, MultiSportSelector } from './SportSelector'
import { CyclingOnboarding, DEFAULT_CYCLING_SETTINGS, type CyclingSettings } from './CyclingOnboarding'
import { SkiingOnboarding, DEFAULT_SKIING_SETTINGS, type SkiingSettings } from './SkiingOnboarding'
import { SwimmingOnboarding, DEFAULT_SWIMMING_SETTINGS, type SwimmingSettings } from './SwimmingOnboarding'
import { TriathlonOnboarding, DEFAULT_TRIATHLON_SETTINGS, type TriathlonSettings } from './TriathlonOnboarding'
import { HYROXOnboarding, DEFAULT_HYROX_SETTINGS, type HYROXSettings } from './HYROXOnboarding'
import { GeneralFitnessOnboarding, DEFAULT_GENERAL_FITNESS_SETTINGS, type GeneralFitnessSettings } from './GeneralFitnessOnboarding'
import { FunctionalFitnessOnboarding, DEFAULT_FUNCTIONAL_FITNESS_SETTINGS, type FunctionalFitnessSettings } from './FunctionalFitnessOnboarding'
import { HockeyOnboarding, DEFAULT_HOCKEY_SETTINGS, type HockeySettings } from './HockeyOnboarding'
import { FootballOnboarding, DEFAULT_FOOTBALL_SETTINGS, type FootballSettings } from './FootballOnboarding'
import { HandballOnboarding, DEFAULT_HANDBALL_SETTINGS, type HandballSettings } from './HandballOnboarding'
import { FloorballOnboarding, DEFAULT_FLOORBALL_SETTINGS, type FloorballSettings } from './FloorballOnboarding'
import { BasketballOnboarding, DEFAULT_BASKETBALL_SETTINGS, type BasketballSettings } from './BasketballOnboarding'
import { VolleyballOnboarding, DEFAULT_VOLLEYBALL_SETTINGS, type VolleyballSettings } from './VolleyballOnboarding'
import { TennisOnboarding, DEFAULT_TENNIS_SETTINGS, type TennisSettings } from './TennisOnboarding'
import { PadelOnboarding, DEFAULT_PADEL_SETTINGS, type PadelSettings } from './PadelOnboarding'
import { NutritionOnboarding, DEFAULT_NUTRITION_SETTINGS, type NutritionSettings } from './NutritionOnboarding'
import { BiometricsStep, DEFAULT_BIOMETRICS_DATA, type BiometricsData } from './BiometricsStep'
import { FitnessSummary } from './FitnessSummary'
import { AIProgramOfferStep } from './AIProgramOfferStep'
import { SportType } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from '@/i18n/client'

const EXPERIENCE_LEVELS = [
  { value: 'BEGINNER', labelKey: 'experience.levels.beginner.label', descriptionKey: 'experience.levels.beginner.description' },
  { value: 'INTERMEDIATE', labelKey: 'experience.levels.intermediate.label', descriptionKey: 'experience.levels.intermediate.description' },
  { value: 'ADVANCED', labelKey: 'experience.levels.advanced.label', descriptionKey: 'experience.levels.advanced.description' },
  { value: 'ELITE', labelKey: 'experience.levels.elite.label', descriptionKey: 'experience.levels.elite.description' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'treadmill', labelKey: 'equipment.treadmill' },
  { id: 'bike', labelKey: 'equipment.stationaryBike' },
  { id: 'rower', labelKey: 'equipment.rowingMachine' },
  { id: 'skiErg', labelKey: 'equipment.skiErg' },
  { id: 'pool', labelKey: 'equipment.poolAccess' },
  { id: 'gym', labelKey: 'equipment.gymAccess' },
  { id: 'powerMeter', labelKey: 'equipment.powerMeter' },
  { id: 'hrMonitor', labelKey: 'equipment.hrMonitor' },
  { id: 'lactateMeter', labelKey: 'equipment.lactateMeter' },
]

const DAYS_OF_WEEK = [
  { id: 'monday', key: 'availability.days.monday' },
  { id: 'tuesday', key: 'availability.days.tuesday' },
  { id: 'wednesday', key: 'availability.days.wednesday' },
  { id: 'thursday', key: 'availability.days.thursday' },
  { id: 'friday', key: 'availability.days.friday' },
  { id: 'saturday', key: 'availability.days.saturday' },
  { id: 'sunday', key: 'availability.days.sunday' },
]

interface OnboardingWizardProps {
  clientId: string
  clientName: string
  locale?: 'en' | 'sv'
  onComplete?: () => void
  basePath?: string
  initialSport?: SportType
  initialStep?: number
}

// Race distances for VDOT calculation
type RaceDistance = '1500M' | '1_MILE' | '3K' | '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON'

interface RecentRaceTime {
  distance: RaceDistance | null
  hours: number
  minutes: number
  seconds: number
}

interface OnboardingData {
  primarySport: SportType | null
  secondarySports: SportType[]
  experience: string
  biometrics: BiometricsData
  recentRaceTime: RecentRaceTime
  equipment: Record<string, boolean>
  weeklyAvailability: Record<string, { available: boolean; maxHours?: number }>
  preferredSessionLength: number
  currentGoal: string
  targetDate: string
  // Sport-specific settings
  cyclingSettings: CyclingSettings
  skiingSettings: SkiingSettings
  swimmingSettings: SwimmingSettings
  triathlonSettings: TriathlonSettings
  hyroxSettings: HYROXSettings
  generalFitnessSettings: GeneralFitnessSettings
  functionalFitnessSettings: FunctionalFitnessSettings
  hockeySettings: HockeySettings
  footballSettings: FootballSettings
  handballSettings: HandballSettings
  floorballSettings: FloorballSettings
  basketballSettings: BasketballSettings
  volleyballSettings: VolleyballSettings
  tennisSettings: TennisSettings
  padelSettings: PadelSettings
  nutritionSettings: NutritionSettings
}

// Step definitions for different sports
type StepId = 'sport' | 'experience' | 'biometrics' | 'sport_specific' | 'availability' | 'equipment' | 'goals' | 'ai_program' | 'summary'

interface StepDefinition {
  id: StepId
  titleKey: string
  descriptionKey: string
}

const BASE_STEPS: StepDefinition[] = [
  {
    id: 'sport',
    titleKey: 'steps.sport.title',
    descriptionKey: 'steps.sport.description',
  },
  {
    id: 'experience',
    titleKey: 'steps.experience.title',
    descriptionKey: 'steps.experience.description',
  },
  {
    id: 'biometrics',
    titleKey: 'steps.biometrics.title',
    descriptionKey: 'steps.biometrics.description',
  },
]

const CYCLING_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.cycling.title',
  descriptionKey: 'steps.cycling.description',
}

const SKIING_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.skiing.title',
  descriptionKey: 'steps.skiing.description',
}

const SWIMMING_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.swimming.title',
  descriptionKey: 'steps.swimming.description',
}

const TRIATHLON_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.triathlon.title',
  descriptionKey: 'steps.triathlon.description',
}

const HYROX_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.hyrox.title',
  descriptionKey: 'steps.hyrox.description',
}

const GENERAL_FITNESS_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.fitness.title',
  descriptionKey: 'steps.fitness.description',
}

const FUNCTIONAL_FITNESS_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.functionalFitness.title',
  descriptionKey: 'steps.functionalFitness.description',
}

const HOCKEY_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.hockey.title',
  descriptionKey: 'steps.hockey.description',
}

const FOOTBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.football.title',
  descriptionKey: 'steps.football.description',
}

const HANDBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.handball.title',
  descriptionKey: 'steps.handball.description',
}

const FLOORBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.floorball.title',
  descriptionKey: 'steps.floorball.description',
}

const BASKETBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.basketball.title',
  descriptionKey: 'steps.basketball.description',
}

const VOLLEYBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.volleyball.title',
  descriptionKey: 'steps.volleyball.description',
}

const TENNIS_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.tennis.title',
  descriptionKey: 'steps.tennis.description',
}

const PADEL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.padel.title',
  descriptionKey: 'steps.padel.description',
}

const NUTRITION_STEP: StepDefinition = {
  id: 'sport_specific',
  titleKey: 'steps.nutrition.title',
  descriptionKey: 'steps.nutrition.description',
}

const AI_PROGRAM_STEP: StepDefinition = {
  id: 'ai_program',
  titleKey: 'steps.aiProgram.title',
  descriptionKey: 'steps.aiProgram.description',
}

const COMMON_STEPS: StepDefinition[] = [
  {
    id: 'availability',
    titleKey: 'steps.availability.title',
    descriptionKey: 'steps.availability.description',
  },
  {
    id: 'equipment',
    titleKey: 'steps.equipment.title',
    descriptionKey: 'steps.equipment.description',
  },
  {
    id: 'goals',
    titleKey: 'steps.goals.title',
    descriptionKey: 'steps.goals.description',
  },
  {
    id: 'summary',
    titleKey: 'steps.summary.title',
    descriptionKey: 'steps.summary.description',
  },
]

export function OnboardingWizard({
  clientId,
  clientName,
  locale = 'sv',
  onComplete,
  basePath = '',
  initialSport,
  initialStep = 0,
}: OnboardingWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  // If sport was pre-selected during signup (initialStep >= 1), skip the sport selection step
  const [stepIndex, setStepIndex] = useState(initialSport && initialStep >= 1 ? 1 : 0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // AI Program generation state
  const [subscriptionTier, setSubscriptionTier] = useState<'FREE' | 'STANDARD' | 'PRO' | null>(null)
  const [hasAssignedCoach, setHasAssignedCoach] = useState(false)
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const t = useTranslations('components.onboardingWizard')

  const [data, setData] = useState<OnboardingData>({
    primarySport: initialSport || null,
    secondarySports: [],
    experience: '',
    biometrics: DEFAULT_BIOMETRICS_DATA,
    recentRaceTime: { distance: null, hours: 0, minutes: 0, seconds: 0 },
    equipment: {},
    weeklyAvailability: DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.id]: { available: false },
    }), {}),
    preferredSessionLength: 60,
    currentGoal: '',
    targetDate: '',
    cyclingSettings: DEFAULT_CYCLING_SETTINGS,
    skiingSettings: DEFAULT_SKIING_SETTINGS,
    swimmingSettings: DEFAULT_SWIMMING_SETTINGS,
    triathlonSettings: DEFAULT_TRIATHLON_SETTINGS,
    hyroxSettings: DEFAULT_HYROX_SETTINGS,
    generalFitnessSettings: DEFAULT_GENERAL_FITNESS_SETTINGS,
    functionalFitnessSettings: DEFAULT_FUNCTIONAL_FITNESS_SETTINGS,
    hockeySettings: DEFAULT_HOCKEY_SETTINGS,
    footballSettings: DEFAULT_FOOTBALL_SETTINGS,
    handballSettings: DEFAULT_HANDBALL_SETTINGS,
    floorballSettings: DEFAULT_FLOORBALL_SETTINGS,
    basketballSettings: DEFAULT_BASKETBALL_SETTINGS,
    volleyballSettings: DEFAULT_VOLLEYBALL_SETTINGS,
    tennisSettings: DEFAULT_TENNIS_SETTINGS,
    padelSettings: DEFAULT_PADEL_SETTINGS,
    nutritionSettings: DEFAULT_NUTRITION_SETTINGS,
  })

  // Fetch subscription tier and coach status for AI program step
  useEffect(() => {
    const fetchSubscriptionAndCoachStatus = async () => {
      try {
        // Fetch athlete subscription status
        const response = await fetch('/api/athlete/subscription-status')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setSubscriptionTier(result.data.tier || 'FREE')
            setHasAssignedCoach(!!result.data.assignedCoachId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error)
        setSubscriptionTier('FREE')
      }
    }

    fetchSubscriptionAndCoachStatus()
  }, [clientId])

  // Handle AI program generation
  const handleGenerateProgram = async () => {
    setIsGeneratingProgram(true)
    setGenerationProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch('/api/athlete/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          sport: data.primarySport,
          experience: data.experience,
          goal: data.currentGoal,
          targetDate: data.targetDate,
          weeklyAvailability: data.weeklyAvailability,
          preferredSessionLength: data.preferredSessionLength,
          equipment: data.equipment,
        }),
      })

      clearInterval(progressInterval)
      setGenerationProgress(100)

      if (!response.ok) {
        throw new Error('Failed to generate program')
      }

      toast({
        title: t('toasts.aiProgramCreated.title'),
        description: t('toasts.aiProgramCreated.description'),
      })

      // Move to next step after short delay
      setTimeout(() => {
        handleNext()
      }, 1500)
    } catch (error) {
      toast({
        title: t('toasts.error.title'),
        description: t('toasts.error.description'),
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingProgram(false)
    }
  }

  // Compute steps based on selected sport
  const steps = useMemo(() => {
    // Nutrition-focused users get a streamlined flow
    if (data.primarySport === 'NUTRITION') {
      return [
        BASE_STEPS[0], // Sport selection
        BASE_STEPS[2], // Biometrics (height/weight needed for TDEE)
        NUTRITION_STEP, // Nutrition goals & preferences
        COMMON_STEPS[2], // Goals
        COMMON_STEPS[3], // Summary
      ]
    }

    const allSteps = [...BASE_STEPS]

    // Add sport-specific step based on selected sport
    switch (data.primarySport) {
      case 'CYCLING':
        allSteps.push(CYCLING_STEP)
        break
      case 'SKIING':
        allSteps.push(SKIING_STEP)
        break
      case 'SWIMMING':
        allSteps.push(SWIMMING_STEP)
        break
      case 'TRIATHLON':
        allSteps.push(TRIATHLON_STEP)
        break
      case 'HYROX':
        allSteps.push(HYROX_STEP)
        break
      case 'GENERAL_FITNESS':
        allSteps.push(GENERAL_FITNESS_STEP)
        break
      case 'FUNCTIONAL_FITNESS':
        allSteps.push(FUNCTIONAL_FITNESS_STEP)
        break
      case 'TEAM_ICE_HOCKEY':
        allSteps.push(HOCKEY_STEP)
        break
      case 'TEAM_FOOTBALL':
        allSteps.push(FOOTBALL_STEP)
        break
      case 'TEAM_HANDBALL':
        allSteps.push(HANDBALL_STEP)
        break
      case 'TEAM_FLOORBALL':
        allSteps.push(FLOORBALL_STEP)
        break
      case 'TEAM_BASKETBALL':
        allSteps.push(BASKETBALL_STEP)
        break
      case 'TEAM_VOLLEYBALL':
        allSteps.push(VOLLEYBALL_STEP)
        break
      case 'TENNIS':
        allSteps.push(TENNIS_STEP)
        break
      case 'PADEL':
        allSteps.push(PADEL_STEP)
        break
    }

    // Add common steps (availability, equipment, goals)
    allSteps.push(...COMMON_STEPS.slice(0, 3))

    // Add AI program step before summary
    allSteps.push(AI_PROGRAM_STEP)

    // Add summary step
    allSteps.push(COMMON_STEPS[3])

    return allSteps
  }, [data.primarySport])

  const currentStep = steps[stepIndex]
  const totalSteps = steps.length

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (currentStep.id) {
      case 'sport':
        return data.primarySport !== null
      case 'experience':
        return data.experience !== ''
      case 'biometrics':
        return true // Biometrics is optional but helpful
      case 'sport_specific':
        // Cycling requires at least one bike type and a discipline
        if (data.primarySport === 'CYCLING') {
          return data.cyclingSettings.bikeTypes.length > 0 && data.cyclingSettings.primaryDiscipline !== ''
        }
        // Skiing requires technique and discipline
        if (data.primarySport === 'SKIING') {
          return data.skiingSettings.technique !== '' && data.skiingSettings.primaryDiscipline !== ''
        }
        // Swimming requires stroke types and discipline
        if (data.primarySport === 'SWIMMING') {
          return data.swimmingSettings.strokeTypes.length > 0 && data.swimmingSettings.primaryDiscipline !== ''
        }
        // Triathlon requires race distance and experience level
        if (data.primarySport === 'TRIATHLON') {
          return data.triathlonSettings.targetRaceDistance !== '' && data.triathlonSettings.experienceLevel !== ''
        }
        // HYROX requires race category and experience level (already have valid defaults)
        if (data.primarySport === 'HYROX') {
          return !!data.hyroxSettings.raceCategory && !!data.hyroxSettings.experienceLevel
        }
        // General Fitness requires primary goal and fitness level (already have valid defaults)
        if (data.primarySport === 'GENERAL_FITNESS') {
          return !!data.generalFitnessSettings.primaryGoal && !!data.generalFitnessSettings.fitnessLevel
        }
        // Functional Fitness requires experience level (already have valid defaults)
        if (data.primarySport === 'FUNCTIONAL_FITNESS') {
          return !!data.functionalFitnessSettings.experienceLevel
        }
        // Team sports - require position
        if (data.primarySport === 'TEAM_ICE_HOCKEY') {
          return !!data.hockeySettings.position
        }
        if (data.primarySport === 'TEAM_FOOTBALL') {
          return !!data.footballSettings.position
        }
        if (data.primarySport === 'TEAM_HANDBALL') {
          return !!data.handballSettings.position
        }
        if (data.primarySport === 'TEAM_FLOORBALL') {
          return !!data.floorballSettings.position
        }
        if (data.primarySport === 'TEAM_BASKETBALL') {
          return !!data.basketballSettings.position
        }
        if (data.primarySport === 'TEAM_VOLLEYBALL') {
          return !!data.volleyballSettings.position
        }
        // Racket sports - require position/play style
        if (data.primarySport === 'TENNIS') {
          return !!data.tennisSettings.playStyle
        }
        if (data.primarySport === 'PADEL') {
          return !!data.padelSettings.position
        }
        // Nutrition - always valid (has sensible defaults)
        if (data.primarySport === 'NUTRITION') {
          return !!data.nutritionSettings.goalType && !!data.nutritionSettings.activityLevel
        }
        return true
      case 'availability':
        return Object.values(data.weeklyAvailability).some((d) => d.available)
      case 'equipment':
        return true // Equipment is optional
      case 'goals':
        return true // Goal is optional
      case 'ai_program':
        return true // AI program step can always proceed (it's optional)
      case 'summary':
        return true // Summary is just review
      default:
        return false
    }
  }

  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1)
    }
  }

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      // Build the request body with sport-specific settings
      const requestBody: Record<string, unknown> = {
        primarySport: data.primarySport,
        secondarySports: data.secondarySports,
        [`${data.primarySport?.toLowerCase()}Experience`]: data.experience,
        equipment: data.equipment,
        weeklyAvailability: data.weeklyAvailability,
        preferredSessionLength: data.preferredSessionLength,
        currentGoal: data.currentGoal || undefined,
        targetDate: data.targetDate || undefined,
        onboardingCompleted: true,
        onboardingStep: totalSteps,
      }

      // Add biometrics data if any values were provided
      if (data.biometrics.restingHR || data.biometrics.maxHR || data.biometrics.watchVO2maxEstimate) {
        requestBody.biometrics = data.biometrics
      }

      // Add recent race time for fitness estimation (convert to total minutes)
      if (data.recentRaceTime.distance && (data.recentRaceTime.hours > 0 || data.recentRaceTime.minutes > 0 || data.recentRaceTime.seconds > 0)) {
        const timeMinutes = data.recentRaceTime.hours * 60 + data.recentRaceTime.minutes + data.recentRaceTime.seconds / 60
        requestBody.recentRaceTime = {
          distance: data.recentRaceTime.distance,
          timeMinutes,
        }
      }

      // Add sport-specific settings
      if (data.primarySport === 'CYCLING') {
        requestBody.cyclingSettings = data.cyclingSettings
      }
      if (data.primarySport === 'SKIING') {
        requestBody.skiingSettings = data.skiingSettings
      }
      if (data.primarySport === 'SWIMMING') {
        requestBody.swimmingSettings = data.swimmingSettings
      }
      if (data.primarySport === 'TRIATHLON') {
        requestBody.triathlonSettings = data.triathlonSettings
      }
      if (data.primarySport === 'HYROX') {
        requestBody.hyroxSettings = data.hyroxSettings
      }
      if (data.primarySport === 'GENERAL_FITNESS') {
        requestBody.generalFitnessSettings = data.generalFitnessSettings
      }
      if (data.primarySport === 'FUNCTIONAL_FITNESS') {
        requestBody.functionalFitnessSettings = data.functionalFitnessSettings
      }
      if (data.primarySport === 'TEAM_ICE_HOCKEY') {
        requestBody.hockeySettings = data.hockeySettings
      }
      if (data.primarySport === 'TEAM_FOOTBALL') {
        requestBody.footballSettings = data.footballSettings
      }
      if (data.primarySport === 'TEAM_HANDBALL') {
        requestBody.handballSettings = data.handballSettings
      }
      if (data.primarySport === 'TEAM_FLOORBALL') {
        requestBody.floorballSettings = data.floorballSettings
      }
      if (data.primarySport === 'TEAM_BASKETBALL') {
        requestBody.basketballSettings = data.basketballSettings
      }
      if (data.primarySport === 'TEAM_VOLLEYBALL') {
        requestBody.volleyballSettings = data.volleyballSettings
      }
      if (data.primarySport === 'TENNIS') {
        requestBody.tennisSettings = data.tennisSettings
      }
      if (data.primarySport === 'PADEL') {
        requestBody.padelSettings = data.padelSettings
      }

      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to save profile')
      }

      // For nutrition-focused users, also save nutrition goals and dietary preferences
      if (data.primarySport === 'NUTRITION') {
        const ns = data.nutritionSettings
        await Promise.all([
          fetch('/api/nutrition/goals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goalType: ns.goalType,
              targetWeightKg: ns.targetWeightKg,
              weeklyChangeKg: ns.weeklyChangeKg,
              macroProfile: ns.macroProfile,
              activityLevel: ns.activityLevel,
            }),
          }),
          fetch('/api/nutrition/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dietaryStyle: ns.dietaryStyle,
              allergies: ns.allergies,
              intolerances: ns.intolerances,
            }),
          }),
        ])
      }

      toast({
        title: t('toasts.profileCreated.title'),
        description: t('toasts.profileCreated.description'),
      })

      if (onComplete) {
        onComplete()
      } else {
        router.push(`${basePath}/athlete/dashboard`)
      }
    } catch (error) {
      toast({
        title: t('toasts.saveError.title'),
        description: t('toasts.saveError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getGoalPlaceholderKey = (sport: SportType | null) => {
    switch (sport) {
      case 'CYCLING':
        return 'goals.placeholders.cycling'
      case 'SKIING':
        return 'goals.placeholders.skiing'
      case 'SWIMMING':
        return 'goals.placeholders.swimming'
      case 'TRIATHLON':
        return 'goals.placeholders.triathlon'
      case 'HYROX':
        return 'goals.placeholders.hydrox'
      case 'GENERAL_FITNESS':
        return 'goals.placeholders.generalFitness'
      default:
        return 'goals.placeholders.default'
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl">
              {t('header.welcome', { clientName })}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {t('header.step', { step: stepIndex + 1, total: totalSteps })}
            </span>
          </div>
          <Progress value={((stepIndex + 1) / totalSteps) * 100} className="h-2" />
          <CardDescription className="mt-4">
            {t(currentStep.descriptionKey)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step: Sport Selection */}
          {currentStep.id === 'sport' && (
            <div className="space-y-6">
              <SportSelector
                value={data.primarySport || undefined}
                onChange={(sport) => {
                  updateData({ primarySport: sport })
                  // Reset sport-specific settings when sport changes
                  if (sport !== 'CYCLING') {
                    updateData({ cyclingSettings: DEFAULT_CYCLING_SETTINGS })
                  }
                  if (sport !== 'SKIING') {
                    updateData({ skiingSettings: DEFAULT_SKIING_SETTINGS })
                  }
                  if (sport !== 'SWIMMING') {
                    updateData({ swimmingSettings: DEFAULT_SWIMMING_SETTINGS })
                  }
                  if (sport !== 'TRIATHLON') {
                    updateData({ triathlonSettings: DEFAULT_TRIATHLON_SETTINGS })
                  }
                  if (sport !== 'HYROX') {
                    updateData({ hyroxSettings: DEFAULT_HYROX_SETTINGS })
                  }
                  if (sport !== 'GENERAL_FITNESS') {
                    updateData({ generalFitnessSettings: DEFAULT_GENERAL_FITNESS_SETTINGS })
                  }
                  if (sport !== 'FUNCTIONAL_FITNESS') {
                    updateData({ functionalFitnessSettings: DEFAULT_FUNCTIONAL_FITNESS_SETTINGS })
                  }
                  if (sport !== 'TEAM_ICE_HOCKEY') {
                    updateData({ hockeySettings: DEFAULT_HOCKEY_SETTINGS })
                  }
                  if (sport !== 'TEAM_FOOTBALL') {
                    updateData({ footballSettings: DEFAULT_FOOTBALL_SETTINGS })
                  }
                  if (sport !== 'TEAM_HANDBALL') {
                    updateData({ handballSettings: DEFAULT_HANDBALL_SETTINGS })
                  }
                  if (sport !== 'TEAM_FLOORBALL') {
                    updateData({ floorballSettings: DEFAULT_FLOORBALL_SETTINGS })
                  }
                  if (sport !== 'TEAM_BASKETBALL') {
                    updateData({ basketballSettings: DEFAULT_BASKETBALL_SETTINGS })
                  }
                  if (sport !== 'TEAM_VOLLEYBALL') {
                    updateData({ volleyballSettings: DEFAULT_VOLLEYBALL_SETTINGS })
                  }
                  if (sport !== 'TENNIS') {
                    updateData({ tennisSettings: DEFAULT_TENNIS_SETTINGS })
                  }
                  if (sport !== 'PADEL') {
                    updateData({ padelSettings: DEFAULT_PADEL_SETTINGS })
                  }
                }}
              />
              {data.primarySport && (
                <div className="pt-4 border-t">
                  <Label className="text-base mb-3 block">
                    {t('labels.secondarySports')}
                  </Label>
                  <MultiSportSelector
                    value={data.secondarySports}
                    onChange={(sports) => updateData({
                      secondarySports: sports.filter(s => s !== data.primarySport)
                    })}
                    maxSelections={2}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step: Experience Level */}
          {currentStep.id === 'experience' && (
            <RadioGroup
              value={data.experience}
              onValueChange={(value) => updateData({ experience: value })}
              className="grid gap-4 sm:grid-cols-2"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <Label
                  key={level.value}
                  htmlFor={level.value}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                    data.experience === level.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={level.value} id={level.value} />
                  <div>
                    <p className="font-medium">
                      {t(level.labelKey)}
                    </p>
                    <p className="text-sm text-muted-foreground">{t(level.descriptionKey)}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          )}

          {/* Step: Biometrics */}
          {currentStep.id === 'biometrics' && (
            <BiometricsStep
              value={data.biometrics}
              onChange={(biometrics) => updateData({ biometrics })}
              locale={locale}
            />
          )}

          {/* Step: Sport-Specific Settings (Cycling) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'CYCLING' && (
            <CyclingOnboarding
              value={data.cyclingSettings}
              onChange={(settings) => updateData({ cyclingSettings: settings })}
              locale={locale}
            />
          )}

          {/* Step: Sport-Specific Settings (Skiing) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'SKIING' && (
            <SkiingOnboarding
              value={data.skiingSettings}
              onChange={(settings) => updateData({ skiingSettings: settings })}
              locale={locale}
            />
          )}

          {/* Step: Sport-Specific Settings (Swimming) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'SWIMMING' && (
            <SwimmingOnboarding
              value={data.swimmingSettings}
              onChange={(settings) => updateData({ swimmingSettings: settings })}
              locale={locale}
            />
          )}

          {/* Step: Sport-Specific Settings (Triathlon) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TRIATHLON' && (
            <TriathlonOnboarding
              value={data.triathlonSettings}
              onChange={(settings) => updateData({ triathlonSettings: settings })}
              locale={locale}
            />
          )}

          {/* Step: Sport-Specific Settings (HYROX) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'HYROX' && (
            <HYROXOnboarding
              settings={data.hyroxSettings}
              onUpdate={(settings) => updateData({ hyroxSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (General Fitness) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'GENERAL_FITNESS' && (
            <GeneralFitnessOnboarding
              settings={data.generalFitnessSettings}
              onUpdate={(settings) => updateData({ generalFitnessSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Functional Fitness) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'FUNCTIONAL_FITNESS' && (
            <FunctionalFitnessOnboarding
              settings={data.functionalFitnessSettings}
              onUpdate={(settings) => updateData({ functionalFitnessSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Ice Hockey) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TEAM_ICE_HOCKEY' && (
            <HockeyOnboarding
              settings={data.hockeySettings}
              onUpdate={(settings) => updateData({ hockeySettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Football) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TEAM_FOOTBALL' && (
            <FootballOnboarding
              settings={data.footballSettings}
              onUpdate={(settings) => updateData({ footballSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Handball) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TEAM_HANDBALL' && (
            <HandballOnboarding
              settings={data.handballSettings}
              onUpdate={(settings) => updateData({ handballSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Floorball) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TEAM_FLOORBALL' && (
            <FloorballOnboarding
              settings={data.floorballSettings}
              onUpdate={(settings) => updateData({ floorballSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Basketball) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TEAM_BASKETBALL' && (
            <BasketballOnboarding
              settings={data.basketballSettings}
              onUpdate={(settings) => updateData({ basketballSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Volleyball) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TEAM_VOLLEYBALL' && (
            <VolleyballOnboarding
              settings={data.volleyballSettings}
              onUpdate={(settings) => updateData({ volleyballSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Tennis) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'TENNIS' && (
            <TennisOnboarding
              settings={data.tennisSettings}
              onUpdate={(settings) => updateData({ tennisSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Padel) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'PADEL' && (
            <PadelOnboarding
              settings={data.padelSettings}
              onUpdate={(settings) => updateData({ padelSettings: settings })}
            />
          )}

          {/* Step: Sport-Specific Settings (Nutrition) */}
          {currentStep.id === 'sport_specific' && data.primarySport === 'NUTRITION' && (
            <NutritionOnboarding
              settings={data.nutritionSettings}
              onUpdate={(settings) => updateData({ nutritionSettings: settings })}
            />
          )}

          {/* Step: Weekly Availability */}
          {currentStep.id === 'availability' && (
            <div className="space-y-6">
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.id} className="text-center">
                    <Label className="text-sm">{t(day.key)}</Label>
                    <div
                      className={cn(
                        'mt-2 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        data.weeklyAvailability[day.id]?.available
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/30 border-transparent hover:border-muted'
                      )}
                      onClick={() =>
                        updateData({
                          weeklyAvailability: {
                            ...data.weeklyAvailability,
                            [day.id]: {
                              available: !data.weeklyAvailability[day.id]?.available,
                              maxHours: data.weeklyAvailability[day.id]?.maxHours || 2,
                            },
                          },
                        })
                      }
                    >
                      {data.weeklyAvailability[day.id]?.available ? '✓' : ''}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>{t('labels.preferredSessionLength')}</Label>
                <Input
                  type="number"
                  min={15}
                  max={300}
                  value={data.preferredSessionLength}
                  onChange={(e) => updateData({ preferredSessionLength: parseInt(e.target.value) || 60 })}
                  className="max-w-[200px]"
                />
              </div>
            </div>
          )}

          {/* Step: Equipment */}
          {currentStep.id === 'equipment' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EQUIPMENT_OPTIONS.map((item) => (
                <Label
                  key={item.id}
                  htmlFor={item.id}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    data.equipment[item.id] ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    id={item.id}
                    checked={data.equipment[item.id] || false}
                    onCheckedChange={(checked) =>
                      updateData({
                        equipment: { ...data.equipment, [item.id]: !!checked },
                      })
                    }
                  />
                  <span>{t(item.labelKey)}</span>
                </Label>
              ))}
            </div>
          )}

          {/* Step: Goals */}
          {currentStep.id === 'goals' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>{t('labels.mainGoal')}</Label>
                <Textarea
                  placeholder={t(getGoalPlaceholderKey(data.primarySport))}
                  value={data.currentGoal}
                  onChange={(e) => updateData({ currentGoal: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('labels.targetDate')}</Label>
                <Input
                  type="date"
                  value={data.targetDate}
                  onChange={(e) => updateData({ targetDate: e.target.value })}
                  className="max-w-[200px]"
                />
              </div>

              {/* Recent race time for fitness estimation (running sports only) */}
              {(data.primarySport === 'RUNNING' || data.primarySport === 'TRIATHLON') && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {t('labels.recentRaceTime')}
                    </CardTitle>
                    <CardDescription>
                      {t('labels.recentRaceDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('labels.distance')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: '1500M', label: '1500m' },
                          { id: '1_MILE', label: '1 mile' },
                          { id: '3K', label: '3K' },
                          { id: '5K', label: '5K' },
                          { id: '10K', label: '10K' },
                          { id: 'HALF_MARATHON', labelKey: 'race.halfMarathon' },
                          { id: 'MARATHON', label: 'Marathon' },
                        ].map((dist) => (
                          <button
                            key={dist.id}
                            type="button"
                            onClick={() => updateData({
                              recentRaceTime: {
                                ...data.recentRaceTime,
                                distance: data.recentRaceTime.distance === dist.id ? null : dist.id as RaceDistance,
                              }
                            })}
                            className={cn(
                              'px-3 py-1.5 text-sm rounded-full border transition-colors',
                              data.recentRaceTime.distance === dist.id
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {dist.labelKey ? t(dist.labelKey) : dist.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {data.recentRaceTime.distance && (
                      <div className="space-y-2">
                        <Label>{t('labels.time')}</Label>
                        <div className="flex items-center gap-2">
                          {(data.recentRaceTime.distance === 'HALF_MARATHON' || data.recentRaceTime.distance === 'MARATHON') && (
                            <>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                placeholder="0"
                                value={data.recentRaceTime.hours || ''}
                                onChange={(e) => updateData({
                                  recentRaceTime: {
                                    ...data.recentRaceTime,
                                    hours: parseInt(e.target.value) || 0,
                                  }
                                })}
                                className="w-16 text-center"
                              />
                              <span className="text-sm text-muted-foreground">{t('labels.hours')}</span>
                            </>
                          )}
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            placeholder="00"
                            value={data.recentRaceTime.minutes || ''}
                            onChange={(e) => updateData({
                              recentRaceTime: {
                                ...data.recentRaceTime,
                                minutes: parseInt(e.target.value) || 0,
                              }
                            })}
                            className="w-16 text-center"
                          />
                          <span className="text-sm text-muted-foreground">{t('labels.minutes')}</span>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            placeholder="00"
                            value={data.recentRaceTime.seconds || ''}
                            onChange={(e) => updateData({
                              recentRaceTime: {
                                ...data.recentRaceTime,
                                seconds: parseInt(e.target.value) || 0,
                              }
                            })}
                            className="w-16 text-center"
                          />
                          <span className="text-sm text-muted-foreground">{t('labels.seconds')}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step: AI Program Generation Offer */}
          {currentStep.id === 'ai_program' && (
            <AIProgramOfferStep
              subscriptionTier={subscriptionTier}
              onGenerate={handleGenerateProgram}
              onSkip={handleNext}
              isGenerating={isGeneratingProgram}
              generationProgress={generationProgress}
              hasAssignedCoach={hasAssignedCoach}
            />
          )}

          {/* Step: Summary */}
          {currentStep.id === 'summary' && (
            <FitnessSummary
              biometrics={data.biometrics}
              recentRaceTime={
                data.recentRaceTime.distance
                  ? {
                      distance: data.recentRaceTime.distance,
                      timeMinutes:
                        data.recentRaceTime.hours * 60 +
                        data.recentRaceTime.minutes +
                        data.recentRaceTime.seconds / 60,
                    }
                  : undefined
              }
              experienceLevel={data.experience as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' | undefined}
              locale={locale}
            />
          )}
        </CardContent>

        {/* Hide footer during AI program step - it has its own buttons */}
        {currentStep.id !== 'ai_program' && (
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              {t('buttons.back')}
            </Button>
            {stepIndex < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {t('buttons.next')}
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t('buttons.saving')
                  : t('buttons.completeSetup')}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
