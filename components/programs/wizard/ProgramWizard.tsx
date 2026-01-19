'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
}

export function ProgramWizard({ clients }: ProgramWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceType | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset downstream selections when sport changes
  useEffect(() => {
    setSelectedGoal(null)
    setSelectedDataSource(null)
  }, [selectedSport])

  // Reset data source when goal changes
  useEffect(() => {
    setSelectedDataSource(null)
  }, [selectedGoal])

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
        profileLabel: getProfileLabel(selectedSport),
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

  const getProfileLabel = (sport: SportType): string => {
    switch (sport) {
      case 'CYCLING':
        return 'FTP'
      case 'SWIMMING':
        return 'CSS'
      case 'RUNNING':
        return 'VDOT'
      default:
        return 'Värde'
    }
  }

  const handleNext = () => {
    if (currentStep === 1 && !selectedSport) {
      toast.error('Välj en sport först')
      return
    }
    if (currentStep === 2 && !selectedGoal) {
      toast.error('Välj ett mål först')
      return
    }
    if (currentStep === 3 && !selectedDataSource) {
      toast.error('Välj en datakälla först')
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSportSelect = (sport: SportType) => {
    setSelectedSport(sport)
    // Auto-advance after short delay for better UX
    setTimeout(() => setCurrentStep(2), 300)
  }

  const handleGoalSelect = (goal: string) => {
    setSelectedGoal(goal)
    setTimeout(() => setCurrentStep(3), 300)
  }

  const handleDataSourceSelect = (source: DataSourceType) => {
    setSelectedDataSource(source)
    setTimeout(() => setCurrentStep(4), 300)
  }

  const handleFormSubmit = async (data: any) => {
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
        const error = await response.json()
        throw new Error(error.message || 'Kunde inte skapa program')
      }

      const result = await response.json()
      toast.success('Program skapat!')
      router.push(`/coach/programs/${result.data.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Ett fel uppstod')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/coach/programs')
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

  return (
    <GlassCard className="w-full max-w-4xl mx-auto">
      <GlassCardContent className="p-6">
        {/* Cancel Button */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Avbryt
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
            Tillbaka
          </Button>

          <div className="flex items-center gap-3">
            {/* AI Assistant on configuration step */}
            {currentStep === 4 && selectedSport && selectedGoal && selectedClientId && (
              <AIContextButton
                athleteId={selectedClientId}
                athleteName={clients.find(c => c.id === selectedClientId)?.name}
                buttonText="AI-hjälp"
                quickActions={[
                  {
                    label: 'Granska programkonfiguration',
                    prompt: `Jag skapar ett ${selectedSport === 'RUNNING' ? 'löp' : selectedSport === 'CYCLING' ? 'cykel' : 'tränings'}program för ${clients.find(c => c.id === selectedClientId)?.name || 'en atlet'} med målet "${selectedGoal}". Granska mina val och ge förslag på förbättringar eller justeringar innan jag genererar programmet.`,
                  },
                  {
                    label: 'Föreslå träningsupplägg',
                    prompt: `Baserat på målet "${selectedGoal}" för ${selectedSport === 'RUNNING' ? 'löpning' : selectedSport === 'CYCLING' ? 'cykling' : 'träning'}, vilken periodisering och träningsupplägg rekommenderar du? Ge konkreta förslag på veckostruktur och intensitetsfördelning.`,
                  },
                  {
                    label: 'Tips för Stockholm Marathon',
                    prompt: `Ge mig specifika tips för att förbereda en atlet för Stockholm Marathon den 30 maj. Vilka nyckelfaser bör programmet innehålla och hur bör jag lägga upp de sista veckorna före loppet?`,
                  },
                  {
                    label: 'Anpassa för atletens nivå',
                    prompt: `Hur bör jag anpassa träningsprogrammet baserat på atletens nuvarande konditionsnivå och erfarenhet? Vilka tecken ska jag leta efter för att veta om belastningen är rätt?`,
                  },
                ]}
              />
            )}

            {currentStep < 4 && (
              <Button onClick={handleNext}>
                Nästa
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
