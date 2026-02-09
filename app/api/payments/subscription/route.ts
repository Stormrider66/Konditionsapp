/**
 * Subscription Status API
 *
 * GET /api/payments/subscription - Get current subscription status
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteClientId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'
import {
  checkAIAccess,
  checkVideoAccess,
  checkIntegrationAccess,
  getTierDisplayName,
  getTierPrice,
  getTierYearlyPrice,
} from '@/lib/auth/tier-utils';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId();
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, clientId } = resolved;

    const rateLimited = await rateLimitJsonResponse('payments:athlete:subscription', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get athlete's client record with subscription
    const clientWithSub = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteSubscription: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!clientWithSub) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      );
    }

    const subscription = clientWithSub.athleteSubscription;

    // If no subscription, return FREE tier
    if (!subscription) {
      return NextResponse.json({
        tier: 'FREE',
        tierDisplayName: 'Gratis',
        status: 'ACTIVE',
        paymentSource: 'DIRECT',
        features: {
          aiChat: { enabled: false, messagesUsed: 0, messagesLimit: 0, remainingMessages: 0 },
          videoAnalysis: false,
          stravaSync: false,
          garminSync: false,
          workoutLogging: false,
          dailyCheckIn: false,
        },
        billing: null,
        availableUpgrades: [
          {
            tier: 'STANDARD',
            name: getTierDisplayName('STANDARD'),
            monthlyPrice: getTierPrice('STANDARD'),
            yearlyPrice: getTierYearlyPrice('STANDARD'),
          },
          {
            tier: 'PRO',
            name: getTierDisplayName('PRO'),
            monthlyPrice: getTierPrice('PRO'),
            yearlyPrice: getTierYearlyPrice('PRO'),
          },
        ],
      });
    }

    // Get feature access
    const aiAccess = await checkAIAccess(clientId);
    const videoAccess = await checkVideoAccess(clientId);
    const stravaAccess = await checkIntegrationAccess(clientId, 'strava');
    const garminAccess = await checkIntegrationAccess(clientId, 'garmin');

    // Build available upgrades
    const availableUpgrades = [];
    if (subscription.tier === 'FREE') {
      availableUpgrades.push(
        {
          tier: 'STANDARD',
          name: getTierDisplayName('STANDARD'),
          monthlyPrice: getTierPrice('STANDARD'),
          yearlyPrice: getTierYearlyPrice('STANDARD'),
        },
        {
          tier: 'PRO',
          name: getTierDisplayName('PRO'),
          monthlyPrice: getTierPrice('PRO'),
          yearlyPrice: getTierYearlyPrice('PRO'),
        }
      );
    } else if (subscription.tier === 'STANDARD') {
      availableUpgrades.push({
        tier: 'PRO',
        name: getTierDisplayName('PRO'),
        monthlyPrice: getTierPrice('PRO'),
        yearlyPrice: getTierYearlyPrice('PRO'),
      });
    }

    return NextResponse.json({
      tier: subscription.tier,
      tierDisplayName: getTierDisplayName(subscription.tier),
      status: subscription.status,
      paymentSource: subscription.paymentSource,
      business: subscription.business
        ? {
            id: subscription.business.id,
            name: subscription.business.name,
          }
        : null,
      features: {
        aiChat: aiAccess,
        videoAnalysis: videoAccess,
        stravaSync: stravaAccess,
        garminSync: garminAccess,
        workoutLogging: subscription.workoutLoggingEnabled,
        dailyCheckIn: subscription.dailyCheckInEnabled,
      },
      billing: subscription.stripeSubscriptionId
        ? {
            billingCycle: subscription.billingCycle,
            hasStripeSubscription: true,
          }
        : null,
      trialEndsAt: subscription.trialEndsAt,
      availableUpgrades,
    });
  } catch (error) {
    logger.error('Get subscription error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
