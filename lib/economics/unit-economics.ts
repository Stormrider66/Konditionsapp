import { subDays, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';

const DEFAULT_USD_TO_SEK = 9.2;
const DAYS_IN_MONTH = 30;

export interface UnitEconomicsAssumptions {
  usdToSek: number;
  fixedInfraSekPerMonth: number;
  variableInfraSekPerActiveUser: number;
  paymentFeePercent: number;
  paymentFixedFeeSek: number;
  supportMinutesPerTicket: number;
  onboardingHoursPerNewPaidCustomer: number;
  internalHourlyCostSek: number;
}

export interface UnitEconomicsSummary {
  period: {
    start: string;
    end: string;
    days: number;
  };
  assumptions: UnitEconomicsAssumptions;
  revenue: {
    grossMrrSek: number;
    platformMrrSek: number;
    coachMrrSek: number;
    athleteGrossMrrSek: number;
    athletePlatformMrrSek: number;
    enterpriseMrrSek: number;
    arpaSek: number;
    revenuePerCoachSek: number;
    revenuePerAthleteSek: number;
  };
  costs: {
    aiCostSekMonthlyized: number;
    operatorAgentCostSekMonthlyized: number;
    paymentFeesSek: number;
    fixedInfraSek: number;
    variableInfraSek: number;
    supportCostSekMonthlyized: number;
    onboardingCostSekMonthlyized: number;
    directCostSek: number;
    operatingLoadSek: number;
  };
  margins: {
    grossMarginPercent: number;
    contributionMarginPercent: number;
    grossProfitSek: number;
    contributionProfitSek: number;
  };
  customers: {
    activePaidCoachSubscriptions: number;
    activePaidAthleteSubscriptions: number;
    activeEnterpriseContracts: number;
    activeRevenueAccounts: number;
    totalUsers: number;
    totalAthletes: number;
    newPaidCustomersThisPeriod: number;
    cancelledSubscriptionsThisPeriod: number;
    estimatedLogoChurnPercent: number;
  };
  usage: {
    aiRequests: number;
    aiCostSek: number;
    aiCostPerActiveRevenueAccountSek: number;
    aiCostPerActiveUserSek: number;
    supportTicketsThisPeriod: number;
    unresolvedSupportTickets: number;
  };
  segments: UnitEconomicsSegment[];
  topAiCostUsers: UnitEconomicsTopUser[];
  dataGaps: string[];
}

export interface UnitEconomicsSegment {
  segment: string;
  activeAccounts: number;
  mrrSek: number;
  aiCostSekMonthlyized: number;
  grossMarginPercent: number;
  revenuePerAccountSek: number;
  aiCostPerAccountSek: number;
}

export interface UnitEconomicsTopUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  segment: string;
  aiCostSek: number;
  tokens: number;
}

export async function getUnitEconomicsSummary(
  days: number,
  assumptions: Partial<UnitEconomicsAssumptions> = {}
): Promise<UnitEconomicsSummary> {
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.round(days), 1), 365) : 30;
  const resolvedAssumptions: UnitEconomicsAssumptions = {
    usdToSek: assumptions.usdToSek ?? DEFAULT_USD_TO_SEK,
    fixedInfraSekPerMonth: assumptions.fixedInfraSekPerMonth ?? 4000,
    variableInfraSekPerActiveUser: assumptions.variableInfraSekPerActiveUser ?? 3,
    paymentFeePercent: assumptions.paymentFeePercent ?? 1.5,
    paymentFixedFeeSek: assumptions.paymentFixedFeeSek ?? 1.8,
    supportMinutesPerTicket: assumptions.supportMinutesPerTicket ?? 15,
    onboardingHoursPerNewPaidCustomer: assumptions.onboardingHoursPerNewPaidCustomer ?? 1.5,
    internalHourlyCostSek: assumptions.internalHourlyCostSek ?? 700,
  };

  const startDate = startOfDay(subDays(new Date(), safeDays));
  const endDate = endOfDay(new Date());
  const monthlyize = (value: number) => (value / safeDays) * DAYS_IN_MONTH;

  const [
    pricingTiers,
    coachSubscriptions,
    athleteSubscriptions,
    enterpriseContracts,
    aiUsageLogs,
    operatorRuns,
    supportTicketsThisPeriod,
    unresolvedSupportTickets,
    totalUsers,
    totalAthletes,
    newPaidCoachSubscriptions,
    newPaidAthleteSubscriptions,
    cancelledCoachSubscriptions,
    cancelledAthleteSubscriptions,
  ] = await Promise.all([
    prisma.pricingTier.findMany({ where: { isActive: true } }),
    prisma.subscription.findMany({
      where: { status: 'ACTIVE', tier: { not: 'FREE' } },
      select: { tier: true, userId: true },
    }),
    prisma.athleteSubscription.findMany({
      where: { status: 'ACTIVE', tier: { not: 'FREE' } },
      select: {
        tier: true,
        paymentSource: true,
        revenueSharePercent: true,
        business: { select: { elitePriceMonthly: true, defaultRevenueShare: true } },
        client: { select: { userId: true } },
      },
    }),
    prisma.enterpriseContract.findMany({
      where: { status: 'ACTIVE' },
      select: { monthlyFee: true, currency: true },
    }),
    prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        userId: true,
        estimatedCost: true,
        inputTokens: true,
        outputTokens: true,
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            subscription: { select: { tier: true } },
            clients: {
              select: { athleteSubscription: { select: { tier: true } } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.operatorAgentRun.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { costUsd: true },
    }),
    prisma.supportTicket.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.user.count(),
    prisma.client.count(),
    prisma.subscription.count({
      where: {
        tier: { not: 'FREE' },
        status: 'ACTIVE',
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.athleteSubscription.count({
      where: {
        tier: { not: 'FREE' },
        status: 'ACTIVE',
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.subscription.count({
      where: {
        tier: { not: 'FREE' },
        status: { in: ['CANCELLED', 'EXPIRED'] },
        updatedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.athleteSubscription.count({
      where: {
        tier: { not: 'FREE' },
        status: { in: ['CANCELLED', 'EXPIRED'] },
        updatedAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const pricingByKey = new Map(
    pricingTiers.map((tier) => [`${tier.tierType}:${tier.tierName}`, tier])
  );

  const coachMrrSek = coachSubscriptions.reduce((sum, subscription) => {
    const tier = pricingByKey.get(`COACH:${subscription.tier}`);
    return sum + centsToSek(tier?.monthlyPriceCents ?? 0);
  }, 0);

  const athleteRevenue = athleteSubscriptions.reduce(
    (acc, subscription) => {
      const tier = pricingByKey.get(`ATHLETE:${subscription.tier}`);
      const elitePrice = subscription.tier === 'ELITE'
        ? subscription.business?.elitePriceMonthly
        : null;
      const grossSek = centsToSek(elitePrice ?? tier?.monthlyPriceCents ?? 0);
      const platformShare = subscription.paymentSource === 'BUSINESS'
        ? (subscription.revenueSharePercent ?? subscription.business?.defaultRevenueShare ?? 20) / 100
        : 1;

      acc.gross += grossSek;
      acc.platform += grossSek * platformShare;
      return acc;
    },
    { gross: 0, platform: 0 }
  );

  const enterpriseMrrSek = enterpriseContracts.reduce((sum, contract) => {
    if (contract.currency !== 'SEK') return sum;
    return sum + contract.monthlyFee;
  }, 0);

  const platformMrrSek = coachMrrSek + athleteRevenue.platform + enterpriseMrrSek;
  const grossMrrSek = coachMrrSek + athleteRevenue.gross + enterpriseMrrSek;
  const activeRevenueAccounts =
    coachSubscriptions.length + athleteSubscriptions.length + enterpriseContracts.length;

  const aiCostUsd = aiUsageLogs.reduce((sum, log) => sum + log.estimatedCost, 0);
  const aiCostSek = aiCostUsd * resolvedAssumptions.usdToSek;
  const aiCostSekMonthlyized = monthlyize(aiCostSek);
  const operatorAgentCostSekMonthlyized = monthlyize(
    operatorRuns.reduce((sum, run) => sum + run.costUsd, 0) * resolvedAssumptions.usdToSek
  );

  const paymentFeeBaseAccounts = coachSubscriptions.length + athleteSubscriptions.length;
  const paymentFeesSek =
    platformMrrSek * (resolvedAssumptions.paymentFeePercent / 100) +
    paymentFeeBaseAccounts * resolvedAssumptions.paymentFixedFeeSek;
  const variableInfraSek = totalUsers * resolvedAssumptions.variableInfraSekPerActiveUser;
  const supportCostSekMonthlyized = monthlyize(
    (supportTicketsThisPeriod * resolvedAssumptions.supportMinutesPerTicket / 60) *
    resolvedAssumptions.internalHourlyCostSek
  );
  const newPaidCustomersThisPeriod = newPaidCoachSubscriptions + newPaidAthleteSubscriptions;
  const onboardingCostSekMonthlyized = monthlyize(
    newPaidCustomersThisPeriod *
    resolvedAssumptions.onboardingHoursPerNewPaidCustomer *
    resolvedAssumptions.internalHourlyCostSek
  );
  const directCostSek =
    aiCostSekMonthlyized +
    operatorAgentCostSekMonthlyized +
    paymentFeesSek +
    resolvedAssumptions.fixedInfraSekPerMonth +
    variableInfraSek;
  const operatingLoadSek = directCostSek + supportCostSekMonthlyized + onboardingCostSekMonthlyized;
  const grossProfitSek = platformMrrSek - directCostSek;
  const contributionProfitSek = platformMrrSek - operatingLoadSek;

  const segments = buildSegments({
    pricingByKey,
    coachSubscriptions,
    athleteSubscriptions,
    enterpriseMrrSek,
    enterpriseCount: enterpriseContracts.length,
    aiUsageLogs,
    usdToSek: resolvedAssumptions.usdToSek,
    monthlyize,
  });

  const topAiCostUsers = buildTopAiCostUsers(aiUsageLogs, resolvedAssumptions.usdToSek);
  const cancelledSubscriptionsThisPeriod = cancelledCoachSubscriptions + cancelledAthleteSubscriptions;

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days: safeDays,
    },
    assumptions: resolvedAssumptions,
    revenue: {
      grossMrrSek: roundSek(grossMrrSek),
      platformMrrSek: roundSek(platformMrrSek),
      coachMrrSek: roundSek(coachMrrSek),
      athleteGrossMrrSek: roundSek(athleteRevenue.gross),
      athletePlatformMrrSek: roundSek(athleteRevenue.platform),
      enterpriseMrrSek: roundSek(enterpriseMrrSek),
      arpaSek: activeRevenueAccounts > 0 ? roundSek(platformMrrSek / activeRevenueAccounts) : 0,
      revenuePerCoachSek: coachSubscriptions.length > 0 ? roundSek(coachMrrSek / coachSubscriptions.length) : 0,
      revenuePerAthleteSek: athleteSubscriptions.length > 0 ? roundSek(athleteRevenue.platform / athleteSubscriptions.length) : 0,
    },
    costs: {
      aiCostSekMonthlyized: roundSek(aiCostSekMonthlyized),
      operatorAgentCostSekMonthlyized: roundSek(operatorAgentCostSekMonthlyized),
      paymentFeesSek: roundSek(paymentFeesSek),
      fixedInfraSek: roundSek(resolvedAssumptions.fixedInfraSekPerMonth),
      variableInfraSek: roundSek(variableInfraSek),
      supportCostSekMonthlyized: roundSek(supportCostSekMonthlyized),
      onboardingCostSekMonthlyized: roundSek(onboardingCostSekMonthlyized),
      directCostSek: roundSek(directCostSek),
      operatingLoadSek: roundSek(operatingLoadSek),
    },
    margins: {
      grossMarginPercent: percent(platformMrrSek, grossProfitSek),
      contributionMarginPercent: percent(platformMrrSek, contributionProfitSek),
      grossProfitSek: roundSek(grossProfitSek),
      contributionProfitSek: roundSek(contributionProfitSek),
    },
    customers: {
      activePaidCoachSubscriptions: coachSubscriptions.length,
      activePaidAthleteSubscriptions: athleteSubscriptions.length,
      activeEnterpriseContracts: enterpriseContracts.length,
      activeRevenueAccounts,
      totalUsers,
      totalAthletes,
      newPaidCustomersThisPeriod,
      cancelledSubscriptionsThisPeriod,
      estimatedLogoChurnPercent: percent(
        activeRevenueAccounts + cancelledSubscriptionsThisPeriod,
        cancelledSubscriptionsThisPeriod
      ),
    },
    usage: {
      aiRequests: aiUsageLogs.length,
      aiCostSek: roundSek(aiCostSek),
      aiCostPerActiveRevenueAccountSek: activeRevenueAccounts > 0
        ? roundSek(aiCostSekMonthlyized / activeRevenueAccounts)
        : 0,
      aiCostPerActiveUserSek: totalUsers > 0 ? roundSek(aiCostSekMonthlyized / totalUsers) : 0,
      supportTicketsThisPeriod,
      unresolvedSupportTickets,
    },
    segments,
    topAiCostUsers,
    dataGaps: [
      'Subscription rows do not store actual Stripe invoice amounts, discounts, refunds, VAT, or billing interval, so MRR uses active pricing tiers as the default estimate.',
      'Infrastructure and support costs are assumptions until Vercel, Supabase, Resend, storage, and founder/support time are imported as real monthly expenses.',
      'Onboarding time is estimated from new paid customers; add a tracked onboarding workflow to replace this with actual time spent.',
      'Enterprise contracts in non-SEK currencies are excluded from MRR until currency conversion is added.',
    ],
  };
}

function buildSegments({
  pricingByKey,
  coachSubscriptions,
  athleteSubscriptions,
  enterpriseMrrSek,
  enterpriseCount,
  aiUsageLogs,
  usdToSek,
  monthlyize,
}: {
  pricingByKey: Map<string, { monthlyPriceCents: number }>;
  coachSubscriptions: Array<{ tier: string; userId: string }>;
  athleteSubscriptions: Array<{
    tier: string;
    paymentSource: string;
    revenueSharePercent: number | null;
    business: { elitePriceMonthly: number | null; defaultRevenueShare: number } | null;
    client: { userId: string };
  }>;
  enterpriseMrrSek: number;
  enterpriseCount: number;
  aiUsageLogs: Array<{
    userId: string;
    estimatedCost: number;
    user: {
      role: string;
      subscription: { tier: string } | null;
      clients: Array<{ athleteSubscription: { tier: string } | null }>;
    };
  }>;
  usdToSek: number;
  monthlyize: (value: number) => number;
}): UnitEconomicsSegment[] {
  const segments = new Map<string, { accounts: number; mrr: number; aiCost: number }>();

  for (const subscription of coachSubscriptions) {
    const segment = `Coach ${subscription.tier}`;
    const tier = pricingByKey.get(`COACH:${subscription.tier}`);
    addSegment(segments, segment, 1, centsToSek(tier?.monthlyPriceCents ?? 0), 0);
  }

  for (const subscription of athleteSubscriptions) {
    const segment = `Athlete ${subscription.tier}`;
    const tier = pricingByKey.get(`ATHLETE:${subscription.tier}`);
    const grossSek = centsToSek(
      subscription.tier === 'ELITE'
        ? subscription.business?.elitePriceMonthly ?? 0
        : tier?.monthlyPriceCents ?? 0
    );
    const platformShare = subscription.paymentSource === 'BUSINESS'
      ? (subscription.revenueSharePercent ?? subscription.business?.defaultRevenueShare ?? 20) / 100
      : 1;
    addSegment(segments, segment, 1, grossSek * platformShare, 0);
  }

  if (enterpriseCount > 0) {
    addSegment(segments, 'Enterprise', enterpriseCount, enterpriseMrrSek, 0);
  }

  for (const log of aiUsageLogs) {
    const segment = getUserSegment(log.user);
    const current = segments.get(segment) ?? { accounts: 0, mrr: 0, aiCost: 0 };
    current.aiCost += log.estimatedCost * usdToSek;
    segments.set(segment, current);
  }

  return Array.from(segments.entries())
    .map(([segment, value]) => {
      const monthlyAiCost = monthlyize(value.aiCost);
      const grossProfit = value.mrr - monthlyAiCost;
      return {
        segment,
        activeAccounts: value.accounts,
        mrrSek: roundSek(value.mrr),
        aiCostSekMonthlyized: roundSek(monthlyAiCost),
        grossMarginPercent: percent(value.mrr, grossProfit),
        revenuePerAccountSek: value.accounts > 0 ? roundSek(value.mrr / value.accounts) : 0,
        aiCostPerAccountSek: value.accounts > 0 ? roundSek(monthlyAiCost / value.accounts) : 0,
      };
    })
    .sort((a, b) => b.mrrSek - a.mrrSek);
}

function buildTopAiCostUsers(
  logs: Array<{
    userId: string;
    estimatedCost: number;
    inputTokens: number;
    outputTokens: number;
    user: {
      name: string;
      email: string;
      role: string;
      subscription: { tier: string } | null;
      clients: Array<{ athleteSubscription: { tier: string } | null }>;
    };
  }>,
  usdToSek: number
): UnitEconomicsTopUser[] {
  const users = new Map<string, UnitEconomicsTopUser>();

  for (const log of logs) {
    const existing = users.get(log.userId) ?? {
      userId: log.userId,
      name: log.user?.name ?? 'Unknown',
      email: log.user?.email ?? '',
      role: log.user?.role ?? 'UNKNOWN',
      segment: getUserSegment(log.user),
      aiCostSek: 0,
      tokens: 0,
    };

    existing.aiCostSek += log.estimatedCost * usdToSek;
    existing.tokens += log.inputTokens + log.outputTokens;
    users.set(log.userId, existing);
  }

  return Array.from(users.values())
    .map((user) => ({ ...user, aiCostSek: roundSek(user.aiCostSek) }))
    .sort((a, b) => b.aiCostSek - a.aiCostSek)
    .slice(0, 10);
}

function getUserSegment(user: {
  role: string;
  subscription: { tier: string } | null;
  clients: Array<{ athleteSubscription: { tier: string } | null }>;
} | null): string {
  if (!user) return 'Unknown';
  if (user.role === 'COACH') return `Coach ${user.subscription?.tier ?? 'FREE'}`;
  if (user.role === 'ATHLETE') {
    return `Athlete ${user.clients[0]?.athleteSubscription?.tier ?? 'FREE'}`;
  }
  return user.role;
}

function addSegment(
  segments: Map<string, { accounts: number; mrr: number; aiCost: number }>,
  segment: string,
  accounts: number,
  mrr: number,
  aiCost: number
) {
  const current = segments.get(segment) ?? { accounts: 0, mrr: 0, aiCost: 0 };
  current.accounts += accounts;
  current.mrr += mrr;
  current.aiCost += aiCost;
  segments.set(segment, current);
}

function centsToSek(cents: number): number {
  return cents / 100;
}

function roundSek(value: number): number {
  return Math.round(value);
}

function percent(total: number, part: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
