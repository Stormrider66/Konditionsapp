// scripts/create-athlete-account.ts
// Creates an athlete account for testing the athlete portal
// Run with: npx ts-node scripts/create-athlete-account.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking for client with program...\n')

  // Get the most recent program's client
  const program = await prisma.trainingProgram.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { client: true },
  })

  if (!program) {
    console.log('❌ No programs found. Create a program first.')
    return
  }

  console.log('✅ Found program for client:')
  console.log(`   Name: ${program.client.name}`)
  console.log(`   Client ID: ${program.client.id}`)
  console.log(`   Email: ${program.client.email || 'No email'}`)

  // Check if athlete account already exists
  const existingAccount = await prisma.athleteAccount.findUnique({
    where: { clientId: program.client.id },
    include: { user: true },
  })

  if (existingAccount) {
    console.log('\n✅ Athlete account ALREADY EXISTS!')
    console.log(`   User ID: ${existingAccount.userId}`)
    console.log(`   Email: ${existingAccount.user.email}`)
    console.log(`   Role: ${existingAccount.user.role}`)
    console.log('\n📝 You can login with:')
    console.log(`   Email: ${existingAccount.user.email}`)
    console.log(`   Password: (the password you set during account creation)`)
    return
  }

  console.log('\n❌ No athlete account exists yet.')
  console.log('\n📋 To create an athlete account, you need to:')
  console.log('   1. Use the /api/athlete-accounts endpoint')
  console.log('   2. Or create manually via Supabase Auth')
  console.log('\n🔧 Creating athlete account now...\n')

  // Generate test email
  const athleteEmail = program.client.email || `${program.client.name.toLowerCase().replace(/\s+/g, '.')}@test.com`

  console.log(`   Email: ${athleteEmail}`)
  console.log('   Password: athlete123 (for testing)')

  console.log('\n⚠️  IMPORTANT: This script cannot create Supabase Auth users.')
  console.log('   You need to either:')
  console.log('   A) Use the API endpoint POST /api/athlete-accounts with coach credentials')
  console.log('   B) Manually create user in Supabase Auth dashboard')
  console.log(`\n   Suggested Supabase Auth user:`)
  console.log(`   - Email: ${athleteEmail}`)
  console.log(`   - Password: athlete123`)
  console.log(`   - Then run this script again or create AthleteAccount manually`)
}

main()
  .then(() => {
    console.log('\n✅ Script completed\n')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\n❌ Script failed:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
