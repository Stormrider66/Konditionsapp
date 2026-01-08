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

// Validation schema for athlete signup
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  birthDate: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  // Optional invitation code
  inviteCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit signup attempts per IP
    const ip = getRequestIp(request)
    const rateLimited = await rateLimitJsonResponse('auth:signup-athlete', ip, {
      limit: 10,
      windowSeconds: 60,
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

    const { email, password, name, birthDate, gender, inviteCode } = validationResult.data;

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
        },
      });

      // Create free tier subscription
      const subscription = await tx.athleteSubscription.create({
        data: {
          clientId: client.id,
          tier: 'FREE',
          status: 'ACTIVE',
          paymentSource: 'DIRECT',
          aiChatEnabled: false,
          videoAnalysisEnabled: false,
          garminEnabled: false,
          stravaEnabled: false,
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

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
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
        redirectUrl: '/athlete/onboarding',
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
