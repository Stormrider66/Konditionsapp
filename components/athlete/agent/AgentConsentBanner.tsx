'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Bot,
  ShieldCheck,
  Brain,
  Heart,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface AgentConsentBannerProps {
  onConsentGranted: () => void
  basePath?: string
}

export function AgentConsentBanner({
  onConsentGranted,
  basePath = '/athlete',
}: AgentConsentBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [consents, setConsents] = useState({
    dataProcessingConsent: false,
    healthDataProcessingConsent: false,
    automatedDecisionConsent: false,
    learningContributionConsent: true,
  })

  const canSubmit =
    consents.dataProcessingConsent && consents.healthDataProcessingConsent

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/agent/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consents),
      })

      if (res.ok) {
        onConsentGranted()
      }
    } catch (error) {
      console.error('Error granting consent:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-1.5">Enable AI Training Agent <InfoTooltip conceptKey="agentConsent" /></CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get personalized recommendations based on your training data
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Benefits */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
            <Brain className="h-4 w-4 mx-auto text-purple-600 dark:text-purple-400" />
            <p className="text-xs mt-1">Smart adjustments</p>
          </div>
          <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
            <Heart className="h-4 w-4 mx-auto text-purple-600 dark:text-purple-400" />
            <p className="text-xs mt-1">Recovery focus</p>
          </div>
          <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
            <ShieldCheck className="h-4 w-4 mx-auto text-purple-600 dark:text-purple-400" />
            <p className="text-xs mt-1">Injury prevention</p>
          </div>
        </div>

        {/* Consent checkboxes */}
        <div className="space-y-3 pt-2">
          <TooltipProvider>
            {/* Required: Data Processing */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="dataProcessing"
                checked={consents.dataProcessingConsent}
                onCheckedChange={(checked) =>
                  setConsents((prev) => ({
                    ...prev,
                    dataProcessingConsent: checked === true,
                  }))
                }
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label htmlFor="dataProcessing" className="text-sm cursor-pointer">
                    Process my training data
                  </Label>
                  <span className="text-xs text-red-500">*</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Allow the AI agent to analyze your check-ins, workouts, and
                        performance metrics to provide recommendations.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Required: Health Data */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="healthData"
                checked={consents.healthDataProcessingConsent}
                onCheckedChange={(checked) =>
                  setConsents((prev) => ({
                    ...prev,
                    healthDataProcessingConsent: checked === true,
                  }))
                }
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label htmlFor="healthData" className="text-sm cursor-pointer">
                    Process health-related data
                  </Label>
                  <span className="text-xs text-red-500">*</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Allow processing of readiness scores, fatigue levels, injury
                        status, and pain reports for safety monitoring.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Optional: Automated Decisions */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="automated"
                checked={consents.automatedDecisionConsent}
                onCheckedChange={(checked) =>
                  setConsents((prev) => ({
                    ...prev,
                    automatedDecisionConsent: checked === true,
                  }))
                }
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label htmlFor="automated" className="text-sm cursor-pointer">
                    Allow automatic adjustments
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Enable the agent to automatically adjust workout intensity when
                        needed. You can configure limits in settings.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Optional: Learning contribution */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="learning"
                checked={consents.learningContributionConsent}
                onCheckedChange={(checked) =>
                  setConsents((prev) => ({
                    ...prev,
                    learningContributionConsent: checked === true,
                  }))
                }
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label htmlFor="learning" className="text-sm cursor-pointer">
                    Help improve the AI (anonymized)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Allow your anonymized data to be used to improve the AI for all
                        athletes. No personal information is shared.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Enable Agent
              </>
            )}
          </Button>
          <Link href={`${basePath}/settings/agent`}>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You can change these settings or withdraw consent at any time.
        </p>
      </CardContent>
    </Card>
  )
}
