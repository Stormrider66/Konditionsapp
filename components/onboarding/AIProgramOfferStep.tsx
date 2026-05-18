'use client'

import Link from 'next/link'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTranslations } from '@/i18n/client'
import {
  Sparkles,
  Check,
  ArrowRight,
  Lock,
  Loader2,
  Calendar,
  Target,
  TrendingUp,
} from 'lucide-react'

interface Props {
  subscriptionTier: 'FREE' | 'STANDARD' | 'PRO' | null
  onGenerate: () => Promise<void>
  onSkip: () => void
  isGenerating?: boolean
  generationProgress?: number
  hasAssignedCoach?: boolean
}

export function AIProgramOfferStep({
  subscriptionTier,
  onGenerate,
  onSkip,
  isGenerating = false,
  generationProgress = 0,
  hasAssignedCoach = false,
}: Props) {
  const basePath = useBasePath()
  const t = useTranslations('components.aiProgramOfferStep')

  const canGenerate = (subscriptionTier === 'STANDARD' || subscriptionTier === 'PRO') && !hasAssignedCoach

  // If athlete has a coach, show different message
  if (hasAssignedCoach) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">
              {t('coach.title')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('coach.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onSkip} size="lg">
              {t('coach.actions.continue')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If generating, show progress
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {t('generating.title')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('generating.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={generationProgress} className="h-2" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {generationProgress < 30
                  ? t('generating.progress.analyzingGoals')
                  : generationProgress < 60
                    ? t('generating.progress.buildingPeriodization')
                    : generationProgress < 90
                      ? t('generating.progress.creatingWorkouts')
                      : t('generating.progress.finalizingProgram')
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If FREE tier, show upgrade prompt
  if (!canGenerate) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-xl">
              {t('upgrade.title')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('upgrade.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span>{t('upgrade.benefits.personalizedPlans')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span>{t('upgrade.benefits.goalBasedPeriodization')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span>{t('upgrade.benefits.adaptiveWorkouts')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="default" size="lg" className="flex-1" asChild>
                <Link href={`${basePath}/athlete/subscription`}>
                  {t('upgrade.actions.upgradeNow')}
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="flex-1" onClick={onSkip}>
                {t('upgrade.actions.skipForNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main offer screen
  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {t('offer.title')}
          </CardTitle>
          <CardDescription className="text-base">
            {t('offer.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="grid gap-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('offer.benefits.fullPeriodizationTitle')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('offer.benefits.fullPeriodizationDescription')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('offer.benefits.sportSpecificWorkoutsTitle')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('offer.benefits.sportSpecificWorkoutsDescription')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('offer.benefits.smartProgressionTitle')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('offer.benefits.smartProgressionDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs">
              {subscriptionTier === 'PRO'
                ? t('offer.badge.pro')
                : t('offer.badge.standard')
              }
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button size="lg" className="flex-1" onClick={onGenerate}>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('offer.actions.generate')}
            </Button>
            <Button variant="outline" size="lg" className="flex-1" onClick={onSkip}>
              {t('offer.actions.skip')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <p className="text-sm text-muted-foreground text-center">
        {t('offer.info')}
      </p>
    </div>
  )
}
