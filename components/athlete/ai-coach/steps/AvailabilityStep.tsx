'use client'

/**
 * Availability Step
 *
 * Collects training schedule availability and facility access.
 */

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import type { AssessmentData } from '../AIAssessmentWizard'

interface AvailabilityStepProps {
  data: AssessmentData
  updateData: (updates: Partial<AssessmentData>) => void
}

const TRAINING_TIMES = [
  { value: 'EARLY_MORNING', label: 'Early Morning', description: '5-7 AM' },
  { value: 'MORNING', label: 'Morning', description: '7-10 AM' },
  { value: 'MIDDAY', label: 'Midday', description: '10 AM - 2 PM' },
  { value: 'AFTERNOON', label: 'Afternoon', description: '2-5 PM' },
  { value: 'EVENING', label: 'Evening', description: '5-8 PM' },
  { value: 'NIGHT', label: 'Night', description: '8 PM+' },
]

const FACILITIES = [
  { key: 'hasGymAccess', label: 'Gym', description: 'Access to weights and machines' },
  { key: 'hasPoolAccess', label: 'Pool', description: 'Access to swimming pool' },
  { key: 'hasOutdoorAccess', label: 'Outdoor', description: 'Safe outdoor running/cycling routes' },
]

export function AvailabilityStep({ data, updateData }: AvailabilityStepProps) {
  const handleTimeToggle = (time: string) => {
    const current = data.preferredTrainingTimes || []
    if (current.includes(time)) {
      updateData({ preferredTrainingTimes: current.filter((t) => t !== time) })
    } else {
      updateData({ preferredTrainingTimes: [...current, time] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Training Days Per Week */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label className="text-base font-medium">Days available for training</Label>
          <span className="text-sm font-medium text-indigo-600">
            {data.trainingDaysPerWeek} days/week
          </span>
        </div>
        <Slider
          value={[data.trainingDaysPerWeek]}
          onValueChange={([value]) => updateData({ trainingDaysPerWeek: value })}
          min={1}
          max={7}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 day</span>
          <span>7 days</span>
        </div>
      </div>

      {/* Hours Per Session */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label className="text-base font-medium">Time per session</Label>
          <span className="text-sm font-medium text-indigo-600">
            {data.hoursPerSession < 1
              ? `${Math.round(data.hoursPerSession * 60)} minutes`
              : `${data.hoursPerSession} hour${data.hoursPerSession > 1 ? 's' : ''}`}
          </span>
        </div>
        <Slider
          value={[data.hoursPerSession]}
          onValueChange={([value]) => updateData({ hoursPerSession: value })}
          min={0.5}
          max={3}
          step={0.25}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>30 min</span>
          <span>3 hours</span>
        </div>
      </div>

      {/* Preferred Training Times */}
      <div className="space-y-3">
        <Label className="text-base font-medium">When do you prefer to train?</Label>
        <p className="text-sm text-muted-foreground">Select all that apply</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TRAINING_TIMES.map((time) => (
            <div
              key={time.value}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                data.preferredTrainingTimes?.includes(time.value)
                  ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/20'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleTimeToggle(time.value)}
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={data.preferredTrainingTimes?.includes(time.value)}
                  onCheckedChange={() => handleTimeToggle(time.value)}
                />
                <div>
                  <span className="text-sm font-medium">{time.label}</span>
                  <p className="text-xs text-muted-foreground">{time.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Facility Access */}
      <div className="space-y-3">
        <Label className="text-base font-medium">What facilities do you have access to?</Label>
        <div className="space-y-2">
          {FACILITIES.map((facility) => (
            <div
              key={facility.key}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                data[facility.key as keyof AssessmentData]
                  ? 'bg-green-50 border-green-300 dark:bg-green-950/20'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() =>
                updateData({
                  [facility.key]: !data[facility.key as keyof AssessmentData],
                })
              }
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={!!data[facility.key as keyof AssessmentData]}
                  onCheckedChange={(checked) => updateData({ [facility.key]: checked })}
                />
                <div>
                  <span className="font-medium">{facility.label}</span>
                  <p className="text-sm text-muted-foreground">{facility.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
