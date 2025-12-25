/**
 * Self-Service Strength Session Assignment API
 *
 * POST - Athlete self-assigns a strength session from a template
 *
 * This allows PRO/ENTERPRISE athletes to:
 * 1. Select a system template
 * 2. Create a strength session from it
 * 3. Assign it to themselves for a specific date
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'
import { getTemplateById } from '@/lib/training-engine/templates/strength-templates'
import { logger } from '@/lib/logger'

interface SelfAssignRequestBody {
  templateId: string
  assignedDate: string // ISO date
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAthlete()
    const body: SelfAssignRequestBody = await request.json()

    const { templateId, assignedDate, notes } = body

    // Validate required fields
    if (!templateId || !assignedDate) {
      return NextResponse.json(
        { error: 'templateId and assignedDate are required' },
        { status: 400 }
      )
    }

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: true,
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    // Check subscription through user
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })

    // Check if athlete has self-service enabled (PRO or higher)
    const subscriptionTier = subscription?.tier || 'FREE'
    const selfServiceEnabled = ['PRO', 'ENTERPRISE'].includes(subscriptionTier)

    if (!selfServiceEnabled) {
      return NextResponse.json(
        {
          error: 'Self-service strength training requires PRO subscription',
          upgradeRequired: true,
        },
        { status: 403 }
      )
    }

    // Get the system template
    const template = getTemplateById(templateId)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create strength session from template
    const session = await prisma.strengthSession.create({
      data: {
        name: template.nameSv,
        description: template.descriptionSv,
        phase: template.phase,
        estimatedDuration: template.estimatedDuration,
        exercises: template.exercises
          .filter((ex) => ex.section === 'MAIN')
          .map((ex, idx) => ({
            exerciseId: `template-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
            exerciseName: ex.exerciseNameSv,
            order: idx,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            tempo: ex.tempo,
            notes: ex.notes,
          })),
        warmupData: template.includesWarmup
          ? {
              notes: 'Uppvärmning från mall',
              duration: 8,
              exercises: template.exercises
                .filter((ex) => ex.section === 'WARMUP')
                .map((ex) => ({
                  exerciseId: `template-warmup-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                  exerciseName: ex.exerciseNameSv,
                  sets: ex.sets,
                  reps: ex.reps,
                  restSeconds: ex.restSeconds,
                  notes: ex.notes,
                })),
            }
          : undefined,
        coreData: template.includesCore
          ? {
              notes: 'Core-övningar från mall',
              duration: 5,
              exercises: template.exercises
                .filter((ex) => ex.section === 'CORE')
                .map((ex) => ({
                  exerciseId: `template-core-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                  exerciseName: ex.exerciseNameSv,
                  sets: ex.sets,
                  reps: ex.reps,
                  restSeconds: ex.restSeconds,
                  notes: ex.notes,
                })),
            }
          : undefined,
        cooldownData: template.includesCooldown
          ? {
              notes: 'Stretcha alla stora muskelgrupper',
              duration: 7,
              exercises: template.exercises
                .filter((ex) => ex.section === 'COOLDOWN')
                .map((ex) => ({
                  exerciseId: `template-cooldown-${ex.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                  exerciseName: ex.exerciseNameSv,
                  sets: ex.sets,
                  reps: ex.reps,
                  restSeconds: ex.restSeconds,
                  notes: ex.notes,
                })),
            }
          : undefined,
        totalSets: template.exercises.reduce((sum, ex) => sum + ex.sets, 0),
        totalExercises: template.exercises.length,
        coachId: athleteAccount.client?.userId || user.id, // Use athlete's coach or self
        isPublic: false,
        tags: [...template.tags, `template:${template.id}`], // Store template reference in tags
      },
    })

    // Create assignment for the athlete
    const assignment = await prisma.strengthSessionAssignment.create({
      data: {
        sessionId: session.id,
        athleteId: athleteAccount.clientId,
        assignedDate: new Date(assignedDate),
        assignedBy: user.id, // Self-assigned
        notes: notes || `Självtilldelad från mall: ${template.nameSv}`,
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
      message: 'Styrkepass tilldelat!',
    })
  } catch (error) {
    logger.error('Error self-assigning strength session', {}, error)
    return NextResponse.json(
      { error: 'Failed to assign strength session' },
      { status: 500 }
    )
  }
}
