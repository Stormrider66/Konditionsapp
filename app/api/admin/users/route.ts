// app/api/admin/users/route.ts
// Admin API for user management

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { parsePagination } from '@/lib/utils/parse';
import { logRoleChange, logAuditEvent, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit/log';
import { ATHLETE_TIER_FEATURES } from '@/lib/subscription/feature-access';
import { z } from 'zod';

const COACH_TIER_VALUES = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] as const;
const ATHLETE_TIER_VALUES = ['FREE', 'STANDARD', 'PRO', 'ELITE'] as const;

type CoachTierValue = typeof COACH_TIER_VALUES[number];
type AthleteTierValue = typeof ATHLETE_TIER_VALUES[number];

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['COACH', 'ATHLETE', 'ADMIN']).optional(),
  adminRole: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']).nullable().optional(),
  tier: z.enum(['FREE', 'BASIC', 'STANDARD', 'PRO', 'ELITE', 'ENTERPRISE']).optional(),
});

function isCoachTier(tier: string): tier is CoachTierValue {
  return COACH_TIER_VALUES.includes(tier as CoachTierValue);
}

function isAthleteTier(tier: string): tier is AthleteTierValue {
  return ATHLETE_TIER_VALUES.includes(tier as AthleteTierValue);
}

function getCoachMaxAthletes(tier: CoachTierValue): number {
  return {
    FREE: 1,
    BASIC: 20,
    PRO: 100,
    ENTERPRISE: -1,
  }[tier];
}

function getAthleteSubscriptionUpdateData(tier: AthleteTierValue) {
  const features = ATHLETE_TIER_FEATURES[tier];

  return {
    tier,
    status: 'ACTIVE' as const,
    trialEndsAt: null,
    aiChatEnabled: features.ai_chat.enabled,
    aiChatMessagesLimit: features.ai_chat.limit,
    videoAnalysisEnabled: features.video_analysis.enabled,
    garminEnabled: features.garmin.enabled,
    stravaEnabled: features.strava.enabled,
    workoutLoggingEnabled: tier !== 'FREE',
    dailyCheckInEnabled: tier !== 'FREE',
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(
      searchParams.get('page'),
      searchParams.get('limit'),
      { defaultLimit: 20, maxLimit: 100 }
    );
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const business = searchParams.get('business') || '';

    const where = {
      ...(search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
      ...(role ? { role: role as 'COACH' | 'ATHLETE' | 'ADMIN' } : {}),
      ...(business === 'NONE'
        ? { businessMemberships: { none: { isActive: true } } }
        : business
          ? { businessMemberships: { some: { businessId: business, isActive: true } } }
          : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminRole: true,
          language: true,
          createdAt: true,
          updatedAt: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              maxAthletes: true,
              stripeCurrentPeriodEnd: true,
            },
          },
          athleteAccount: {
            select: {
              clientId: true,
              client: {
                select: {
                  athleteSubscription: {
                    select: {
                      tier: true,
                      status: true,
                      trialEndsAt: true,
                    },
                  },
                },
              },
            },
          },
          businessMemberships: {
            select: {
              role: true,
              business: { select: { id: true, name: true, slug: true } },
            },
            where: { isActive: true },
          },
          _count: {
            select: {
              clients: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((user) => ({
          ...user,
          subscription: user.role === 'ATHLETE'
            ? user.athleteAccount?.client?.athleteSubscription
              ? {
                  tier: user.athleteAccount.client.athleteSubscription.tier,
                  status: user.athleteAccount.client.athleteSubscription.status,
                  maxAthletes: null,
                  stripeCurrentPeriodEnd: user.athleteAccount.client.athleteSubscription.trialEndsAt,
                }
              : null
            : user.subscription,
          clientsCount: user._count.clients,
          businesses: user.businessMemberships.map((m) => ({
            id: m.business.id,
            name: m.business.name,
            slug: m.business.slug,
            role: m.role,
          })),
          athleteAccount: undefined,
          businessMemberships: undefined,
          _count: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching users', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await requireAdmin();

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId, role, adminRole, tier } = validation.data;

    // Get current user state for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        adminRole: true,
        subscription: { select: { tier: true } },
        athleteAccount: {
          select: {
            clientId: true,
            client: {
              select: {
                athleteSubscription: { select: { tier: true } },
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user role if provided
    if (role && role !== targetUser.role) {
      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      // SECURITY: Log role change for audit trail
      await logRoleChange(
        adminUser.id,
        userId,
        targetUser.role,
        role,
        request
      );
    }

    // Update platform admin role if provided (including clearing it with null)
    if (adminRole !== undefined) {
      const oldAdminRole = targetUser.adminRole;
      await prisma.user.update({
        where: { id: userId },
        data: { adminRole },
      });

      if (adminRole !== oldAdminRole) {
        await logAuditEvent({
          action: 'USER_ROLE_CHANGE',
          userId: adminUser.id,
          targetId: userId,
          targetType: 'User',
          oldValue: { adminRole: oldAdminRole },
          newValue: { adminRole },
          ipAddress: getIpFromRequest(request),
          userAgent: getUserAgentFromRequest(request),
        });
      }
    }

    // Update subscription tier if provided
    if (tier) {
      if (targetUser.role === 'ATHLETE') {
        if (!isAthleteTier(tier)) {
          return NextResponse.json(
            { success: false, error: 'Invalid athlete tier' },
            { status: 400 }
          );
        }

        const clientId = targetUser.athleteAccount?.clientId;
        if (!clientId) {
          return NextResponse.json(
            { success: false, error: 'Athlete account not found for user' },
            { status: 400 }
          );
        }

        const oldTier = targetUser.athleteAccount?.client?.athleteSubscription?.tier;

        await prisma.athleteSubscription.upsert({
          where: { clientId },
          update: getAthleteSubscriptionUpdateData(tier),
          create: {
            clientId,
            paymentSource: 'DIRECT',
            ...getAthleteSubscriptionUpdateData(tier),
          },
        });

        if (tier !== oldTier) {
          await logAuditEvent({
            action: 'SUBSCRIPTION_CHANGE',
            userId: adminUser.id,
            targetId: userId,
            targetType: 'AthleteSubscription',
            oldValue: { tier: oldTier },
            newValue: { tier },
            ipAddress: getIpFromRequest(request),
            userAgent: getUserAgentFromRequest(request),
          });
        }
      } else {
        if (!isCoachTier(tier)) {
          return NextResponse.json(
            { success: false, error: 'Invalid coach tier' },
            { status: 400 }
          );
        }

        const oldTier = targetUser.subscription?.tier;
        const maxAthletes = getCoachMaxAthletes(tier);

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            tier,
            maxAthletes,
          },
          create: {
            userId,
            tier,
            maxAthletes,
            status: 'ACTIVE',
          },
        });

        // SECURITY: Log subscription tier change
        if (tier !== oldTier) {
          await logAuditEvent({
            action: 'SUBSCRIPTION_CHANGE',
            userId: adminUser.id,
            targetId: userId,
            targetType: 'Subscription',
            oldValue: { tier: oldTier },
            newValue: { tier },
            ipAddress: getIpFromRequest(request),
            userAgent: getUserAgentFromRequest(request),
          });
        }
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscription: {
          select: {
            tier: true,
            status: true,
            maxAthletes: true,
          },
        },
        athleteAccount: {
          select: {
            client: {
              select: {
                athleteSubscription: {
                  select: {
                    tier: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            subscription: updatedUser.role === 'ATHLETE'
              ? updatedUser.athleteAccount?.client?.athleteSubscription
                ? {
                    tier: updatedUser.athleteAccount.client.athleteSubscription.tier,
                    status: updatedUser.athleteAccount.client.athleteSubscription.status,
                    maxAthletes: null,
                  }
                : null
              : updatedUser.subscription,
          }
        : null,
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
