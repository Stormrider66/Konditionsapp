/**
 * GET /api/data-moat/training-outcomes/[id]/report
 *
 * Data Moat Phase 2: Generate "What Worked" report for a training period.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateWhatWorkedReport } from '@/lib/data-moat/correlation-engine'
import { generateFingerprint, saveFingerprint } from '@/lib/data-moat/fingerprint-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify access to the outcome
    const outcome = await prisma.trainingPeriodOutcome.findUnique({
      where: { id },
      include: {
        fingerprint: true,
        athlete: {
          select: { id: true, name: true },
        },
      },
    })

    if (!outcome) {
      return NextResponse.json({ error: 'Training outcome not found' }, { status: 404 })
    }

    if (outcome.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate fingerprint if not exists
    if (!outcome.fingerprint) {
      try {
        const fingerprintData = await generateFingerprint(
          outcome.athleteId,
          outcome.startDate,
          outcome.endDate
        )
        await saveFingerprint(id, fingerprintData)
      } catch (err) {
        console.error('Failed to generate fingerprint:', err)
        return NextResponse.json({
          error: 'Could not generate training fingerprint',
          details: 'Insufficient workout data for this period',
        }, { status: 400 })
      }
    }

    // Generate the report
    const report = await generateWhatWorkedReport(id)

    if (!report) {
      return NextResponse.json({
        error: 'Could not generate report',
        details: 'Training fingerprint is required',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating what worked report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// POST: Generate fingerprint for outcome
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify access
    const outcome = await prisma.trainingPeriodOutcome.findUnique({
      where: { id },
      include: { fingerprint: true },
    })

    if (!outcome) {
      return NextResponse.json({ error: 'Training outcome not found' }, { status: 404 })
    }

    if (outcome.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete existing fingerprint if regenerating
    if (outcome.fingerprint) {
      await prisma.trainingFingerprint.delete({
        where: { id: outcome.fingerprint.id },
      })
    }

    // Generate new fingerprint
    const fingerprintData = await generateFingerprint(
      outcome.athleteId,
      outcome.startDate,
      outcome.endDate
    )

    const fingerprintId = await saveFingerprint(id, fingerprintData)

    return NextResponse.json({
      success: true,
      fingerprintId,
      fingerprint: fingerprintData,
    })
  } catch (error) {
    console.error('Error generating fingerprint:', error)
    return NextResponse.json(
      { error: 'Failed to generate fingerprint' },
      { status: 500 }
    )
  }
}
