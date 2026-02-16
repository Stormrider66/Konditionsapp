/**
 * Revenue Sharing Utilities
 *
 * Handles revenue share calculations between businesses and platform
 * when athletes are onboarded via a business.
 */

import { prisma } from '@/lib/prisma';
import { PaymentSource } from '@prisma/client';

export interface RevenueBreakdown {
  totalAmount: number;
  platformAmount: number;
  businessAmount: number;
  platformPercent: number;
  businessPercent: number;
}

/**
 * Calculate revenue split for a subscription payment
 *
 * @param totalAmount - Total payment amount in SEK
 * @param businessId - Business ID if athlete came via business
 * @param customRevenueShare - Custom platform share % (overrides business default)
 */
export async function calculateRevenueSplit(
  totalAmount: number,
  businessId?: string,
  customRevenueShare?: number
): Promise<RevenueBreakdown> {
  // If no business, 100% goes to platform
  if (!businessId) {
    return {
      totalAmount,
      platformAmount: totalAmount,
      businessAmount: 0,
      platformPercent: 100,
      businessPercent: 0,
    };
  }

  // Get business revenue share settings
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    return {
      totalAmount,
      platformAmount: totalAmount,
      businessAmount: 0,
      platformPercent: 100,
      businessPercent: 0,
    };
  }

  // Use custom share or business default
  const platformPercent = customRevenueShare ?? business.defaultRevenueShare;
  const businessPercent = 100 - platformPercent;

  const platformAmount = Math.round((totalAmount * platformPercent) / 100);
  const businessAmount = totalAmount - platformAmount;

  return {
    totalAmount,
    platformAmount,
    businessAmount,
    platformPercent,
    businessPercent,
  };
}

/**
 * Get revenue statistics for a business
 */
export async function getBusinessRevenueStats(
  businessId: string,
  startDate?: Date,
  endDate?: Date
) {
  const whereClause: any = {
    businessId,
    paymentSource: PaymentSource.BUSINESS,
    status: 'ACTIVE',
  };

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  const subscriptions = await prisma.athleteSubscription.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Calculate totals (this is simplified - real implementation would use actual payments)
  const tierPrices = {
    FREE: 0,
    STANDARD: 199,
    PRO: 399,
    ELITE: 399,
  };

  let totalRevenue = 0;
  let platformRevenue = 0;
  let businessRevenue = 0;

  for (const sub of subscriptions) {
    const monthlyPrice = tierPrices[sub.tier];
    const breakdown = await calculateRevenueSplit(
      monthlyPrice,
      businessId,
      sub.revenueSharePercent ?? undefined
    );

    totalRevenue += breakdown.totalAmount;
    platformRevenue += breakdown.platformAmount;
    businessRevenue += breakdown.businessAmount;
  }

  return {
    activeSubscriptions: subscriptions.length,
    tierBreakdown: {
      FREE: subscriptions.filter((s) => s.tier === 'FREE').length,
      STANDARD: subscriptions.filter((s) => s.tier === 'STANDARD').length,
      PRO: subscriptions.filter((s) => s.tier === 'PRO').length,
      ELITE: subscriptions.filter((s) => s.tier === 'ELITE').length,
    },
    monthlyRevenue: {
      total: totalRevenue,
      platform: platformRevenue,
      business: businessRevenue,
    },
    athletes: subscriptions.map((s) => ({
      id: s.client.id,
      name: s.client.name,
      tier: s.tier,
      status: s.status,
      createdAt: s.createdAt,
    })),
  };
}

/**
 * Update revenue share percentage for a specific athlete subscription
 */
export async function updateAthleteRevenueShare(
  clientId: string,
  newRevenueSharePercent: number
): Promise<void> {
  await prisma.athleteSubscription.update({
    where: { clientId },
    data: {
      revenueSharePercent: newRevenueSharePercent,
    },
  });
}

/**
 * Update default revenue share for a business
 */
export async function updateBusinessDefaultRevenueShare(
  businessId: string,
  newDefaultPercent: number
): Promise<void> {
  await prisma.business.update({
    where: { id: businessId },
    data: {
      defaultRevenueShare: newDefaultPercent,
    },
  });
}

/**
 * Transfer athlete from direct to business (or vice versa)
 */
export async function transferAthletePaymentSource(
  clientId: string,
  newPaymentSource: PaymentSource,
  businessId?: string,
  revenueSharePercent?: number
): Promise<void> {
  const updateData: any = {
    paymentSource: newPaymentSource,
  };

  if (newPaymentSource === PaymentSource.BUSINESS) {
    if (!businessId) {
      throw new Error('businessId required when transferring to BUSINESS payment source');
    }
    updateData.businessId = businessId;
    updateData.revenueSharePercent = revenueSharePercent;
  } else {
    // Direct payment - remove business association
    updateData.businessId = null;
    updateData.revenueSharePercent = null;
  }

  await prisma.athleteSubscription.update({
    where: { clientId },
    data: updateData,
  });
}
