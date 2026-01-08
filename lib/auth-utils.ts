// lib/auth-utils.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { User, UserRole } from '@/types'
import { redirect } from 'next/navigation'

/**
 * Get the currently authenticated user from Supabase session
 * Returns null if no user is authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return null
  }

  const email = supabaseUser.email || null

  // Prefer ID match (Supabase user id), fallback to email for legacy rows
  let user =
    (await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    })) ||
    (email
      ? await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            language: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : null)

  if (user) return user

  // Auto-create DB user row on first authenticated request.
  // This prevents flows (like signup/login) from depending on an insecure public endpoint.
  if (!email) {
    return null
  }

  const nameFromMetadata =
    (supabaseUser.user_metadata &&
      typeof supabaseUser.user_metadata === 'object' &&
      'name' in supabaseUser.user_metadata &&
      typeof (supabaseUser.user_metadata as any).name === 'string' &&
      ((supabaseUser.user_metadata as any).name as string).trim()) ||
    email.split('@')[0]

  user = await prisma.user.create({
    data: {
      id: supabaseUser.id,
      email,
      name: nameFromMetadata,
      role: 'COACH',
      language: 'sv',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

/**
 * Require a user to be authenticated and have a specific role
 * Redirects to login if not authenticated
 * Throws error if user doesn't have required role
 */
export async function requireRole(
  role: UserRole
): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== role && user.role !== 'ADMIN') {
    throw new Error(`Access denied. Required role: ${role}`)
  }

  return user
}

/**
 * Require user to be a COACH or ADMIN
 */
export async function requireCoach(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'COACH' && user.role !== 'ADMIN') {
    throw new Error('Access denied. Coach access required.')
  }

  return user
}

/**
 * Require user to be an ATHLETE
 */
export async function requireAthlete(): Promise<User> {
  return requireRole('ATHLETE')
}

/**
 * Require user to be an ADMIN
 */
export async function requireAdmin(): Promise<User> {
  return requireRole('ADMIN')
}

/**
 * Check if user is authenticated
 * Does not throw or redirect, just returns boolean
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === role || user?.role === 'ADMIN'
}

/**
 * Check if current user can access a training program
 * Coaches can access programs they created
 * Athletes can access programs assigned to them (via their client record)
 * Admins can access all programs
 */
export async function canAccessProgram(
  userId: string,
  programId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athleteAccount: {
        include: {
          client: {
            include: {
              trainingPrograms: {
                where: { id: programId },
              },
            },
          },
        },
      },
    },
  })

  if (!user) return false

  // Admins can access everything
  if (user.role === 'ADMIN') return true

  // Coaches can access programs they created
  if (user.role === 'COACH') {
    const program = await prisma.trainingProgram.findFirst({
      where: {
        id: programId,
        coachId: userId,
      },
    })
    return program !== null
  }

  // Athletes can access programs assigned to their client
  if (user.role === 'ATHLETE' && user.athleteAccount) {
    const programs = user.athleteAccount.client.trainingPrograms
    return programs.some((p) => p.id === programId)
  }

  return false
}

/**
 * Check if current user can access a workout
 * Similar logic to programs - coaches own the program, athletes are assigned
 */
export async function canAccessWorkout(
  userId: string,
  workoutId: string
): Promise<boolean> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                include: {
                  client: {
                    include: {
                      athleteAccount: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!workout) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return false

  // Admins can access everything
  if (user.role === 'ADMIN') return true

  // Coaches can access workouts in programs they created
  if (user.role === 'COACH') {
    return workout.day.week.program.coachId === userId
  }

  // Athletes can access workouts in their programs
  if (user.role === 'ATHLETE') {
    return workout.day.week.program.client.athleteAccount?.userId === userId
  }

  return false
}

/**
 * Check if current user can access a client
 * Coaches can access clients they created
 * Athletes can access their own client record
 * Admins can access all clients
 */
export async function canAccessClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athleteAccount: true,
    },
  })

  if (!user) return false

  // Admins can access everything
  if (user.role === 'ADMIN') return true

  // Coaches can access clients they created
  if (user.role === 'COACH') {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: userId,
      },
    })
    return client !== null
  }

  // Athletes can access their own client record
  if (user.role === 'ATHLETE' && user.athleteAccount) {
    return user.athleteAccount.clientId === clientId
  }

  return false
}

/**
 * Check if current user can access an exercise
 *
 * - Public exercises are accessible to everyone
 * - Coaches can access exercises they created
 * - Athletes can access exercises created by their coach (plus public)
 * - Admins can access everything
 */
export async function canAccessExercise(
  userId: string,
  exerciseId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athleteAccount: {
        include: {
          client: {
            select: { userId: true },
          },
        },
      },
    },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { isPublic: true, coachId: true },
  })

  if (!exercise) return false
  if (exercise.isPublic) return true

  if (user.role === 'COACH') {
    return exercise.coachId === userId
  }

  if (user.role === 'ATHLETE') {
    const coachId = user.athleteAccount?.client.userId
    return Boolean(coachId && exercise.coachId === coachId)
  }

  return false
}

/**
 * Get client ID for an athlete user
 * Returns null if user is not an athlete or has no client linked
 */
export async function getAthleteClientId(userId: string): Promise<string | null> {
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
  })

  return athleteAccount?.clientId || null
}

/**
 * Get all programs accessible by current user
 */
export async function getAccessiblePrograms(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athleteAccount: true,
    },
  })

  if (!user) return []

  // Admins and coaches see programs they created
  if (user.role === 'ADMIN' || user.role === 'COACH') {
    return prisma.trainingProgram.findMany({
      where: {
        coachId: userId,
      },
      include: {
        client: true,
        test: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })
  }

  // Athletes see their assigned programs
  if (user.role === 'ATHLETE' && user.athleteAccount) {
    return prisma.trainingProgram.findMany({
      where: {
        clientId: user.athleteAccount.clientId,
      },
      include: {
        client: true,
        test: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })
  }

  return []
}

/**
 * Check if coach has reached their subscription athlete limit
 */
export async function hasReachedAthleteLimit(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) {
    // No subscription = FREE tier with 0 athletes allowed
    return true
  }

  // -1 means unlimited (ENTERPRISE)
  if (subscription.maxAthletes === -1) {
    return false
  }

  return subscription.currentAthletes >= subscription.maxAthletes
}

/**
 * Get subscription tier for a coach
 */
export async function getSubscriptionTier(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  return subscription?.tier || 'FREE'
}

/**
 * Check if subscription is active
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) return false

  return subscription.status === 'ACTIVE' || subscription.status === 'TRIAL'
}

// ============================================
// Tester Privacy Controls
// ============================================

/**
 * Get the Tester record linked to a user (if any)
 */
export async function getTesterForUser(userId: string) {
  return prisma.tester.findUnique({
    where: { userId },
  })
}

/**
 * Check if a user is a private tester
 * Private testers can only see tests they conducted
 */
export async function isPrivateTester(userId: string): Promise<boolean> {
  const tester = await prisma.tester.findUnique({
    where: { userId },
  })

  return tester?.isPrivate === true
}

/**
 * Get test filter clause for tester privacy
 * Returns a where clause that filters tests based on tester privacy settings
 *
 * If user is a private tester: only return their tests
 * If user is not a private tester: no additional filter
 */
export async function getTestPrivacyFilter(userId: string): Promise<{ testerId?: string } | null> {
  const tester = await prisma.tester.findUnique({
    where: { userId },
  })

  if (!tester) {
    // Not a tester, no privacy filter needed
    return null
  }

  if (tester.isPrivate) {
    // Private tester - can only see their own tests
    return { testerId: tester.id }
  }

  // Not private, no additional filter
  return null
}

/**
 * Apply tester privacy to a Prisma query where clause
 * Use this when fetching tests to automatically apply privacy filters
 */
export async function applyTesterPrivacy<T extends { testerId?: string | null }>(
  userId: string,
  whereClause: T
): Promise<T> {
  const privacyFilter = await getTestPrivacyFilter(userId)

  if (privacyFilter) {
    return {
      ...whereClause,
      ...privacyFilter,
    }
  }

  return whereClause
}

/**
 * Check if user can access a specific test based on tester privacy
 */
export async function canAccessTestAsTester(
  userId: string,
  testId: string
): Promise<boolean> {
  const tester = await prisma.tester.findUnique({
    where: { userId },
  })

  // If not a tester, allow (other access controls will apply)
  if (!tester) {
    return true
  }

  // If not private, allow
  if (!tester.isPrivate) {
    return true
  }

  // Private tester - check if they conducted this test
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { testerId: true },
  })

  return test?.testerId === tester.id
}
