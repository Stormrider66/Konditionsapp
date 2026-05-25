import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'

const MIN_TRAINING_YEAR = 2000
const MAX_TRAINING_YEAR = 2100

export class WorkoutLibraryMetadataError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'WorkoutLibraryMetadataError'
    this.status = status
  }
}

function hasOwn(object: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

export function normalizeWorkoutTrainingYear(
  input: unknown,
  options: { defaultToCurrent?: boolean } = {}
): number | null | undefined {
  if (input === undefined) {
    return options.defaultToCurrent ? new Date().getFullYear() : undefined
  }

  if (input === null || input === '' || input === 'none') {
    return null
  }

  const year = typeof input === 'number' ? input : Number.parseInt(String(input), 10)

  if (!Number.isInteger(year) || year < MIN_TRAINING_YEAR || year > MAX_TRAINING_YEAR) {
    throw new WorkoutLibraryMetadataError('Training year must be between 2000 and 2100')
  }

  return year
}

async function getBusinessSlugForRequest(request: NextRequest) {
  const scope = getRequestedBusinessScope(request)

  if (scope.businessSlug) {
    return scope.businessSlug
  }

  if (!scope.businessId) {
    return undefined
  }

  const business = await prisma.business.findUnique({
    where: { id: scope.businessId },
    select: { slug: true },
  })

  return business?.slug
}

export async function resolveWorkoutLibraryTeamId(
  userId: string,
  request: NextRequest,
  input: unknown
): Promise<string | null | undefined> {
  if (input === undefined) {
    return undefined
  }

  if (input === null || input === '' || input === 'none' || input === 'all') {
    return null
  }

  if (typeof input !== 'string') {
    throw new WorkoutLibraryMetadataError('Team must be a valid team id')
  }

  const businessSlug = await getBusinessSlugForRequest(request)
  const team = await getAccessibleTeam(userId, input, businessSlug)

  if (!team) {
    throw new WorkoutLibraryMetadataError('Team not found or unavailable', 403)
  }

  return team.id
}

export async function buildWorkoutLibraryMetadataData(
  userId: string,
  request: NextRequest,
  body: Record<string, unknown>,
  options: { defaultTrainingYear?: boolean } = {}
) {
  const data: {
    teamId?: string | null
    trainingYear?: number | null
  } = {}

  if (hasOwn(body, 'teamId')) {
    data.teamId = await resolveWorkoutLibraryTeamId(userId, request, body.teamId)
  }

  if (hasOwn(body, 'trainingYear') || options.defaultTrainingYear) {
    data.trainingYear = normalizeWorkoutTrainingYear(body.trainingYear, {
      defaultToCurrent: options.defaultTrainingYear,
    }) ?? null
  }

  return data
}
