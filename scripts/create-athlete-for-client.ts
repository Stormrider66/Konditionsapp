// scripts/create-athlete-for-client.ts
// Run with: npx ts-node scripts/create-athlete-for-client.ts

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// You'll need to set these
const CLIENT_EMAIL = 'starhenrik@thomsons.se'
const TEMP_PASSWORD = 'TempPass123!' // The password you want to set

async function main() {
  console.log('Looking for client with email:', CLIENT_EMAIL)

  // Find the client
  const client = await prisma.client.findFirst({
    where: { email: CLIENT_EMAIL },
    include: { athleteAccount: true }
  })

  if (!client) {
    console.log('❌ Client not found with email:', CLIENT_EMAIL)
    console.log('\nAll clients:')
    const allClients = await prisma.client.findMany({ select: { id: true, name: true, email: true } })
    console.table(allClients)
    return
  }

  console.log('✅ Found client:', client.name, '(ID:', client.id, ')')

  if (client.athleteAccount) {
    console.log('✅ Athlete account already exists!')
    const user = await prisma.user.findUnique({ where: { id: client.athleteAccount.userId } })
    console.log('   User ID:', user?.id)
    console.log('   Email:', user?.email)
    console.log('\n🔑 You can reset the password in Supabase Dashboard')
    return
  }

  console.log('❌ No athlete account found. Creating one...')

  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing Supabase env vars')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Create auth user
  console.log('Creating Supabase auth user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: CLIENT_EMAIL,
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: { name: client.name, role: 'ATHLETE' }
  })

  if (authError) {
    console.log('❌ Supabase auth error:', authError.message)
    return
  }

  console.log('✅ Auth user created:', authData.user.id)

  // Create User in database
  const athleteUser = await prisma.user.create({
    data: {
      id: authData.user.id,
      email: CLIENT_EMAIL,
      name: client.name,
      role: 'ATHLETE',
      language: 'sv'
    }
  })

  console.log('✅ Database user created')

  // Create AthleteAccount
  const athleteAccount = await prisma.athleteAccount.create({
    data: {
      clientId: client.id,
      userId: athleteUser.id,
      notificationPrefs: { email: true, push: false, workoutReminders: true }
    }
  })

  console.log('✅ Athlete account created!')
  console.log('\n' + '='.repeat(50))
  console.log('🎉 SUCCESS! Login credentials:')
  console.log('='.repeat(50))
  console.log('Email:', CLIENT_EMAIL)
  console.log('Password:', TEMP_PASSWORD)
  console.log('='.repeat(50))
  console.log('\nGo to: http://localhost:3000/login')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
