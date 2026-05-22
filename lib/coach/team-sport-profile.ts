import type { Prisma, SportType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type SportProfileDb = typeof prisma | Prisma.TransactionClient

const PROFILE_SPORTS = [
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
  'HYROX',
  'GENERAL_FITNESS',
  'FUNCTIONAL_FITNESS',
  'STRENGTH',
  'TEAM_FOOTBALL',
  'TEAM_ICE_HOCKEY',
  'TEAM_HANDBALL',
  'TEAM_FLOORBALL',
  'TEAM_BASKETBALL',
  'TEAM_VOLLEYBALL',
  'TENNIS',
  'PADEL',
  'NUTRITION',
] as const satisfies readonly SportType[]

const LEGACY_SPORT_ALIASES: Record<string, SportType> = {
  FOOTBALL: 'TEAM_FOOTBALL',
  SOCCER: 'TEAM_FOOTBALL',
  HOCKEY: 'TEAM_ICE_HOCKEY',
  ICE_HOCKEY: 'TEAM_ICE_HOCKEY',
  ISHOCKEY: 'TEAM_ICE_HOCKEY',
  HANDBALL: 'TEAM_HANDBALL',
  FLOORBALL: 'TEAM_FLOORBALL',
  INNEBANDY: 'TEAM_FLOORBALL',
  BASKETBALL: 'TEAM_BASKETBALL',
  VOLLEYBALL: 'TEAM_VOLLEYBALL',
}

const PROFILE_SPORT_SET = new Set<string>(PROFILE_SPORTS)

export function resolveTeamSportProfileSport(sportType: string | null | undefined): SportType | null {
  if (!sportType) return null
  const normalized = sportType.trim().toUpperCase()
  if (PROFILE_SPORT_SET.has(normalized)) return normalized as SportType
  return LEGACY_SPORT_ALIASES[normalized] ?? null
}

export async function syncClientSportProfileToTeam(
  clientId: string,
  sportType: string | null | undefined,
  db: SportProfileDb = prisma
) {
  const primarySport = resolveTeamSportProfileSport(sportType)
  if (!primarySport) return null

  return db.sportProfile.upsert({
    where: { clientId },
    update: { primarySport },
    create: {
      clientId,
      primarySport,
      onboardingCompleted: false,
      onboardingStep: 0,
    },
  })
}

export async function syncTeamMemberSportProfilesToTeam(
  teamId: string,
  sportType?: string | null,
  db: SportProfileDb = prisma
) {
  const resolvedSport =
    sportType === undefined
      ? resolveTeamSportProfileSport(
          (
            await db.team.findUnique({
              where: { id: teamId },
              select: { sportType: true },
            })
          )?.sportType
        )
      : resolveTeamSportProfileSport(sportType)

  if (!resolvedSport) return 0

  const members = await db.client.findMany({
    where: { teamId },
    select: { id: true },
  })

  for (const member of members) {
    await syncClientSportProfileToTeam(member.id, resolvedSport, db)
  }

  return members.length
}
