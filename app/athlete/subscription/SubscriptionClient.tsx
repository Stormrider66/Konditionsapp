'use client'

/**
 * Subscription Client Component
 *
 * Client-side component for managing subscription.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  CreditCard,
  Check,
  Loader2,
  Crown,
  Zap,
  Star,
  Activity,
  MessageSquare,
  Video,
  Watch,
} from 'lucide-react'

interface Subscription {
  id: string
  tier: string
  status: string
  billingCycle?: string | null
  stripeSubscriptionId?: string | null
}

interface SubscriptionClientProps {
  clientId: string
  subscription: Subscription | null
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
      'Grundläggande Strava/Garmin-synk',
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
      'AI-agent (autonom)',
      'Videoanalys',
      'Full Strava/Garmin-integration',
      'Näringsplanering',
      'Programjusteringar med AI',
    ],
    icon: Crown,
    color: 'purple',
  },
]

export function SubscriptionClient({ clientId, subscription }: SubscriptionClientProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')

  const currentTier = subscription?.tier || 'FREE'

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

  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      return {
        border: `border-${color}-500 ring-2 ring-${color}-500`,
        bg: `bg-${color}-50`,
        badge: `bg-${color}-100 text-${color}-700`,
      }
    }
    return {
      border: 'border-gray-200',
      bg: 'bg-white',
      badge: 'bg-gray-100 text-gray-700',
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/athlete/settings">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Prenumeration</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Din nuvarande plan</CardTitle>
            <CardDescription>
              {currentTier === 'FREE'
                ? 'Du använder gratisversionen'
                : `Du har ${currentTier} prenumeration`}
            </CardDescription>
          </CardHeader>
          {subscription?.stripeSubscriptionId && (
            <CardContent>
              <Button variant="outline" onClick={handleManageSubscription} disabled={isLoading === 'manage'}>
                {isLoading === 'manage' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Hantera betalning
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
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
                      Nuvarande plan
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
                      Uppgradera
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
