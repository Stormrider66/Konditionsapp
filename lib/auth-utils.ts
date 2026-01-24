// lib/auth-utils.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { User, UserRole, AdminRole, BusinessAdminUser, BusinessMemberRole } from '@/types'
import { redirect } from 'next/navigation'
import { isAthleteModeActive } from '@/lib/athlete-mode'

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
 * Return type for athlete mode auth check
 */
export interface AthleteOrCoachInAthleteModeResult {
  user: User
  clientId: string
  isCoachInAthleteMode: boolean
}

/**
 * Require user to be an ATHLETE or a COACH/ADMIN in athlete mode
 * Returns the user with the clientId for data access
 *
 * For ATHLETE role: returns athleteAccount.clientId
 * For COACH/ADMIN with athleteMode cookie: returns selfAthleteClientId
 *
 * @throws Redirects to login if not authenticated
 * @throws Redirects to /coach/settings/athlete-profile if coach without athlete profile
 */
export async function requireAthleteOrCoachInAthleteMode(): Promise<AthleteOrCoachInAthleteModeResult> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is a regular ATHLETE
  if (user.role === 'ATHLETE') {
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      throw new Error('Athlete account not found')
    }

    return {
      user,
      clientId: athleteAccount.clientId,
      isCoachInAthleteMode: false,
    }
  }

  // Check if user is COACH/ADMIN in athlete mode
  if (user.role === 'COACH' || user.role === 'ADMIN') {
    const athleteMode = await isAthleteModeActive()

    if (!athleteMode) {
      // Not in athlete mode, redirect to coach dashboard
      redirect('/coach')
    }

    // Get the coach's self athlete client ID
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { selfAthleteClientId: true },
    })

    if (!fullUser?.selfAthleteClientId) {
      // No athlete profile set up, redirect to setup page
      redirect('/coach/settings/athlete-profile')
    }

    return {
      user,
      clientId: fullUser.selfAthleteClientId,
      isCoachInAthleteMode: true,
    }
  }

  // Unknown role
  throw new Error('Access denied')
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

// ============================================
// Admin Role Controls
// ============================================

/**
 * Extended user type that includes adminRole
 */
export interface AdminUser extends User {
  adminRole: AdminRole | null
}

/**
 * Require user to have an admin role
 * @param requiredRoles - Array of admin roles that are allowed
 * @throws Error if user doesn't have required admin role
 */
export async function requireAdminRole(requiredRoles: AdminRole[]): Promise<AdminUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: not authenticated')
  }

  // Get the full user with adminRole from database
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      adminRole: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!fullUser) {
    throw new Error('Unauthorized: user not found')
  }

  // ADMIN role users automatically get SUPER_ADMIN privileges for backwards compatibility
  if (fullUser.role === 'ADMIN') {
    return {
      ...user,
      adminRole: fullUser.adminRole || 'SUPER_ADMIN',
    } as AdminUser
  }

  // Check if user has required admin role
  if (!fullUser.adminRole || !requiredRoles.includes(fullUser.adminRole as AdminRole)) {
    throw new Error(`Forbidden: requires one of these roles: ${requiredRoles.join(', ')}`)
  }

  return {
    ...user,
    adminRole: fullUser.adminRole as AdminRole,
  } as AdminUser
}

/**
 * Check if user has admin role without throwing
 */
export async function hasAdminRole(requiredRoles: AdminRole[]): Promise<boolean> {
  try {
    await requireAdminRole(requiredRoles)
    return true
  } catch {
    return false
  }
}

// ============================================
// Business Admin Controls
// ============================================

/**
 * Get the business context for a user (if they belong to a business)
 * Returns null values if user is not a member of any business
 */
export async function getBusinessContext(userId: string): Promise<{
  businessId: string | null
  role: BusinessMemberRole | null
  business: { id: string; name: string; slug: string } | null
}> {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc', // Get the first/primary business if user belongs to multiple
    },
  })

  if (!membership) {
    return {
      businessId: null,
      role: null,
      business: null,
    }
  }

  return {
    businessId: membership.businessId,
    role: membership.role as BusinessMemberRole,
    business: membership.business,
  }
}

/**
 * Require user to be a business OWNER or ADMIN
 * Returns the user with business context for scoped queries
 * @throws Error if user is not authenticated or not a business admin
 */
export async function requireBusinessAdminRole(): Promise<BusinessAdminUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // First try to find a membership with OWNER or ADMIN role
  let membership = await prisma.businessMember.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      role: {
        in: ['OWNER', 'ADMIN'],
      },
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  // If user is a global ADMIN, allow access to any business they're a member of
  if (!membership && user.role === 'ADMIN') {
    membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })
  }

  if (!membership) {
    throw new Error('Access denied. Business admin role required.')
  }

  return {
    ...user,
    businessId: membership.businessId,
    businessRole: membership.role as 'OWNER' | 'ADMIN',
    business: membership.business,
  }
}

/**
 * Check if user is a business admin without throwing
 */
export async function hasBusinessAdminRole(): Promise<boolean> {
  try {
    await requireBusinessAdminRole()
    return true
  } catch {
    return false
  }
}

// ============================================
// Physiotherapist Controls
// ============================================

/**
 * Extended user type for physio context
 */
export interface PhysioUser extends User {
  physioAssignments?: {
    id: string
    clientId: string | null
    teamId: string | null
    organizationId: string | null
    businessId: string | null
    locationId: string | null
    role: 'PRIMARY' | 'SECONDARY' | 'CONSULTANT'
    canModifyPrograms: boolean
    canCreateRestrictions: boolean
    canViewFullHistory: boolean
  }[]
}

/**
 * Require user to be a PHYSIO or ADMIN
 * Returns the user with physio context
 * @throws Redirects to login if not authenticated
 * @throws Error if user doesn't have PHYSIO or ADMIN role
 */
export async function requirePhysio(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'PHYSIO' && user.role !== 'ADMIN') {
    throw new Error('Access denied. Physiotherapist access required.')
  }

  return user
}

/**
 * Require user to be a PHYSIO or ADMIN, and return with assignments
 */
export async function requirePhysioWithAssignments(): Promise<PhysioUser> {
  const user = await requirePhysio()

  // Get physio's assignments
  const assignments = await prisma.physioAssignment.findMany({
    where: {
      physioUserId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      clientId: true,
      teamId: true,
      organizationId: true,
      businessId: true,
      locationId: true,
      role: true,
      canModifyPrograms: true,
      canCreateRestrictions: true,
      canViewFullHistory: true,
    },
  })

  return {
    ...user,
    physioAssignments: assignments.map(a => ({
      ...a,
      role: a.role as 'PRIMARY' | 'SECONDARY' | 'CONSULTANT',
    })),
  }
}

/**
 * Check if a physio user can access a specific athlete
 * Checks direct client assignment, team membership, organization membership,
 * business membership, and location membership
 */
export async function canAccessAthleteAsPhysio(
  physioUserId: string,
  clientId: string
): Promise<boolean> {
  // First check if user has PHYSIO or ADMIN role
  const user = await prisma.user.findUnique({
    where: { id: physioUserId },
    select: { role: true },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true
  if (user.role !== 'PHYSIO') return false

  // Get the client with all relevant context
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      teamId: true,
      team: {
        select: {
          organizationId: true,
        },
      },
      athleteAccount: {
        select: {
          preferredLocationId: true,
        },
      },
    },
  })

  if (!client) return false

  // Check all physio assignments
  const assignments = await prisma.physioAssignment.findMany({
    where: {
      physioUserId,
      isActive: true,
    },
  })

  for (const assignment of assignments) {
    // Direct client assignment
    if (assignment.clientId && assignment.clientId === clientId) {
      return true
    }

    // Team assignment
    if (assignment.teamId && client.teamId === assignment.teamId) {
      return true
    }

    // Organization assignment (check if client's team belongs to this org)
    if (assignment.organizationId && client.team?.organizationId === assignment.organizationId) {
      return true
    }

    // Business assignment - check if client's coach belongs to this business
    if (assignment.businessId) {
      const coachBusiness = await prisma.businessMember.findFirst({
        where: {
          userId: client.id, // Note: client.userId is the coach
          businessId: assignment.businessId,
          isActive: true,
        },
      })
      if (coachBusiness) return true

      // Also check by client's userId (the coach who owns the client)
      const clientRecord = await prisma.client.findUnique({
        where: { id: clientId },
        select: { userId: true },
      })
      if (clientRecord) {
        const ownerBusiness = await prisma.businessMember.findFirst({
          where: {
            userId: clientRecord.userId,
            businessId: assignment.businessId,
            isActive: true,
          },
        })
        if (ownerBusiness) return true
      }
    }

    // Location assignment - check if client prefers this location
    if (assignment.locationId && client.athleteAccount?.preferredLocationId === assignment.locationId) {
      return true
    }
  }

  return false
}

/**
 * Get all athletes accessible by a physio user
 * Returns athletes based on direct assignments, team assignments,
 * organization assignments, business assignments, and location assignments
 */
export async function getPhysioAthletes(physioUserId: string): Promise<string[]> {
  // First check if user has PHYSIO or ADMIN role
  const user = await prisma.user.findUnique({
    where: { id: physioUserId },
    select: { role: true },
  })

  if (!user) return []
  if (user.role !== 'PHYSIO' && user.role !== 'ADMIN') return []

  // Get all physio assignments
  const assignments = await prisma.physioAssignment.findMany({
    where: {
      physioUserId,
      isActive: true,
    },
  })

  const clientIds = new Set<string>()

  for (const assignment of assignments) {
    // Direct client assignments
    if (assignment.clientId) {
      clientIds.add(assignment.clientId)
    }

    // Team assignments - get all clients in the team
    if (assignment.teamId) {
      const teamClients = await prisma.client.findMany({
        where: { teamId: assignment.teamId },
        select: { id: true },
      })
      teamClients.forEach(c => clientIds.add(c.id))
    }

    // Organization assignments - get all clients in all teams of the org
    if (assignment.organizationId) {
      const orgClients = await prisma.client.findMany({
        where: {
          team: {
            organizationId: assignment.organizationId,
          },
        },
        select: { id: true },
      })
      orgClients.forEach(c => clientIds.add(c.id))
    }

    // Business assignments - get all clients whose coach belongs to this business
    if (assignment.businessId) {
      const businessMembers = await prisma.businessMember.findMany({
        where: {
          businessId: assignment.businessId,
          isActive: true,
        },
        select: { userId: true },
      })
      const coachIds = businessMembers.map(m => m.userId)

      if (coachIds.length > 0) {
        const businessClients = await prisma.client.findMany({
          where: {
            userId: { in: coachIds },
          },
          select: { id: true },
        })
        businessClients.forEach(c => clientIds.add(c.id))
      }
    }

    // Location assignments - get all clients who prefer this location
    if (assignment.locationId) {
      const locationClients = await prisma.athleteAccount.findMany({
        where: {
          preferredLocationId: assignment.locationId,
        },
        select: { clientId: true },
      })
      locationClients.forEach(a => clientIds.add(a.clientId))
    }
  }

  return Array.from(clientIds)
}

/**
 * Require user to be a PHYSIO or ADMIN
 * Alias for requirePhysio for consistency
 */
export async function requirePhysioOrAdmin(): Promise<User> {
  return requirePhysio()
}

/**
 * Get business context for a physio user
 * Returns null if physio is not associated with any business
 */
export async function getPhysioBusinessContext(userId: string): Promise<{
  businessId: string | null
  business: { id: string; name: string; slug: string } | null
  role: string | null
}> {
  // First check direct business membership
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  if (membership) {
    return {
      businessId: membership.businessId,
      business: membership.business,
      role: membership.role,
    }
  }

  // Check if physio has business-level assignment
  const businessAssignment = await prisma.physioAssignment.findFirst({
    where: {
      physioUserId: userId,
      businessId: { not: null },
      isActive: true,
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  if (businessAssignment?.business) {
    return {
      businessId: businessAssignment.businessId!,
      business: businessAssignment.business,
      role: 'PHYSIO',
    }
  }

  return {
    businessId: null,
    business: null,
    role: null,
  }
}

/**
 * Check if current user can create training restrictions
 * Returns true if user is ADMIN or PHYSIO/COACH with permission
 */
export async function canCreateRestrictions(userId: string, clientId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  // Check if user is the coach who owns this client
  if (user.role === 'COACH') {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: userId,
      },
    })
    return client !== null
  }

  // Check if user is a physio with restriction permission for this client
  if (user.role === 'PHYSIO') {
    const canAccess = await canAccessAthleteAsPhysio(userId, clientId)
    if (!canAccess) return false

    // Check if any of their assignments allow creating restrictions
    const assignments = await prisma.physioAssignment.findMany({
      where: {
        physioUserId: userId,
        isActive: true,
        canCreateRestrictions: true,
      },
    })

    return assignments.length > 0
  }

  return false
}

/**
 * Check if current user can modify training programs
 * Returns true if user is ADMIN or PHYSIO with permission
 */
export async function canModifyProgramsAsPhysio(userId: string, clientId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  // Coaches can always modify their own clients' programs
  if (user.role === 'COACH') {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: userId,
      },
    })
    return client !== null
  }

  // Check if user is a physio with program modification permission
  if (user.role === 'PHYSIO') {
    const canAccess = await canAccessAthleteAsPhysio(userId, clientId)
    if (!canAccess) return false

    // Check if any of their assignments allow modifying programs
    const assignments = await prisma.physioAssignment.findMany({
      where: {
        physioUserId: userId,
        isActive: true,
        canModifyPrograms: true,
      },
    })

    return assignments.length > 0
  }

  return false
}
