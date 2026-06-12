// app/api/programs/from-assignments/route.ts
//
// Bundle loose studio assignments (strength / cardio / hybrid / agility)
// into a TrainingProgram the athlete can view as one program.
//
// GET  → preview which unlinked assignments fall inside a date range
// POST → create the program shell (weeks) and link the assignments
//
// Option A design: assignments are LINKED via programId, never copied —
// the assignment rows remain the single source of truth for content,
// scheduling and completion status.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const DAY_MS = 86_400_000
const MAX_WEEKS = 53

/** UTC midnight of the Monday of the week containing `d` (dayNumber 1 = Monday). */
function mondayOfUTC(d: Date): Date {
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const daysSinceMonday = (d.getUTCDay() + 6) % 7
  return new Date(midnight - daysSinceMonday * DAY_MS)
}

const dateString = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'Invalid date',
})

const rangeSchema = z.object({
  clientId: z.string().min(1),
  startDate: dateString,
  endDate: dateString,
})

const createSchema = rangeSchema.extend({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  goalType: z.string().max(100).optional(),
})

/** Range filter shared by preview and create. Only unlinked assignments qualify. */
function looseAssignmentWhere(clientId: string, start: Date, end: Date) {
  return {
    athleteId: clientId,
    programId: null,
    assignedDate: { gte: start, lte: end },
  }
}

async function findLooseAssignments(clientId: string, start: Date, end: Date) {
  const where = looseAssignmentWhere(clientId, start, end)
  const [strength, cardio, hybrid, agility] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where,
      select: { id: true, assignedDate: true, status: true, session: { select: { name: true } } },
      orderBy: { assignedDate: 'asc' },
    }),
    prisma.cardioSessionAssignment.findMany({
      where,
      select: { id: true, assignedDate: true, status: true, session: { select: { name: true, sport: true } } },
      orderBy: { assignedDate: 'asc' },
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where,
      select: { id: true, assignedDate: true, status: true, workout: { select: { name: true } } },
      orderBy: { assignedDate: 'asc' },
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where,
      select: { id: true, assignedDate: true, status: true, workout: { select: { name: true } } },
      orderBy: { assignedDate: 'asc' },
    }),
  ])

  return [
    ...strength.map((a) => ({ id: a.id, kind: 'STRENGTH' as const, name: a.session.name, date: a.assignedDate, status: a.status })),
    ...cardio.map((a) => ({ id: a.id, kind: 'CARDIO' as const, name: a.session.name, sport: a.session.sport, date: a.assignedDate, status: a.status })),
    ...hybrid.map((a) => ({ id: a.id, kind: 'HYBRID' as const, name: a.workout.name, date: a.assignedDate, status: a.status })),
    ...agility.map((a) => ({ id: a.id, kind: 'AGILITY' as const, name: a.workout.name, date: a.assignedDate, status: a.status })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())
}

async function authorizeCoach(request: NextRequest, clientId: string) {
  let locale: AppLocale = resolveRequestLocale(request)
  const user = await getCurrentUser()
  if (!user) {
    return { error: NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 }) }
  }
  locale = resolveRequestLocale(request, user.language)

  if (!(await canAccessCoachPlatform(user.id))) {
    return {
      error: NextResponse.json(
        { success: false, error: t(locale, 'Only coaches can bundle programs', 'Endast tränare kan paketera program') },
        { status: 403 }
      ),
    }
  }

  if (!(await canAccessClient(user.id, clientId))) {
    return {
      error: NextResponse.json(
        { success: false, error: t(locale, 'Client not found or access denied', 'Klient hittades inte eller åtkomst nekad') },
        { status: 404 }
      ),
    }
  }

  return { user, locale }
}

/**
 * GET /api/programs/from-assignments?clientId=&startDate=&endDate=
 * Preview the unlinked assignments that would be bundled.
 */
export async function GET(request: NextRequest) {
  const locale: AppLocale = resolveRequestLocale(request)
  try {
    const { searchParams } = new URL(request.url)
    const parsed = rangeSchema.safeParse({
      clientId: searchParams.get('clientId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    })
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Missing or invalid clientId/startDate/endDate', 'Saknade eller ogiltiga clientId/startDate/endDate') },
        { status: 400 }
      )
    }

    const auth = await authorizeCoach(request, parsed.data.clientId)
    if ('error' in auth) return auth.error

    const start = new Date(parsed.data.startDate)
    const end = new Date(parsed.data.endDate)
    if (end < start) {
      return NextResponse.json(
        { success: false, error: t(auth.locale, 'endDate must be after startDate', 'endDate måste vara efter startDate') },
        { status: 400 }
      )
    }

    const assignments = await findLooseAssignments(parsed.data.clientId, start, end)
    return NextResponse.json({ success: true, data: { assignments, total: assignments.length } })
  } catch (error) {
    logger.error('Failed to preview assignments for bundling', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load assignments', 'Kunde inte ladda pass') },
      { status: 500 }
    )
  }
}

/**
 * POST /api/programs/from-assignments
 * Body: { clientId, name, description?, goalType?, startDate, endDate }
 *
 * Creates a TrainingProgram shell with Monday-aligned TrainingWeek rows
 * covering the range, then links every unlinked studio assignment for the
 * client inside the range via programId.
 */
export async function POST(request: NextRequest) {
  const locale: AppLocale = resolveRequestLocale(request)
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid request body', 'Ogiltig förfrågan'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { clientId, name, description, goalType } = parsed.data

    const auth = await authorizeCoach(request, clientId)
    if ('error' in auth) return auth.error
    const { user } = auth

    const start = new Date(parsed.data.startDate)
    const end = new Date(parsed.data.endDate)
    if (end < start) {
      return NextResponse.json(
        { success: false, error: t(auth.locale, 'endDate must be after startDate', 'endDate måste vara efter startDate') },
        { status: 400 }
      )
    }

    // Monday-aligned week shells spanning the range
    const firstMonday = mondayOfUTC(start)
    const weeks: { weekNumber: number; startDate: Date; endDate: Date }[] = []
    for (
      let weekStart = firstMonday;
      weekStart <= end && weeks.length < MAX_WEEKS;
      weekStart = new Date(weekStart.getTime() + 7 * DAY_MS)
    ) {
      weeks.push({
        weekNumber: weeks.length + 1,
        startDate: weekStart,
        endDate: new Date(weekStart.getTime() + 6 * DAY_MS),
      })
    }
    if (weeks.length === MAX_WEEKS) {
      return NextResponse.json(
        { success: false, error: t(auth.locale, 'Date range too long (max 52 weeks)', 'Datumintervallet är för långt (max 52 veckor)') },
        { status: 400 }
      )
    }

    const where = looseAssignmentWhere(clientId, start, end)

    const result = await prisma.$transaction(async (tx) => {
      const program = await tx.trainingProgram.create({
        data: {
          clientId,
          coachId: user.id,
          name,
          description,
          goalType,
          // Monday-aligned so week N renders as startDate + (N-1)*7 in the
          // program calendar; the assignment link filter still uses the
          // coach-picked range.
          startDate: firstMonday,
          endDate: end,
          planningMetadata: { source: 'assignment-bundle' },
          weeks: {
            create: weeks.map((w) => ({ ...w, phase: 'BASE' as const })),
          },
        },
        select: { id: true, name: true, startDate: true, endDate: true },
      })

      const link = { programId: program.id }
      const [strength, cardio, hybrid, agility] = await Promise.all([
        tx.strengthSessionAssignment.updateMany({ where, data: link }),
        tx.cardioSessionAssignment.updateMany({ where, data: link }),
        tx.hybridWorkoutAssignment.updateMany({ where, data: link }),
        tx.agilityWorkoutAssignment.updateMany({ where, data: link }),
      ])

      return {
        program,
        linked: {
          strength: strength.count,
          cardio: cardio.count,
          hybrid: hybrid.count,
          agility: agility.count,
          total: strength.count + cardio.count + hybrid.count + agility.count,
        },
      }
    })

    logger.info('Bundled assignments into program', {
      programId: result.program.id,
      clientId,
      coachId: user.id,
      linked: result.linked,
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    logger.error('Failed to bundle assignments into program', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to create program', 'Kunde inte skapa program') },
      { status: 500 }
    )
  }
}
