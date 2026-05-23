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
type RosterAthlete = {
  name: string
  position: 'G' | 'D' | 'C' | 'W'
  jersey: number
  birthYear: number
  height: number
  weight: number
}

const legacyDemoAthleteNote = 'Skelleftea hockey demo athlete. Safe to overwrite by rerunning seed:skelleftea-hockey-demo.'
const seededRosterAthleteNote = 'Skelleftea AIK 2026 roster seed. Safe to overwrite by rerunning seed:skelleftea-hockey-demo.'

const roster: Record<TeamName, RosterAthlete[]> = {
  'A-team': [
    { name: 'Viktor Grahn', position: 'D', jersey: 3, birthYear: 1998, height: 183, weight: 83 },
    { name: 'Rasmus Bergqvist', position: 'D', jersey: 4, birthYear: 2005, height: 187, weight: 82 },
    { name: 'Måns Forsfjäll', position: 'D', jersey: 6, birthYear: 2002, height: 182, weight: 81 },
    { name: 'Frans Haara', position: 'D', jersey: 7, birthYear: 2004, height: 186, weight: 87 },
    { name: 'Oliver Okuliar', position: 'W', jersey: 8, birthYear: 2000, height: 187, weight: 86 },
    { name: 'Victor Stjernborg', position: 'C', jersey: 9, birthYear: 2003, height: 180, weight: 86 },
    { name: 'Valter Lindberg', position: 'C', jersey: 12, birthYear: 2006, height: 178, weight: 78 },
    { name: 'Andreas Johnsson', position: 'W', jersey: 14, birthYear: 1994, height: 178, weight: 82 },
    { name: 'Pär Lindholm', position: 'C', jersey: 17, birthYear: 1991, height: 190, weight: 90 },
    { name: 'Jonathan Johnson', position: 'C', jersey: 22, birthYear: 1993, height: 183, weight: 83 },
    { name: 'Oscar Lindberg', position: 'C', jersey: 24, birthYear: 1991, height: 185, weight: 89 },
    { name: 'Pontus Johansson', position: 'D', jersey: 25, birthYear: 2001, height: 185, weight: 84 },
    { name: 'Andro Kaderli', position: 'W', jersey: 28, birthYear: 2005, height: 183, weight: 89 },
    { name: 'Mikkel Aagaard', position: 'W', jersey: 29, birthYear: 1995, height: 184, weight: 81 },
    { name: 'Jani Lampinen', position: 'G', jersey: 31, birthYear: 2003, height: 188, weight: 80 },
    { name: 'Linus Söderström', position: 'G', jersey: 32, birthYear: 1996, height: 194, weight: 90 },
    { name: 'Zeb Forsfjäll', position: 'C', jersey: 33, birthYear: 2005, height: 176, weight: 82 },
    { name: 'Strauss Mann', position: 'G', jersey: 38, birthYear: 1998, height: 183, weight: 79 },
    { name: 'Arvid Lundberg', position: 'D', jersey: 52, birthYear: 1994, height: 185, weight: 87 },
    { name: 'Emil Djuse', position: 'D', jersey: 57, birthYear: 1993, height: 181, weight: 84 },
    { name: 'Jonathan Pudas', position: 'D', jersey: 64, birthYear: 1993, height: 179, weight: 79 },
    { name: 'Jonathan Davidsson', position: 'W', jersey: 71, birthYear: 1997, height: 182, weight: 84 },
    { name: 'Oskar Vuollet', position: 'C', jersey: 72, birthYear: 2004, height: 183, weight: 86 },
    { name: 'Viggo Nordlund', position: 'W', jersey: 73, birthYear: 2006, height: 176, weight: 76 },
    { name: 'Rickard Hugg', position: 'W', jersey: 96, birthYear: 1999, height: 179, weight: 86 },
  ],
  J20: [],
  J18: [],
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

function athleteSeed(teamName: TeamName, athlete: RosterAthlete, athleteIndex: number, seasonIndex: number) {
  const base = levelBase(teamName)
  const positionAdj = positionAdjustment(athlete.position)
  const progress = seasonIndex * 0.045
  const athleteOffset = athleteIndex * 0.012
  const sprint30 = round(4.72 - base * 0.22 - progress + positionAdj.sprint + athleteOffset, 2)
  const sprint20 = round(sprint30 * 0.72, 2)
  const sprint10 = round(sprint30 * 0.42, 2)
  const first40 = round(6.05 - base * 0.23 - progress + positionAdj.sprint + athleteOffset, 2)
  const fatigue = 0.05 + athleteIndex * 0.025 + (athlete.position === 'G' ? 0.05 : 0) - seasonIndex * 0.006
  const endurance7x40 = Array.from({ length: 7 }, (_, index) => round(first40 + index * fatigue, 2))
  const repeated = buildRepeatedSprintProfile(endurance7x40)
  const vo2Max = round(51 + base * 6 + progress * 34 + positionAdj.endurance - athleteIndex * 0.4, 1)
  const bodyMass = athlete.weight

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
    maxHeartRate: Math.round(190 + athleteIndex - (athlete.position === 'G' ? 2 : 0)),
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

  const existingOrganization = await prisma.organization.findUnique({
    where: { id: `${businessSlug}-org` },
    select: { user: true },
  })
  if (existingOrganization?.user) return existingOrganization.user

  const existingBusiness = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: {
      members: {
        where: { isActive: true, role: 'OWNER' },
        orderBy: [{ acceptedAt: 'asc' }],
        take: 1,
        select: { user: true },
      },
    },
  })

  let owner = existingBusiness?.members[0]?.user
  if (owner) return owner

  const fallbackBusiness = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: {
      members: {
        where: { isActive: true },
        orderBy: [{ acceptedAt: 'asc' }],
        take: 1,
        select: { user: true },
      },
    },
  })

  owner = fallbackBusiness?.members[0]?.user
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

async function deleteStaleSeededAthletes(businessId: string) {
  const currentRosterNames = Object.values(roster).flat().map((athlete) => athlete.name)
  const staleSeededAthletes = await prisma.client.findMany({
    where: {
      businessId,
      OR: [
        { notes: legacyDemoAthleteNote },
        { notes: seededRosterAthleteNote },
        { name: { startsWith: 'Pilot ' } },
      ],
      ...(currentRosterNames.length > 0 ? { NOT: { name: { in: currentRosterNames } } } : {}),
    },
    select: { id: true },
  })

  if (staleSeededAthletes.length === 0) return 0

  await prisma.client.deleteMany({
    where: { id: { in: staleSeededAthletes.map((athlete) => athlete.id) } },
  })

  return staleSeededAthletes.length
}

async function deleteEmptySeededTeams(organizationId: string) {
  const seededTeams = await prisma.team.findMany({
    where: {
      organizationId,
      name: { in: Object.keys(roster) },
      OR: [
        { description: { contains: 'pilot group' } },
        { description: { contains: 'demo group' } },
        { description: { contains: 'roster group' } },
      ],
    },
    select: {
      id: true,
      _count: {
        select: {
          members: true,
          hockeyPhysicalTests: true,
          events: true,
          plans: true,
          workoutBroadcasts: true,
          liveHRSessions: true,
          intervalSessions: true,
          coachAssignments: true,
          communityPosts: true,
          drills: true,
          notes: true,
          customTestResults: true,
          physioAssignments: true,
        },
      },
    },
  })

  const emptyTeamIds = seededTeams
    .filter((team) => Object.values(team._count).every((count) => count === 0))
    .map((team) => team.id)

  if (emptyTeamIds.length === 0) return 0

  await prisma.team.deleteMany({
    where: { id: { in: emptyTeamIds } },
  })

  return emptyTeamIds.length
}

async function deleteLegacyNoDataPilotTeams(organizationId: string) {
  const legacyTeams = await prisma.team.findMany({
    where: {
      organizationId,
      name: { in: Object.keys(roster) },
      OR: [
        { description: { contains: 'pilot group' } },
        { description: { contains: 'demo group' } },
      ],
    },
    select: {
      id: true,
      members: {
        select: {
          id: true,
          name: true,
          notes: true,
          athleteProfile: { select: { id: true } },
          athleteAccount: { select: { id: true } },
          sportProfile: { select: { id: true } },
          _count: {
            select: {
              tests: true,
              hockeyPhysicalTests: true,
              trainingPrograms: true,
              athletePlans: true,
              dailyMetrics: true,
              trainingLoads: true,
              injuryAssessments: true,
              strengthSessions: true,
              cardioSessionAssignments: true,
              strengthSessionAssignments: true,
              hybridWorkoutAssignments: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          hockeyPhysicalTests: true,
          events: true,
          plans: true,
          workoutBroadcasts: true,
          liveHRSessions: true,
          intervalSessions: true,
          coachAssignments: true,
          communityPosts: true,
          drills: true,
          notes: true,
          customTestResults: true,
          physioAssignments: true,
        },
      },
    },
  })

  const deletableTeamIds: string[] = []
  const deletableClientIds: string[] = []

  for (const team of legacyTeams) {
    const hasNoTeamData = Object.entries(team._count).every(([key, count]) => {
      if (key === 'members') return true
      return count === 0
    })
    if (!hasNoTeamData) continue

    const safeMembers = team.members.filter((member) => {
      const isKnownSeededMember =
        member.name.startsWith('Pilot ') ||
        member.notes === legacyDemoAthleteNote ||
        member.notes === seededRosterAthleteNote
      const hasNoMemberData =
        Object.values(member._count).every((count) => count === 0) &&
        !member.athleteProfile &&
        !member.athleteAccount &&
        !member.sportProfile

      return isKnownSeededMember || hasNoMemberData
    })

    if (safeMembers.length !== team.members.length) continue

    deletableTeamIds.push(team.id)
    deletableClientIds.push(...safeMembers.map((member) => member.id))
  }

  if (deletableTeamIds.length === 0) return { teams: 0, athletes: 0 }

  if (deletableClientIds.length > 0) {
    await prisma.client.deleteMany({
      where: { id: { in: deletableClientIds } },
    })
  }
  await prisma.team.deleteMany({
    where: { id: { in: deletableTeamIds } },
  })

  return { teams: deletableTeamIds.length, athletes: deletableClientIds.length }
}

async function deleteDuplicateSeededRosterTeams(organizationId: string, ownerId: string) {
  const teamNamesWithRoster = Object.entries(roster)
    .filter(([, athletes]) => athletes.length > 0)
    .map(([teamName]) => teamName)

  const seededTeams = await prisma.team.findMany({
    where: {
      organizationId,
      name: { in: teamNamesWithRoster },
      description: { contains: 'roster group' },
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      userId: true,
      createdAt: true,
      members: { select: { notes: true } },
      _count: {
        select: {
          members: true,
          events: true,
          plans: true,
          workoutBroadcasts: true,
          liveHRSessions: true,
          intervalSessions: true,
          coachAssignments: true,
          communityPosts: true,
          drills: true,
          notes: true,
          customTestResults: true,
          physioAssignments: true,
        },
      },
    },
  })

  const teamsByName = seededTeams.reduce((groups, team) => {
    const teams = groups.get(team.name) ?? []
    teams.push(team)
    groups.set(team.name, teams)
    return groups
  }, new Map<string, typeof seededTeams>())

  const duplicateTeamIds: string[] = []
  for (const teams of teamsByName.values()) {
    if (teams.length <= 1) continue

    const [canonical] = [...teams].sort((a, b) => {
      if (a.userId === ownerId && b.userId !== ownerId) return -1
      if (a.userId !== ownerId && b.userId === ownerId) return 1
      if (a._count.members !== b._count.members) return b._count.members - a._count.members
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    for (const team of teams) {
      const isDuplicate = team.id !== canonical.id
      const hasOnlySeededRosterMembers =
        team.members.length > 0 &&
        team.members.every((member) => member.notes === seededRosterAthleteNote)
      const hasNoManualTeamData = Object.entries(team._count).every(([key, count]) => {
        if (key === 'members') return true
        return count === 0
      })

      if (isDuplicate && hasOnlySeededRosterMembers && hasNoManualTeamData) {
        duplicateTeamIds.push(team.id)
      }
    }
  }

  if (duplicateTeamIds.length === 0) return { teams: 0, athletes: 0 }

  const deletedAthletes = await prisma.client.deleteMany({
    where: {
      teamId: { in: duplicateTeamIds },
      notes: seededRosterAthleteNote,
    },
  })
  await prisma.team.deleteMany({
    where: { id: { in: duplicateTeamIds } },
  })

  return { teams: duplicateTeamIds.length, athletes: deletedAthletes.count }
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
      description: 'Roster workspace with longitudinal hockey testing data.',
    },
  })

  let athletes = 0
  let hockeyTests = 0
  const removedStaleAthletes = await deleteStaleSeededAthletes(business.id)
  const removedLegacyPilot = await deleteLegacyNoDataPilotTeams(organization.id)
  let removedEmptyTeams = await deleteEmptySeededTeams(organization.id)

  for (const teamName of Object.keys(roster) as TeamName[]) {
    const teamRoster = roster[teamName]
    if (teamRoster.length === 0) continue

    const team = await upsertByFindFirst(
      () => prisma.team.findFirst({ where: { userId: owner.id, organizationId: organization.id, name: teamName } }),
      () => prisma.team.create({
        data: {
          userId: owner.id,
          organizationId: organization.id,
          name: teamName,
          sportType: 'TEAM_ICE_HOCKEY',
          description: `${businessName} ${teamName} roster group`,
        },
      }),
      (existing) => prisma.team.update({
        where: { id: existing.id },
        data: { sportType: 'TEAM_ICE_HOCKEY', description: `${businessName} ${teamName} roster group` },
      }),
    )

    for (const [athleteIndex, athlete] of teamRoster.entries()) {
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
            height: athlete.height,
            weight: athlete.weight,
            position: athlete.position,
            jerseyNumber: athlete.jersey,
            notes: seededRosterAthleteNote,
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
            height: athlete.height,
            weight: athlete.weight,
            position: athlete.position,
            jerseyNumber: athlete.jersey,
            notes: seededRosterAthleteNote,
          },
        }),
      )
      athletes += 1

      const latest = athleteSeed(teamName, athlete, athleteIndex, seasonDates.length - 1)
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
        const seed = athleteSeed(teamName, athlete, athleteIndex, seasonIndex)
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

  const removedDuplicateRoster = await deleteDuplicateSeededRosterTeams(organization.id, owner.id)
  removedEmptyTeams += await deleteEmptySeededTeams(organization.id)

  console.log(`Removed ${removedStaleAthletes} stale seeded athletes from /${business.slug}.`)
  console.log(
    `Removed ${removedLegacyPilot.athletes} legacy no-data pilot athletes across ${removedLegacyPilot.teams} teams from /${business.slug}.`,
  )
  console.log(
    `Removed ${removedDuplicateRoster.athletes} duplicate seeded roster athletes across ${removedDuplicateRoster.teams} teams from /${business.slug}.`,
  )
  console.log(`Removed ${removedEmptyTeams} empty seeded teams from /${business.slug}.`)
  console.log(`Seeded ${athletes} roster athletes and ${hockeyTests} hockey tests for /${business.slug}.`)
  console.log('Half of latest seeded hockey tests intentionally omit aerobic lab fields, so linked-source badges can be verified.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
