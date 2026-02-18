// app/api/cron/injury-digest/route.ts
/**
 * Daily Injury & Modification Digest Email
 *
 * Sends coaches a daily summary of:
 * - Pending workout modifications to review
 * - Active injuries requiring attention
 * - High-risk ACWR athletes (>1.3)
 * - Athletes with consecutive low readiness scores
 *
 * Trigger: Cron job (daily at 7:00 AM)
 * Method: POST /api/cron/injury-digest
 * Auth: Cron secret token (CRON_SECRET environment variable)
 *
 * Email sent via Resend API
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
import { logger } from '@/lib/logger'
import { sanitizeForEmail } from '@/lib/sanitize'

const prisma = new PrismaClient()
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface DigestData {
  coachId: string
  coachEmail: string
  coachName: string
  pendingModifications: number
  activeInjuries: number
  highRiskAthletes: number
  lowReadinessAthletes: number
  details: {
    modifications: Array<{
      athleteName: string
      workoutDate: string
      originalType: string
      modifiedType: string
      reason: string
    }>
    injuries: Array<{
      athleteName: string
      injuryType: string
      painLevel: number
      daysActive: number
      currentPhase: number
    }>
    highRisk: Array<{
      athleteName: string
      acwr: number
      zone: string
    }>
    lowReadiness: Array<{
      athleteName: string
      consecutiveDays: number
      latestScore: number
    }>
  }
}

function generateEmailHTML(data: DigestData): string {
  const s = (value: unknown) => sanitizeForEmail(value == null ? '' : String(value))

  const hasAnyAlerts =
    data.pendingModifications > 0 ||
    data.activeInjuries > 0 ||
    data.highRiskAthletes > 0 ||
    data.lowReadinessAthletes > 0

  if (!hasAnyAlerts) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">✅ Inga åtgärder krävs idag</h2>
          <p>Hej ${s(data.coachName)},</p>
          <p>Alla dina atleter ser bra ut! Inga skador, modifieringar eller riskvarningar att hantera.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Detta meddelande skickades automatiskt av konditionstest-appen.
          </p>
        </body>
      </html>
    `
  }

  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #1f2937; margin-top: 0;">Daglig skade- & träningsrapport</h1>
          <p style="color: #6b7280;">Hej ${s(data.coachName)},</p>
          <p style="color: #6b7280;">Här är din dagliga sammanfattning av atleter som behöver din uppmärksamhet:</p>

          <!-- Summary Cards -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 25px 0;">
            ${
              data.pendingModifications > 0
                ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <div style="font-size: 24px; font-weight: bold; color: #92400e;">${data.pendingModifications}</div>
              <div style="font-size: 14px; color: #78350f;">Väntande modifieringar</div>
            </div>
            `
                : ''
            }
            ${
              data.activeInjuries > 0
                ? `
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
              <div style="font-size: 24px; font-weight: bold; color: #991b1b;">${data.activeInjuries}</div>
              <div style="font-size: 14px; color: #7f1d1d;">Aktiva skador</div>
            </div>
            `
                : ''
            }
            ${
              data.highRiskAthletes > 0
                ? `
            <div style="background-color: #ffedd5; padding: 15px; border-radius: 6px; border-left: 4px solid #f97316;">
              <div style="font-size: 24px; font-weight: bold; color: #9a3412;">${data.highRiskAthletes}</div>
              <div style="font-size: 14px; color: #7c2d12;">Högriskatleter (ACWR)</div>
            </div>
            `
                : ''
            }
            ${
              data.lowReadinessAthletes > 0
                ? `
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${data.lowReadinessAthletes}</div>
              <div style="font-size: 14px; color: #1e3a8a;">Låg beredskap (3+ dagar)</div>
            </div>
            `
                : ''
            }
          </div>

          <!-- Pending Modifications -->
          ${
            data.details.modifications.length > 0
              ? `
          <div style="margin-top: 30px;">
            <h2 style="color: #1f2937; font-size: 18px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
              ⏳ Väntande träningsmodifieringar
            </h2>
            ${data.details.modifications
              .map(
                (mod) => `
              <div style="background-color: #fffbeb; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #f59e0b;">
                <div style="font-weight: bold; color: #92400e;">${s(mod.athleteName)}</div>
                <div style="font-size: 14px; color: #78350f; margin-top: 5px;">
                  ${s(mod.workoutDate)} • ${s(mod.originalType)} → ${s(mod.modifiedType)}
                </div>
                <div style="font-size: 13px; color: #a16207; margin-top: 5px; font-style: italic;">
                  Anledning: ${s(mod.reason)}
                </div>
              </div>
            `
              )
              .join('')}
            <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
              → <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/injury/modifications" style="color: #3b82f6;">Granska modifieringar</a>
            </p>
          </div>
          `
              : ''
          }

          <!-- Active Injuries -->
          ${
            data.details.injuries.length > 0
              ? `
          <div style="margin-top: 30px;">
            <h2 style="color: #1f2937; font-size: 18px; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">
              🩹 Aktiva skador
            </h2>
            ${data.details.injuries
              .map(
                (injury) => `
              <div style="background-color: #fef2f2; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #ef4444;">
                <div style="font-weight: bold; color: #991b1b;">${s(injury.athleteName)}</div>
                <div style="font-size: 14px; color: #7f1d1d; margin-top: 5px;">
                  ${s(injury.injuryType)} • Smärta: ${injury.painLevel}/10 • Fas ${injury.currentPhase}/5
                </div>
                <div style="font-size: 13px; color: #b91c1c; margin-top: 5px;">
                  Aktiv i ${injury.daysActive} dagar
                </div>
              </div>
            `
              )
              .join('')}
            <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
              → <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/injury/active" style="color: #3b82f6;">Se skadeöversikt</a>
            </p>
          </div>
          `
              : ''
          }

          <!-- High Risk ACWR -->
          ${
            data.details.highRisk.length > 0
              ? `
          <div style="margin-top: 30px;">
            <h2 style="color: #1f2937; font-size: 18px; border-bottom: 2px solid #f97316; padding-bottom: 8px;">
              ⚠️ Högriskatleter (ACWR >1.3)
            </h2>
            ${data.details.highRisk
              .map(
                (risk) => `
              <div style="background-color: #fff7ed; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #f97316;">
                <div style="font-weight: bold; color: #9a3412;">${s(risk.athleteName)}</div>
                <div style="font-size: 14px; color: #7c2d12; margin-top: 5px;">
                  ACWR: ${risk.acwr.toFixed(2)} • Zon: ${s(risk.zone)}
                </div>
              </div>
            `
              )
              .join('')}
            <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
              → <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/monitoring" style="color: #3b82f6;">Se ACWR-övervakning</a>
            </p>
          </div>
          `
              : ''
          }

          <!-- Low Readiness -->
          ${
            data.details.lowReadiness.length > 0
              ? `
          <div style="margin-top: 30px;">
            <h2 style="color: #1f2937; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
              😴 Låg beredskap (3+ dagar i rad)
            </h2>
            ${data.details.lowReadiness
              .map(
                (readiness) => `
              <div style="background-color: #eff6ff; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #3b82f6;">
                <div style="font-weight: bold; color: #1e40af;">${s(readiness.athleteName)}</div>
                <div style="font-size: 14px; color: #1e3a8a; margin-top: 5px;">
                  ${readiness.consecutiveDays} dagar i rad • Senaste poäng: ${readiness.latestScore}
                </div>
              </div>
            `
              )
              .join('')}
            <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
              → <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/monitoring" style="color: #3b82f6;">Se beredskapsöversikt</a>
            </p>
          </div>
          `
              : ''
          }

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Detta meddelande skickades automatiskt kl. 07:00 varje dag.<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/settings" style="color: #3b82f6;">Ändra aviseringsinställningar</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

async function getCoachDigestData(coachId: string): Promise<DigestData | null> {
  // Get coach info
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { email: true, name: true },
  })

  if (!coach || !coach.email) {
    return null
  }

  // Get coach's athletes
  const athletes = await prisma.client.findMany({
    where: { userId: coachId },
    select: { id: true, name: true },
  })

  const athleteIds = athletes.map((a) => a.id)

  // 1. Pending workout modifications (future only)
  // Note: WorkoutModification doesn't have direct relation to Workout in schema
  // Get modifications via workoutIds from athlete's programs
  // Path: Workout -> day (TrainingDay) -> week (TrainingWeek) -> program (TrainingProgram) -> clientId
  const athleteWorkouts = await prisma.workout.findMany({
    where: {
      day: {
        week: {
          program: {
            clientId: { in: athleteIds },
          },
        },
      },
    },
    select: { id: true },
  })
  const workoutIds = athleteWorkouts.map((w) => w.id)

  const pendingModifications = await prisma.workoutModification.findMany({
    where: {
      workoutId: { in: workoutIds },
      date: {
        gte: new Date(), // Future modifications only
      },
    },
    orderBy: { date: 'asc' },
    take: 10,
  })

  // 2. Active injuries (not resolved)
  const activeInjuries = await prisma.injuryAssessment.findMany({
    where: {
      clientId: { in: athleteIds },
      status: { not: 'RESOLVED' },
    },
    include: {
      client: true,
    },
    orderBy: { date: 'desc' },
    take: 10,
  })

  // 3. High-risk ACWR athletes (>1.3)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const highRiskACWR = await prisma.trainingLoad.findMany({
    where: {
      clientId: { in: athleteIds },
      date: today,
      acwr: { gte: 1.3 },
    },
    include: {
      client: true,
    },
    orderBy: { acwr: 'desc' },
    take: 10,
  })

  // 4. Athletes with consecutive low readiness (3+ days)
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const recentCheckIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId: { in: athleteIds },
      date: {
        gte: threeDaysAgo,
        lte: today,
      },
    },
    include: {
      client: true,
    },
    orderBy: { date: 'desc' },
  })

  // Group by athlete and check for 3+ consecutive low scores
  const athleteCheckIns = new Map<string, any[]>()
  for (const checkIn of recentCheckIns) {
    if (!athleteCheckIns.has(checkIn.clientId)) {
      athleteCheckIns.set(checkIn.clientId, [])
    }
    athleteCheckIns.get(checkIn.clientId)!.push(checkIn)
  }

  const lowReadinessAthletes: Array<{
    athleteName: string
    consecutiveDays: number
    latestScore: number
  }> = []

  for (const [athleteId, checkIns] of athleteCheckIns.entries()) {
    // Sort by date descending
    checkIns.sort((a, b) => b.date.getTime() - a.date.getTime())

    // Count consecutive days with readiness score <55 (FAIR or worse)
    let consecutiveDays = 0
    for (const checkIn of checkIns) {
      if (checkIn.readinessScore < 55) {
        consecutiveDays++
      } else {
        break
      }
    }

    if (consecutiveDays >= 3) {
      lowReadinessAthletes.push({
        athleteName: checkIns[0].client.name,
        consecutiveDays,
        latestScore: checkIns[0].readinessScore,
      })
    }
  }

  // Build digest data
  const digestData: DigestData = {
    coachId,
    coachEmail: coach.email,
    coachName: coach.name || 'Coach',
    pendingModifications: pendingModifications.length,
    activeInjuries: activeInjuries.length,
    highRiskAthletes: highRiskACWR.length,
    lowReadinessAthletes: lowReadinessAthletes.length,
    details: {
      modifications: pendingModifications.map((mod) => ({
        athleteName: 'See workout', // Workout relation not available in current schema
        workoutDate: mod.date.toLocaleDateString('sv-SE'),
        originalType: mod.plannedType || 'Unknown',
        modifiedType: mod.modifiedType || 'Unknown',
        reason: mod.reasoning || 'No reason provided',
      })),
      injuries: activeInjuries.map((injury) => {
        const daysActive = Math.floor(
          (new Date().getTime() - injury.date.getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          athleteName: injury.client.name,
          injuryType: injury.injuryType || 'Unknown',
          painLevel: injury.painLevel,
          daysActive,
          currentPhase: 1, // Default phase number
        }
      }),
      highRisk: highRiskACWR.map((load) => ({
        athleteName: load.client?.name || 'Unknown',
        acwr: load.acwr ?? 0,
        zone: load.acwrZone ?? 'Unknown',
      })),
      lowReadiness: lowReadinessAthletes,
    },
  }

  return digestData
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (REQUIRED)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not configured', {})
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET not set' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting injury digest email job')

    if (!resend) {
      logger.warn('RESEND_API_KEY not configured, skipping email send', {})
      return NextResponse.json(
        { success: false, error: 'Resend API key not configured' },
        { status: 500 }
      )
    }

    // Get all coaches
    const coaches = await prisma.user.findMany({
      where: { role: 'COACH' },
      select: { id: true, email: true, name: true },
    })

    logger.info('Found coaches', { count: coaches.length })

    let sent = 0
    let skipped = 0
    let errors = 0

    for (const coach of coaches) {
      try {
        if (!coach.email) {
          skipped++
          continue
        }

        // Get digest data for this coach
        const digestData = await getCoachDigestData(coach.id)

        if (!digestData) {
          skipped++
          continue
        }

        // Generate email HTML
        const emailHTML = generateEmailHTML(digestData)

        // Determine subject line
        const hasAlerts =
          digestData.pendingModifications > 0 ||
          digestData.activeInjuries > 0 ||
          digestData.highRiskAthletes > 0 ||
          digestData.lowReadinessAthletes > 0

        const subject = hasAlerts
          ? `⚠️ ${digestData.pendingModifications + digestData.activeInjuries + digestData.highRiskAthletes + digestData.lowReadinessAthletes} atleter behöver din uppmärksamhet`
          : '✅ Daglig rapport - Inga åtgärder krävs'

        // Send email via Resend
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@trainomics.app',
          to: coach.email,
          subject,
          html: emailHTML,
        })

        sent++
        logger.info('Sent digest', { coachName: coach.name, coachEmail: coach.email })
      } catch (coachError: unknown) {
        logger.error('Error sending digest', { coachEmail: coach.email }, coachError)
        errors++
      }
    }

    logger.info('Injury digest job complete', { sent, skipped, errors })

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    logger.error('Injury digest job failed', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// Allow GET for manual testing (requires same authentication)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}
