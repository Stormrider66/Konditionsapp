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
import { AIChatUsageMeter } from '@/components/athlete/AIChatUsageMeter'
import { Progress } from '@/components/ui/progress'
import {
  ChevronLeft,
  CreditCard,
  Check,
  Loader2,
  Crown,
  Zap,
  Star,
  MessageSquare,
  Video,
  Watch,
  Clock,
  AlertTriangle,
  Lock,
} from 'lucide-react'

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

const TIERS = [
  {
    id: 'FREE',
    name: 'Gratis',
    price: 0,
    description: 'Grundläggande funktioner',
    features: [
      'Visa testrapporter',
      'Grundläggande profil',
      'Träningshistorik',
    ],
    icon: Star,
    color: 'gray',
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    price: 199,
    yearlyPrice: 1990,
    description: 'För aktiva atleter',
    features: [
      'Allt i Gratis',
      'Daglig incheckning',
      'Träningsloggning',
      'AI-chatt (50 meddelanden/månad)',
      'Strava/Garmin-synk',
    ],
    icon: Zap,
    color: 'blue',
    popular: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 399,
    yearlyPrice: 3990,
    description: 'Maximal träningsoptimering',
    features: [
      'Allt i Standard',
      'Obegränsad AI-chatt',
      'Videoanalys',
      'AI-agent (autonom)',
      'Full integration',
      'Programjusteringar med AI',
    ],
    icon: Crown,
    color: 'purple',
  },
]

export function SubscriptionClient({ clientId, subscription, basePath = '' }: SubscriptionClientProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

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
      } finally {
        setIsLoadingStatus(false)
      }
    }
    fetchStatus()
  }, [])

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
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte starta betalning',
          variant: 'destructive',
        })
      }
    } catch (error) {
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
        window.location.href = data.url
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte öppna kundportalen',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte öppna kundportalen',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(null)
    }
  }

  const getPrice = (tier: typeof TIERS[0]) => {
    if (billingCycle === 'YEARLY' && tier.yearlyPrice) {
      return tier.yearlyPrice
    }
    return tier.price
  }

  const isTrialExpired = status?.status === 'EXPIRED' && subscription?.status === 'TRIAL'

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
              <div className="grid sm:grid-cols-2 gap-6">
                {/* AI Chat Usage */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    AI-chatt
                  </div>
                  <AIChatUsageMeter
                    used={status.features.aiChat.used}
                    limit={status.features.aiChat.limit === -1 ? undefined : status.features.aiChat.limit}
                  />
                </div>

                {/* Feature Status */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Funktioner</div>
                  <div className="space-y-2">
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
              </div>
            </CardContent>
          )}
        </Card>

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
        <div className="grid md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
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
