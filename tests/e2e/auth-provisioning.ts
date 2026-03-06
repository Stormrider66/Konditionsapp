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

type ProvisionedAuthAccount = {
  email: string
  password: string
  name: string
  role: 'ATHLETE' | 'ADMIN'
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
