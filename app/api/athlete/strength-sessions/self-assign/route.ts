/**
 * Self-Service Strength Session Assignment API
 *
 * POST - Athlete self-assigns a strength session from a template
 *
 * This allows PRO/ELITE athletes to:
 * 1. Select a system template
 * 2. Create a strength session from it
 * 3. Assign it to themselves for a specific date
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getAthleteSelfServiceAccess } from '@/lib/auth/tier-utils'
import { getTemplateById } from '@/lib/training-engine/templates/strength-templates'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface SelfAssignRequestBody {
  templateId: string
  assignedDate: string // ISO date
  notes?: string
}

function localizedNotes(locale: AppLocale, notes?: string, notesSv?: string): string | undefined {
  return locale === 'sv' ? notesSv ?? notes : notes
}

function localizedReps(
  locale: AppLocale,
  reps: number | string,
  repsSv?: number | string
): number | string {
  return locale === 'sv' ? repsSv ?? reps : reps
}

function localizedTags(locale: AppLocale, tags: string[], tagsSv?: string[]): string[] {
  return locale === 'sv' ? tagsSv ?? tags : tags
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    const { user, clientId, isCoachInAthleteMode } = resolved
    locale = resolveRequestLocale(request, user.language)

    const body: SelfAssignRequestBody = await request.json()

    const { templateId, assignedDate, notes } = body

    // Validate required fields
    if (!templateId || !assignedDate) {
      return NextResponse.json(
        { error: t(locale, 'templateId and assignedDate are required', 'templateId och assignedDate krävs') },
        { status: 400 }
      )
    }

    // Get client for coach lookup
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: t(locale, 'Client not found', 'Klienten hittades inte') },
        { status: 404 }
      )
    }

    const { enabled: selfServiceEnabled } = await getAthleteSelfServiceAccess(clientId)

    if (!selfServiceEnabled) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Self-service strength training requires a PRO or ELITE athlete subscription',
            'Självservice för styrketräning kräver en PRO- eller ELITE-prenumeration för idrottare'
          ),
          upgradeRequired: true,
        },
        { status: 403 }
      )
    }

    // Get the system template
    const template = getTemplateById(templateId)
    if (!template) {
      return NextResponse.json(
        { error: t(locale, 'Template not found', 'Mallen hittades inte') },
        { status: 404 }
      )
    }

    // Create strength session from template
    const session = await prisma.strengthSession.create({
      data: {
        name: locale === 'sv' ? template.nameSv : template.name,
        description: locale === 'sv' ? template.descriptionSv : template.description,
        phase: template.phase,
        estimatedDuration: template.estimatedDuration,
        exercises: template.exercises
          .filter((ex) => ex.section === 'MAIN')
          .map((ex, idx) => ({
            exerciseId: `template-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
            exerciseName: locale === 'sv' ? ex.exerciseNameSv : ex.exerciseName,
            order: idx,
            sets: ex.sets,
            reps: localizedReps(locale, ex.reps, ex.repsSv),
            restSeconds: ex.restSeconds,
            tempo: ex.tempo,
            notes: localizedNotes(locale, ex.notes, ex.notesSv),
          })),
        warmupData: template.includesWarmup
          ? {
              notes: t(locale, 'Warm-up from template', 'Uppvärmning från mall'),
              duration: 8,
              exercises: template.exercises
                .filter((ex) => ex.section === 'WARMUP')
                .map((ex) => ({
                  exerciseId: `template-warmup-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                  exerciseName: locale === 'sv' ? ex.exerciseNameSv : ex.exerciseName,
                  sets: ex.sets,
                  reps: localizedReps(locale, ex.reps, ex.repsSv),
                  restSeconds: ex.restSeconds,
                  notes: localizedNotes(locale, ex.notes, ex.notesSv),
                })),
            }
          : undefined,
        coreData: template.includesCore
          ? {
              notes: t(locale, 'Core exercises from template', 'Core-övningar från mall'),
              duration: 5,
              exercises: template.exercises
                .filter((ex) => ex.section === 'CORE')
                .map((ex) => ({
                  exerciseId: `template-core-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                  exerciseName: locale === 'sv' ? ex.exerciseNameSv : ex.exerciseName,
                  sets: ex.sets,
                  reps: localizedReps(locale, ex.reps, ex.repsSv),
                  restSeconds: ex.restSeconds,
                  notes: localizedNotes(locale, ex.notes, ex.notesSv),
                })),
            }
          : undefined,
        cooldownData: template.includesCooldown
          ? {
              notes: t(locale, 'Stretch all major muscle groups', 'Stretcha alla stora muskelgrupper'),
              duration: 7,
              exercises: template.exercises
                .filter((ex) => ex.section === 'COOLDOWN')
                .map((ex) => ({
                  exerciseId: `template-cooldown-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                  exerciseName: locale === 'sv' ? ex.exerciseNameSv : ex.exerciseName,
                  sets: ex.sets,
                  reps: localizedReps(locale, ex.reps, ex.repsSv),
                  restSeconds: ex.restSeconds,
                  notes: localizedNotes(locale, ex.notes, ex.notesSv),
                })),
            }
          : undefined,
        totalSets: template.exercises.reduce((sum, ex) => sum + ex.sets, 0),
        totalExercises: template.exercises.length,
        coachId: isCoachInAthleteMode ? user.id : client.userId, // Use athlete's coach or self
        isPublic: false,
        tags: [...localizedTags(locale, template.tags, template.tagsSv), `template:${template.id}`], // Store template reference in tags
      },
    })

    // Create assignment for the athlete
    const assignment = await prisma.strengthSessionAssignment.create({
      data: {
        sessionId: session.id,
        athleteId: clientId,
        assignedDate: new Date(assignedDate),
        assignedBy: user.id, // Self-assigned
        notes: notes || t(locale, `Self-assigned from template: ${template.name}`, `Självtilldelad från mall: ${template.nameSv}`),
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          name: session.name,
        },
        assignment: {
          id: assignment.id,
          assignedDate: assignment.assignedDate,
        },
      },
      message: t(locale, 'Strength session assigned.', 'Styrkepass tilldelat!'),
    })
  } catch (error) {
    logger.error('Error self-assigning strength session', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to assign strength session', 'Kunde inte tilldela styrkepass') },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
