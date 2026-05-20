'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { SportType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { WizardProgress } from './WizardProgress'
import { SportSelector } from './SportSelector'
import { GoalSelector } from './GoalSelector'
import { DataSourceSelector, DataSourceType, DataSourceInfo } from './DataSourceSelector'
import { ConfigurationForm } from './ConfigurationForm'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'

interface Test {
  id: string
  testDate: Date
  testType: string
  vo2max: number | null
}

interface SportProfile {
  primarySport: SportType | null
  cyclingSettings: {
    currentFtp?: number
  } | null
  swimmingSettings: {
    css?: string
  } | null
  runningSettings: {
    vdot?: number
  } | null
  skiingSettings: Record<string, unknown> | null
}

interface Client {
  id: string
  name: string
  tests: Test[]
  sportProfile: SportProfile | null
}

interface ProgramWizardProps {
  clients: Client[]
  basePath: string
  initialClientId?: string
}

type ProgramFormData = Record<string, unknown>

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

const getSportPromptLabel = (sport: SportType, locale: AppLocale) => {
  switch (sport) {
    case 'RUNNING':
      return t(locale, 'löpning', 'running')
    case 'CYCLING':
      return t(locale, 'cykling', 'cycling')
    case 'SKIING':
      return t(locale, 'skidåkning', 'skiing')
    case 'SWIMMING':
      return t(locale, 'simning', 'swimming')
    case 'TRIATHLON':
      return t(locale, 'triathlon', 'triathlon')
    case 'HYROX':
      return 'HYROX'
    case 'STRENGTH':
      return t(locale, 'styrka', 'strength')
    case 'GENERAL_FITNESS':
      return t(locale, 'träning', 'general fitness')
    default:
      return t(locale, 'träning', 'training')
  }
}

const getProgramPromptLabel = (sport: SportType, locale: AppLocale) => {
  switch (sport) {
    case 'RUNNING':
      return t(locale, 'löpprogram', 'running program')
    case 'CYCLING':
      return t(locale, 'cykelprogram', 'cycling program')
    default:
      return t(locale, 'träningsprogram', 'training program')
  }
}

export function ProgramWizard({ clients, basePath, initialClientId = '' }: ProgramWizardProps) {
  const router = useRouter()
  const locale = getAppLocale(useLocale())
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceType | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>(() =>
    clients.some((client) => client.id === initialClientId) ? initialClientId : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate data source availability based on selected sport and client tests
  const getDataSources = (): DataSourceInfo[] => {
    if (!selectedSport) return []

    // Count clients with tests for this sport
    const testTypeMap: Record<string, string> = {
      RUNNING: 'RUNNING',
      CYCLING: 'CYCLING',
      SKIING: 'SKIING',
      SWIMMING: 'SWIMMING',
      TRIATHLON: 'RUNNING', // Tri uses running tests for paces
      HYROX: 'RUNNING',
      GENERAL_FITNESS: 'RUNNING',
      STRENGTH: 'RUNNING',
    }

    const relevantTestType = testTypeMap[selectedSport]
    const clientsWithTests = clients.filter(
      (c) => c.tests.some((t) => t.testType === relevantTestType)
    )
    const testCount = clientsWithTests.reduce((sum, c) => sum + c.tests.length, 0)

    // Check if any client has sport profile data
    const clientWithProfile = clients.find((c) => {
      if (!c.sportProfile) return false
      switch (selectedSport) {
        case 'CYCLING':
          return c.sportProfile.cyclingSettings?.currentFtp
        case 'SWIMMING':
          return c.sportProfile.swimmingSettings?.css
        case 'RUNNING':
          return c.sportProfile.runningSettings?.vdot
        default:
          return false
      }
    })

    const profileValue = clientWithProfile
      ? getProfileValue(clientWithProfile.sportProfile, selectedSport)
      : undefined

    return [
      {
        type: 'TEST' as const,
        available: testCount > 0,
        testCount,
        testId: clientsWithTests[0]?.tests[0]?.id,
      },
      {
        type: 'PROFILE' as const,
        available: !!profileValue,
        profileValue,
        profileLabel: getProfileLabel(selectedSport, locale),
      },
      {
        type: 'MANUAL' as const,
        available: true,
      },
    ]
  }

  const getProfileValue = (
    profile: SportProfile | null,
    sport: SportType
  ): string | undefined => {
    if (!profile) return undefined
    switch (sport) {
      case 'CYCLING':
        return profile.cyclingSettings?.currentFtp?.toString()
      case 'SWIMMING':
        return profile.swimmingSettings?.css
      case 'RUNNING':
        return profile.runningSettings?.vdot?.toString()
      default:
        return undefined
    }
  }

  const getProfileLabel = (sport: SportType, locale: AppLocale): string => {
    switch (sport) {
      case 'CYCLING':
        return 'FTP'
      case 'SWIMMING':
        return 'CSS'
      case 'RUNNING':
        return 'VDOT'
      default:
        return t(locale, 'Värde', 'Value')
    }
  }

  const handleNext = () => {
    if (currentStep === 1 && !selectedSport) {
      toast.error(t(locale, 'Välj en sport först', 'Choose a sport first'))
      return
    }
    if (currentStep === 2 && !selectedGoal) {
      toast.error(t(locale, 'Välj ett mål först', 'Choose a goal first'))
      return
    }
    if (currentStep === 3 && !selectedDataSource) {
      toast.error(t(locale, 'Välj en datakälla först', 'Choose a data source first'))
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSportSelect = (sport: SportType) => {
    setSelectedSport(sport)
    setSelectedGoal(null)
    setSelectedDataSource(null)
    // Auto-advance after short delay for better UX
    setTimeout(() => setCurrentStep(2), 300)
  }

  const handleGoalSelect = (goal: string) => {
    setSelectedGoal(goal)
    setSelectedDataSource(null)
    setTimeout(() => setCurrentStep(3), 300)
  }

  const handleDataSourceSelect = (source: DataSourceType) => {
    setSelectedDataSource(source)
    setTimeout(() => setCurrentStep(4), 300)
  }

  const handleFormSubmit = async (data: ProgramFormData) => {
    setIsSubmitting(true)

    try {
      // Add sport, goal, and data source to the submission
      const payload = {
        ...data,
        sport: selectedSport,
        goal: selectedGoal,
        dataSource: selectedDataSource,
      }

      const response = await fetch('/api/programs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json() as { message?: string }
        throw new Error(error.message || t(locale, 'Kunde inte skapa program', 'Could not create program'))
      }

      const result = await response.json() as { data: { id: string } }
      toast.success(t(locale, 'Program skapat!', 'Program created!'))
      router.push(`${basePath}/programs/${result.data.id}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null
      toast.error(message || t(locale, 'Ett fel uppstod', 'Something went wrong'))
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`${basePath}/programs`)
  }

  // Transform clients for ConfigurationForm
  const formClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    tests: c.tests.map((t) => ({
      id: t.id,
      testDate: t.testDate,
      testType: t.testType,
    })),
  }))
  const selectedClientName = clients.find((client) => client.id === selectedClientId)?.name
  const athletePromptName = selectedClientName || t(locale, 'en atlet', 'an athlete')

  return (
    <GlassCard className="w-full max-w-4xl mx-auto">
      <GlassCardContent className="p-6">
        {/* Cancel Button */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            {t(locale, 'Avbryt', 'Cancel')}
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <WizardProgress currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <SportSelector
              selectedSport={selectedSport}
              onSelect={handleSportSelect}
            />
          )}

          {currentStep === 2 && selectedSport && (
            <GoalSelector
              sport={selectedSport}
              selectedGoal={selectedGoal}
              onSelect={handleGoalSelect}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && selectedSport && (
            <DataSourceSelector
              sport={selectedSport}
              selectedSource={selectedDataSource}
              onSelect={handleDataSourceSelect}
              dataSources={getDataSources()}
            />
          )}

          {currentStep === 4 && selectedSport && selectedGoal && selectedDataSource && (
            <ConfigurationForm
              sport={selectedSport}
              goal={selectedGoal}
              dataSource={selectedDataSource}
              clients={formClients}
              selectedClientId={selectedClientId}
              onClientChange={setSelectedClientId}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t(locale, 'Tillbaka', 'Back')}
          </Button>

          <div className="flex items-center gap-3">
            {/* AI Assistant on configuration step */}
            {currentStep === 4 && selectedSport && selectedGoal && selectedClientId && (
              <AIContextButton
                athleteId={selectedClientId}
                athleteName={selectedClientName}
                buttonText={t(locale, 'AI-hjälp', 'AI help')}
                quickActions={[
                  {
                    label: t(locale, 'Granska programkonfiguration', 'Review program configuration'),
                    prompt: t(
                      locale,
                      `Jag skapar ett ${getProgramPromptLabel(selectedSport, locale)} för ${athletePromptName} med målet "${selectedGoal}". Granska mina val och ge förslag på förbättringar eller justeringar innan jag genererar programmet.`,
                      `I am creating a ${getProgramPromptLabel(selectedSport, locale)} for ${athletePromptName} with the goal "${selectedGoal}". Review my choices and suggest improvements or adjustments before I generate the program.`
                    ),
                  },
                  {
                    label: t(locale, 'Föreslå träningsupplägg', 'Suggest training structure'),
                    prompt: t(
                      locale,
                      `Baserat på målet "${selectedGoal}" för ${getSportPromptLabel(selectedSport, locale)}, vilken periodisering och träningsupplägg rekommenderar du? Ge konkreta förslag på veckostruktur och intensitetsfördelning.`,
                      `Based on the goal "${selectedGoal}" for ${getSportPromptLabel(selectedSport, locale)}, what periodization and training structure do you recommend? Give concrete suggestions for weekly structure and intensity distribution.`
                    ),
                  },
                  {
                    label: t(locale, 'Tips för Stockholm Marathon', 'Stockholm Marathon tips'),
                    prompt: t(
                      locale,
                      'Ge mig specifika tips för att förbereda en atlet för Stockholm Marathon den 30 maj. Vilka nyckelfaser bör programmet innehålla och hur bör jag lägga upp de sista veckorna före loppet?',
                      'Give me specific tips for preparing an athlete for Stockholm Marathon on May 30. Which key phases should the program include, and how should I structure the final weeks before the race?'
                    ),
                  },
                  {
                    label: t(locale, 'Anpassa för atletens nivå', "Adapt to athlete's level"),
                    prompt: t(
                      locale,
                      'Hur bör jag anpassa träningsprogrammet baserat på atletens nuvarande konditionsnivå och erfarenhet? Vilka tecken ska jag leta efter för att veta om belastningen är rätt?',
                      "How should I adapt the training program based on the athlete's current fitness level and experience? What signs should I look for to know whether the load is right?"
                    ),
                  },
                ]}
              />
            )}

            {currentStep < 4 && (
              <Button onClick={handleNext}>
                {t(locale, 'Nästa', 'Next')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
