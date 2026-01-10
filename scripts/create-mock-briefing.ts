import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

const prisma = new PrismaClient()

async function main() {
  console.log('Creating mock briefing...\n')

  const athlete = await prisma.client.findFirst({
    where: { athleteAccount: { isNot: null } },
    select: { id: true, name: true }
  })

  if (!athlete) {
    console.log('No athlete found')
    return
  }

  console.log(`Found athlete: ${athlete.name}`)

  const briefing = await prisma.aIBriefing.create({
    data: {
      clientId: athlete.id,
      briefingType: 'MORNING',
      title: `God morgon ${athlete.name.split(' ')[0]}!`,
      content: 'En ny dag och nya möjligheter! Även utan check-in data kan du fokusera på att lyssna på kroppen och ta dagen som den kommer. Kom ihåg att röra på dig och hålla dig hydrerad!',
      highlights: [
        'Ta några minuter för att röra på dig',
        'Drick vatten direkt på morgonen',
        'Planera dagens aktiviteter'
      ],
      alerts: [],
      quickActions: [
        { label: 'Logga träning', action: 'log_workout' },
        { label: 'Chatta med AI', action: 'open_chat' }
      ],
      scheduledFor: new Date(),
      modelUsed: 'mock-test'
    }
  })

  console.log('\n✅ Mock briefing created!')
  console.log(`   ID: ${briefing.id}`)
  console.log(`   Title: ${briefing.title}`)
  console.log(`   Athlete: ${athlete.name}`)
  console.log('')
  console.log('🎉 The athlete can now see this briefing on their dashboard!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
