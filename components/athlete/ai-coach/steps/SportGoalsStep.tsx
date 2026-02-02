'use client'

/**
 * Sport & Goals Step
 *
 * Collects primary sport, secondary sports, and training goals.
 */

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AssessmentData } from '../AIAssessmentWizard'

interface SportGoalsStepProps {
  data: AssessmentData
  updateData: (updates: Partial<AssessmentData>) => void
}

const SPORTS = [
  { value: 'RUNNING', label: 'Running' },
  { value: 'CYCLING', label: 'Cycling' },
  { value: 'SWIMMING', label: 'Swimming' },
  { value: 'TRIATHLON', label: 'Triathlon' },
  { value: 'CROSS_COUNTRY_SKIING', label: 'Cross-Country Skiing' },
  { value: 'GENERAL_FITNESS', label: 'General Fitness' },
  { value: 'STRENGTH', label: 'Strength Training' },
  { value: 'HYROX', label: 'HYROX' },
  { value: 'FUNCTIONAL_FITNESS', label: 'Functional Fitness' },
]

const GOALS = [
  { value: 'GENERAL_FITNESS', label: 'General Fitness', description: 'Stay healthy and active' },
  { value: 'WEIGHT_LOSS', label: 'Weight Loss', description: 'Lose weight through training' },
  { value: 'ENDURANCE', label: 'Build Endurance', description: 'Go longer and stronger' },
  { value: 'SPEED', label: 'Improve Speed', description: 'Get faster at your sport' },
  { value: 'RACE_PREP', label: 'Race Preparation', description: 'Prepare for a specific event' },
  { value: 'STRENGTH_GAIN', label: 'Build Strength', description: 'Get stronger overall' },
  { value: 'COMEBACK', label: 'Comeback', description: 'Return after time off or injury' },
]

export function SportGoalsStep({ data, updateData }: SportGoalsStepProps) {
  const handleSecondarySportToggle = (sport: string) => {
    const current = data.secondarySports || []
    if (current.includes(sport)) {
      updateData({ secondarySports: current.filter((s) => s !== sport) })
    } else {
      updateData({ secondarySports: [...current, sport] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Primary Sport */}
      <div className="space-y-3">
        <Label className="text-base font-medium">What&apos;s your primary sport?</Label>
        <Select
          value={data.primarySport}
          onValueChange={(value) => updateData({ primarySport: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a sport" />
          </SelectTrigger>
          <SelectContent>
            {SPORTS.map((sport) => (
              <SelectItem key={sport.value} value={sport.value}>
                {sport.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Secondary Sports */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Any secondary activities? (optional)</Label>
        <div className="grid grid-cols-2 gap-2">
          {SPORTS.filter((s) => s.value !== data.primarySport).map((sport) => (
            <div key={sport.value} className="flex items-center space-x-2">
              <Checkbox
                id={`secondary-${sport.value}`}
                checked={data.secondarySports?.includes(sport.value)}
                onCheckedChange={() => handleSecondarySportToggle(sport.value)}
              />
              <label
                htmlFor={`secondary-${sport.value}`}
                className="text-sm cursor-pointer"
              >
                {sport.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Goal */}
      <div className="space-y-3">
        <Label className="text-base font-medium">What&apos;s your main training goal?</Label>
        <RadioGroup
          value={data.primaryGoal}
          onValueChange={(value) => updateData({ primaryGoal: value })}
          className="space-y-2"
        >
          {GOALS.map((goal) => (
            <div
              key={goal.value}
              className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => updateData({ primaryGoal: goal.value })}
            >
              <RadioGroupItem value={goal.value} id={goal.value} />
              <div className="flex-1">
                <label htmlFor={goal.value} className="font-medium cursor-pointer">
                  {goal.label}
                </label>
                <p className="text-sm text-muted-foreground">{goal.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Target Event (if Race Prep) */}
      {data.primaryGoal === 'RACE_PREP' && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Target Event (optional)</Label>
            <Input
              placeholder="e.g., Stockholm Marathon"
              value={data.targetEvent || ''}
              onChange={(e) => updateData({ targetEvent: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Event Date (optional)</Label>
            <Input
              type="date"
              value={data.targetEventDate || ''}
              onChange={(e) => updateData({ targetEventDate: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
