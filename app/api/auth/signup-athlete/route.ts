/**
 * Direct Athlete Signup API
 *
 * POST /api/auth/signup-athlete - Create athlete account without coach
 *
 * This endpoint allows athletes to create their own account directly,
 * bypassing the traditional coach-onboarded flow. Creates:
 * - User account (ATHLETE role)
 * - Client record (isDirect: true)
 * - Free tier AthleteSubscription
 * - SportProfile for onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimitJsonResponse, getRequestIp } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'
import { createCheckoutSession } from '@/lib/payments/stripe'

// Validation schema for athlete signup
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  birthDate: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  // Optional invitation code
  inviteCode: z.string().optional(),
  // AI-coached mode - athlete uses AI as primary coach
  aiCoached: z.boolean().optional(),
  // Desired subscription tier (default: FREE)
  tier: z.enum(['FREE', 'STANDARD', 'PRO']).optional().default('FREE'),
});

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Strict rate limit for signup attempts per IP
    // 5 attempts per hour to prevent abuse
    const ip = getRequestIp(request)
    const rateLimited = await rateLimitJsonResponse('auth:signup-athlete', ip, {
      limit: 5,
      windowSeconds: 3600, // 1 hour
    })
    if (rateLimited) return rateLimited

    const body = await request.json();

    // Validate input
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, birthDate, gender, inviteCode, aiCoached, tier } = validationResult.data;

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Validate invitation code if provided
    let invitation = null;
    if (inviteCode) {
      invitation = await prisma.invitation.findUnique({
        where: { code: inviteCode },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: 'Invalid invitation code' },
          { status: 400 }
        );
      }

      if (invitation.type !== 'ATHLETE_SIGNUP' && invitation.type !== 'REFERRAL') {
        return NextResponse.json(
          { error: 'This invitation code is not valid for signup' },
          { status: 400 }
        );
      }

      // Check if expired or used
      const now = new Date();
      if (invitation.expiresAt && invitation.expiresAt < now) {
        return NextResponse.json(
          { error: 'Invitation code has expired' },
          { status: 400 }
        );
      }

      if (invitation.currentUses >= invitation.maxUses) {
        return NextResponse.json(
          { error: 'Invitation code has already been used' },
          { status: 400 }
        );
      }
    }

    // Create Supabase auth user
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'ATHLETE',
        },
      },
    });

    if (authError || !authData.user) {
      logger.error('Supabase auth error during athlete signup', {}, authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // Create user and client records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user record
      const user = await tx.user.create({
        data: {
          id: authData.user!.id,
          email,
          name,
          role: 'ATHLETE',
        },
      });

      // Create client record (direct signup)
      const client = await tx.client.create({
        data: {
          userId: user.id,
          name,
          email,
          gender: gender || 'MALE',
          birthDate: birthDate ? new Date(birthDate) : new Date('1990-01-01'),
          height: 170, // Default values, will be updated during onboarding
          weight: 70,
          isDirect: true,
          isAICoached: aiCoached || false,
        },
      });

      // SECURITY: All signups start with FREE tier
      // PRO/AI features require payment verification - aiCoached flag from request is IGNORED
      // This prevents tier bypass where users could self-select PRO without paying
      const subscription = await tx.athleteSubscription.create({
        data: {
          clientId: client.id,
          tier: 'FREE', // Always start FREE - upgrade requires payment
          status: 'ACTIVE',
          paymentSource: 'DIRECT',
          // All premium features disabled by default - require subscription upgrade
          aiChatEnabled: false,
          videoAnalysisEnabled: false,
          garminEnabled: false,
          stravaEnabled: false,
        },
      });

      // Agent preferences created with minimal defaults
      // Full AI coaching features enabled after subscription upgrade
      await tx.agentPreferences.create({
        data: {
          clientId: client.id,
          autonomyLevel: 'ADVISORY', // Advisory only until subscription upgrade
          allowWorkoutModification: false,
          allowRestDayInjection: false,
          maxIntensityReduction: 10,
          dailyBriefingEnabled: false,
          proactiveNudgesEnabled: false,
        },
      });

      // Create sport profile for onboarding
      const sportProfile = await tx.sportProfile.create({
        data: {
          clientId: client.id,
          primarySport: 'RUNNING', // Default, will be updated in onboarding
          onboardingCompleted: false,
          onboardingStep: 0,
        },
      });

      // Create athlete account link
      const athleteAccount = await tx.athleteAccount.create({
        data: {
          userId: user.id,
          clientId: client.id,
        },
      });

      // If invitation was used, update it
      if (invitation) {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            currentUses: { increment: 1 },
            usedAt: invitation.currentUses === 0 ? new Date() : invitation.usedAt,
            usedByClientId: client.id,
          },
        });
      }

      return {
        user,
        client,
        subscription,
        sportProfile,
        athleteAccount,
      };
    });

    // For paid tiers, create Stripe checkout session and redirect there
    let redirectUrl = '/athlete/onboarding'

    if (tier && tier !== 'FREE') {
      try {
        const origin = request.headers.get('origin') || 'http://localhost:3000'
        const checkoutUrl = await createCheckoutSession(
          result.client.id,
          tier,
          'MONTHLY',
          `${origin}/athlete/onboarding?upgraded=true`,
          `${origin}/athlete/onboarding`,
        )
        redirectUrl = checkoutUrl
      } catch (stripeError) {
        // If Stripe checkout fails, still let them in with FREE tier
        logger.error('Stripe checkout creation failed during signup', {}, stripeError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        client: {
          id: result.client.id,
          name: result.client.name,
          isDirect: result.client.isDirect,
        },
        subscription: {
          id: result.subscription.id,
          tier: result.subscription.tier,
        },
        needsOnboarding: true,
        redirectUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Athlete signup error', {}, error)

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
