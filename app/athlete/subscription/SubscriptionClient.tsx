'use client'

/**
 * Subscription Client Component
 *
 * Client-side component for managing subscription.
 * Shows trial status, usage meters, and upgrade options.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { TrialBadge } from '@/components/ui/TrialBadge'
import { useTranslations } from '@/i18n/client'
import {
  ChevronLeft,
  CreditCard,
  Check,
  Loader2,
  Crown,
  Zap,
  Star,
  Video,
  Watch,
  AlertTriangle,
  Lock,
  Coins,
} from 'lucide-react'
import { AICreditStatusCard } from '@/components/athlete/ai/AICreditStatusCard'
import {
  ATHLETE_AI_ALLOWANCE_SEK,
  ATHLETE_PLAN_PRICING,
  type AthletePlanTier,
} from '@/lib/subscription/athlete-plans'
import { AI_TOP_UP_PACKS } from '@/lib/ai/billing/top-up-packs'

interface Subscription {
  id: string
  tier: string
  status: string
  billingCycle?: string | null
  stripeSubscriptionId?: string | null
  trialEndsAt?: string | null
  aiChatEnabled?: boolean
  aiChatMessagesUsed?: number
  aiChatMessagesLimit?: number
  videoAnalysisEnabled?: boolean
  stravaEnabled?: boolean
  garminEnabled?: boolean
}

interface SubscriptionClientProps {
  clientId: string
  subscription: Subscription | null
  basePath?: string
  eliteOffer?: EliteOffer | null
  billingEnabled?: boolean
}

interface EliteOffer {
  businessId: string
  businessName: string
  monthlySek: number | null
  yearlySek: number | null
  description: string | null
  aiAllowanceSek: number | null
}

interface SubscriptionStatus {
  hasSubscription: boolean
  tier: string
  status: string
  trialActive: boolean
  trialDaysRemaining: number | null
  features: {
    aiChat: { enabled: boolean; used: number; limit: number }
    videoAnalysis: { enabled: boolean }
    strava: { enabled: boolean }
    garmin: { enabled: boolean }
  }
}

type PlanLocaleKey = 'free' | 'standard' | 'pro' | 'elite'

type SelfServeTier = {
  id: Exclude<AthletePlanTier, 'ELITE'>
  price: number
  yearlyPrice: number
  aiAllowanceSek: number
  nameKey: string
  descriptionKey: string
  featureKeys: string[]
  icon: typeof Star
  color: 'gray' | 'blue' | 'purple'
  popular?: boolean
}

const SELF_SERVE_TIERS: SelfServeTier[] = [
  {
    id: 'FREE',
    price: ATHLETE_PLAN_PRICING.FREE.monthlySek,
    yearlyPrice: ATHLETE_PLAN_PRICING.FREE.yearlySek,
    aiAllowanceSek: ATHLETE_AI_ALLOWANCE_SEK.FREE,
    nameKey: 'plans.free.name',
    descriptionKey: 'plans.free.description',
    featureKeys: [
      'plans.free.features.0',
      'plans.free.features.1',
      'plans.free.features.2',
    ],
    icon: Star,
    color: 'gray',
  },
  {
    id: 'STANDARD',
    price: ATHLETE_PLAN_PRICING.STANDARD.monthlySek,
    yearlyPrice: ATHLETE_PLAN_PRICING.STANDARD.yearlySek,
    aiAllowanceSek: ATHLETE_AI_ALLOWANCE_SEK.STANDARD,
    nameKey: 'plans.standard.name',
    descriptionKey: 'plans.standard.description',
    featureKeys: [
      'plans.standard.features.0',
      'plans.standard.features.1',
      'plans.standard.features.2',
      'plans.standard.features.3',
      'plans.standard.features.4',
    ],
    icon: Zap,
    color: 'blue',
    popular: true,
  },
  {
    id: 'PRO',
    price: ATHLETE_PLAN_PRICING.PRO.monthlySek,
    yearlyPrice: ATHLETE_PLAN_PRICING.PRO.yearlySek,
    aiAllowanceSek: ATHLETE_AI_ALLOWANCE_SEK.PRO,
    nameKey: 'plans.pro.name',
    descriptionKey: 'plans.pro.description',
    featureKeys: [
      'plans.pro.features.0',
      'plans.pro.features.1',
      'plans.pro.features.2',
      'plans.pro.features.3',
      'plans.pro.features.4',
      'plans.pro.features.5',
    ],
    icon: Crown,
    color: 'purple',
  },
]

export function SubscriptionClient({
  clientId,
  subscription,
  basePath = '',
  eliteOffer = null,
  billingEnabled = true,
}: SubscriptionClientProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const t = useTranslations('athletePages.subscription')
  const tCommon = useTranslations('common')

  const currentTier = subscription?.tier || 'FREE'
  const currentTierLabel = (() => {
    const key = currentTier.toLowerCase() as PlanLocaleKey
    if (key === 'free' || key === 'standard' || key === 'pro' || key === 'elite') {
      return t(`plans.${key}.name`)
    }
    return t('plans.free.name')
  })()

  // Fetch detailed subscription status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/athlete/subscription-status')
        const data = await response.json()
        if (data.success) {
          setStatus(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error)
      }
    }
    void fetchStatus()
  }, [])

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('aiTopUp')
    if (result === 'success') {
      toast({
        title: t('toasts.topUpSuccess.title'),
        description: t('toasts.topUpSuccess.description'),
      })
    }
    if (result === 'cancelled') {
      toast({
        title: t('toasts.topUpCancelled.title'),
        description: t('toasts.topUpCancelled.description'),
      })
    }
  }, [toast, t])

  const handleUpgrade = async (tierId: string) => {
    if (tierId === 'FREE') return
    if (!billingEnabled) {
      toast({
        title: t('toasts.billingNotEnabled.title'),
        description: t('toasts.billingNotEnabled.description'),
      })
      return
    }

    setIsLoading(tierId)
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          tier: tierId,
          billingCycle,
          businessId: tierId === 'ELITE' ? eliteOffer?.businessId : undefined,
          returnPath: `${basePath}/athlete/subscription`,
        }),
      })

      const data = await response.json()

      const checkoutUrl = data.url || data.checkoutUrl
      if (checkoutUrl) {
        window.location.assign(checkoutUrl)
      } else {
        toast({
          title: tCommon('error'),
          description: data.error || t('errors.checkoutFailed'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: tCommon('error'),
        description: t('errors.checkoutFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!billingEnabled) {
      toast({
        title: t('toasts.billingNotEnabled.title'),
        description: t('toasts.billingNotEnabled.portalDescription'),
      })
      return
    }

    setIsLoading('manage')
    try {
      const response = await fetch('/api/payments/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.assign(data.url)
      } else {
        toast({
          title: tCommon('error'),
          description: data.error || t('errors.managePortalFailed'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: tCommon('error'),
        description: t('errors.managePortalFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(null)
    }
  }

  const handleAiTopUp = async (packId: string) => {
    if (!billingEnabled) {
      toast({
        title: t('toasts.topUpNotAvailable.title'),
        description: t('toasts.topUpNotAvailable.description'),
      })
      return
    }

    setIsLoading(packId)
    try {
      const response = await fetch('/api/payments/ai-top-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId,
          returnPath: `${basePath}/athlete/subscription`,
        }),
      })

      const data = await response.json()
      const checkoutUrl = data.url || data.checkoutUrl

      if (checkoutUrl) {
        window.location.assign(checkoutUrl)
      } else {
        toast({
          title: tCommon('error'),
          description: data.error || t('errors.checkoutFailed'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: tCommon('error'),
        description: t('errors.checkoutFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(null)
    }
  }

  const getPrice = (tier: typeof SELF_SERVE_TIERS[0]) => {
    if (billingCycle === 'YEARLY' && tier.yearlyPrice) {
      return tier.yearlyPrice
    }
    return tier.price
  }

  const getBillingLabel = (cycle: 'MONTHLY' | 'YEARLY') =>
    cycle === 'MONTHLY' ? t('billing.monthlyUnit') : t('billing.yearlyUnit')

  const currentAiAllowance =
    ATHLETE_AI_ALLOWANCE_SEK[currentTier as AthletePlanTier] ?? ATHLETE_AI_ALLOWANCE_SEK.FREE
  const eliteFeatureRows = [
    ...(eliteOffer?.description
      ? [{ text: eliteOffer.description, useTranslation: false }]
      : []),
    { text: 'plans.elite.features.0', useTranslation: true },
    { text: 'plans.elite.features.1', useTranslation: true },
    { text: 'plans.elite.features.2', useTranslation: true },
    { text: 'plans.elite.features.3', useTranslation: true },
  ]

  const isTrialExpired = status?.status === 'EXPIRED' && subscription?.status === 'TRIAL'
  const elitePrice = billingCycle === 'YEARLY' ? eliteOffer?.yearlySek : eliteOffer?.monthlySek
  const eliteCheckoutEnabled = Boolean(eliteOffer?.businessId && elitePrice)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`${basePath}/athlete/settings`}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h1 className="text-lg font-semibold">{t('header.title')}</h1>
            </div>
          </div>
          {status?.trialActive && status.trialDaysRemaining && (
            <TrialBadge daysRemaining={status.trialDaysRemaining} upgradeUrl="#plans" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Trial Expired Warning */}
        {isTrialExpired && (
          <Card className="border-amber-500 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">{t('trialExpired.title')}</h3>
                  <p className="text-sm text-amber-700 mt-1">{t('trialExpired.description')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t('currentPlan.title')}
                  {status?.trialActive && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      {t('currentPlan.trialBadge')}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentTier === 'FREE'
                    ? t('currentPlan.description.free')
                    : status?.trialActive
                    ? t('currentPlan.description.trial', {
                        plan: currentTierLabel,
                        days: status?.trialDaysRemaining ?? 0,
                      })
                    : t('currentPlan.description.active', {
                        plan: currentTierLabel,
                      })}
                </CardDescription>
              </div>
              {subscription?.stripeSubscriptionId && (
                <Button variant="outline" onClick={handleManageSubscription} disabled={isLoading === 'manage'}>
                  {isLoading === 'manage' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {t('actions.manage')}
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Usage & Features */}
          {status && (currentTier !== 'FREE' || status.trialActive) && (
            <CardContent className="border-t pt-6">
              <div className="space-y-3">
                <div className="text-sm font-medium">{t('planFeatures.title')}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FeatureStatus
                    icon={<Video className="h-4 w-4" />}
                    label={t('planFeatures.videoAnalysis')}
                    enabled={status.features.videoAnalysis.enabled}
                  />
                  <FeatureStatus
                    icon={<Watch className="h-4 w-4" />}
                    label={t('planFeatures.integrations')}
                    enabled={status.features.strava.enabled || status.features.garmin.enabled}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* AI Credits */}
        <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-4">
          <AICreditStatusCard basePath={basePath} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-600" />
                {t('aiCredits.title')}
              </CardTitle>
              <CardDescription>
                {t('aiCredits.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {t('aiCredits.usageHint')}
              </p>
              <p>
                {currentTier === 'ELITE' ? (
                  <>{t('elite.customCredits')}</>
                ) : (
                  <>
                    {t('aiCredits.tierAllowance', {
                      plan: currentTierLabel,
                      amount: currentAiAllowance,
                    })}
                  </>
                )}
              </p>
              <div className="space-y-2">
                {AI_TOP_UP_PACKS.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {t('aiCredits.packCredits', { amount: pack.creditsSek })}
                      </p>
                      <p className="text-xs">{t(`packs.${pack.id}.description`)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={!billingEnabled || isLoading === pack.id}
                      onClick={() => handleAiTopUp(pack.id)}
                    >
                      {isLoading === pack.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !billingEnabled ? (
                        t('actions.topUpSoon')
                      ) : (
                        t('actions.topUpAmount', { amount: pack.amountSek })
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              {!billingEnabled && (
                <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
                  {t('aiCredits.billingDisabledNotice')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center" id="plans">
          <div className="bg-white rounded-lg p-1 border inline-flex">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'MONTHLY'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('billing.monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'YEARLY'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('billing.yearly')}
            </button>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {SELF_SERVE_TIERS.map((tier) => {
            const isActive = currentTier === tier.id
            const Icon = tier.icon
            const price = getPrice(tier)

            return (
              <Card
                key={tier.id}
                className={`relative ${isActive ? 'border-blue-500 ring-2 ring-blue-500' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                      {t('plans.free.popular')}
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      tier.color === 'gray'
                        ? 'bg-gray-100'
                        : tier.color === 'blue'
                        ? 'bg-blue-100'
                        : 'bg-purple-100'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        tier.color === 'gray'
                          ? 'text-gray-600'
                          : tier.color === 'blue'
                          ? 'text-blue-600'
                          : 'text-purple-600'
                      }`}
                    />
                  </div>
                  <CardTitle>{t(tier.nameKey)}</CardTitle>
                  <CardDescription>{t(tier.descriptionKey)}</CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{price}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      SEK/{getBillingLabel(billingCycle)}
                    </span>
                  </div>

                  <ul className="text-sm text-left space-y-2 mb-6">
                    <li className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2 text-emerald-800">
                      <Coins className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{t('planCard.aiAllowanceMonthly', { amount: tier.aiAllowanceSek })}</span>
                    </li>
                    {tier.featureKeys.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t(feature)}</span>
                      </li>
                    ))}
                  </ul>

                  {isActive ? (
                    <Button variant="outline" className="w-full" disabled>
                      {status?.trialActive ? t('actions.currentTrial') : t('actions.currentPlan')}
                    </Button>
                  ) : tier.id === 'FREE' ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t('actions.freePlan')}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        tier.color === 'blue'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={!billingEnabled || isLoading === tier.id}
                    >
                      {isLoading === tier.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {status?.trialActive && currentTier === tier.id
                        ? t('actions.activateNow')
                        : billingEnabled
                          ? t('actions.upgrade')
                          : t('actions.soon')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}

          <Card className={`relative ${currentTier === 'ELITE' ? 'border-amber-500 ring-2 ring-amber-500' : ''}`}>
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-amber-100">
                <Crown className="h-6 w-6 text-amber-700" />
              </div>
              <CardTitle>{t('plans.elite.name')}</CardTitle>
              <CardDescription>
                {eliteOffer?.businessName
                  ? t('elite.descriptionWithBusiness', { businessName: eliteOffer.businessName })
                  : t('plans.elite.description')}
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="mb-4">
                {elitePrice ? (
                  <>
                    <span className="text-3xl font-bold">{elitePrice}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      SEK/{getBillingLabel(billingCycle)}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold">{t('elite.customPriceLabel')}</span>
                )}
              </div>

              <ul className="text-sm text-left space-y-2 mb-6">
                <li className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-900">
                  <Coins className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {eliteOffer?.aiAllowanceSek
                      ? t('planCard.eliteAiAllowance', { amount: eliteOffer.aiAllowanceSek })
                      : t('planCard.eliteAiAllowanceCustom')}
                  </span>
                </li>
                {eliteFeatureRows.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>
                      {feature.useTranslation ? t(feature.text) : feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {currentTier === 'ELITE' ? (
                <Button variant="outline" className="w-full" disabled>
                  {t('actions.currentPlan')}
                </Button>
              ) : eliteCheckoutEnabled ? (
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={() => handleUpgrade('ELITE')}
                  disabled={!billingEnabled || isLoading === 'ELITE'}
                >
                  {isLoading === 'ELITE' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {billingEnabled ? t('actions.selectElite') : t('actions.soon')}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  {t('actions.contactCoach')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Helper component for feature status display
function FeatureStatus({
  icon,
  label,
  enabled,
}: {
  icon: React.ReactNode
  label: string
  enabled: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </div>
      {enabled ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Lock className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  )
}
