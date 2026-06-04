import { createHash, randomBytes } from 'crypto'

import { prisma } from '@/lib/prisma'

export const EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES = ['calendar', 'workouts', 'tests'] as const
export const EXTERNAL_ATHLETE_ACCESS_TOKEN_PREFIX = 'eax_'

export type ExternalAthleteAccessStatus = 'active' | 'expired' | 'revoked'

export function createExternalAthleteAccessToken() {
  return `${EXTERNAL_ATHLETE_ACCESS_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
}

export function hashExternalAthleteAccessToken(token: string) {
  return createHash('sha256').update(token.trim()).digest('hex')
}

export function buildExternalAthleteAccessUrl(origin: string, token: string) {
  const baseUrl = origin.replace(/\/$/, '')
  return `${baseUrl}/external/athlete/${encodeURIComponent(token)}`
}

export function getExternalAthleteAccessStatus(access: {
  expiresAt?: Date | null
  revokedAt?: Date | null
}): ExternalAthleteAccessStatus {
  if (access.revokedAt) return 'revoked'
  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) return 'expired'
  return 'active'
}

export function isExternalAthleteAccessActive(access: {
  expiresAt?: Date | null
  revokedAt?: Date | null
}) {
  return getExternalAthleteAccessStatus(access) === 'active'
}

export async function resolveExternalAthleteAccess(token: string) {
  const tokenHash = hashExternalAthleteAccessToken(token)

  return prisma.athleteExternalAccess.findUnique({
    where: { tokenHash },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
          email: true,
          position: true,
          jerseyNumber: true,
          photoUrl: true,
          team: { select: { id: true, name: true, sportType: true } },
          sportProfile: { select: { primarySport: true } },
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              primaryColor: true,
              secondaryColor: true,
              hidePlatformBranding: true,
            },
          },
        },
      },
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          hidePlatformBranding: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
}
