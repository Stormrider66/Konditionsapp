/**
 * Agent Event Dispatch API
 *
 * Receives events from webhooks (Garmin, Strava, Concept2) and internal
 * triggers (check-ins, meal logs) and dispatches them to the appropriate
 * managed agent sessions.
 *
 * POST /api/agent-tools/dispatch
 */

import { NextRequest, NextResponse } from 'next/server'
import { dispatchEvent, type AgentEventType } from '@/lib/managed-agents'
import { prisma } from '@/lib/prisma'

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

export async function POST(req: NextRequest) {
  try {
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

    // Verify entity exists (athlete, coach, or physio)
    const client = await prisma.client.findUnique({
      where: { id: entityId },
      select: { id: true },
    })

    if (!client) {
      // Could be a coachId or physioId - check user table
      const user = await prisma.user.findUnique({
        where: { id: entityId },
        select: { id: true },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Entity not found' },
          { status: 404 }
        )
      }
    }

    // Dispatch the event to appropriate agent(s)
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
    })
  } catch (error) {
    console.error('[agent-tools/dispatch] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
