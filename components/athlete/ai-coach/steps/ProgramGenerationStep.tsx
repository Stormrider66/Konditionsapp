'use client'

/**
 * Program Generation Step
 *
 * Final step showing program generation in progress and summary.
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, CheckCircle2, Dumbbell, Calendar, Target } from 'lucide-react'
import type { AssessmentData } from '../AIAssessmentWizard'

interface ProgramGenerationStepProps {
  data: AssessmentData
  isGenerating: boolean
  onGenerate: () => void
}

export function ProgramGenerationStep({
  data,
  isGenerating,
  onGenerate,
}: ProgramGenerationStepProps) {
  const getSportLabel = (sport: string) => {
    const labels: Record<string, string> = {
      RUNNING: 'Running',
      CYCLING: 'Cycling',
      SWIMMING: 'Swimming',
      TRIATHLON: 'Triathlon',
      CROSS_COUNTRY_SKIING: 'Cross-Country Skiing',
      GENERAL_FITNESS: 'General Fitness',
      STRENGTH: 'Strength Training',
      HYROX: 'HYROX',
      FUNCTIONAL_FITNESS: 'Functional Fitness',
    }
    return labels[sport] || sport
  }

  const getGoalLabel = (goal: string) => {
    const labels: Record<string, string> = {
      GENERAL_FITNESS: 'General Fitness',
      WEIGHT_LOSS: 'Weight Loss',
      ENDURANCE: 'Build Endurance',
      SPEED: 'Improve Speed',
      RACE_PREP: 'Race Preparation',
      STRENGTH_GAIN: 'Build Strength',
      COMEBACK: 'Comeback',
    }
    return labels[goal] || goal
  }

  const getExperienceLabel = (level: string) => {
    const labels: Record<string, string> = {
      BEGINNER: 'Beginner',
      INTERMEDIATE: 'Intermediate',
      ADVANCED: 'Advanced',
      ELITE: 'Elite',
    }
    return labels[level] || level
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Assessment Complete
        </h3>

        <div className="grid gap-3">
          <div className="flex items-center justify-between p-3 bg-white/80 dark:bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Dumbbell className="h-4 w-4 text-indigo-600" />
              <span className="text-muted-foreground">Sport</span>
            </div>
            <Badge variant="outline">{getSportLabel(data.primarySport)}</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/80 dark:bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="text-muted-foreground">Goal</span>
            </div>
            <Badge variant="outline">{getGoalLabel(data.primaryGoal)}</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/80 dark:bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span className="text-muted-foreground">Schedule</span>
            </div>
            <Badge variant="outline">
              {data.trainingDaysPerWeek} days/week, {data.hoursPerSession}h/session
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/80 dark:bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-muted-foreground">Level</span>
            </div>
            <Badge variant="outline">{getExperienceLabel(data.experienceLevel)}</Badge>
          </div>
        </div>

        {data.hasInjuries && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
            <span className="font-medium text-amber-800 dark:text-amber-200">
              Health considerations:
            </span>{' '}
            <span className="text-amber-700 dark:text-amber-300">
              Your program will be adapted for your reported injuries/conditions.
            </span>
          </div>
        )}
      </div>

      {/* What happens next */}
      <div className="space-y-3">
        <h4 className="font-medium">What happens next?</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-bold">1.</span>
            <span>Your AI coach analyzes your assessment data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-bold">2.</span>
            <span>A personalized training program is generated</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-bold">3.</span>
            <span>You&apos;ll receive daily workout recommendations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-bold">4.</span>
            <span>The program adapts as you log workouts and check-ins</span>
          </li>
        </ul>
      </div>

      {/* Generate button */}
      <div className="pt-4">
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Your Program...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Generate My Training Program
            </>
          )}
        </Button>

        {isGenerating && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            This may take a moment while we create your personalized plan...
          </p>
        )}
      </div>
    </div>
  )
}
