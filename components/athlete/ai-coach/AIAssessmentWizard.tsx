'use client'

/**
 * AI Assessment Wizard
 *
 * Multi-step onboarding wizard for AI-coached athletes.
 * Collects fitness data to generate personalized training programs.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Bot,
  Target,
  Activity,
  Calendar,
  Heart,
  Shield,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

// Step components
import { SportGoalsStep } from './steps/SportGoalsStep'
import { FitnessLevelStep } from './steps/FitnessLevelStep'
import { AvailabilityStep } from './steps/AvailabilityStep'
import { HealthScreeningStep } from './steps/HealthScreeningStep'
import { ConsentStep } from './steps/ConsentStep'
import { ProgramGenerationStep } from './steps/ProgramGenerationStep'

interface AIAssessmentWizardProps {
  clientId: string
  clientName: string
  hasConsent: boolean
}

export interface AssessmentData {
  // Sport & Goals
  primarySport: string
  secondarySports: string[]
  primaryGoal: string
  targetEvent?: string
  targetEventDate?: string

  // Fitness Level
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  currentWeeklyHours: number
  recentActivityLevel: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE'
  estimatedVO2Max?: number
  recentPRs?: { distance: string; time: string }[]

  // Availability
  trainingDaysPerWeek: number
  hoursPerSession: number
  preferredTrainingTimes: string[]
  hasGymAccess: boolean
  hasPoolAccess: boolean
  hasOutdoorAccess: boolean

  // Health
  hasInjuries: boolean
  injuries?: string[]
  hasConditions: boolean
  conditions?: string[]
  medications?: string[]
  painAreas?: string[]

  // Consent
  dataProcessingConsent: boolean
  automatedDecisionConsent: boolean
  healthDataProcessingConsent: boolean
}

const STEPS = [
  { id: 'sport', title: 'Sport & Goals', icon: Target, description: 'What are you training for?' },
  { id: 'fitness', title: 'Fitness Level', icon: Activity, description: 'Where are you now?' },
  { id: 'availability', title: 'Availability', icon: Calendar, description: 'When can you train?' },
  { id: 'health', title: 'Health Check', icon: Heart, description: 'Any limitations we should know?' },
  { id: 'consent', title: 'AI Consent', icon: Shield, description: 'Data processing permissions' },
  { id: 'generate', title: 'Your Program', icon: Sparkles, description: 'AI-powered training plan' },
]

const initialData: AssessmentData = {
  primarySport: 'RUNNING',
  secondarySports: [],
  primaryGoal: 'GENERAL_FITNESS',
  experienceLevel: 'INTERMEDIATE',
  currentWeeklyHours: 4,
  recentActivityLevel: 'MODERATE',
  trainingDaysPerWeek: 4,
  hoursPerSession: 1,
  preferredTrainingTimes: ['MORNING'],
  hasGymAccess: true,
  hasPoolAccess: false,
  hasOutdoorAccess: true,
  hasInjuries: false,
  hasConditions: false,
  dataProcessingConsent: false,
  automatedDecisionConsent: false,
  healthDataProcessingConsent: false,
}

export function AIAssessmentWizard({
  clientId,
  clientName,
  hasConsent,
}: AIAssessmentWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<AssessmentData>({
    ...initialData,
    dataProcessingConsent: hasConsent,
    healthDataProcessingConsent: hasConsent,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const updateData = (updates: Partial<AssessmentData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const canProceed = (): boolean => {
    switch (STEPS[currentStep].id) {
      case 'sport':
        return !!data.primarySport && !!data.primaryGoal
      case 'fitness':
        return !!data.experienceLevel && data.currentWeeklyHours >= 0
      case 'availability':
        return data.trainingDaysPerWeek > 0 && data.hoursPerSession > 0
      case 'health':
        return true // Always can proceed
      case 'consent':
        return data.dataProcessingConsent && data.healthDataProcessingConsent
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (currentStep === STEPS.length - 2) {
      // Moving to generation step - save assessment first
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/agent/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, ...data }),
        })

        if (!response.ok) {
          throw new Error('Failed to save assessment')
        }

        setCurrentStep((prev) => prev + 1)
      } catch (error) {
        toast.error('Failed to save your assessment. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const handleGenerateProgram = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/agent/program/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate program')
      }

      toast.success('Your personalized training program is ready!')
      router.push('/athlete/dashboard')
    } catch (error) {
      toast.error('Failed to generate program. Please try again.')
      setIsGenerating(false)
    }
  }

  const CurrentStepIcon = STEPS[currentStep].icon

  return (
    <div className="container max-w-3xl py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
          <Bot className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome, {clientName}!</h1>
        <p className="text-muted-foreground">
          Let&apos;s set up your AI training coach in just a few steps
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{STEPS[currentStep].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mb-8 px-4">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon
          const isActive = index === currentStep
          const isComplete = index < currentStep

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                index < STEPS.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
              </div>
              <span
                className={`text-xs mt-1 hidden sm:block ${
                  isActive ? 'text-indigo-600 font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <CurrentStepIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>{STEPS[currentStep].title}</CardTitle>
              <CardDescription>{STEPS[currentStep].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {STEPS[currentStep].id === 'sport' && (
                <SportGoalsStep data={data} updateData={updateData} />
              )}
              {STEPS[currentStep].id === 'fitness' && (
                <FitnessLevelStep data={data} updateData={updateData} />
              )}
              {STEPS[currentStep].id === 'availability' && (
                <AvailabilityStep data={data} updateData={updateData} />
              )}
              {STEPS[currentStep].id === 'health' && (
                <HealthScreeningStep data={data} updateData={updateData} />
              )}
              {STEPS[currentStep].id === 'consent' && (
                <ConsentStep data={data} updateData={updateData} />
              )}
              {STEPS[currentStep].id === 'generate' && (
                <ProgramGenerationStep
                  data={data}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerateProgram}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      {STEPS[currentStep].id !== 'generate' && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {currentStep === STEPS.length - 2 ? 'Generate Program' : 'Continue'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
