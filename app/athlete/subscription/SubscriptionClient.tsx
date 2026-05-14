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
  ATHLETE_PLAN_COPY,
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

const SELF_SERVE_TIERS = [
  {
    id: 'FREE',
    name: ATHLETE_PLAN_COPY.FREE.nameSv,
    price: ATHLETE_PLAN_PRICING.FREE.monthlySek,
    yearlyPrice: ATHLETE_PLAN_PRICING.FREE.yearlySek,
    description: ATHLETE_PLAN_COPY.FREE.descriptionSv,
    features: ATHLETE_PLAN_COPY.FREE.featuresSv,
    aiAllowanceSek: ATHLETE_AI_ALLOWANCE_SEK.FREE,
    icon: Star,
    color: 'gray',
  },
  {
    id: 'STANDARD',
    name: ATHLETE_PLAN_COPY.STANDARD.nameSv,
    price: ATHLETE_PLAN_PRICING.STANDARD.monthlySek,
    yearlyPrice: ATHLETE_PLAN_PRICING.STANDARD.yearlySek,
    description: ATHLETE_PLAN_COPY.STANDARD.descriptionSv,
    features: ATHLETE_PLAN_COPY.STANDARD.featuresSv,
    aiAllowanceSek: ATHLETE_AI_ALLOWANCE_SEK.STANDARD,
    icon: Zap,
    color: 'blue',
    popular: true,
  },
  {
    id: 'PRO',
    name: ATHLETE_PLAN_COPY.PRO.nameSv,
    price: ATHLETE_PLAN_PRICING.PRO.monthlySek,
    yearlyPrice: ATHLETE_PLAN_PRICING.PRO.yearlySek,
    description: ATHLETE_PLAN_COPY.PRO.descriptionSv,
    features: ATHLETE_PLAN_COPY.PRO.featuresSv,
    aiAllowanceSek: ATHLETE_AI_ALLOWANCE_SEK.PRO,
    icon: Crown,
    color: 'purple',
  },
]

export function SubscriptionClient({
  clientId,
  subscription,
  basePath = '',
  eliteOffer = null,
}: SubscriptionClientProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  const currentTier = subscription?.tier || 'FREE'

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
        title: 'AI-krediter påfyllda',
        description: 'Betalningen är mottagen. Saldot uppdateras så snart Stripe-bekräftelsen är behandlad.',
      })
    }
    if (result === 'cancelled') {
      toast({
        title: 'Påfyllning avbruten',
        description: 'Ingen betalning drogs och inga AI-krediter lades till.',
      })
    }
  }, [toast])

  const handleUpgrade = async (tierId: string) => {
    if (tierId === 'FREE') return

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
          title: 'Fel',
          description: data.error || 'Kunde inte starta betalning',
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte starta betalning',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(null)
    }
  }

  const handleManageSubscription = async () => {
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
          title: 'Fel',
          description: data.error || 'Kunde inte öppna kundportalen',
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte öppna kundportalen',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(null)
    }
  }

  const handleAiTopUp = async (packId: string) => {
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
          title: 'Fel',
          description: data.error || 'Kunde inte starta betalning',
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte starta betalning',
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

  const isTrialExpired = status?.status === 'EXPIRED' && subscription?.status === 'TRIAL'
  const currentPlanCopy = ATHLETE_PLAN_COPY[currentTier as AthletePlanTier] ?? ATHLETE_PLAN_COPY.FREE
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
              <h1 className="text-lg font-semibold">Prenumeration</h1>
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
                  <h3 className="font-semibold text-amber-900">Din provperiod har gått ut</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Uppgradera nu för att fortsätta använda AI-chatt, videoanalys och andra premiumfunktioner.
                  </p>
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
                  Din nuvarande plan
                  {status?.trialActive && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      Provperiod
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentTier === 'FREE'
                    ? 'Du använder gratisversionen'
                    : status?.trialActive
                    ? `Du testar ${currentTier} - ${status.trialDaysRemaining} dagar kvar`
                    : `Du har ${currentTier} prenumeration`}
                </CardDescription>
              </div>
              {subscription?.stripeSubscriptionId && (
                <Button variant="outline" onClick={handleManageSubscription} disabled={isLoading === 'manage'}>
                  {isLoading === 'manage' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Hantera
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Usage & Features */}
          {status && (currentTier !== 'FREE' || status.trialActive) && (
            <CardContent className="border-t pt-6">
              <div className="space-y-3">
                <div className="text-sm font-medium">Planfunktioner</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FeatureStatus
                    icon={<Video className="h-4 w-4" />}
                    label="Videoanalys"
                    enabled={status.features.videoAnalysis.enabled}
                  />
                  <FeatureStatus
                    icon={<Watch className="h-4 w-4" />}
                    label="Strava/Garmin"
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
                Så fungerar AI-krediter
              </CardTitle>
              <CardDescription>
                Din plan avgör hur mycket tung AI-användning som ingår varje månad.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Mat-skanner, videoanalys, röstcoach, programimport och rapportbilder använder AI-krediter.
              </p>
              <p>
                {currentTier === 'ELITE' ? (
                  <>
                    Elite har en anpassad AI-kreditpott som sätts tillsammans med din coach eller PT.
                  </>
                ) : (
                  <>
                    {currentPlanCopy.nameSv} inkluderar{' '}
                    <span className="font-semibold text-foreground">
                      {ATHLETE_AI_ALLOWANCE_SEK[currentTier as AthletePlanTier] ?? ATHLETE_AI_ALLOWANCE_SEK.FREE} SEK/mån
                    </span>{' '}
                    i AI-krediter.
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
                      <p className="font-medium text-foreground">{pack.creditsSek} SEK krediter</p>
                      <p className="text-xs">{pack.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={isLoading === pack.id}
                      onClick={() => handleAiTopUp(pack.id)}
                    >
                      {isLoading === pack.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `${pack.amountSek} kr`
                      )}
                    </Button>
                  </div>
                ))}
              </div>
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
              Månadsvis
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'YEARLY'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Årsvis (spara 17%)
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
                      Populärast
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
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{price}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      SEK/{billingCycle === 'MONTHLY' ? 'mån' : 'år'}
                    </span>
                  </div>

                  <ul className="text-sm text-left space-y-2 mb-6">
                    <li className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2 text-emerald-800">
                      <Coins className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{tier.aiAllowanceSek} SEK AI-krediter/mån ingår</span>
                    </li>
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isActive ? (
                    <Button variant="outline" className="w-full" disabled>
                      {status?.trialActive ? 'Provperiod aktiv' : 'Nuvarande plan'}
                    </Button>
                  ) : tier.id === 'FREE' ? (
                    <Button variant="outline" className="w-full" disabled>
                      Gratisversion
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        tier.color === 'blue'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={isLoading === tier.id}
                    >
                      {isLoading === tier.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {status?.trialActive && currentTier === tier.id
                        ? 'Aktivera nu'
                        : 'Uppgradera'}
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
              <CardTitle>{ATHLETE_PLAN_COPY.ELITE.nameSv}</CardTitle>
              <CardDescription>
                {eliteOffer?.businessName
                  ? `Coach/PT via ${eliteOffer.businessName}`
                  : ATHLETE_PLAN_COPY.ELITE.descriptionSv}
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="mb-4">
                {elitePrice ? (
                  <>
                    <span className="text-3xl font-bold">{elitePrice}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      SEK/{billingCycle === 'MONTHLY' ? 'mån' : 'år'}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold">Custom</span>
                )}
              </div>

              <ul className="text-sm text-left space-y-2 mb-6">
                <li className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-900">
                  <Coins className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {eliteOffer?.aiAllowanceSek
                      ? `${eliteOffer.aiAllowanceSek} SEK AI-krediter/mån ingår`
                      : 'Custom AI-krediter sätts med coach/PT'}
                  </span>
                </li>
                {(eliteOffer?.description
                  ? [eliteOffer.description, ...ATHLETE_PLAN_COPY.ELITE.featuresSv]
                  : ATHLETE_PLAN_COPY.ELITE.featuresSv
                ).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {currentTier === 'ELITE' ? (
                <Button variant="outline" className="w-full" disabled>
                  Nuvarande plan
                </Button>
              ) : eliteCheckoutEnabled ? (
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={() => handleUpgrade('ELITE')}
                  disabled={isLoading === 'ELITE'}
                >
                  {isLoading === 'ELITE' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Välj Elite
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Kontakta coach/PT
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
