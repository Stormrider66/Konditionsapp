'use client'

import { useState, useMemo } from 'react'
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
import { SportType } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'

const EXPERIENCE_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', labelSv: 'Nybörjare', description: '<1 year' },
  { value: 'INTERMEDIATE', label: 'Intermediate', labelSv: 'Mellanliggande', description: '1-3 years' },
  { value: 'ADVANCED', label: 'Advanced', labelSv: 'Avancerad', description: '3-5 years' },
  { value: 'ELITE', label: 'Elite', labelSv: 'Elit', description: '5+ years' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'treadmill', label: 'Treadmill', labelSv: 'Löpband' },
  { id: 'bike', label: 'Stationary Bike', labelSv: 'Motionscykel' },
  { id: 'rower', label: 'Rowing Machine', labelSv: 'Roddmaskin' },
  { id: 'skiErg', label: 'SkiErg', labelSv: 'SkiErg' },
  { id: 'pool', label: 'Pool Access', labelSv: 'Tillgång till pool' },
  { id: 'gym', label: 'Gym Access', labelSv: 'Tillgång till gym' },
  { id: 'powerMeter', label: 'Power Meter', labelSv: 'Wattmätare' },
  { id: 'hrMonitor', label: 'HR Monitor', labelSv: 'Pulsmätare' },
  { id: 'lactateMeter', label: 'Lactate Meter', labelSv: 'Laktatmätare' },
]

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon', labelSv: 'Mån' },
  { id: 'tuesday', label: 'Tue', labelSv: 'Tis' },
  { id: 'wednesday', label: 'Wed', labelSv: 'Ons' },
  { id: 'thursday', label: 'Thu', labelSv: 'Tor' },
  { id: 'friday', label: 'Fri', labelSv: 'Fre' },
  { id: 'saturday', label: 'Sat', labelSv: 'Lör' },
  { id: 'sunday', label: 'Sun', labelSv: 'Sön' },
]

interface OnboardingWizardProps {
  clientId: string
  clientName: string
  locale?: 'en' | 'sv'
  onComplete?: () => void
}

interface OnboardingData {
  primarySport: SportType | null
  secondarySports: SportType[]
  experience: string
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
}

// Step definitions for different sports
type StepId = 'sport' | 'experience' | 'sport_specific' | 'availability' | 'equipment' | 'goals'

interface StepDefinition {
  id: StepId
  titleEn: string
  titleSv: string
  descriptionEn: string
  descriptionSv: string
}

const BASE_STEPS: StepDefinition[] = [
  {
    id: 'sport',
    titleEn: 'Select Sport',
    titleSv: 'Välj sport',
    descriptionEn: 'Select your primary sport to customize your training experience.',
    descriptionSv: 'Välj din huvudsakliga sport för att anpassa din träningsupplevelse.',
  },
  {
    id: 'experience',
    titleEn: 'Experience Level',
    titleSv: 'Erfarenhetsnivå',
    descriptionEn: 'Tell us about your experience level.',
    descriptionSv: 'Berätta om din erfarenhetsnivå.',
  },
]

const CYCLING_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Cycling Setup',
  titleSv: 'Cyklinginställningar',
  descriptionEn: 'Configure your cycling-specific settings and equipment.',
  descriptionSv: 'Konfigurera dina cykelspecifika inställningar och utrustning.',
}

const SKIING_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Skiing Setup',
  titleSv: 'Skidinställningar',
  descriptionEn: 'Configure your skiing-specific settings and training methods.',
  descriptionSv: 'Konfigurera dina skidspecifika inställningar och träningsmetoder.',
}

const SWIMMING_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Swimming Setup',
  titleSv: 'Siminställningar',
  descriptionEn: 'Configure your swimming-specific settings and training environment.',
  descriptionSv: 'Konfigurera dina simspecifika inställningar och träningsmiljö.',
}

const TRIATHLON_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Triathlon Setup',
  titleSv: 'Triathloninställningar',
  descriptionEn: 'Configure your triathlon-specific settings for swim, bike, and run.',
  descriptionSv: 'Konfigurera dina triathlonspecifika inställningar för sim, cykel och löpning.',
}

const HYROX_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'HYROX Setup',
  titleSv: 'HYROX-inställningar',
  descriptionEn: 'Configure your HYROX-specific settings, benchmarks, and training preferences.',
  descriptionSv: 'Konfigurera dina HYROX-specifika inställningar, benchmark-tider och träningspreferenser.',
}

const GENERAL_FITNESS_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Fitness Setup',
  titleSv: 'Fitnessinställningar',
  descriptionEn: 'Configure your fitness goals, preferences, and training style.',
  descriptionSv: 'Konfigurera dina träningsmål, preferenser och träningsstil.',
}

const FUNCTIONAL_FITNESS_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Functional Fitness Setup',
  titleSv: 'Funktionell fitness-inställningar',
  descriptionEn: 'Configure your benchmarks, gymnastics skills, and training preferences.',
  descriptionSv: 'Konfigurera dina benchmarks, gymnastik-skills och träningspreferenser.',
}

const HOCKEY_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Ice Hockey Setup',
  titleSv: 'Ishockeyinställningar',
  descriptionEn: 'Configure your position, team info, and training preferences.',
  descriptionSv: 'Konfigurera din position, laginformation och träningspreferenser.',
}

const FOOTBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Football Setup',
  titleSv: 'Fotbollsinställningar',
  descriptionEn: 'Configure your position, team info, and physical benchmarks.',
  descriptionSv: 'Konfigurera din position, laginformation och fysiska tester.',
}

const HANDBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Handball Setup',
  titleSv: 'Handbollsinställningar',
  descriptionEn: 'Configure your position, team info, and training preferences.',
  descriptionSv: 'Konfigurera din position, laginformation och träningspreferenser.',
}

const FLOORBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Floorball Setup',
  titleSv: 'Innebandyinställningar',
  descriptionEn: 'Configure your position, team info, and training preferences.',
  descriptionSv: 'Konfigurera din position, laginformation och träningspreferenser.',
}

const BASKETBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Basketball Setup',
  titleSv: 'Basketinställningar',
  descriptionEn: 'Configure your position, team info, and physical benchmarks.',
  descriptionSv: 'Konfigurera din position, laginformation och fysiska tester.',
}

const VOLLEYBALL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Volleyball Setup',
  titleSv: 'Volleybollinställningar',
  descriptionEn: 'Configure your position, team info, and physical benchmarks.',
  descriptionSv: 'Konfigurera din position, laginformation och fysiska tester.',
}

const TENNIS_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Tennis Setup',
  titleSv: 'Tennisinställningar',
  descriptionEn: 'Configure your play style, benchmarks, and training preferences.',
  descriptionSv: 'Konfigurera din spelstil, fysiska tester och träningspreferenser.',
}

const PADEL_STEP: StepDefinition = {
  id: 'sport_specific',
  titleEn: 'Padel Setup',
  titleSv: 'Padelinställningar',
  descriptionEn: 'Configure your position, partner info, and physical benchmarks.',
  descriptionSv: 'Konfigurera din position, partnerinformation och fysiska tester.',
}

const COMMON_STEPS: StepDefinition[] = [
  {
    id: 'availability',
    titleEn: 'Weekly Availability',
    titleSv: 'Tillgänglighet',
    descriptionEn: 'When can you train during the week?',
    descriptionSv: 'När kan du träna under veckan?',
  },
  {
    id: 'equipment',
    titleEn: 'Equipment',
    titleSv: 'Utrustning',
    descriptionEn: 'What equipment do you have access to?',
    descriptionSv: 'Vilken utrustning har du tillgång till?',
  },
  {
    id: 'goals',
    titleEn: 'Goals',
    titleSv: 'Mål',
    descriptionEn: 'What are your training goals?',
    descriptionSv: 'Vad är dina träningsmål?',
  },
]

export function OnboardingWizard({
  clientId,
  clientName,
  locale = 'sv',
  onComplete,
}: OnboardingWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [stepIndex, setStepIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    primarySport: null,
    secondarySports: [],
    experience: '',
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
  })

  // Compute steps based on selected sport
  const steps = useMemo(() => {
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

    // Add common steps
    allSteps.push(...COMMON_STEPS)

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
        return true
      case 'availability':
        return Object.values(data.weeklyAvailability).some((d) => d.available)
      case 'equipment':
        return true // Equipment is optional
      case 'goals':
        return true // Goal is optional
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

      toast({
        title: locale === 'sv' ? 'Profil skapad!' : 'Profile created!',
        description: locale === 'sv'
          ? 'Din sportprofil har sparats.'
          : 'Your sport profile has been saved.',
      })

      if (onComplete) {
        onComplete()
      } else {
        router.push('/athlete/dashboard')
      }
    } catch (error) {
      toast({
        title: locale === 'sv' ? 'Fel' : 'Error',
        description: locale === 'sv'
          ? 'Kunde inte spara profilen. Försök igen.'
          : 'Could not save profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl">
              {t(`Welcome, ${clientName}!`, `Välkommen, ${clientName}!`)}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {t(`Step ${stepIndex + 1} of ${totalSteps}`, `Steg ${stepIndex + 1} av ${totalSteps}`)}
            </span>
          </div>
          <Progress value={((stepIndex + 1) / totalSteps) * 100} className="h-2" />
          <CardDescription className="mt-4">
            {locale === 'sv' ? currentStep.descriptionSv : currentStep.descriptionEn}
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
                locale={locale}
              />
              {data.primarySport && (
                <div className="pt-4 border-t">
                  <Label className="text-base mb-3 block">
                    {t('Secondary sports (optional)', 'Sekundära sporter (valfritt)')}
                  </Label>
                  <MultiSportSelector
                    value={data.secondarySports}
                    onChange={(sports) => updateData({
                      secondarySports: sports.filter(s => s !== data.primarySport)
                    })}
                    locale={locale}
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
                      {locale === 'sv' ? level.labelSv : level.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
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

          {/* Step: Weekly Availability */}
          {currentStep.id === 'availability' && (
            <div className="space-y-6">
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.id} className="text-center">
                    <Label className="text-sm">{locale === 'sv' ? day.labelSv : day.label}</Label>
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
                <Label>{t('Preferred session length (minutes)', 'Föredragen passlängd (minuter)')}</Label>
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
                  <span>{locale === 'sv' ? item.labelSv : item.label}</span>
                </Label>
              ))}
            </div>
          )}

          {/* Step: Goals */}
          {currentStep.id === 'goals' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>{t('What is your main goal?', 'Vad är ditt huvudmål?')}</Label>
                <Textarea
                  placeholder={
                    data.primarySport === 'CYCLING'
                      ? t(
                          'e.g., Increase FTP to 300W, complete a Gran Fondo, win a local race...',
                          't.ex. Öka FTP till 300W, slutföra en Gran Fondo, vinna en lokal tävling...'
                        )
                      : data.primarySport === 'SKIING'
                        ? t(
                            'e.g., Complete Vasaloppet, improve threshold pace, win age group...',
                            't.ex. Slutföra Vasaloppet, förbättra tröskeltempot, vinna åldersgrupp...'
                          )
                        : data.primarySport === 'SWIMMING'
                          ? t(
                              'e.g., Improve CSS to 1:30/100m, complete an open water race, qualify for Masters nationals...',
                              't.ex. Förbättra CSS till 1:30/100m, slutföra ett öppet vatten-lopp, kvala till Masters-SM...'
                            )
                          : data.primarySport === 'TRIATHLON'
                            ? t(
                                'e.g., Complete my first Olympic triathlon, qualify for 70.3 Worlds, sub-10 hour Ironman...',
                                't.ex. Slutföra min första olympiska triathlon, kvala till 70.3 VM, sub-10 timmar Ironman...'
                              )
                            : data.primarySport === 'HYROX'
                              ? t(
                                  'e.g., Complete my first HYROX under 90 min, qualify for World Championship, podium in Pro...',
                                  't.ex. Slutföra mitt första HYROX under 90 min, kvala till VM, pall i Pro-klassen...'
                                )
                              : data.primarySport === 'GENERAL_FITNESS'
                                ? t(
                                    'e.g., Lose 5 kg, build daily exercise habits, improve energy levels, get stronger...',
                                    't.ex. Gå ner 5 kg, bygga dagliga träningsvanor, förbättra energinivåer, bli starkare...'
                                  )
                                : t(
                                  'e.g., Run a marathon under 3:30, improve my overall fitness...',
                                  't.ex. Springa maraton under 3:30, förbättra min allmänna kondition...'
                                )
                  }
                  value={data.currentGoal}
                  onChange={(e) => updateData({ currentGoal: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Target date (optional)', 'Måldatum (valfritt)')}</Label>
                <Input
                  type="date"
                  value={data.targetDate}
                  onChange={(e) => updateData({ targetDate: e.target.value })}
                  className="max-w-[200px]"
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            {t('Back', 'Tillbaka')}
          </Button>
          {stepIndex < totalSteps - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {t('Next', 'Nästa')}
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t('Saving...', 'Sparar...')
                : t('Complete Setup', 'Slutför inställning')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
