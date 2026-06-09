/**
 * Agent Event Dispatch API
 *
 * Receives events from webhooks (Garmin, Strava, Concept2) and internal
 * triggers (check-ins, meal logs) and dispatches them to the appropriate
 * managed agent sessions.
 *
 * POST /api/agent-tools/dispatch
 *
 * Authentication:
 *   Either (a) an authenticated session whose business owns `entityId`, or
 *   (b) a shared secret via `x-internal-secret` header matching
 *   `INTERNAL_DISPATCH_SECRET`. The secret is used by other internal
 *   routes/workers that don't carry a user session (e.g. webhook fan-out,
 *   cron jobs running outside Vercel Cron).
 */

import { NextRequest, NextResponse } from 'next/server'
import { dispatchEvent, type AgentEventType } from '@/lib/managed-agents'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { timingSafeStringEqual } from '@/lib/security/timing-safe'

const VALID_EVENT_TYPES: AgentEventType[] = [
  'GARMIN_ACTIVITY', 'GARMIN_SLEEP', 'GARMIN_HRV', 'GARMIN_DAILY',
  'GARMIN_BODY_COMPOSITION', 'GARMIN_STRESS', 'STRAVA_ACTIVITY',
  'CONCEPT2_RESULT', 'CHECKIN_SUBMITTED', 'WORKOUT_COMPLETED',
  'WORKOUT_SKIPPED', 'INJURY_REPORTED', 'RESTRICTION_CREATED',
  'RESTRICTION_UPDATED', 'RESTRICTION_CLEARED', 'MEAL_LOGGED',
  'FOOD_SCANNED', 'BODY_COMP_LOGGED', 'PROGRAM_REQUESTED',
  'RESEARCH_REQUESTED', 'COACH_QUERY', 'MORNING_SCHEDULE',
  'WEEKLY_REVIEW', 'REHAB_LOG_SUBMITTED',
]

type AuthResult =
  | { kind: 'internal' }
  | { kind: 'session'; userId: string; role: string }
  | { kind: 'rejected'; response: NextResponse }

async function authenticate(req: NextRequest): Promise<AuthResult> {
  const providedSecret = req.headers.get('x-internal-secret')
  const expectedSecret = process.env.INTERNAL_DISPATCH_SECRET

  if (providedSecret) {
    if (!expectedSecret) {
      logger.error('[agent-tools/dispatch] INTERNAL_DISPATCH_SECRET not configured')
      return {
        kind: 'rejected',
        response: NextResponse.json(
          { error: 'Security misconfiguration' },
          { status: 500 }
        ),
      }
    }
    if (!timingSafeStringEqual(providedSecret, expectedSecret)) {
      return {
        kind: 'rejected',
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }
    }
    return { kind: 'internal' }
  }

  const user = await getCurrentUser()
  if (!user) {
    return {
      kind: 'rejected',
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { kind: 'session', userId: user.id, role: user.role }
}

/**
 * Verify that the caller may dispatch events for `entityId`. The entity may
 * be either a Client (athlete) or a User (coach/physio). Internal secret
 * callers are fully trusted (they proxy verified webhook payloads).
 */
async function authorizeEntityAccess(
  auth: Extract<AuthResult, { kind: 'internal' } | { kind: 'session' }>,
  entityId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (auth.kind === 'internal') return { ok: true }

  // Entity is a Client → use existing access control.
  const client = await prisma.client.findUnique({
    where: { id: entityId },
    select: { id: true },
  })
  if (client) {
    const allowed = await canAccessClient(auth.userId, entityId)
    if (!allowed) return { ok: false, status: 403, error: 'Forbidden' }
    return { ok: true }
  }

  // Entity is a User (coach/physio dispatching about themselves, or an admin
  // in the same business).
  const user = await prisma.user.findUnique({
    where: { id: entityId },
    select: { id: true },
  })
  if (!user) return { ok: false, status: 404, error: 'Entity not found' }

  if (auth.role === 'ADMIN') return { ok: true }
  if (user.id === auth.userId) return { ok: true }

  // Cross-user dispatch is only allowed within the same business.
  const shared = await prisma.businessMember.findFirst({
    where: {
      userId: auth.userId,
      isActive: true,
      business: {
        members: {
          some: { userId: user.id, isActive: true },
        },
      },
    },
    select: { id: true },
  })
  if (shared) return { ok: true }

  return { ok: false, status: 403, error: 'Forbidden' }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.kind === 'rejected') return auth.response

    const body = await req.json()
    const { eventType, entityId, data } = body

    if (!eventType || !entityId) {
      return NextResponse.json(
        { error: 'eventType and entityId are required' },
        { status: 400 }
      )
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType: ${eventType}` },
        { status: 400 }
      )
    }

    const authorized = await authorizeEntityAccess(auth, entityId)
    if (!authorized.ok) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status }
      )
    }

    const result = await dispatchEvent({
      id: crypto.randomUUID(),
      type: eventType,
      entityId,
      data: data || {},
      timestamp: new Date(),
    })

    return NextResponse.json({
      success: true,
      dispatched: result.dispatched,
      debounced: result.debounced,
    })
  } catch (error) {
    logger.error('[agent-tools/dispatch] Error', {}, error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
