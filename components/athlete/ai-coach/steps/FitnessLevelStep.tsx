'use client'

/**
 * Fitness Level Step
 *
 * Collects current fitness level, experience, and recent activity.
 */

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import type { AssessmentData } from '../AIAssessmentWizard'

interface FitnessLevelStepProps {
  data: AssessmentData
  updateData: (updates: Partial<AssessmentData>) => void
}

const EXPERIENCE_LEVELS = [
  {
    value: 'BEGINNER',
    label: 'Beginner',
    description: 'New to structured training (< 1 year)',
  },
  {
    value: 'INTERMEDIATE',
    label: 'Intermediate',
    description: 'Some training experience (1-3 years)',
  },
  {
    value: 'ADVANCED',
    label: 'Advanced',
    description: 'Consistent training history (3+ years)',
  },
  {
    value: 'ELITE',
    label: 'Elite/Competitive',
    description: 'Competitive athlete or professional',
  },
]

const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'LIGHT', label: 'Lightly Active', description: '1-2 sessions per week' },
  { value: 'MODERATE', label: 'Moderately Active', description: '3-4 sessions per week' },
  { value: 'ACTIVE', label: 'Active', description: '5-6 sessions per week' },
  { value: 'VERY_ACTIVE', label: 'Very Active', description: 'Daily training' },
]

export function FitnessLevelStep({ data, updateData }: FitnessLevelStepProps) {
  return (
    <div className="space-y-6">
      {/* Experience Level */}
      <div className="space-y-3">
        <Label className="text-base font-medium">What&apos;s your experience level?</Label>
        <RadioGroup
          value={data.experienceLevel}
          onValueChange={(value) =>
            updateData({ experienceLevel: value as AssessmentData['experienceLevel'] })
          }
          className="space-y-2"
        >
          {EXPERIENCE_LEVELS.map((level) => (
            <div
              key={level.value}
              className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                updateData({ experienceLevel: level.value as AssessmentData['experienceLevel'] })
              }
            >
              <RadioGroupItem value={level.value} id={level.value} />
              <div className="flex-1">
                <label htmlFor={level.value} className="font-medium cursor-pointer">
                  {level.label}
                </label>
                <p className="text-sm text-muted-foreground">{level.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Current Weekly Hours */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label className="text-base font-medium">Current weekly training hours</Label>
          <span className="text-sm font-medium text-indigo-600">
            {data.currentWeeklyHours} hours/week
          </span>
        </div>
        <Slider
          value={[data.currentWeeklyHours]}
          onValueChange={([value]) => updateData({ currentWeeklyHours: value })}
          min={0}
          max={20}
          step={0.5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 hours</span>
          <span>20+ hours</span>
        </div>
      </div>

      {/* Recent Activity Level */}
      <div className="space-y-3">
        <Label className="text-base font-medium">How active have you been recently?</Label>
        <RadioGroup
          value={data.recentActivityLevel}
          onValueChange={(value) =>
            updateData({ recentActivityLevel: value as AssessmentData['recentActivityLevel'] })
          }
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {ACTIVITY_LEVELS.map((level) => (
            <div
              key={level.value}
              className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                updateData({
                  recentActivityLevel: level.value as AssessmentData['recentActivityLevel'],
                })
              }
            >
              <RadioGroupItem value={level.value} id={`activity-${level.value}`} />
              <div>
                <label htmlFor={`activity-${level.value}`} className="text-sm font-medium cursor-pointer">
                  {level.label}
                </label>
                <p className="text-xs text-muted-foreground">{level.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Estimated VO2 Max (optional) */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Estimated VO2 Max (optional)
          <span className="text-sm font-normal text-muted-foreground ml-2">
            From fitness watch or test
          </span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="e.g., 45"
            value={data.estimatedVO2Max || ''}
            onChange={(e) =>
              updateData({ estimatedVO2Max: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">ml/kg/min</span>
        </div>
      </div>
    </div>
  )
}
