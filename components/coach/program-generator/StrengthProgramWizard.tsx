// components/coach/program-generator/StrengthProgramWizard.tsx
/**
 * Strength Program Generator Wizard
 *
 * Multi-step wizard for generating complete periodized strength programs:
 *
 * Step 1: Athlete Information
 * - Select athlete/client
 * - Athlete level (BEGINNER → ELITE)
 * - Current running phase (BASE, BUILD, PEAK, TAPER)
 * - Equipment availability
 *
 * Step 2: Program Goals
 * - Target race date (optional)
 * - Primary goal (injury prevention, power, endurance)
 * - Weekly frequency (1-3 sessions)
 * - Session duration preference (30-90 min)
 *
 * Step 3: Periodization Plan
 * - Automatic phase sequence (AA → MS → Power → Maintenance → Taper)
 * - Phase duration visualization
 * - Running integration warnings
 * - Interference management
 *
 * Step 4: Exercise Selection
 * - Automatic biomechanical balance
 * - Exercise pool customization
 * - Recent exercise rotation
 * - Manual overrides
 *
 * Step 5: Review & Generate
 * - Complete program preview
 * - Weekly volume distribution
 * - Phase transitions
 * - Generate or save as template
 */

'use client'

import { useState } from 'react'
import { Client, StrengthPhase, BiomechanicalPillar } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Target,
  Dumbbell,
  Zap,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { generatePeriodizationPlan, STRENGTH_PHASES } from '@/lib/training-engine/quality-programming/strength-periodization'

interface StrengthProgramWizardProps {
  clients: Client[]
  onGenerate: (programData: any) => void
  onCancel: () => void
}

type AthleteLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
type RunningPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'
type ProgramGoal = 'INJURY_PREVENTION' | 'POWER_DEVELOPMENT' | 'ENDURANCE_SUPPORT' | 'GENERAL_FITNESS'

interface WizardData {
  // Step 1: Athlete Info
  clientId: string
  athleteLevel: AthleteLevel
  runningPhase: RunningPhase
  equipmentAvailable: string[]

  // Step 2: Program Goals
  programName: string
  raceDate: Date | null
  primaryGoal: ProgramGoal
  weeklyFrequency: number
  sessionDuration: number

  // Step 3: Periodization (auto-generated)
  periodizationPlan: any[]

  // Step 4: Exercise Selection
  excludedExerciseIds: string[]
  customExercisePool: string[]
}

export function StrengthProgramWizard({
  clients,
  onGenerate,
  onCancel,
}: StrengthProgramWizardProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 5

  // Wizard data
  const [wizardData, setWizardData] = useState<WizardData>({
    clientId: '',
    athleteLevel: 'INTERMEDIATE',
    runningPhase: 'BASE',
    equipmentAvailable: ['Barbell', 'Dumbbells'],
    programName: '',
    raceDate: null,
    primaryGoal: 'INJURY_PREVENTION',
    weeklyFrequency: 2,
    sessionDuration: 60,
    periodizationPlan: [],
    excludedExerciseIds: [],
    customExercisePool: [],
  })

  // Update wizard data
  const updateData = (field: keyof WizardData, value: any) => {
    setWizardData({ ...wizardData, [field]: value })
  }

  // Navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2) {
        // Generate periodization plan after step 2
        generatePeriodization()
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const previousStep = () => {
    setCurrentStep(currentStep - 1)
  }

  // Validate current step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!wizardData.clientId) {
          toast({
            title: 'Validation Error',
            description: 'Please select an athlete',
            variant: 'destructive',
          })
          return false
        }
        return true

      case 2:
        if (!wizardData.programName.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Please enter a program name',
            variant: 'destructive',
          })
          return false
        }
        return true

      default:
        return true
    }
  }

  // Generate periodization plan
  const generatePeriodization = () => {
    const startDate = new Date()
    const raceDate = wizardData.raceDate || new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000) // 12 weeks default

    const plan = generatePeriodizationPlan(
      startDate,
      raceDate,
      wizardData.athleteLevel
    )

    updateData('periodizationPlan', plan)
  }

  // Equipment options
  const equipmentOptions = [
    'Barbell',
    'Dumbbells',
    'Kettlebell',
    'Resistance Band',
    'TRX',
    'Medicine Ball',
    'Pull-up Bar',
    'Plyo Box',
    'None',
  ]

  // Render Step 1: Athlete Information
  const renderStep1 = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Athlete Information</h3>
          <p className="text-sm text-gray-600 mb-6">
            Select the athlete and configure their training parameters
          </p>
        </div>

        {/* Client Selection */}
        <div>
          <Label>
            Select Athlete <span className="text-red-500">*</span>
          </Label>
          <Select value={wizardData.clientId} onValueChange={(value) => updateData('clientId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose athlete..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Athlete Level */}
        <div>
          <Label>Athlete Level</Label>
          <Select
            value={wizardData.athleteLevel}
            onValueChange={(value) => updateData('athleteLevel', value as AthleteLevel)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BEGINNER">Beginner (0-1 year training)</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermediate (1-3 years)</SelectItem>
              <SelectItem value="ADVANCED">Advanced (3-5 years)</SelectItem>
              <SelectItem value="ELITE">Elite (5+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Current Running Phase */}
        <div>
          <Label>Current Running Phase</Label>
          <Select
            value={wizardData.runningPhase}
            onValueChange={(value) => updateData('runningPhase', value as RunningPhase)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BASE">Base Building</SelectItem>
              <SelectItem value="BUILD">Build Phase</SelectItem>
              <SelectItem value="PEAK">Peak/Race Phase</SelectItem>
              <SelectItem value="TAPER">Taper</SelectItem>
              <SelectItem value="RECOVERY">Recovery</SelectItem>
              <SelectItem value="TRANSITION">Transition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Equipment Available */}
        <div>
          <Label>Available Equipment</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {equipmentOptions.map((equipment) => (
              <div key={equipment} className="flex items-center space-x-2">
                <Checkbox
                  id={equipment}
                  checked={wizardData.equipmentAvailable.includes(equipment)}
                  onCheckedChange={(checked) => {
                    const current = wizardData.equipmentAvailable
                    if (checked) {
                      updateData('equipmentAvailable', [...current, equipment])
                    } else {
                      updateData('equipmentAvailable', current.filter((e) => e !== equipment))
                    }
                  }}
                />
                <Label htmlFor={equipment} className="text-sm font-normal cursor-pointer">
                  {equipment}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Equipment selection will filter available exercises. Select "None" for bodyweight-only programs.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Render Step 2: Program Goals
  const renderStep2 = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Program Goals</h3>
          <p className="text-sm text-gray-600 mb-6">
            Define program parameters and target outcomes
          </p>
        </div>

        {/* Program Name */}
        <div>
          <Label>
            Program Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={wizardData.programName}
            onChange={(e) => updateData('programName', e.target.value)}
            placeholder="e.g., Marathon Strength Program 2024"
          />
        </div>

        {/* Race Date */}
        <div>
          <Label>Target Race Date (Optional)</Label>
          <Input
            type="date"
            value={wizardData.raceDate ? wizardData.raceDate.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              updateData('raceDate', e.target.value ? new Date(e.target.value) : null)
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for ongoing/maintenance programs
          </p>
        </div>

        {/* Primary Goal */}
        <div>
          <Label>Primary Goal</Label>
          <Select
            value={wizardData.primaryGoal}
            onValueChange={(value) => updateData('primaryGoal', value as ProgramGoal)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INJURY_PREVENTION">
                Injury Prevention (Foundation, stability)
              </SelectItem>
              <SelectItem value="POWER_DEVELOPMENT">
                Power Development (Speed, explosiveness)
              </SelectItem>
              <SelectItem value="ENDURANCE_SUPPORT">
                Endurance Support (Running economy, fatigue resistance)
              </SelectItem>
              <SelectItem value="GENERAL_FITNESS">
                General Fitness (Balanced development)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weekly Frequency */}
        <div>
          <Label>Sessions Per Week</Label>
          <Select
            value={wizardData.weeklyFrequency.toString()}
            onValueChange={(value) => updateData('weeklyFrequency', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x per week (Maintenance)</SelectItem>
              <SelectItem value="2">2x per week (Recommended)</SelectItem>
              <SelectItem value="3">3x per week (High volume)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Duration */}
        <div>
          <Label>Target Session Duration (minutes)</Label>
          <Select
            value={wizardData.sessionDuration.toString()}
            onValueChange={(value) => updateData('sessionDuration', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 min (Express)</SelectItem>
              <SelectItem value="45">45 min (Moderate)</SelectItem>
              <SelectItem value="60">60 min (Standard)</SelectItem>
              <SelectItem value="75">75 min (Extended)</SelectItem>
              <SelectItem value="90">90 min (Full session)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  // Render Step 3: Periodization Plan
  const renderStep3 = () => {
    const totalWeeks = wizardData.periodizationPlan.length > 0
      ? wizardData.periodizationPlan[wizardData.periodizationPlan.length - 1].endWeek
      : 0

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Periodization Plan</h3>
          <p className="text-sm text-gray-600 mb-6">
            Automatically generated phase sequence based on your inputs
          </p>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Program Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600">Total Duration</p>
                <p className="text-lg font-semibold">{totalWeeks} weeks</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Phases</p>
                <p className="text-lg font-semibold">{wizardData.periodizationPlan.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Weekly Sessions</p>
                <p className="text-lg font-semibold">{wizardData.weeklyFrequency}x</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Sessions</p>
                <p className="text-lg font-semibold">
                  {totalWeeks * wizardData.weeklyFrequency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase Timeline */}
        <div className="space-y-3">
          {wizardData.periodizationPlan.map((phase, index) => {
            const protocol = STRENGTH_PHASES[phase.phase as StrengthPhase]
            const weeksDuration = phase.endWeek - phase.startWeek + 1

            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{phase.phase.replace(/_/g, ' ')}</CardTitle>
                      <CardDescription className="text-xs">
                        Week {phase.startWeek} - {phase.endWeek} ({weeksDuration} weeks)
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{protocol.frequency}x/week</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Goal:</span>
                      <span className="font-medium">{protocol.goal}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Protocol:</span>
                      <span className="font-medium">
                        {protocol.sets.min}-{protocol.sets.max} sets × {protocol.reps.min}-
                        {protocol.reps.max} reps @ {protocol.intensity.min}-{protocol.intensity.max}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Rest:</span>
                      <span className="font-medium">
                        {protocol.restPeriod.min}-{protocol.restPeriod.max}s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Periodization automatically aligns with your running phase. Strength phases will
            transition appropriately to avoid interference with key running workouts.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Render Step 4: Exercise Selection
  const renderStep4 = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Exercise Selection</h3>
          <p className="text-sm text-gray-600 mb-6">
            Exercise pool will be automatically selected based on biomechanical balance
          </p>
        </div>

        <Alert>
          <Dumbbell className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Exercises will be automatically selected to ensure:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Biomechanical balance (1 posterior chain, 1 knee dominance, 1 unilateral, 1-2 core per session)</li>
              <li>Appropriate progression level based on athlete level and phase</li>
              <li>Equipment availability matching</li>
              <li>Exercise rotation (no repeats within 2 weeks)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Exercise Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wizardData.periodizationPlan.map((phase, index) => {
                const protocol = STRENGTH_PHASES[phase.phase as StrengthPhase]
                const { posteriorChain, kneeDominance, unilateral, core } =
                  protocol.exerciseCategories

                return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{phase.phase.replace(/_/g, ' ')}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {posteriorChain + kneeDominance + unilateral + core} exercises/session
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Advanced customization:</strong> After program generation, you can manually
            swap exercises, add custom exercises, or adjust sets/reps/load for any workout.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Render Step 5: Review & Generate
  const renderStep5 = () => {
    const selectedClient = clients.find((c) => c.id === wizardData.clientId)
    const totalWeeks = wizardData.periodizationPlan.length > 0
      ? wizardData.periodizationPlan[wizardData.periodizationPlan.length - 1].endWeek
      : 0
    const totalSessions = totalWeeks * wizardData.weeklyFrequency

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Review & Generate</h3>
          <p className="text-sm text-gray-600 mb-6">
            Review your program configuration before generating
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Athlete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{selectedClient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Level:</span>
                <span className="font-medium">{wizardData.athleteLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Running Phase:</span>
                <span className="font-medium">{wizardData.runningPhase}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{wizardData.programName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{totalWeeks} weeks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sessions:</span>
                <span className="font-medium">{totalSessions}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Frequency:</span>
                <span className="font-medium">{wizardData.weeklyFrequency}x per week</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Session Duration:</span>
                <span className="font-medium">{wizardData.sessionDuration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phases:</span>
                <span className="font-medium">{wizardData.periodizationPlan.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {wizardData.equipmentAvailable.map((eq) => (
                  <Badge key={eq} variant="secondary" className="text-xs">
                    {eq}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Ready to generate!</strong> Your program will include {totalSessions} complete
            workouts with automatic exercise selection, progression tracking, and interference
            management.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Handle generate
  const handleGenerate = () => {
    onGenerate(wizardData)
  }

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      case 5:
        return renderStep5()
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step < currentStep
                  ? 'bg-green-500 border-green-500 text-white'
                  : step === currentStep
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
            >
              {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
            </div>
            {step < totalSteps && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-xs text-gray-600">
        <span className={currentStep === 1 ? 'font-semibold text-blue-600' : ''}>Athlete Info</span>
        <span className={currentStep === 2 ? 'font-semibold text-blue-600' : ''}>Goals</span>
        <span className={currentStep === 3 ? 'font-semibold text-blue-600' : ''}>Periodization</span>
        <span className={currentStep === 4 ? 'font-semibold text-blue-600' : ''}>Exercises</span>
        <span className={currentStep === 5 ? 'font-semibold text-blue-600' : ''}>Review</span>
      </div>

      <Separator />

      {/* Current Step Content */}
      <div className="min-h-[400px]">{renderCurrentStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : previousStep}
          disabled={currentStep === 1 && false}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>

        {currentStep < totalSteps ? (
          <Button onClick={nextStep}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleGenerate} className="bg-green-600 hover:bg-green-700">
            <Zap className="h-4 w-4 mr-2" />
            Generate Program
          </Button>
        )}
      </div>
    </div>
  )
}
