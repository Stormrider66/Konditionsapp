import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

export const EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES = ['calendar', 'workouts', 'tests'] as const
export const EXTERNAL_ATHLETE_ACCESS_TOKEN_PREFIX = 'eax_'

export type ExternalAthleteAccessStatus = 'active' | 'expired' | 'revoked'

const optionalExternalAccessText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(250).optional()
)

export const createExternalAthleteAccessSchema = z.object({
  viewerName: optionalExternalAccessText,
  viewerEmail: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().email().max(250).optional()
  ),
  organizationName: optionalExternalAccessText,
  organizationType: optionalExternalAccessText,
  roleLabel: optionalExternalAccessText,
  note: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(1000).optional()
  ),
  expiresAt: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().datetime().optional().nullable()
  ),
  scopes: z.array(z.enum(EXTERNAL_ATHLETE_ACCESS_DEFAULT_SCOPES)).min(1).optional(),
})

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

export function getExternalAthleteAccessDefaultExpiryDate() {
  const expiresAt = new Date()
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 120)
  return expiresAt
}

export function serializeExternalAthleteAccess(access: {
  id: string
  viewerName: string | null
  viewerEmail: string | null
  organizationName: string | null
  organizationType: string | null
  roleLabel: string | null
  accessLevel: string
  scopes: string[]
  note: string | null
  expiresAt: Date | null
  revokedAt: Date | null
  lastViewedAt: Date | null
  viewCount: number
  createdAt: Date
  updatedAt: Date
  createdBy?: { id: string; name: string; email: string } | null
}) {
  return {
    id: access.id,
    viewerName: access.viewerName,
    viewerEmail: access.viewerEmail,
    organizationName: access.organizationName,
    organizationType: access.organizationType,
    roleLabel: access.roleLabel,
    accessLevel: access.accessLevel,
    scopes: access.scopes,
    note: access.note,
    expiresAt: access.expiresAt,
    revokedAt: access.revokedAt,
    lastViewedAt: access.lastViewedAt,
    viewCount: access.viewCount,
    status: getExternalAthleteAccessStatus(access),
    createdAt: access.createdAt,
    updatedAt: access.updatedAt,
    createdBy: access.createdBy ?? null,
  }
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
