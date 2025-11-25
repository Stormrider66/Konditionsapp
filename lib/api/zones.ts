import { prisma } from '@/lib/prisma'

export async function getClientZones(clientId: string) {
  // 1. Try to get zones from AthleteProfile
  const profile = await prisma.athleteProfile.findUnique({
    where: { clientId },
    select: { hrZones: true }
  })

  if (profile?.hrZones) {
    return profile.hrZones
  }

  // 2. Fallback: Try to get zones from the most recent Test with zones
  // We fetch tests and filter in code to be safe with JSON null checks
  const tests = await prisma.test.findMany({
    where: { 
      clientId,
      trainingZones: { not: undefined } // Just to filter empty
    },
    orderBy: { testDate: 'desc' },
    take: 5,
    select: { trainingZones: true }
  })

  const validTest = tests.find(t => t.trainingZones !== null)
  
  if (validTest?.trainingZones) {
    return validTest.trainingZones
  }

  return null
}


