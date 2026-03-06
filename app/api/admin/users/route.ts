// app/api/admin/users/route.ts
// Admin API for user management

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { parsePagination } from '@/lib/utils/parse';
import { logRoleChange, logAuditEvent, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit/log';
import { ATHLETE_TIER_FEATURES } from '@/lib/subscription/feature-access';
import { z } from 'zod';
import { ensureAthleteClientDefaultsTx } from '@/lib/user-provisioning';

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

async function ensureAthleteRoleDependenciesTx(
  tx: Prisma.TransactionClient,
  user: {
    id: string
    name: string
    email: string
    selfAthleteClientId: string | null
  }
): Promise<string> {
  const existingAccount = await tx.athleteAccount.findUnique({
    where: { userId: user.id },
    select: { clientId: true },
  });

  let clientId = existingAccount?.clientId ?? null;

  if (!clientId && user.selfAthleteClientId) {
    const selfAthleteClient = await tx.client.findUnique({
      where: { id: user.selfAthleteClientId },
      select: { id: true },
    });
    clientId = selfAthleteClient?.id ?? null;
  }

  if (!clientId) {
    const existingClient = await tx.client.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    clientId = existingClient?.id ?? null;
  }

  if (!clientId) {
    const membership = await tx.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { businessId: true },
    });

    const createdClient = await tx.client.create({
      data: {
        userId: user.id,
        businessId: membership?.businessId ?? null,
        name: user.name,
        email: user.email,
        gender: 'MALE',
        birthDate: new Date('1990-01-01'),
        height: 170,
        weight: 70,
        isDirect: true,
      },
      select: { id: true },
    });

    clientId = createdClient.id;
  }

  if (!existingAccount) {
    await tx.athleteAccount.create({
      data: {
        userId: user.id,
        clientId,
      },
    });
  }

  await ensureAthleteClientDefaultsTx(tx, clientId);

  const athleteSubscription = await tx.athleteSubscription.findUnique({
    where: { clientId },
    select: { id: true },
  });

  if (!athleteSubscription) {
    await tx.athleteSubscription.create({
      data: {
        clientId,
        paymentSource: 'DIRECT',
        ...getAthleteSubscriptionUpdateData('FREE'),
      },
    });
  }

  return clientId;
}

async function ensureCoachRoleDependenciesTx(
  tx: Prisma.TransactionClient,
  userId: string,
  tier?: CoachTierValue
): Promise<void> {
  const existingSubscription = await tx.subscription.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!existingSubscription) {
    const nextTier = tier ?? 'FREE';
    await tx.subscription.create({
      data: {
        userId,
        tier: nextTier,
        maxAthletes: getCoachMaxAthletes(nextTier),
        status: 'ACTIVE',
      },
    });
    return;
  }

  if (!tier) {
    return;
  }

  await tx.subscription.update({
    where: { userId },
    data: {
      tier,
      maxAthletes: getCoachMaxAthletes(tier),
    },
  });
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
        id: true,
        email: true,
        name: true,
        role: true,
        adminRole: true,
        selfAthleteClientId: true,
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

    const nextRole = role ?? targetUser.role;

    if (tier) {
      if (nextRole === 'ATHLETE' && !isAthleteTier(tier)) {
        return NextResponse.json(
          { success: false, error: 'Invalid athlete tier' },
          { status: 400 }
        );
      }

      if (nextRole !== 'ATHLETE' && !isCoachTier(tier)) {
        return NextResponse.json(
          { success: false, error: 'Invalid coach tier' },
          { status: 400 }
        );
      }
    }

    const oldTier = nextRole === 'ATHLETE'
      ? targetUser.athleteAccount?.client?.athleteSubscription?.tier
      : targetUser.subscription?.tier;

    await prisma.$transaction(async (tx) => {
      if (nextRole === 'ATHLETE') {
        const clientId = await ensureAthleteRoleDependenciesTx(tx, {
          id: userId,
          name: targetUser.name,
          email: targetUser.email,
          selfAthleteClientId: targetUser.selfAthleteClientId,
        });

        if (tier && isAthleteTier(tier)) {
          await tx.athleteSubscription.upsert({
            where: { clientId },
            update: getAthleteSubscriptionUpdateData(tier),
            create: {
              clientId,
              paymentSource: 'DIRECT',
              ...getAthleteSubscriptionUpdateData(tier),
            },
          });
        }
      } else if (role || tier) {
        await ensureCoachRoleDependenciesTx(
          tx,
          userId,
          tier && isCoachTier(tier) ? tier : undefined
        );
      }

      if (role && role !== targetUser.role) {
        await tx.user.update({
          where: { id: userId },
          data: { role },
        });
      }

      if (adminRole !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { adminRole },
        });
      }
    });

    if (role && role !== targetUser.role) {
      await logRoleChange(
        adminUser.id,
        userId,
        targetUser.role,
        role,
        request
      );
    }

    if (adminRole !== undefined && adminRole !== targetUser.adminRole) {
      await logAuditEvent({
        action: 'USER_ROLE_CHANGE',
        userId: adminUser.id,
        targetId: userId,
        targetType: 'User',
        oldValue: { adminRole: targetUser.adminRole },
        newValue: { adminRole },
        ipAddress: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
      });
    }

    if (tier && tier !== oldTier) {
      await logAuditEvent({
        action: 'SUBSCRIPTION_CHANGE',
        userId: adminUser.id,
        targetId: userId,
        targetType: nextRole === 'ATHLETE' ? 'AthleteSubscription' : 'Subscription',
        oldValue: { tier: oldTier },
        newValue: { tier },
        ipAddress: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
      });
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
