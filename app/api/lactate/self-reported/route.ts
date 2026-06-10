/**
 * Self-Reported Lactate Test API
 *
 * Receives multi-stage lactate tests submitted by athletes via
 * SelfReportedLactateForm. The test is always saved (warn-not-block,
 * matching the coach test flow); curve-quality problems are returned as
 * validation feedback so the athlete can review suspect values.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { detectLactateDecreases } from '@/lib/lactate/data-quality'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const stageSchema = z.object({
  sequence: z.number().min(1),
  speed: z.number().min(0).max(30).optional().nullable(),
  power: z.number().min(0).max(600).optional().nullable(),
  pace: z.number().min(2).max(10).optional().nullable(),
  heartRate: z.number().min(40).max(250),
  lactate: z.number().min(0).max(30),
  duration: z.number().min(0.5).max(60),
})

const selfReportedSchema = z.object({
  clientId: z.string().min(1),
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
  testDate: z.string(),
  stages: z.array(stageSchema).min(1),
  meterModel: z.string().max(100).optional(),
  meterCalibrationDate: z.string().optional(),
  photoUrl: z.string().url().max(2048).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  submittedAt: z.string().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const parsed = selfReportedSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: t(locale, 'Invalid lactate test data', 'Ogiltiga laktatdata'),
          details: parsed.error.errors,
        },
        { status: 400 }
      )
    }
    const data = parsed.data

    const hasAccess = await canAccessClient(user.id, data.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klient hittades inte eller saknar behörighet') },
        { status: 403 }
      )
    }

    const stages = [...data.stages].sort((a, b) => a.sequence - b.sequence)
    const intensityOf = (s: (typeof stages)[number]) => s.speed ?? s.power ?? s.pace ?? null

    // Curve-quality feedback (warn, don't block — test is saved regardless)
    const errors: string[] = []
    for (const drop of detectLactateDecreases(stages)) {
      errors.push(
        t(
          locale,
          `Lactate dropped by ${drop.drop} mmol/L from stage ${drop.fromStage} to stage ${drop.toStage} — check the values.`,
          `Laktat sjönk med ${drop.drop} mmol/L från steg ${drop.fromStage} till steg ${drop.toStage} — kontrollera värdena.`
        )
      )
    }
    for (let i = 1; i < stages.length; i++) {
      const prev = intensityOf(stages[i - 1])
      const curr = intensityOf(stages[i])
      // Pace counts down as intensity rises; speed/power count up
      const usesPace = stages[i].pace != null
      if (prev != null && curr != null && (usesPace ? curr >= prev : curr <= prev)) {
        errors.push(
          t(
            locale,
            `Stage ${i + 1} is not harder than stage ${i} — intensity should increase each stage.`,
            `Steg ${i + 1} är inte hårdare än steg ${i} — intensiteten ska öka för varje steg.`
          )
        )
      }
    }

    const reading = await prisma.selfReportedLactate.create({
      data: {
        clientId: data.clientId,
        date: new Date(data.testDate),
        measurementType: 'STANDALONE_TEST',
        measurements: stages.map(s => ({
          stage: s.sequence,
          intensity: intensityOf(s),
          lactate: s.lactate,
          heartRate: s.heartRate,
          duration: s.duration,
          speed: s.speed ?? null,
          power: s.power ?? null,
          pace: s.pace ?? null,
        })),
        meterBrand: data.meterModel || null,
        calibrated: Boolean(data.meterCalibrationDate),
        qualityRating: errors.length === 0 ? 'GOOD' : 'FAIR',
        photos: data.photoUrl ? [data.photoUrl] : undefined,
        notes: [
          `${data.testType} test`,
          data.meterCalibrationDate
            ? `${t(locale, 'Meter calibrated', 'Mätare kalibrerad')}: ${data.meterCalibrationDate}`
            : null,
          data.notes || null,
        ]
          .filter(Boolean)
          .join(' • '),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: reading.id,
        validation: {
          isValid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined,
        },
      },
    })
  } catch (error) {
    logError('Error saving self-reported lactate test', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to save lactate data', 'Kunde inte spara laktatdata') },
      { status: 500 }
    )
  }
}
