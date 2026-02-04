'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  locale?: 'en' | 'sv'
  subscriptionTier: 'FREE' | 'STANDARD' | 'PRO' | null
  onGenerate: () => Promise<void>
  onSkip: () => void
  isGenerating?: boolean
  generationProgress?: number
  hasAssignedCoach?: boolean
}

export function AIProgramOfferStep({
  locale = 'sv',
  subscriptionTier,
  onGenerate,
  onSkip,
  isGenerating = false,
  generationProgress = 0,
  hasAssignedCoach = false,
}: Props) {
  const t = (en: string, sv: string) => locale === 'sv' ? sv : en

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
              {t('You have a coach!', 'Du har en coach!')}
            </CardTitle>
            <CardDescription className="text-base">
              {t(
                'Your coach will create and manage your training program. You can skip this step.',
                'Din coach kommer att skapa och hantera ditt träningsprogram. Du kan hoppa över detta steg.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onSkip} size="lg">
              {t('Continue', 'Fortsätt')}
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
              {t('Creating Your Training Program...', 'Skapar ditt träningsprogram...')}
            </CardTitle>
            <CardDescription className="text-base">
              {t(
                'Our AI is analyzing your profile and creating a personalized program.',
                'Vår AI analyserar din profil och skapar ett personligt program.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={generationProgress} className="h-2" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {generationProgress < 30
                  ? t('Analyzing your goals...', 'Analyserar dina mål...')
                  : generationProgress < 60
                    ? t('Building periodization...', 'Bygger periodisering...')
                    : generationProgress < 90
                      ? t('Creating workouts...', 'Skapar träningspass...')
                      : t('Finalizing program...', 'Slutför programmet...')
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
              {t('Upgrade to Generate AI Programs', 'Uppgradera för att generera AI-program')}
            </CardTitle>
            <CardDescription className="text-base">
              {t(
                'AI training program generation requires a Standard or Pro subscription.',
                'AI-träningsprogramgenerering kräver en Standard- eller Pro-prenumeration.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span>{t('Personalized training plans', 'Personliga träningsplaner')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span>{t('Goal-based periodization', 'Målbaserad periodisering')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span>{t('Adaptive workouts', 'Adaptiva träningspass')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="default" size="lg" className="flex-1" asChild>
                <Link href="/athlete/subscription">
                  {t('Upgrade Now', 'Uppgradera nu')}
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="flex-1" onClick={onSkip}>
                {t('Skip for Now', 'Hoppa över')}
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
            {t('Create Your AI Training Program', 'Skapa ditt AI-träningsprogram')}
          </CardTitle>
          <CardDescription className="text-base">
            {t(
              'Based on your profile, goals, and availability, our AI will create a personalized training program just for you.',
              'Baserat på din profil, mål och tillgänglighet skapar vår AI ett personligt träningsprogram just för dig.'
            )}
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
                <h4 className="font-medium">{t('Full Periodization', 'Full periodisering')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'A complete training plan from base to peak, structured around your goal date.',
                    'En komplett träningsplan från bas till topp, strukturerad kring ditt måldatum.'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('Sport-Specific Workouts', 'Sportspecifika pass')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'Every session is tailored to your sport, fitness level, and available equipment.',
                    'Varje pass är anpassat för din sport, konditionsnivå och tillgänglig utrustning.'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-background border">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">{t('Smart Progression', 'Smart progression')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'Your program adapts based on your progress and daily readiness.',
                    'Ditt program anpassas baserat på din progression och dagliga beredskap.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs">
              {subscriptionTier === 'PRO'
                ? t('Included in your Pro subscription', 'Ingår i din Pro-prenumeration')
                : t('Included in your Standard subscription', 'Ingår i din Standard-prenumeration')
              }
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button size="lg" className="flex-1" onClick={onGenerate}>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('Generate My Program', 'Generera mitt program')}
            </Button>
            <Button variant="outline" size="lg" className="flex-1" onClick={onSkip}>
              {t('Skip - I\'ll Create Later', 'Hoppa över - jag skapar senare')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <p className="text-sm text-muted-foreground text-center">
        {t(
          'You can always generate or modify your program later from your dashboard.',
          'Du kan alltid generera eller ändra ditt program senare från din dashboard.'
        )}
      </p>
    </div>
  )
}
