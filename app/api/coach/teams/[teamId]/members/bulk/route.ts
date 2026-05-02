/**
 * Bulk-create team members.
 *
 * POST /api/coach/teams/[teamId]/members/bulk
 *
 * Used by:
 *  - The "Add players" modal on the team dashboard (quick-new path)
 *  - The roster importer (paste / Excel / CSV / PDF → AI → preview → submit)
 *
 * Accepts a mostly-open schema because imported rosters rarely carry all
 * physio fields. Defaults are applied for Prisma NOT NULLs — coaches are
 * expected to fill the missing details later (or via the athlete's own
 * profile completion flow). We intentionally do NOT auto-create Supabase
 * athlete accounts for rows without an email — the coach can create those
 * per-player once the roster is settled.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireCoach, hasReachedAthleteLimit } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { connectTeamMemberToCoach } from '@/lib/coach/team-connection'
import { createAthleteAccountForClient } from '@/lib/athlete-account-utils'
import { getBusinessMembership, getWritableTeam } from '@/lib/coach/team-access'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

const rowSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  phone: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthDate: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), 'Invalid birthDate'),
  height: z.number().min(100).max(250).optional(),
  weight: z.number().min(30).max(300).optional(),
  jerseyNumber: z.number().int().min(0).max(999).optional(),
  position: z.string().max(40).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  notes: z.string().optional(),
  createAthleteAccount: z.boolean().optional(),
  athleteTier: z.enum(['FREE', 'STANDARD', 'PRO', 'ELITE']).optional(),
})

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(200),
})

// Roster defaults for fields Prisma requires NOT NULL but a roster import
// typically doesn't contain. The coach edits these per-player later.
const DEFAULT_BIRTH_DATE = new Date('2000-01-01T00:00:00.000Z')
const DEFAULT_HEIGHT = 180
const DEFAULT_WEIGHT = 80

type RosterRowResult =
  | { status: 'created'; clientId: string; name: string; athleteAccountCreated: boolean }
  | { status: 'skipped'; name: string; reason: string }
  | { status: 'error'; name: string; reason: string }

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getWritableTeam(user.id, teamId, scope.businessSlug, 'roster')
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const raw = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.errors },
        { status: 400 }
      )
    }
    const { rows } = parsed.data

    const membership = await getBusinessMembership(user.id, scope.businessSlug)

    const results: RosterRowResult[] = []

    // Pre-fetch existing emails for this coach so we can skip duplicates cleanly
    const emailsInBatch = rows.map((r) => r.email).filter((e): e is string => !!e)
    const existingEmailClients = emailsInBatch.length
      ? await prisma.client.findMany({
          where: {
            email: { in: emailsInBatch },
            OR: [
              { userId: team.userId },
              ...(membership?.businessId ? [{ businessId: membership.businessId }] : []),
            ],
          },
          select: { email: true },
        })
      : []
    const takenEmails = new Set(existingEmailClients.map((c) => c.email!.toLowerCase()))

    for (const row of rows) {
      try {
        // Respect per-coach athlete limit (solo coaches only — business members
        // are governed at the business level).
        if (!membership) {
          const limitReached = await hasReachedAthleteLimit(user.id)
          if (limitReached) {
            results.push({ status: 'skipped', name: row.name, reason: 'Atletgränsen är nådd' })
            continue
          }
        }

        if (row.email && takenEmails.has(row.email.toLowerCase())) {
          results.push({
            status: 'skipped',
            name: row.name,
            reason: `E-post används redan: ${row.email}`,
          })
          continue
        }

        const created = await prisma.client.create({
          data: {
            userId: team.userId,
            businessId: membership?.businessId ?? null,
            teamId,
            name: row.name,
            email: row.email ?? null,
            phone: row.phone ?? null,
            gender: row.gender ?? 'MALE',
            birthDate: row.birthDate ? new Date(row.birthDate) : DEFAULT_BIRTH_DATE,
            height: row.height ?? DEFAULT_HEIGHT,
            weight: row.weight ?? DEFAULT_WEIGHT,
            notes: row.notes ?? null,
            jerseyNumber: row.jerseyNumber ?? null,
            position: row.position ?? null,
          },
          select: { id: true, email: true, teamId: true },
        })

        try {
          await connectTeamMemberToCoach(created.id, teamId, {
            assignedByUserId: user.id,
            businessId: membership?.businessId,
          })
        } catch (err) {
          logger.warn('bulk: team auto-connection failed', { clientId: created.id, teamId, error: err })
        }

        let athleteAccountCreated = false
        if (created.email && row.createAthleteAccount !== false) {
          const athleteResult = await createAthleteAccountForClient(created.id, user.id, {
            tier: row.athleteTier,
          })
          athleteAccountCreated = athleteResult.success
          if (!athleteResult.success) {
            logger.warn('bulk: athlete account creation failed', {
              clientId: created.id,
              error: athleteResult.error,
            })
          }
        }

        if (row.email) takenEmails.add(row.email.toLowerCase())

        results.push({
          status: 'created',
          clientId: created.id,
          name: row.name,
          athleteAccountCreated,
        })
      } catch (err) {
        const msg =
          err instanceof Prisma.PrismaClientKnownRequestError
            ? err.code === 'P2002'
              ? 'Dubblett (e-post används redan)'
              : `DB-fel (${err.code})`
            : err instanceof Error
              ? err.message
              : 'Okänt fel'
        results.push({ status: 'error', name: row.name, reason: msg })
        logger.error('bulk: failed to create roster row', { teamId, name: row.name }, err)
      }
    }

    const summary = {
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errored: results.filter((r) => r.status === 'error').length,
    }

    return NextResponse.json({ summary, results })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Bulk create team members failed', {}, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
