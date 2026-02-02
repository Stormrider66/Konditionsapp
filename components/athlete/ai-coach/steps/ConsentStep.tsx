'use client'

/**
 * Consent Step
 *
 * GDPR consent for AI data processing.
 */

import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Brain, Heart, Info } from 'lucide-react'
import type { AssessmentData } from '../AIAssessmentWizard'

interface ConsentStepProps {
  data: AssessmentData
  updateData: (updates: Partial<AssessmentData>) => void
}

const CONSENTS = [
  {
    key: 'dataProcessingConsent',
    title: 'Data Processing',
    description:
      'I consent to the processing of my training data by the AI system to generate personalized recommendations.',
    icon: Brain,
    required: true,
  },
  {
    key: 'healthDataProcessingConsent',
    title: 'Health Data Processing',
    description:
      'I consent to the processing of my health information (injuries, conditions, readiness data) to ensure safe training recommendations.',
    icon: Heart,
    required: true,
  },
  {
    key: 'automatedDecisionConsent',
    title: 'Automated Decisions',
    description:
      'I consent to the AI making automated adjustments to my training (e.g., reducing intensity when fatigued). I can review and reject any changes.',
    icon: Shield,
    required: false,
  },
]

export function ConsentStep({ data, updateData }: ConsentStepProps) {
  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200">About AI Training</p>
          <p className="text-blue-700 dark:text-blue-300">
            Your AI coach uses your data to create personalized training plans and make
            intelligent adjustments based on your progress and readiness. We take your privacy
            seriously and process your data in accordance with GDPR.
          </p>
        </div>
      </div>

      {/* Consent items */}
      <div className="space-y-4">
        {CONSENTS.map((consent) => {
          const Icon = consent.icon
          const isChecked = !!data[consent.key as keyof AssessmentData]

          return (
            <div
              key={consent.key}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isChecked
                  ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-700'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
              onClick={() => updateData({ [consent.key]: !isChecked })}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => updateData({ [consent.key]: checked })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium">{consent.title}</span>
                    {consent.required && (
                      <span className="text-xs text-red-500 font-medium">Required</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{consent.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Data rights */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <h4 className="font-medium text-sm">Your Data Rights</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• You can withdraw consent at any time in Settings</li>
          <li>• You can request a full export of your data</li>
          <li>• You can request deletion of all your data</li>
          <li>• The AI learns from your feedback to improve recommendations</li>
        </ul>
      </div>

      {/* Validation message */}
      {(!data.dataProcessingConsent || !data.healthDataProcessingConsent) && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 text-sm text-amber-700 dark:text-amber-300">
          Please accept the required consents to continue with AI-powered training.
        </div>
      )}
    </div>
  )
}
