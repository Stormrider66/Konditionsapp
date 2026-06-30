'use client';

/**
 * Coach Subscription Client Component
 *
 * Client-side component for managing coach subscription.
 */

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RolePanel } from '@/components/layouts/role-shell/RolePage';
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

type AppLocale = 'en' | 'sv';
type TierId = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

const LOCALE_CONFIG: Record<AppLocale, { date: string; number: string }> = {
  en: { date: 'en-US', number: 'en-US' },
  sv: { date: 'sv-SE', number: 'sv-SE' },
};

const COPY = {
  en: {
    pageTitle: 'Subscription',
    successTitle: 'Subscription activated',
    successDescription: 'Your subscription has been activated. Thank you.',
    cancelledTitle: 'Payment cancelled',
    cancelledDescription: 'The payment was cancelled. You can try again whenever you want.',
    errorTitle: 'Error',
    checkoutError: 'Could not start payment',
    portalError: 'Could not open the customer portal',
    enterpriseSubject: 'Enterprise inquiry',
    currentPlan: 'Your current plan',
    upgradePrompt: 'Upgrade to unlock more features',
    renewsAutomatically: 'Your subscription renews automatically',
    athletes: 'athletes',
    managePayment: 'Manage payment',
    nextInvoice: 'Next invoice',
    monthly: 'Monthly',
    yearly: 'Yearly',
    saveYearly: 'Save 17%',
    monthShort: 'mo',
    yearShort: 'yr',
    contactUs: 'Contact us',
    unlimitedAthletes: 'Unlimited athletes',
    upToAthletes: (count: number) => `Up to ${count} athletes`,
    moreFeatures: (count: number) => `+ ${count} more features`,
    currentPlanButton: 'Current plan',
    freeVersion: 'Free version',
    upgrade: 'Upgrade',
    lowerPlan: 'Lower plan',
    popular: 'Most popular',
    compareTitle: 'Compare features',
    compareDescription: 'See what is included in each plan',
    feature: 'Feature',
    maxAthletes: 'Max athletes',
    testReports: 'Test reports',
    aiProgramming: 'AI programming',
    videoAnalysis: 'Video analysis',
    advancedAnalytics: 'Advanced analytics',
    apiAccess: 'API access',
    support: 'Support',
    basic: 'Basic',
    all: 'All',
    allWhiteLabel: 'All + White-label',
    allCustom: 'All + Custom',
    full: 'Full',
    fullCustom: 'Full + Custom',
    limited: 'Limited',
    email: 'Email',
    priority: 'Priority',
    dedicated: 'Dedicated',
    faqTitle: 'Frequently asked questions',
    faqChangePlan: 'Can I change plan at any time?',
    faqChangePlanAnswer:
      'Yes, you can upgrade or downgrade your plan at any time. Upgrades unlock new features immediately. Downgrades take effect from the next billing period.',
    faqMoreAthletes: 'What happens if I have more athletes than the plan allows?',
    faqMoreAthletesAnswer:
      'You keep access to all existing athletes, but you cannot add new ones until you either upgrade or remove athletes.',
    faqPayments: 'How does payment work?',
    faqPaymentsAnswer:
      'We use Stripe for secure payment. You can pay by card and will be billed automatically every month or year depending on the selected billing cycle.',
    tiers: {
      FREE: {
        name: 'Starter',
        description: 'Try for free',
        features: ['Up to 1 athlete', 'Basic test reports', 'Training zones', 'Email support'],
        limitations: ['No AI generation', 'No program generation', 'No video analysis'],
      },
      BASIC: {
        name: 'Professional',
        description: 'For individual coaches',
        features: [
          'Up to 20 athletes',
          'All test reports',
          'AI program generation (basic)',
          'Training programs',
          'Daily check-in',
          'Messaging system',
          'Email support',
        ],
      },
      PRO: {
        name: 'Business',
        description: 'For PT studios and clubs',
        features: [
          'Up to 100 athletes',
          'Everything in Professional',
          'Full AI Studio',
          'Video analysis',
          'White-label reports',
          'Advanced analytics',
          'Priority support',
          'API access (limited)',
        ],
      },
      ENTERPRISE: {
        name: 'Enterprise',
        description: 'For federations and large organizations',
        features: [
          'Unlimited athletes',
          'Everything in Business',
          'Dedicated account manager',
          'Custom integrations',
          'Full API access',
          'SLA guarantee',
          'On-premise available',
          'Custom training',
        ],
      },
    },
  },
  sv: {
    pageTitle: 'Prenumeration',
    successTitle: 'Prenumeration aktiverad',
    successDescription: 'Din prenumeration har aktiverats. Tack.',
    cancelledTitle: 'Betalning avbruten',
    cancelledDescription: 'Betalningen avbröts. Du kan försöka igen när du vill.',
    errorTitle: 'Fel',
    checkoutError: 'Kunde inte starta betalning',
    portalError: 'Kunde inte öppna kundportalen',
    enterpriseSubject: 'Enterprise förfrågan',
    currentPlan: 'Din nuvarande plan',
    upgradePrompt: 'Uppgradera för att få tillgång till fler funktioner',
    renewsAutomatically: 'Din prenumeration förnyas automatiskt',
    athletes: 'atleter',
    managePayment: 'Hantera betalning',
    nextInvoice: 'Nästa faktura',
    monthly: 'Månadsvis',
    yearly: 'Årsvis',
    saveYearly: 'Spara 17%',
    monthShort: 'mån',
    yearShort: 'år',
    contactUs: 'Kontakta oss',
    unlimitedAthletes: 'Obegränsade atleter',
    upToAthletes: (count: number) => `Upp till ${count} atleter`,
    moreFeatures: (count: number) => `+ ${count} fler funktioner`,
    currentPlanButton: 'Nuvarande plan',
    freeVersion: 'Gratisversion',
    upgrade: 'Uppgradera',
    lowerPlan: 'Lägre plan',
    popular: 'Populärast',
    compareTitle: 'Jämför funktioner',
    compareDescription: 'Se vad som ingår i varje plan',
    feature: 'Funktion',
    maxAthletes: 'Max atleter',
    testReports: 'Testrapporter',
    aiProgramming: 'AI-programmering',
    videoAnalysis: 'Videoanalys',
    advancedAnalytics: 'Avancerad analys',
    apiAccess: 'API-tillgång',
    support: 'Support',
    basic: 'Grundläggande',
    all: 'Alla',
    allWhiteLabel: 'Alla + White-label',
    allCustom: 'Alla + Anpassade',
    full: 'Full',
    fullCustom: 'Full + Anpassad',
    limited: 'Begränsad',
    email: 'E-post',
    priority: 'Prioriterad',
    dedicated: 'Dedikerad',
    faqTitle: 'Vanliga frågor',
    faqChangePlan: 'Kan jag byta plan när som helst?',
    faqChangePlanAnswer:
      'Ja, du kan uppgradera eller nedgradera din plan när som helst. Vid uppgradering får du tillgång till nya funktioner direkt. Vid nedgradering gäller den nya planen från nästa faktureringsperiod.',
    faqMoreAthletes: 'Vad händer om jag har fler atleter än planen tillåter?',
    faqMoreAthletesAnswer:
      'Du behåller tillgång till alla befintliga atleter, men kan inte lägga till nya förrän du antingen uppgraderar eller tar bort några atleter.',
    faqPayments: 'Hur fungerar betalningen?',
    faqPaymentsAnswer:
      'Vi använder Stripe för säker betalning. Du kan betala med kort och faktureras automatiskt varje månad eller år beroende på vald betalningsperiod.',
    tiers: {
      FREE: {
        name: 'Starter',
        description: 'Prova gratis',
        features: ['Upp till 1 atlet', 'Grundläggande testrapporter', 'Träningszoner', 'E-postsupport'],
        limitations: ['Ingen AI-generering', 'Ingen programgenerering', 'Ingen videoanalys'],
      },
      BASIC: {
        name: 'Professional',
        description: 'För enskilda tränare',
        features: [
          'Upp till 20 atleter',
          'Alla testrapporter',
          'AI-programgenerering (grundläggande)',
          'Träningsprogram',
          'Daglig incheckning',
          'Meddelandesystem',
          'E-postsupport',
        ],
      },
      PRO: {
        name: 'Business',
        description: 'För PT-studios och klubbar',
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
      },
      ENTERPRISE: {
        name: 'Enterprise',
        description: 'För förbund och stora organisationer',
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
      },
    },
  },
} as const;

const TIER_META: Array<{
  id: TierId;
  price: number | null;
  yearlyPrice: number | null;
  maxAthletes: number;
  icon: typeof Star;
  color: 'gray' | 'blue' | 'purple' | 'amber';
  popular?: boolean;
}> = [
  {
    id: 'FREE',
    price: 0,
    yearlyPrice: 0,
    maxAthletes: 1,
    icon: Star,
    color: 'gray',
  },
  {
    id: 'BASIC',
    price: 499,
    yearlyPrice: 4990,
    maxAthletes: 20,
    icon: Zap,
    color: 'blue',
    popular: true,
  },
  {
    id: 'PRO',
    price: 1499,
    yearlyPrice: 14990,
    maxAthletes: 100,
    icon: Crown,
    color: 'purple',
  },
  {
    id: 'ENTERPRISE',
    price: null,
    yearlyPrice: null,
    maxAthletes: -1,
    icon: Building2,
    color: 'amber',
  },
];

export function CoachSubscriptionClient({
  subscription,
  currentAthleteCount,
}: CoachSubscriptionClientProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const copy = COPY[locale];
  const localeConfig = LOCALE_CONFIG[locale];
  const businessSlug = getBusinessSlugFromPathname(pathname);
  const basePath = businessSlug ? `/${businessSlug}` : '';
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const currentTier = subscription?.tier || 'FREE';

  // Show success/cancel messages from URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: copy.successTitle,
        description: copy.successDescription,
      });
    } else if (searchParams.get('cancelled') === 'true') {
      toast({
        title: copy.cancelledTitle,
        description: copy.cancelledDescription,
        variant: 'destructive',
      });
    }
  }, [copy.cancelledDescription, copy.cancelledTitle, copy.successDescription, copy.successTitle, searchParams, toast]);

  const handleUpgrade = async (tierId: string) => {
    if (tierId === 'FREE') return;

    if (tierId === 'ENTERPRISE') {
      // For enterprise, redirect to contact form
      window.location.assign(`mailto:enterprise@trainomics.app?subject=${encodeURIComponent(copy.enterpriseSubject)}`);
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
        window.location.assign(data.url);
      } else {
        toast({
          title: copy.errorTitle,
          description: data.error || copy.checkoutError,
          variant: 'destructive',
        });
      }
    } catch (_error) {
      toast({
        title: copy.errorTitle,
        description: copy.checkoutError,
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
        window.location.assign(data.url);
      } else {
        toast({
          title: copy.errorTitle,
          description: data.error || copy.portalError,
          variant: 'destructive',
        });
      }
    } catch (_error) {
      toast({
        title: copy.errorTitle,
        description: copy.portalError,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const getPrice = (tier: (typeof TIER_META)[number]) => {
    if (tier.price === null) return null;
    if (billingCycle === 'YEARLY' && tier.yearlyPrice) {
      return tier.yearlyPrice;
    }
    return tier.price;
  };

  const getCurrentTierInfo = () => {
    return TIER_META.find((t) => t.id === currentTier) || TIER_META[0];
  };

  const currentTierInfo = getCurrentTierInfo();

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
            <h1 className="text-lg font-semibold">{copy.pageTitle}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Current Plan Summary */}
        <RolePanel>
          <div className="border-b border-zinc-200 p-5 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  {copy.currentPlan}
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
                    {copy.tiers[currentTierInfo.id].name}
                  </Badge>
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {currentTier === 'FREE'
                    ? copy.upgradePrompt
                    : copy.renewsAutomatically}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {currentAthleteCount} / {currentTierInfo.maxAthletes === -1 ? '∞' : currentTierInfo.maxAthletes} {copy.athletes}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {subscription?.stripeSubscriptionId && (
            <div className="p-5">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleManageSubscription} disabled={isLoading === 'manage'} className="border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">
                  {isLoading === 'manage' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {copy.managePayment}
                </Button>
                {subscription.stripeCurrentPeriodEnd && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {copy.nextInvoice}:{' '}
                    {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString(localeConfig.date)}
                  </span>
                )}
              </div>
            </div>
          )}
        </RolePanel>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-xl p-1 border border-slate-200/50 dark:border-white/10 inline-flex items-center gap-2">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'MONTHLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {copy.monthly}
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'YEARLY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {copy.yearly}
            </button>
            {billingCycle === 'YEARLY' && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 ml-1">
                {copy.saveYearly}
              </Badge>
            )}
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIER_META.map((tier) => {
            const isActive = currentTier === tier.id;
            const Icon = tier.icon;
            const price = getPrice(tier);
            const tierCopy = copy.tiers[tier.id];
            const canUpgrade = TIER_META.findIndex((t) => t.id === tier.id) > TIER_META.findIndex((t) => t.id === currentTier);

            return (
              <RolePanel
                key={tier.id}
                className={`relative ${isActive ? 'ring-2 ring-blue-500' : ''}`}
              >
                {tier.popular && !isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-md font-semibold">
                      {copy.popular}
                    </span>
                  </div>
                )}

                <div className="border-b border-zinc-200 p-5 pb-3 text-center dark:border-white/10">
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
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{tierCopy.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{tierCopy.description}</p>
                </div>

                <div className="p-5 text-center">
                  <div className="mb-4">
                    {price !== null ? (
                      <>
                        <span className="text-3xl font-bold">{price.toLocaleString(localeConfig.number)}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">
                          {' '}
                          SEK/{billingCycle === 'MONTHLY' ? copy.monthShort : copy.yearShort}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-semibold text-slate-500 dark:text-slate-400">{copy.contactUs}</span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    {tier.maxAthletes === -1 ? copy.unlimitedAthletes : copy.upToAthletes(tier.maxAthletes)}
                  </div>

                  <ul className="text-xs text-left space-y-1.5 mb-6 text-slate-700 dark:text-slate-300">
                    {tierCopy.features.slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {tierCopy.features.length > 5 && (
                      <li className="text-slate-500 dark:text-slate-450">{copy.moreFeatures(tierCopy.features.length - 5)}</li>
                    )}
                  </ul>

                  {isActive ? (
                    <Button variant="outline" className="w-full border-slate-200 dark:border-white/10" disabled size="sm">
                      {copy.currentPlanButton}
                    </Button>
                  ) : tier.id === 'FREE' ? (
                    <Button variant="outline" className="w-full border-slate-200 dark:border-white/10" disabled size="sm">
                      {copy.freeVersion}
                    </Button>
                  ) : tier.id === 'ENTERPRISE' ? (
                    <Button
                      variant="outline"
                      className="w-full border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                      onClick={() => handleUpgrade(tier.id)}
                      size="sm"
                    >
                      {copy.contactUs}
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
                      {copy.upgrade}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full border-slate-200 dark:border-white/10" disabled size="sm">
                      {copy.lowerPlan}
                    </Button>
                  )}
                </div>
              </RolePanel>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <RolePanel>
          <div className="border-b border-zinc-200 p-5 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy.compareTitle}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{copy.compareDescription}</p>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-white/10">
                    <th className="text-left py-3 px-2">{copy.feature}</th>
                    {TIER_META.map((tier) => (
                      <th key={tier.id} className="text-center py-3 px-2">
                        {copy.tiers[tier.id].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/10">
                  <FeatureRow
                    icon={<Users className="h-4 w-4" />}
                    name={copy.maxAthletes}
                    values={['1', '20', '100', '∞']}
                  />
                  <FeatureRow
                    icon={<FileText className="h-4 w-4" />}
                    name={copy.testReports}
                    values={[copy.basic, copy.all, copy.allWhiteLabel, copy.allCustom]}
                  />
                  <FeatureRow
                    icon={<Bot className="h-4 w-4" />}
                    name={copy.aiProgramming}
                    values={[false, copy.basic, copy.full, copy.fullCustom]}
                  />
                  <FeatureRow
                    icon={<Video className="h-4 w-4" />}
                    name={copy.videoAnalysis}
                    values={[false, false, true, true]}
                  />
                  <FeatureRow
                    icon={<BarChart3 className="h-4 w-4" />}
                    name={copy.advancedAnalytics}
                    values={[false, false, true, true]}
                  />
                  <FeatureRow
                    icon={<Sparkles className="h-4 w-4" />}
                    name={copy.apiAccess}
                    values={[false, false, copy.limited, copy.full]}
                  />
                  <FeatureRow
                    icon={<Headphones className="h-4 w-4" />}
                    name={copy.support}
                    values={[copy.email, copy.email, copy.priority, copy.dedicated]}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </RolePanel>

        {/* FAQ */}
        <RolePanel>
          <div className="border-b border-zinc-200 p-5 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy.faqTitle}</h2>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <h4 className="font-semibold">{copy.faqChangePlan}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.faqChangePlanAnswer}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">{copy.faqMoreAthletes}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.faqMoreAthletesAnswer}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">{copy.faqPayments}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.faqPaymentsAnswer}
              </p>
            </div>
          </div>
        </RolePanel>
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
              <Check className="h-4 w-4 text-emerald-500 mx-auto" />
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
