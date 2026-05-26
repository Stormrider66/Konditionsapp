import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const DEFAULT_BUSINESS_SLUG = 'skelleftea-aik'
const DEFAULT_TEAM_NAME = 'A-team'
const SEEDED_PROFILE_DATE = new Date('2026-04-29T10:00:00.000Z')

function loadLocalEnv() {
  const dotenvLocalPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(dotenvLocalPath)) return

  const contents = fs.readFileSync(dotenvLocalPath, 'utf8')
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1')
    if (!process.env[key]) process.env[key] = value
  }
}

function argValue(name: string, fallback: string) {
  const prefix = `${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefix))
  return value ? value.slice(prefix.length).trim() || fallback : fallback
}

function hasApplyFlag() {
  return process.argv.includes('--apply')
}

loadLocalEnv()

const prisma = new PrismaClient()

async function main() {
  const businessSlug = argValue('--business-slug', process.env.SKELLEFTEA_BUSINESS_SLUG ?? DEFAULT_BUSINESS_SLUG)
  const teamName = argValue('--team-name', process.env.SKELLEFTEA_TEAM_NAME ?? DEFAULT_TEAM_NAME)
  const apply = hasApplyFlag()

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, slug: true, name: true },
  })

  if (!business) {
    throw new Error(`Business not found: ${businessSlug}`)
  }

  const teams = await prisma.team.findMany({
    where: {
      name: teamName,
      members: { some: { businessId: business.id } },
    },
    select: {
      id: true,
      name: true,
      description: true,
      members: {
        select: {
          id: true,
          name: true,
          notes: true,
        },
      },
    },
  })

  if (teams.length === 0) {
    throw new Error(`No ${teamName} team found for /${business.slug}`)
  }

  const teamIds = teams.map((team) => team.id)
  const memberIds = teams.flatMap((team) => team.members.map((member) => member.id))
  const seededMemberIds = teams.flatMap((team) => (
    team.members
      .filter((member) => member.notes?.includes('Skelleftea AIK 2026 roster seed'))
      .map((member) => member.id)
  ))

  const demoHockeyWhere = {
    teamId: { in: teamIds },
    clientId: { in: memberIds },
    notes: { startsWith: `Demo ${teamName} pathway test` },
  }

  const demoLabWhere = {
    clientId: { in: memberIds },
    OR: [
      { notes: { startsWith: 'Demo VO2/ramp source' } },
      { location: 'Skelleftea demo lab' },
      { testLeader: 'Trainomics demo' },
    ],
  }

  const seededProfileWhere = {
    clientId: { in: seededMemberIds },
    lactateTestDate: SEEDED_PROFILE_DATE,
    lactateConfidence: 'HIGH',
  }

  const [demoHockeyTests, demoLabTests, seededProfiles] = await Promise.all([
    prisma.hockeyPhysicalTest.count({ where: demoHockeyWhere }),
    prisma.test.count({ where: demoLabWhere }),
    prisma.athleteProfile.count({ where: seededProfileWhere }),
  ])

  console.log(
    [
      apply ? 'Applying cleanup' : 'Dry run',
      `business=/${business.slug}`,
      `team=${teamName}`,
      `teams=${teams.length}`,
      `members=${memberIds.length}`,
      `seededMembers=${seededMemberIds.length}`,
      `demoHockeyTests=${demoHockeyTests}`,
      `demoLabTests=${demoLabTests}`,
      `seededProfilesToClear=${seededProfiles}`,
    ].join(' | '),
  )

  if (!apply) {
    console.log('No changes made. Re-run with --apply to delete the demo rows.')
    return
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedHockeyTests = await tx.hockeyPhysicalTest.deleteMany({ where: demoHockeyWhere })
    const deletedLabTests = await tx.test.deleteMany({ where: demoLabWhere })
    const clearedProfiles = await tx.athleteProfile.updateMany({
      where: seededProfileWhere,
      data: {
        maxLactate: null,
        lt2Speed: null,
        lt2HeartRate: null,
        lactateTestDate: null,
        lactateConfidence: null,
      },
    })

    return {
      deletedHockeyTests: deletedHockeyTests.count,
      deletedLabTests: deletedLabTests.count,
      clearedProfiles: clearedProfiles.count,
    }
  })

  console.log(
    [
      'Cleanup complete',
      `deletedHockeyTests=${result.deletedHockeyTests}`,
      `deletedLabTests=${result.deletedLabTests}`,
      `clearedProfiles=${result.clearedProfiles}`,
    ].join(' | '),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
