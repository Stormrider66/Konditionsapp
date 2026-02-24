// scripts/fix-star-thomson-auth.ts
// Fix: Create Supabase Auth accounts for Star by Thomson team members
// who were created via setup script with only Prisma DB records.
//
// Run with: npx ts-node scripts/fix-star-thomson-auth.ts

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const TEAM_MEMBERS = [
  {
    name: 'Stefan Thomson',
    currentEmail: 'stefan@starbythomson.se',
    newEmail: 'stefan@starbythomson.se',
    businessRole: 'OWNER',
    testerTitle: 'VD & Fysiolog',
  },
  {
    name: 'Henrik Lundholm',
    currentEmail: 'henrik@starbythomson.se',
    newEmail: 'henrik@starbythomson.se',
    businessRole: 'ADMIN',
    testerTitle: 'Fysiolog',
  },
  {
    name: 'Elias Ståhl',
    currentEmail: 'elias@starbythomson.se',
    newEmail: 'starelias@thomsons.se',
    businessRole: 'MEMBER',
    testerTitle: 'Fysiolog',
  },
  {
    name: 'Tommy Henriksson',
    currentEmail: 'tommy@starbythomson.se',
    newEmail: 'tommy@starbythomson.se',
    businessRole: 'MEMBER',
    testerTitle: 'Fysiolog',
  },
]

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Find the business
  const business = await prisma.business.findFirst({
    where: { slug: 'star-by-thomson' },
  })

  if (!business) {
    console.error('Business "star-by-thomson" not found')
    process.exit(1)
  }

  console.log(`Found business: ${business.name} (${business.id})\n`)

  const results: { name: string; email: string; recoveryLink?: string; error?: string }[] = []

  for (const member of TEAM_MEMBERS) {
    console.log(`\n--- Processing: ${member.name} ---`)

    // 1. Look up existing User by current email (or new email if already updated)
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: member.currentEmail },
          { email: member.newEmail },
        ],
      },
    })

    if (!existingUser) {
      console.log(`  User not found for ${member.currentEmail} / ${member.newEmail}`)
      results.push({ name: member.name, email: member.newEmail, error: 'User not found in DB' })
      continue
    }

    console.log(`  Found user: ${existingUser.id} (${existingUser.email})`)

    // 2. Check if Supabase Auth account already exists for this email
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
    const existingAuth = existingAuthUsers?.users?.find(
      (u) => u.email === member.newEmail || u.email === member.currentEmail
    )

    if (existingAuth) {
      console.log(`  Auth account already exists: ${existingAuth.id}`)

      // If the DB user ID already matches the auth ID, skip
      if (existingUser.id === existingAuth.id) {
        console.log(`  IDs already match - generating recovery link only`)

        // Generate recovery link
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: member.newEmail,
        })

        if (linkError) {
          console.log(`  Failed to generate recovery link: ${linkError.message}`)
          results.push({ name: member.name, email: member.newEmail, error: `Recovery link failed: ${linkError.message}` })
        } else {
          const recoveryLink = linkData?.properties?.action_link || 'N/A'
          console.log(`  Recovery link: ${recoveryLink}`)
          results.push({ name: member.name, email: member.newEmail, recoveryLink })
        }
        continue
      }

      // IDs don't match - need to re-link DB records to existing auth account
      console.log(`  ID mismatch: DB=${existingUser.id}, Auth=${existingAuth.id}`)
      console.log(`  Will delete old DB records and recreate with auth ID`)

      await deleteAndRecreate(existingUser.id, existingAuth.id, member, business.id)

      // Generate recovery link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: member.newEmail,
      })

      const recoveryLink = linkError ? undefined : linkData?.properties?.action_link
      if (linkError) {
        console.log(`  Failed to generate recovery link: ${linkError.message}`)
      } else {
        console.log(`  Recovery link: ${recoveryLink}`)
      }
      results.push({ name: member.name, email: member.newEmail, recoveryLink, error: linkError?.message })
      continue
    }

    // 3. Create Supabase Auth account (no password - user will set via recovery link)
    console.log(`  Creating Supabase Auth account for ${member.newEmail}...`)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: member.newEmail,
      email_confirm: true,
      user_metadata: {
        name: member.name,
        role: 'COACH',
      },
    })

    if (authError || !authData.user) {
      console.error(`  Auth creation failed: ${authError?.message}`)
      results.push({ name: member.name, email: member.newEmail, error: `Auth creation failed: ${authError?.message}` })
      continue
    }

    console.log(`  Auth user created: ${authData.user.id}`)

    // 4. Delete old DB records and recreate with auth user ID
    await deleteAndRecreate(existingUser.id, authData.user.id, member, business.id)

    // 5. Generate recovery link so user can set their password
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: member.newEmail,
    })

    if (linkError) {
      console.error(`  Recovery link generation failed: ${linkError.message}`)
      results.push({ name: member.name, email: member.newEmail, error: `Recovery link failed: ${linkError.message}` })
      continue
    }

    const recoveryLink = linkData?.properties?.action_link || 'N/A'
    console.log(`  Recovery link: ${recoveryLink}`)
    results.push({ name: member.name, email: member.newEmail, recoveryLink })
  }

  // Print summary
  console.log('\n\n========================================')
  console.log('SUMMARY')
  console.log('========================================\n')

  for (const r of results) {
    console.log(`${r.name} (${r.email}):`)
    if (r.error) {
      console.log(`  ERROR: ${r.error}`)
    }
    if (r.recoveryLink) {
      console.log(`  Recovery link: ${r.recoveryLink}`)
    }
    console.log()
  }
}

async function deleteAndRecreate(
  oldUserId: string,
  newUserId: string,
  member: (typeof TEAM_MEMBERS)[number],
  businessId: string
) {
  console.log(`  Deleting old records for user ${oldUserId}...`)

  // Get existing tester info before deleting
  const existingTester = await prisma.tester.findFirst({
    where: { userId: oldUserId, businessId },
  })

  // Delete in correct order (foreign key constraints)
  // Delete BusinessMember
  await prisma.businessMember.deleteMany({
    where: { userId: oldUserId, businessId },
  })
  console.log(`  Deleted BusinessMember`)

  // Delete Tester
  await prisma.tester.deleteMany({
    where: { userId: oldUserId, businessId },
  })
  console.log(`  Deleted Tester`)

  // Delete User (cascade will handle remaining references if any)
  await prisma.user.deleteMany({
    where: { id: oldUserId },
  })
  console.log(`  Deleted User`)

  // Recreate User with auth ID
  await prisma.user.create({
    data: {
      id: newUserId,
      email: member.newEmail,
      name: member.name,
      role: 'COACH',
      language: 'sv',
    },
  })
  console.log(`  Created User: ${newUserId} (${member.newEmail})`)

  // Recreate BusinessMember
  await prisma.businessMember.create({
    data: {
      businessId,
      userId: newUserId,
      role: member.businessRole,
      isActive: true,
      acceptedAt: new Date(),
    },
  })
  console.log(`  Created BusinessMember: ${member.businessRole}`)

  // Recreate Tester
  await prisma.tester.create({
    data: {
      businessId,
      userId: newUserId,
      name: member.name,
      email: member.newEmail,
      title: existingTester?.title || member.testerTitle,
      isActive: true,
    },
  })
  console.log(`  Created Tester`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
