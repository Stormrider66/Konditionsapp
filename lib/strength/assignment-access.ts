import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, resolveAthleteClientId, getRequestedBusinessScope } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export type StrengthAssignmentAccessMode = 'athlete' | 'team-kiosk'

export interface StrengthAssignmentAccess {
  clientId: string
  locale: 'en' | 'sv'
  mode: StrengthAssignmentAccessMode
  coachUserId?: string
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

type StrengthAssignmentAccessResult =
  | { access: StrengthAssignmentAccess }
  | { response: NextResponse }

export async function resolveStrengthAssignmentAccess(
  request: NextRequest,
  assignmentId: string
): Promise<StrengthAssignmentAccessResult> {
  const locale = resolveRequestLocale(request)
  const coachTeamId = request.nextUrl.searchParams.get('coachTeamId')?.trim()

  if (coachTeamId) {
    return resolveTeamKioskAccess(request, assignmentId, coachTeamId)
  }

  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return {
      response: NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      ),
    }
  }

  return {
    access: {
      clientId: resolved.clientId,
      locale: resolved.user.language === 'sv' ? 'sv' : 'en',
      mode: 'athlete',
    },
  }
}

async function resolveTeamKioskAccess(
  request: NextRequest,
  assignmentId: string,
  teamId: string
): Promise<StrengthAssignmentAccessResult> {
  let locale = resolveRequestLocale(request)
  let coach: Awaited<ReturnType<typeof requireCoach>>

  try {
    coach = await requireCoach()
  } catch {
    return {
      response: NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      ),
    }
  }
  locale = resolveRequestLocale(request, coach.language)

  const scope = getRequestedBusinessScope(request)
  const team = await getAccessibleTeam(coach.id, teamId, scope.businessSlug)

  if (!team) {
    return {
      response: NextResponse.json(
        { success: false, error: t(locale, 'Team not found', 'Laget hittades inte') },
        { status: 404 }
      ),
    }
  }

  const assignment = await prisma.strengthSessionAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      athleteId: true,
      athlete: { select: { teamId: true } },
      teamBroadcast: { select: { teamId: true } },
    },
  })

  if (!assignment) {
    return {
      response: NextResponse.json(
        { success: false, error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') },
        { status: 404 }
      ),
    }
  }

  const belongsToTeam =
    assignment.athlete.teamId === teamId ||
    assignment.teamBroadcast?.teamId === teamId

  if (!belongsToTeam) {
    return {
      response: NextResponse.json(
        { success: false, error: t(locale, 'Assignment is not part of this team', 'Tilldelningen ingår inte i det här laget') },
        { status: 403 }
      ),
    }
  }

  return {
    access: {
      clientId: assignment.athleteId,
      locale: coach.language === 'sv' ? 'sv' : 'en',
      mode: 'team-kiosk',
      coachUserId: coach.id,
    },
  }
}
