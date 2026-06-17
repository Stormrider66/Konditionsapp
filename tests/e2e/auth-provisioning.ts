import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../../lib/prisma'
import { ensureAthleteClientDefaultsTx } from '../../lib/user-provisioning'

const DOTENV_LOCAL_PATH = path.join(process.cwd(), '.env.local')

function loadLocalEnv() {
  if (!fs.existsSync(DOTENV_LOCAL_PATH)) {
    return
  }

  const contents = fs.readFileSync(DOTENV_LOCAL_PATH, 'utf8')

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadLocalEnv()

const TEST_ATHLETE_ACCOUNT = {
  email: process.env.E2E_ATHLETE_EMAIL || 'e2e-athlete-storage@trainomics.test',
  password: process.env.E2E_ATHLETE_PASSWORD || 'Password123!',
  name: 'E2E Athlete Storage',
} as const

const TEST_ADMIN_ACCOUNT = {
  email: process.env.E2E_ADMIN_EMAIL || 'e2e-platform-admin@trainomics.test',
  password: process.env.E2E_ADMIN_PASSWORD || 'Password123!',
  name: 'E2E Platform Admin',
} as const

const TEST_COACH_OPS_ACCOUNT = {
  email: process.env.E2E_COACH_OPS_EMAIL || 'e2e-coach-ops@trainomics.test',
  password: process.env.E2E_COACH_OPS_PASSWORD || 'Password123!',
  name: 'E2E Coach Ops',
} as const

const TEST_COACH_OPS_BUSINESS = {
  slug: process.env.E2E_BUSINESS_SLUG || 'testbusiness',
  name: 'E2E Test Business',
} as const

const TEST_COACH_OPS_CLIENT = {
  email: process.env.E2E_COACH_OPS_ATHLETE_EMAIL || 'e2e-coach-ops-athlete@trainomics.test',
  name: 'E2E Coach Ops Athlete',
} as const

type ProvisionedAuthAccount = {
  email: string
  password: string
  name: string
  role: 'ATHLETE' | 'COACH' | 'ADMIN'
}

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin env for authenticated E2E provisioning')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminSupabaseClient>, email: string) {
  const normalizedEmail = email.toLowerCase()
  const perPage = 1000
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })

    if (error) {
      throw new Error(`Failed to list Supabase auth users for ${email}: ${error.message}`)
    }

    const users = data?.users || []
    const match = users.find((user) => user.email?.toLowerCase() === normalizedEmail)

    if (match) {
      return match
    }

    if (users.length < perPage) {
      return null
    }

    page += 1
  }
}

async function ensureAuthUser(account: ProvisionedAuthAccount) {
  const admin = createAdminSupabaseClient()
  const existingUser = await prisma.user.findUnique({
    where: { email: account.email },
    select: { id: true },
  })

  if (existingUser) {
    const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        role: account.role,
      },
    })

    if (error) {
      throw new Error(`Failed to refresh E2E auth user (${account.email}): ${error.message}`)
    }

    return existingUser.id
  }

  const existingAuthUser = await findAuthUserByEmail(admin, account.email)

  if (existingAuthUser) {
    const { error } = await admin.auth.admin.updateUserById(existingAuthUser.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        role: account.role,
      },
    })

    if (error) {
      throw new Error(`Failed to refresh existing E2E auth user (${account.email}): ${error.message}`)
    }

    return existingAuthUser.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      name: account.name,
      role: account.role,
    },
  })

  if (error || !data.user) {
    const racedAuthUser = await findAuthUserByEmail(admin, account.email)

    if (racedAuthUser) {
      return racedAuthUser.id
    }

    throw new Error(`Failed to create E2E auth user (${account.email}): ${error?.message || 'unknown error'}`)
  }

  return data.user.id
}

export async function ensureAthleteAuthAccount() {
  const userId = await ensureAuthUser({
    ...TEST_ATHLETE_ACCOUNT,
    role: 'ATHLETE',
  })

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: TEST_ATHLETE_ACCOUNT.email },
      update: {
        name: TEST_ATHLETE_ACCOUNT.name,
        role: 'ATHLETE',
      },
      create: {
        id: userId,
        email: TEST_ATHLETE_ACCOUNT.email,
        name: TEST_ATHLETE_ACCOUNT.name,
        role: 'ATHLETE',
      },
    })

    if (user.id !== userId) {
      throw new Error('Existing E2E athlete user ID does not match Supabase auth user')
    }

    const existingClient = await tx.client.findFirst({
      where: { userId },
      select: { id: true },
    })

    const client = existingClient
      ? await tx.client.update({
          where: { id: existingClient.id },
          data: {
            name: TEST_ATHLETE_ACCOUNT.name,
            email: TEST_ATHLETE_ACCOUNT.email,
            gender: 'MALE',
            birthDate: new Date('1990-01-01'),
            height: 180,
            weight: 75,
            isDirect: true,
            isAICoached: true,
          },
        })
      : await tx.client.create({
          data: {
            userId,
            name: TEST_ATHLETE_ACCOUNT.name,
            email: TEST_ATHLETE_ACCOUNT.email,
            gender: 'MALE',
            birthDate: new Date('1990-01-01'),
            height: 180,
            weight: 75,
            isDirect: true,
            isAICoached: true,
          },
        })

    await tx.athleteAccount.upsert({
      where: { userId },
      update: { clientId: client.id },
      create: {
        userId,
        clientId: client.id,
      },
    })

    await ensureAthleteClientDefaultsTx(tx, client.id, {
      subscriptionSeed: {
        tier: 'FREE',
        status: 'ACTIVE',
        paymentSource: 'DIRECT',
      },
    })
  })

  return TEST_ATHLETE_ACCOUNT
}

export async function ensurePlatformAdminAuthAccount() {
  const userId = await ensureAuthUser({
    ...TEST_ADMIN_ACCOUNT,
    role: 'ADMIN',
  })

  const user = await prisma.user.upsert({
    where: { email: TEST_ADMIN_ACCOUNT.email },
    update: {
      name: TEST_ADMIN_ACCOUNT.name,
      role: 'ADMIN',
      adminRole: 'SUPER_ADMIN',
    },
    create: {
      id: userId,
      email: TEST_ADMIN_ACCOUNT.email,
      name: TEST_ADMIN_ACCOUNT.name,
      role: 'ADMIN',
      adminRole: 'SUPER_ADMIN',
    },
  })

  if (user.id !== userId) {
    throw new Error('Existing E2E admin user ID does not match Supabase auth user')
  }

  return TEST_ADMIN_ACCOUNT
}

export async function ensureCoachOpsReviewFixture() {
  const userId = await ensureAuthUser({
    ...TEST_COACH_OPS_ACCOUNT,
    role: 'COACH',
  })

  const fixture = await prisma.$transaction(async (tx) => {
    const coach = await tx.user.upsert({
      where: { email: TEST_COACH_OPS_ACCOUNT.email },
      update: {
        name: TEST_COACH_OPS_ACCOUNT.name,
        role: 'COACH',
        language: 'en',
      },
      create: {
        id: userId,
        email: TEST_COACH_OPS_ACCOUNT.email,
        name: TEST_COACH_OPS_ACCOUNT.name,
        role: 'COACH',
        language: 'en',
      },
    })

    if (coach.id !== userId) {
      throw new Error('Existing E2E coach ops user ID does not match Supabase auth user')
    }

    await tx.subscription.upsert({
      where: { userId },
      update: {
        tier: 'PRO',
        status: 'ACTIVE',
        maxAthletes: 50,
      },
      create: {
        userId,
        tier: 'PRO',
        status: 'ACTIVE',
        maxAthletes: 50,
        currentAthletes: 1,
      },
    })

    const business = await tx.business.upsert({
      where: { slug: TEST_COACH_OPS_BUSINESS.slug },
      update: {
        name: TEST_COACH_OPS_BUSINESS.name,
        type: 'INDEPENDENT_COACH',
        isActive: true,
      },
      create: {
        slug: TEST_COACH_OPS_BUSINESS.slug,
        name: TEST_COACH_OPS_BUSINESS.name,
        type: 'INDEPENDENT_COACH',
        isActive: true,
      },
    })

    await tx.businessMember.upsert({
      where: {
        businessId_userId: {
          businessId: business.id,
          userId,
        },
      },
      update: {
        role: 'OWNER',
        isActive: true,
        acceptedAt: new Date(),
      },
      create: {
        businessId: business.id,
        userId,
        role: 'OWNER',
        isActive: true,
        acceptedAt: new Date(),
      },
    })

    const existingClient = await tx.client.findFirst({
      where: {
        userId,
        email: TEST_COACH_OPS_CLIENT.email,
      },
      select: { id: true },
    })

    const client = existingClient
      ? await tx.client.update({
          where: { id: existingClient.id },
          data: {
            businessId: business.id,
            name: TEST_COACH_OPS_CLIENT.name,
            email: TEST_COACH_OPS_CLIENT.email,
            gender: 'FEMALE',
            birthDate: new Date('1994-04-12'),
            height: 171,
            weight: 63,
            notes: 'E2E coach operations review fixture',
          },
        })
      : await tx.client.create({
          data: {
            userId,
            businessId: business.id,
            name: TEST_COACH_OPS_CLIENT.name,
            email: TEST_COACH_OPS_CLIENT.email,
            gender: 'FEMALE',
            birthDate: new Date('1994-04-12'),
            height: 171,
            weight: 63,
            notes: 'E2E coach operations review fixture',
          },
        })

    await ensureAthleteClientDefaultsTx(tx, client.id, {
      subscriptionSeed: {
        tier: 'FREE',
        status: 'ACTIVE',
        paymentSource: 'BUSINESS',
      },
    })

    await tx.coachAlert.deleteMany({
      where: {
        coachId: userId,
        clientId: client.id,
      },
    })
    await tx.test.deleteMany({
      where: {
        clientId: client.id,
      },
    })

    const painAlert = await tx.coachAlert.create({
      data: {
        coachId: userId,
        clientId: client.id,
        alertType: 'PAIN_MENTION',
        severity: 'HIGH',
        title: 'Post-workout pain reported',
        message: 'E2E Coach Ops Athlete reported sharp knee pain after intervals.',
        sourceId: 'e2e-coach-ops-pain-alert',
        contextData: {
          source: 'post_workout_feedback',
          painOrDiscomfort: 'Sharp knee pain after intervals',
          overallFeeling: 2,
          difficulty: 9,
        },
      },
    })

    const previousTest = await tx.test.create({
      data: {
        clientId: client.id,
        userId,
        testDate: new Date('2026-04-15T09:00:00.000Z'),
        testType: 'RUNNING',
        status: 'COMPLETED',
        location: 'E2E Lab',
        testLeader: TEST_COACH_OPS_ACCOUNT.name,
        maxHR: 187,
        maxLactate: 8.2,
        vo2max: 58.4,
        qualityReviewStatus: 'CLEAR',
        testStages: {
          create: [
            { sequence: 1, duration: 4, heartRate: 118, lactate: 1.1, speed: 8.0 },
            { sequence: 2, duration: 4, heartRate: 136, lactate: 1.5, speed: 10.0 },
            { sequence: 3, duration: 4, heartRate: 154, lactate: 2.2, speed: 12.0 },
            { sequence: 4, duration: 4, heartRate: 171, lactate: 4.4, speed: 14.0 },
            { sequence: 5, duration: 4, heartRate: 187, lactate: 8.2, speed: 16.0 },
          ],
        },
      },
    })

    const reviewTest = await tx.test.create({
      data: {
        clientId: client.id,
        userId,
        testDate: new Date('2026-06-15T09:00:00.000Z'),
        testType: 'RUNNING',
        status: 'COMPLETED',
        location: 'E2E Lab',
        testLeader: TEST_COACH_OPS_ACCOUNT.name,
        maxHR: 189,
        maxLactate: 7.4,
        vo2max: 59.1,
        qualityReviewStatus: 'REVIEW_REQUIRED',
        qualityWarnings: [
          {
            type: 'LACTATE_DROP',
            severity: 'critical',
            message: 'Lactate dropped unexpectedly at a high-intensity stage.',
          },
        ],
        testStages: {
          create: [
            { sequence: 1, duration: 4, heartRate: 119, lactate: 1.0, speed: 8.0 },
            { sequence: 2, duration: 4, heartRate: 138, lactate: 1.6, speed: 10.0 },
            { sequence: 3, duration: 4, heartRate: 157, lactate: 3.2, speed: 12.0 },
            { sequence: 4, duration: 4, heartRate: 172, lactate: 2.4, speed: 14.0 },
            { sequence: 5, duration: 4, heartRate: 189, lactate: 7.4, speed: 16.0 },
          ],
        },
      },
    })

    return {
      businessSlug: business.slug,
      clientId: client.id,
      painAlertId: painAlert.id,
      previousTestId: previousTest.id,
      reviewTestId: reviewTest.id,
    }
  })

  return {
    account: TEST_COACH_OPS_ACCOUNT,
    ...fixture,
  }
}
