'use client';

/**
 * Coach Subscription Client Component
 *
 * Client-side component for managing coach subscription.
 */

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft,
  CreditCard,
  Check,
  Loader2,
  Crown,
  Zap,
  Star,
  Building2,
  Users,
  Sparkles,
  BarChart3,
  Headphones,
  FileText,
  Bot,
  Video,
} from 'lucide-react';
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client';

interface Subscription {
  id: string;
  tier: string;
  status: string;
  maxAthletes: number;
  currentAthletes: number;
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}

interface CoachSubscriptionClientProps {
  userId: string;
  subscription: Subscription | null;
  currentAthleteCount: number;
}

const TIERS = [
  {
    id: 'FREE',
    name: 'Starter',
    price: 0,
    yearlyPrice: 0,
    description: 'Prova gratis',
    maxAthletes: 1,
    features: [
      'Upp till 1 atlet',
      'Grundläggande testrapporter',
      'Träningszoner',
      'E-postsupport',
    ],
    limitations: [
      'Ingen AI-generering',
      'Ingen programgenerering',
      'Ingen videoanalys',
    ],
    icon: Star,
    color: 'gray',
  },
  {
    id: 'BASIC',
    name: 'Professional',
    price: 499,
    yearlyPrice: 4990,
    description: 'För enskilda tränare',
    maxAthletes: 20,
    features: [
      'Upp till 20 atleter',
      'Alla testrapporter',
      'AI-programgenerering (grundläggande)',
      'Träningsprogram',
      'Daglig incheckning',
      'Meddelandesystem',
      'E-postsupport',
    ],
    icon: Zap,
    color: 'blue',
    popular: true,
  },
  {
    id: 'PRO',
    name: 'Business',
    price: 1499,
    yearlyPrice: 14990,
    description: 'För PT-studios och klubbar',
    maxAthletes: 100,
    features: [
      'Upp till 100 atleter',
      'Allt i Professional',
      'Full AI Studio',
      'Videoanalys',
      'White-label rapporter',
      'Avancerad analys',
      'Prioriterad support',
      'API-tillgång (begränsad)',
    ],
    icon: Crown,
    color: 'purple',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: null,
    yearlyPrice: null,
    description: 'För förbund och stora organisationer',
    maxAthletes: -1,
    features: [
      'Obegränsade atleter',
      'Allt i Business',
      'Dedikerad kontoansvarig',
      'Anpassade integrationer',
      'Full API-tillgång',
      'SLA-garanti',
      'On-premise möjligt',
      'Anpassad utbildning',
    ],
    icon: Building2,
    color: 'amber',
  },
];

export function CoachSubscriptionClient({
  userId,
  subscription,
  currentAthleteCount,
}: CoachSubscriptionClientProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const businessSlug = getBusinessSlugFromPathname(pathname);
  const basePath = businessSlug ? `/${businessSlug}` : '';
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const currentTier = subscription?.tier || 'FREE';

  // Show success/cancel messages from URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Prenumeration aktiverad!',
        description: 'Din prenumeration har aktiverats. Tack!',
      });
    } else if (searchParams.get('cancelled') === 'true') {
      toast({
        title: 'Betalning avbruten',
        description: 'Betalningen avbröts. Du kan försöka igen när du vill.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const handleUpgrade = async (tierId: string) => {
    if (tierId === 'FREE') return;

    if (tierId === 'ENTERPRISE') {
      // For enterprise, redirect to contact form
      window.location.href = 'mailto:enterprise@trainomics.app?subject=Enterprise%20förfrågan';
      return;
    }

    setIsLoading(tierId);
    try {
      const response = await fetch('/api/payments/coach/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierId,
          cycle: billingCycle,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte starta betalning',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte starta betalning',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading('manage');
    try {
      const response = await fetch('/api/payments/coach/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte öppna kundportalen',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte öppna kundportalen',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const getPrice = (tier: (typeof TIERS)[0]) => {
    if (tier.price === null) return null;
    if (billingCycle === 'YEARLY' && tier.yearlyPrice) {
      return tier.yearlyPrice;
    }
    return tier.price;
  };

  const getCurrentTierInfo = () => {
    return TIERS.find((t) => t.id === currentTier) || TIERS[0];
  };

  const currentTierInfo = getCurrentTierInfo();

  const currentGlow = currentTier === 'PRO' ? 'purple' : currentTier === 'BASIC' ? 'blue' : 'emerald';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md border-b border-slate-200/50 dark:border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`${basePath}/coach/settings`}>
            <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-white/5">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-slate-700 dark:text-slate-350" />
            <h1 className="text-lg font-semibold">Prenumeration</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Current Plan Summary */}
        <GlassCard glow={currentGlow}>
          <GlassCardHeader>
            <div className="flex items-center justify-between">
              <div>
                <GlassCardTitle className="flex items-center gap-2">
                  Din nuvarande plan
                  <Badge
                    variant={currentTier === 'FREE' ? 'secondary' : 'default'}
                    className={
                      currentTier === 'PRO'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                        : currentTier === 'BASIC'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    }
                  >
                    {currentTierInfo.name}
                  </Badge>
                </GlassCardTitle>
                <GlassCardDescription>
                  {currentTier === 'FREE'
                    ? 'Uppgradera för att få tillgång till fler funktioner'
                    : `Din prenumeration förnyas automatiskt`}
                </GlassCardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {currentAthleteCount} / {currentTierInfo.maxAthletes === -1 ? '∞' : currentTierInfo.maxAthletes} atleter
                  </span>
                </div>
              </div>
            </div>
          </GlassCardHeader>
          {subscription?.stripeSubscriptionId && (
            <GlassCardContent>
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleManageSubscription} disabled={isLoading === 'manage'} className="border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">
                  {isLoading === 'manage' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Hantera betalning
                </Button>
                {subscription.stripeCurrentPeriodEnd && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Nästa faktura:{' '}
                    {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString('sv-SE')}
                  </span>
                )}
              </div>
            </GlassCardContent>
          )}
        </GlassCard>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-xl p-1 border border-slate-200/50 dark:border-white/10 inline-flex items-center gap-2">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'MONTHLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Månadsvis
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'YEARLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Årsvis
            </button>
            {billingCycle === 'YEARLY' && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 ml-1">
                Spara 17%
              </Badge>
            )}
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier) => {
            const isActive = currentTier === tier.id;
            const Icon = tier.icon;
            const price = getPrice(tier);
            const canUpgrade = TIERS.findIndex((t) => t.id === tier.id) > TIERS.findIndex((t) => t.id === currentTier);

            const glowColor = tier.id === 'FREE' ? 'slate' : tier.id === 'BASIC' ? 'blue' : tier.id === 'PRO' ? 'purple' : 'amber';
            return (
              <GlassCard
                key={tier.id}
                glow={glowColor}
                className={`relative ${isActive ? 'ring-2 ring-blue-500' : ''}`}
              >
                {tier.popular && !isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-md font-semibold">
                      Populärast
                    </span>
                  </div>
                )}

                <GlassCardHeader className="text-center pb-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      tier.color === 'gray'
                        ? 'bg-slate-100 dark:bg-white/5'
                        : tier.color === 'blue'
                        ? 'bg-blue-100 dark:bg-blue-500/20'
                        : tier.color === 'purple'
                        ? 'bg-purple-100 dark:bg-purple-500/20'
                        : 'bg-amber-100 dark:bg-amber-500/20'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        tier.color === 'gray'
                          ? 'text-slate-600 dark:text-slate-350'
                          : tier.color === 'blue'
                          ? 'text-blue-600 dark:text-blue-400'
                          : tier.color === 'purple'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    />
                  </div>
                  <GlassCardTitle className="text-lg">{tier.name}</GlassCardTitle>
                  <GlassCardDescription className="text-xs">{tier.description}</GlassCardDescription>
                </GlassCardHeader>

                <GlassCardContent className="text-center">
                  <div className="mb-4">
                    {price !== null ? (
                      <>
                        <span className="text-3xl font-bold">{price.toLocaleString('sv-SE')}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">
                          {' '}
                          SEK/{billingCycle === 'MONTHLY' ? 'mån' : 'år'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-semibold text-slate-500 dark:text-slate-400">Kontakta oss</span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    {tier.maxAthletes === -1 ? 'Obegränsade atleter' : `Upp till ${tier.maxAthletes} atleter`}
                  </div>

                  <ul className="text-xs text-left space-y-1.5 mb-6 text-slate-700 dark:text-slate-300">
                    {tier.features.slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {tier.features.length > 5 && (
                      <li className="text-slate-500 dark:text-slate-450">+ {tier.features.length - 5} fler funktioner</li>
                    )}
                  </ul>

                  {isActive ? (
                    <Button variant="outline" className="w-full border-slate-200 dark:border-white/10" disabled size="sm">
                      Nuvarande plan
                    </Button>
                  ) : tier.id === 'FREE' ? (
                    <Button variant="outline" className="w-full border-slate-200 dark:border-white/10" disabled size="sm">
                      Gratisversion
                    </Button>
                  ) : tier.id === 'ENTERPRISE' ? (
                    <Button
                      variant="outline"
                      className="w-full border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                      onClick={() => handleUpgrade(tier.id)}
                      size="sm"
                    >
                      Kontakta oss
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className={`w-full ${
                        tier.color === 'blue'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={isLoading === tier.id}
                      size="sm"
                    >
                      {isLoading === tier.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Uppgradera
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full border-slate-200 dark:border-white/10" disabled size="sm">
                      Lägre plan
                    </Button>
                  )}
                </GlassCardContent>
              </GlassCard>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <GlassCard glow="blue">
          <GlassCardHeader>
            <GlassCardTitle>Jämför funktioner</GlassCardTitle>
            <GlassCardDescription>Se vad som ingår i varje plan</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-white/10">
                    <th className="text-left py-3 px-2">Funktion</th>
                    {TIERS.map((tier) => (
                      <th key={tier.id} className="text-center py-3 px-2">
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/10">
                  <FeatureRow
                    icon={<Users className="h-4 w-4" />}
                    name="Max atleter"
                    values={['1', '20', '100', '∞']}
                  />
                  <FeatureRow
                    icon={<FileText className="h-4 w-4" />}
                    name="Testrapporter"
                    values={['Grundläggande', 'Alla', 'Alla + White-label', 'Alla + Anpassade']}
                  />
                  <FeatureRow
                    icon={<Bot className="h-4 w-4" />}
                    name="AI-programmering"
                    values={[false, 'Grundläggande', 'Full', 'Full + Anpassad']}
                  />
                  <FeatureRow
                    icon={<Video className="h-4 w-4" />}
                    name="Videoanalys"
                    values={[false, false, true, true]}
                  />
                  <FeatureRow
                    icon={<BarChart3 className="h-4 w-4" />}
                    name="Avancerad analys"
                    values={[false, false, true, true]}
                  />
                  <FeatureRow
                    icon={<Sparkles className="h-4 w-4" />}
                    name="API-tillgång"
                    values={[false, false, 'Begränsad', 'Full']}
                  />
                  <FeatureRow
                    icon={<Headphones className="h-4 w-4" />}
                    name="Support"
                    values={['E-post', 'E-post', 'Prioriterad', 'Dedikerad']}
                  />
                </tbody>
              </table>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* FAQ */}
        <GlassCard glow="purple">
          <GlassCardHeader>
            <GlassCardTitle>Vanliga frågor</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div>
              <h4 className="font-semibold">Kan jag byta plan när som helst?</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ja, du kan uppgradera eller nedgradera din plan när som helst. Vid uppgradering får du
                tillgång till nya funktioner direkt. Vid nedgradering gäller den nya planen från nästa
                faktureringsperiod.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Vad händer om jag har fler atleter än planen tillåter?</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Du behåller tillgång till alla befintliga atleter, men kan inte lägga till nya förrän du
                antingen uppgraderar eller tar bort några atleter.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Hur fungerar betalningen?</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We använder Stripe för säker betalning. Du kan betala med kort och faktureras
                automatiskt varje månad eller år beroende på vald betalningsperiod.
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  name,
  values,
}: {
  icon: React.ReactNode;
  name: string;
  values: (string | boolean)[];
}) {
  return (
    <tr>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          {icon}
          {name}
        </div>
      </td>
      {values.map((value, i) => (
        <td key={i} className="text-center py-3 px-2">
          {typeof value === 'boolean' ? (
            value ? (
              <Check className="h-4 w-4 text-green-500 mx-auto" />
            ) : (
              <span className="text-gray-300">—</span>
            )
          ) : (
            <span className="text-xs">{value}</span>
          )}
        </td>
      ))}
    </tr>
  );
}
