'use client'

/**
 * Health Screening Step
 *
 * Collects health information, injuries, and limitations.
 */

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle } from 'lucide-react'
import type { AssessmentData } from '../AIAssessmentWizard'

interface HealthScreeningStepProps {
  data: AssessmentData
  updateData: (updates: Partial<AssessmentData>) => void
}

const COMMON_INJURIES = [
  'Knee pain/injury',
  'Back pain',
  'Shoulder injury',
  'Ankle sprain',
  'Hip issues',
  'Shin splints',
  'Plantar fasciitis',
  'IT band syndrome',
]

const COMMON_CONDITIONS = [
  'Asthma',
  'High blood pressure',
  'Heart condition',
  'Diabetes',
  'Arthritis',
  'Previous surgery',
]

const PAIN_AREAS = [
  'Lower back',
  'Upper back',
  'Neck',
  'Shoulder',
  'Hip',
  'Knee',
  'Ankle',
  'Foot',
]

export function HealthScreeningStep({ data, updateData }: HealthScreeningStepProps) {
  const handleInjuryToggle = (injury: string) => {
    const current = data.injuries || []
    if (current.includes(injury)) {
      updateData({ injuries: current.filter((i) => i !== injury) })
    } else {
      updateData({ injuries: [...current, injury] })
    }
  }

  const handleConditionToggle = (condition: string) => {
    const current = data.conditions || []
    if (current.includes(condition)) {
      updateData({ conditions: current.filter((c) => c !== condition) })
    } else {
      updateData({ conditions: [...current, condition] })
    }
  }

  const handlePainAreaToggle = (area: string) => {
    const current = data.painAreas || []
    if (current.includes(area)) {
      updateData({ painAreas: current.filter((a) => a !== area) })
    } else {
      updateData({ painAreas: [...current, area] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">Health Information</p>
          <p className="text-amber-700 dark:text-amber-300">
            This information helps us create safe training programs. Consult a healthcare
            professional before starting any exercise program if you have concerns.
          </p>
        </div>
      </div>

      {/* Injuries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">
            Do you have any current injuries or pain?
          </Label>
          <Switch
            checked={data.hasInjuries}
            onCheckedChange={(checked) => updateData({ hasInjuries: checked })}
          />
        </div>

        {data.hasInjuries && (
          <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
            <p className="text-sm text-muted-foreground">Select any that apply:</p>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_INJURIES.map((injury) => (
                <div key={injury} className="flex items-center space-x-2">
                  <Checkbox
                    id={`injury-${injury}`}
                    checked={data.injuries?.includes(injury)}
                    onCheckedChange={() => handleInjuryToggle(injury)}
                  />
                  <label htmlFor={`injury-${injury}`} className="text-sm cursor-pointer">
                    {injury}
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Current pain areas:</Label>
              <div className="flex flex-wrap gap-2">
                {PAIN_AREAS.map((area) => (
                  <div
                    key={area}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                      data.painAreas?.includes(area)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => handlePainAreaToggle(area)}
                  >
                    {area}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Medical Conditions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">
            Do you have any medical conditions?
          </Label>
          <Switch
            checked={data.hasConditions}
            onCheckedChange={(checked) => updateData({ hasConditions: checked })}
          />
        </div>

        {data.hasConditions && (
          <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
            <p className="text-sm text-muted-foreground">Select any that apply:</p>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_CONDITIONS.map((condition) => (
                <div key={condition} className="flex items-center space-x-2">
                  <Checkbox
                    id={`condition-${condition}`}
                    checked={data.conditions?.includes(condition)}
                    onCheckedChange={() => handleConditionToggle(condition)}
                  />
                  <label htmlFor={`condition-${condition}`} className="text-sm cursor-pointer">
                    {condition}
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Any medications we should know about? (optional)</Label>
              <Textarea
                placeholder="List any relevant medications..."
                value={data.medications?.join(', ') || ''}
                onChange={(e) =>
                  updateData({
                    medications: e.target.value
                      ? e.target.value.split(',').map((m) => m.trim())
                      : [],
                  })
                }
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* No issues confirmation */}
      {!data.hasInjuries && !data.hasConditions && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            Great! No injuries or conditions reported. We&apos;ll create a program suited to your
            fitness level.
          </p>
        </div>
      )}
    </div>
  )
}
