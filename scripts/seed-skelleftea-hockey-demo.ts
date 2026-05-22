import fs from 'node:fs'
import path from 'node:path'
import { FeatureFlag, Gender, PrismaClient, TestStatus, TestType } from '@prisma/client'
import { buildRepeatedSprintProfile } from '../lib/hockey/ice-speed'

const prisma = new PrismaClient()
const dotenvLocalPath = path.join(process.cwd(), '.env.local')

const businessSlug = process.env.SKELLEFTEA_BUSINESS_SLUG ?? 'skelleftea-aik'
const businessName = process.env.SKELLEFTEA_BUSINESS_NAME ?? 'Skellefteå AIK'
const ownerEmail = process.env.SKELLEFTEA_OWNER_EMAIL
const skellefteaBranding = {
  logoUrl: '/brands/skelleftea-aik-logo.png',
  primaryColor: '#FFC323',
  secondaryColor: '#000000',
  backgroundColor: '#FFFFFF',
  faviconUrl: '/brands/skelleftea-aik-logo.png',
  fontFamily: 'Inter',
}

function asSettingsObject(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {}
  }
  return { ...(settings as Record<string, unknown>) }
}

type TeamName = 'A-team' | 'J20' | 'J18'

const roster: Record<TeamName, Array<{ name: string; position: string; jersey: number; birthYear: number }>> = {
  'A-team': [
    { name: 'Pilot Forward A1', position: 'C', jersey: 11, birthYear: 2002 },
    { name: 'Pilot Forward A2', position: 'W', jersey: 18, birthYear: 2001 },
    { name: 'Pilot Defender A1', position: 'D', jersey: 44, birthYear: 2000 },
    { name: 'Pilot Goalie A1', position: 'G', jersey: 31, birthYear: 1999 },
  ],
  J20: [
    { name: 'Pilot Forward J20-1', position: 'C', jersey: 21, birthYear: 2006 },
    { name: 'Pilot Forward J20-2', position: 'W', jersey: 27, birthYear: 2006 },
    { name: 'Pilot Defender J20-1', position: 'D', jersey: 55, birthYear: 2005 },
    { name: 'Pilot Goalie J20-1', position: 'G', jersey: 35, birthYear: 2005 },
  ],
  J18: [
    { name: 'Pilot Forward J18-1', position: 'C', jersey: 16, birthYear: 2008 },
    { name: 'Pilot Forward J18-2', position: 'W', jersey: 24, birthYear: 2008 },
    { name: 'Pilot Defender J18-1', position: 'D', jersey: 47, birthYear: 2007 },
    { name: 'Pilot Goalie J18-1', position: 'G', jersey: 30, birthYear: 2007 },
  ],
}

const seasonDates = [
  new Date('2024-05-15T10:00:00.000Z'),
  new Date('2025-05-15T10:00:00.000Z'),
  new Date('2026-04-29T10:00:00.000Z'),
]

function loadLocalEnv() {
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

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function levelBase(teamName: TeamName) {
  if (teamName === 'A-team') return 1
  if (teamName === 'J20') return 0.82
  return 0.66
}

function positionAdjustment(position: string) {
  if (position === 'G') return { sprint: 0.08, endurance: -0.9, strength: 0.02, jump: -4 }
  if (position === 'D') return { sprint: 0.03, endurance: -0.2, strength: 0.06, jump: -1 }
  if (position === 'C') return { sprint: -0.02, endurance: 0.8, strength: 0, jump: 1 }
  return { sprint: -0.04, endurance: 0.2, strength: -0.02, jump: 2 }
}

function athleteSeed(teamName: TeamName, position: string, athleteIndex: number, seasonIndex: number) {
  const base = levelBase(teamName)
  const positionAdj = positionAdjustment(position)
  const progress = seasonIndex * 0.045
  const athleteOffset = athleteIndex * 0.012
  const sprint30 = round(4.72 - base * 0.22 - progress + positionAdj.sprint + athleteOffset, 2)
  const sprint20 = round(sprint30 * 0.72, 2)
  const sprint10 = round(sprint30 * 0.42, 2)
  const first40 = round(6.05 - base * 0.23 - progress + positionAdj.sprint + athleteOffset, 2)
  const fatigue = 0.05 + athleteIndex * 0.025 + (position === 'G' ? 0.05 : 0) - seasonIndex * 0.006
  const endurance7x40 = Array.from({ length: 7 }, (_, index) => round(first40 + index * fatigue, 2))
  const repeated = buildRepeatedSprintProfile(endurance7x40)
  const vo2Max = round(51 + base * 6 + progress * 34 + positionAdj.endurance - athleteIndex * 0.4, 1)
  const bodyMass = position === 'G' ? 88 : position === 'D' ? 86 : 82

  return {
    bodyMass,
    agility505Left: round(4.72 - base * 0.15 - progress + athleteOffset, 2),
    agility505Right: round(4.76 - base * 0.15 - progress + athleteOffset, 2),
    sprint5m: round(sprint10 * 0.58, 2),
    sprint10m: sprint10,
    sprint20m: sprint20,
    sprint30m: sprint30,
    endurance7x40,
    enduranceResistance: repeated.fatigueResistancePct,
    standingLongJump: round(228 + base * 18 + progress * 120 + positionAdj.jump - athleteIndex * 1.5, 0),
    threeJumpLeft: round(650 + base * 42 + progress * 180 + positionAdj.jump * 2 - athleteIndex * 4, 0),
    threeJumpRight: round(658 + base * 42 + progress * 180 + positionAdj.jump * 2 - athleteIndex * 4, 0),
    gripStrengthLeft: round(50 + base * 6 + progress * 22 + athleteIndex, 1),
    gripStrengthRight: round(52 + base * 6 + progress * 22 + athleteIndex, 1),
    backSquat1RM: round(bodyMass * (1.42 + base * 0.22 + progress + positionAdj.strength), 0),
    powerClean1RM: round(bodyMass * (0.82 + base * 0.14 + progress * 0.7 + positionAdj.strength), 0),
    benchPress1RM: round(bodyMass * (1.02 + base * 0.12 + progress * 0.6 + positionAdj.strength), 0),
    pullUp1RM: round(24 + base * 12 + progress * 45 - athleteIndex, 0),
    beepTestLevel: round(11.2 + base * 1.2 + progress * 7 + positionAdj.endurance * 0.1 - athleteIndex * 0.08, 1),
    beepTestShuttle: 5 + athleteIndex,
    vo2Max,
    lt1SpeedKmh: round(10.5 + base * 1.2 + progress * 7 + positionAdj.endurance * 0.15, 1),
    lt1HeartRate: Math.round(148 + base * 4 + seasonIndex * 2),
    lt1Lactate: round(1.7 + athleteIndex * 0.05, 1),
    lt2SpeedKmh: round(13.2 + base * 1.5 + progress * 8 + positionAdj.endurance * 0.2, 1),
    lt2HeartRate: Math.round(174 + base * 5 + seasonIndex),
    lt2Lactate: round(3.4 + athleteIndex * 0.12, 1),
    maxLactate: round(8.6 + base * 1.1 + athleteIndex * 0.2, 1),
    maxHeartRate: Math.round(190 + athleteIndex - (position === 'G' ? 2 : 0)),
    rampTimeSeconds: Math.round(690 + base * 95 + seasonIndex * 32 + positionAdj.endurance * 10),
    muscleLabMaxima: {
      protocolLabel: 'Quarter-depth loaded jump squat power profile',
      maxAveragePowerW: round(bodyMass * (24.5 + base * 2.3 + progress * 16), 0),
      maxAveragePowerPerBodyMass: round(24.5 + base * 2.3 + progress * 16, 1),
      bestPowerLoadKg: 40,
      powerPlateauLoadsKg: [20, 40],
      maxAverageForceN: round(bodyMass * (22.5 + base * 1.8), 0),
      maxAverageVelocityMs: round(1.48 + base * 0.15 + progress, 2),
      flags: ['Power plateau across +20 to +40 kg'],
    },
  }
}

async function findOwner() {
  const email = process.env.SKELLEFTEA_OWNER_EMAIL ?? ownerEmail
  if (email) {
    const owner = await prisma.user.findUnique({ where: { email } })
    if (owner) return owner
    throw new Error(`No Trainomics user found for ${email}.`)
  }

  const existingBusiness = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: {
      members: {
        where: { isActive: true },
        orderBy: [{ role: 'asc' }, { acceptedAt: 'asc' }],
        take: 1,
        select: { user: true },
      },
    },
  })

  const owner = existingBusiness?.members[0]?.user
  if (owner) return owner
  throw new Error('Set SKELLEFTEA_OWNER_EMAIL the first time you seed the Skelleftea demo workspace.')
}

async function upsertByFindFirst<T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
  update: (existing: T) => Promise<T>,
) {
  const existing = await find()
  return existing ? update(existing) : create()
}

async function main() {
  loadLocalEnv()
  const owner = await findOwner()

  const business = await prisma.business.upsert({
    where: { slug: businessSlug },
    update: {
      name: businessName,
      type: 'CLUB',
      isActive: true,
      ...skellefteaBranding,
      country: 'SE',
    },
    create: {
      name: businessName,
      slug: businessSlug,
      type: 'CLUB',
      isActive: true,
      ...skellefteaBranding,
      country: 'SE',
      email: owner.email,
    },
  })

  await prisma.business.update({
    where: { id: business.id },
    data: {
      settings: {
        ...asSettingsObject(business.settings),
        brandingHeaderVariant: 'modern',
      },
    },
  })

  await prisma.businessFeature.upsert({
    where: {
      businessId_feature: {
        businessId: business.id,
        feature: FeatureFlag.CUSTOM_BRANDING,
      },
    },
    update: {
      isEnabled: true,
      enabledAt: new Date(),
    },
    create: {
      businessId: business.id,
      feature: FeatureFlag.CUSTOM_BRANDING,
      isEnabled: true,
      enabledAt: new Date(),
    },
  })

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: business.id, userId: owner.id } },
    update: { role: 'OWNER', isActive: true, acceptedAt: new Date() },
    create: { businessId: business.id, userId: owner.id, role: 'OWNER', isActive: true, acceptedAt: new Date() },
  })

  const organization = await prisma.organization.upsert({
    where: { id: `${businessSlug}-org` },
    update: { userId: owner.id, name: businessName, sportType: 'TEAM_ICE_HOCKEY' },
    create: {
      id: `${businessSlug}-org`,
      userId: owner.id,
      name: businessName,
      sportType: 'TEAM_ICE_HOCKEY',
      description: 'Demo workspace with longitudinal hockey testing data.',
    },
  })

  let athletes = 0
  let hockeyTests = 0

  for (const teamName of Object.keys(roster) as TeamName[]) {
    const team = await upsertByFindFirst(
      () => prisma.team.findFirst({ where: { userId: owner.id, organizationId: organization.id, name: teamName } }),
      () => prisma.team.create({
        data: {
          userId: owner.id,
          organizationId: organization.id,
          name: teamName,
          sportType: 'TEAM_ICE_HOCKEY',
          description: `${businessName} ${teamName} demo group`,
        },
      }),
      (existing) => prisma.team.update({
        where: { id: existing.id },
        data: { sportType: 'TEAM_ICE_HOCKEY', description: `${businessName} ${teamName} demo group` },
      }),
    )

    for (const [athleteIndex, athlete] of roster[teamName].entries()) {
      const email = `demo.${businessSlug}.${teamName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${athlete.jersey}@trainomics.test`
      const client = await upsertByFindFirst(
        () => prisma.client.findFirst({ where: { userId: owner.id, teamId: team.id, name: athlete.name } }),
        () => prisma.client.create({
          data: {
            userId: owner.id,
            businessId: business.id,
            teamId: team.id,
            name: athlete.name,
            email,
            gender: Gender.MALE,
            birthDate: new Date(`${athlete.birthYear}-07-01T00:00:00.000Z`),
            height: athlete.position === 'G' ? 188 : athlete.position === 'D' ? 184 : 181,
            weight: athlete.position === 'G' ? 88 : athlete.position === 'D' ? 86 : 82,
            position: athlete.position,
            jerseyNumber: athlete.jersey,
            notes: 'Skelleftea hockey demo athlete. Safe to overwrite by rerunning seed:skelleftea-hockey-demo.',
            manualVo2max: null,
            manualMaxHR: null,
          },
        }),
        (existing) => prisma.client.update({
          where: { id: existing.id },
          data: {
            businessId: business.id,
            teamId: team.id,
            email,
            position: athlete.position,
            jerseyNumber: athlete.jersey,
            notes: 'Skelleftea hockey demo athlete. Safe to overwrite by rerunning seed:skelleftea-hockey-demo.',
          },
        }),
      )
      athletes += 1

      const latest = athleteSeed(teamName, athlete.position, athleteIndex, seasonDates.length - 1)
      await prisma.athleteProfile.upsert({
        where: { clientId: client.id },
        update: {
          category: teamName === 'A-team' ? 'ELITE' : 'ADVANCED',
          maxLactate: latest.maxLactate,
          lt2Speed: latest.lt2SpeedKmh,
          lt2HeartRate: latest.lt2HeartRate,
          lactateTestDate: seasonDates.at(-1),
          lactateConfidence: 'HIGH',
        },
        create: {
          clientId: client.id,
          category: teamName === 'A-team' ? 'ELITE' : 'ADVANCED',
          maxLactate: latest.maxLactate,
          lt2Speed: latest.lt2SpeedKmh,
          lt2HeartRate: latest.lt2HeartRate,
          lactateTestDate: seasonDates.at(-1),
          lactateConfidence: 'HIGH',
        },
      })

      for (const [seasonIndex, testDate] of seasonDates.entries()) {
        const seed = athleteSeed(teamName, athlete.position, athleteIndex, seasonIndex)
        const labDate = new Date(testDate)
        labDate.setUTCHours(8, 30, 0, 0)
        const omitAerobicInHockeyTest = seasonIndex === seasonDates.length - 1 && athleteIndex % 2 === 0

        await upsertByFindFirst(
          () => prisma.test.findFirst({ where: { clientId: client.id, userId: owner.id, testDate: labDate, testType: TestType.RUNNING } }),
          () => prisma.test.create({
            data: {
              clientId: client.id,
              userId: owner.id,
              testDate: labDate,
              testType: TestType.RUNNING,
              status: TestStatus.COMPLETED,
              location: 'Skelleftea demo lab',
              testLeader: 'Trainomics demo',
              vo2max: seed.vo2Max,
              maxHR: seed.maxHeartRate,
              maxLactate: seed.maxLactate,
              aerobicThreshold: { value: seed.lt1SpeedKmh, unit: 'km/h', hr: seed.lt1HeartRate, lactate: seed.lt1Lactate },
              anaerobicThreshold: { value: seed.lt2SpeedKmh, unit: 'km/h', hr: seed.lt2HeartRate, lactate: seed.lt2Lactate },
              postTestMeasurements: [
                { timeMin: 1, lactate: round(seed.maxLactate - 0.6, 1), heartRate: seed.maxHeartRate },
                { timeMin: 3, lactate: seed.maxLactate, heartRate: seed.maxHeartRate - 5 },
              ],
              notes: `Demo VO2/ramp source for ${athlete.name}.`,
            },
          }),
          (existing) => prisma.test.update({
            where: { id: existing.id },
            data: {
              status: TestStatus.COMPLETED,
              vo2max: seed.vo2Max,
              maxHR: seed.maxHeartRate,
              maxLactate: seed.maxLactate,
              aerobicThreshold: { value: seed.lt1SpeedKmh, unit: 'km/h', hr: seed.lt1HeartRate, lactate: seed.lt1Lactate },
              anaerobicThreshold: { value: seed.lt2SpeedKmh, unit: 'km/h', hr: seed.lt2HeartRate, lactate: seed.lt2Lactate },
              postTestMeasurements: [
                { timeMin: 1, lactate: round(seed.maxLactate - 0.6, 1), heartRate: seed.maxHeartRate },
                { timeMin: 3, lactate: seed.maxLactate, heartRate: seed.maxHeartRate - 5 },
              ],
            },
          }),
        )

        await upsertByFindFirst(
          () => prisma.hockeyPhysicalTest.findFirst({ where: { clientId: client.id, teamId: team.id, testDate } }),
          () => prisma.hockeyPhysicalTest.create({
            data: {
              clientId: client.id,
              teamId: team.id,
              coachId: owner.id,
              testDate,
              notes: `Demo ${teamName} pathway test, season ${seasonIndex + 1}.`,
              agility505Left: seed.agility505Left,
              agility505Right: seed.agility505Right,
              sprint5m: seed.sprint5m,
              sprint10m: seed.sprint10m,
              sprint20m: seed.sprint20m,
              sprint30m: seed.sprint30m,
              endurance7x40: seed.endurance7x40,
              standingLongJump: seed.standingLongJump,
              threeJumpLeft: seed.threeJumpLeft,
              threeJumpRight: seed.threeJumpRight,
              gripStrengthLeft: seed.gripStrengthLeft,
              gripStrengthRight: seed.gripStrengthRight,
              backSquat1RM: seed.backSquat1RM,
              powerClean1RM: seed.powerClean1RM,
              benchPress1RM: seed.benchPress1RM,
              pullUp1RM: seed.pullUp1RM,
              beepTestLevel: seed.beepTestLevel,
              beepTestShuttle: seed.beepTestShuttle,
              vo2Max: omitAerobicInHockeyTest ? null : seed.vo2Max,
              lt1SpeedKmh: omitAerobicInHockeyTest ? null : seed.lt1SpeedKmh,
              lt1HeartRate: omitAerobicInHockeyTest ? null : seed.lt1HeartRate,
              lt1Lactate: omitAerobicInHockeyTest ? null : seed.lt1Lactate,
              lt2SpeedKmh: omitAerobicInHockeyTest ? null : seed.lt2SpeedKmh,
              lt2HeartRate: omitAerobicInHockeyTest ? null : seed.lt2HeartRate,
              lt2Lactate: omitAerobicInHockeyTest ? null : seed.lt2Lactate,
              maxLactate: omitAerobicInHockeyTest ? null : seed.maxLactate,
              maxHeartRate: omitAerobicInHockeyTest ? null : seed.maxHeartRate,
              rampTimeSeconds: omitAerobicInHockeyTest ? null : seed.rampTimeSeconds,
              muscleLabMaxima: seed.muscleLabMaxima,
              sourceType: seasonIndex === seasonDates.length - 1 ? 'MUSCLE_LAB_IMPORT' : 'MANUAL',
            },
          }),
          (existing) => prisma.hockeyPhysicalTest.update({
            where: { id: existing.id },
            data: {
              notes: `Demo ${teamName} pathway test, season ${seasonIndex + 1}.`,
              agility505Left: seed.agility505Left,
              agility505Right: seed.agility505Right,
              sprint5m: seed.sprint5m,
              sprint10m: seed.sprint10m,
              sprint20m: seed.sprint20m,
              sprint30m: seed.sprint30m,
              endurance7x40: seed.endurance7x40,
              standingLongJump: seed.standingLongJump,
              threeJumpLeft: seed.threeJumpLeft,
              threeJumpRight: seed.threeJumpRight,
              gripStrengthLeft: seed.gripStrengthLeft,
              gripStrengthRight: seed.gripStrengthRight,
              backSquat1RM: seed.backSquat1RM,
              powerClean1RM: seed.powerClean1RM,
              benchPress1RM: seed.benchPress1RM,
              pullUp1RM: seed.pullUp1RM,
              beepTestLevel: seed.beepTestLevel,
              beepTestShuttle: seed.beepTestShuttle,
              vo2Max: omitAerobicInHockeyTest ? null : seed.vo2Max,
              lt1SpeedKmh: omitAerobicInHockeyTest ? null : seed.lt1SpeedKmh,
              lt1HeartRate: omitAerobicInHockeyTest ? null : seed.lt1HeartRate,
              lt1Lactate: omitAerobicInHockeyTest ? null : seed.lt1Lactate,
              lt2SpeedKmh: omitAerobicInHockeyTest ? null : seed.lt2SpeedKmh,
              lt2HeartRate: omitAerobicInHockeyTest ? null : seed.lt2HeartRate,
              lt2Lactate: omitAerobicInHockeyTest ? null : seed.lt2Lactate,
              maxLactate: omitAerobicInHockeyTest ? null : seed.maxLactate,
              maxHeartRate: omitAerobicInHockeyTest ? null : seed.maxHeartRate,
              rampTimeSeconds: omitAerobicInHockeyTest ? null : seed.rampTimeSeconds,
              muscleLabMaxima: seed.muscleLabMaxima,
              sourceType: seasonIndex === seasonDates.length - 1 ? 'MUSCLE_LAB_IMPORT' : 'MANUAL',
            },
          }),
        )
        hockeyTests += 1
      }
    }
  }

  console.log(`Seeded ${athletes} demo athletes and ${hockeyTests} hockey tests for /${business.slug}.`)
  console.log('Half of latest demo hockey tests intentionally omit aerobic lab fields, so linked-source badges can be verified.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
