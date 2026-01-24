// app/api/injury/acute-report/[id]/assess/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessAthleteAsPhysio, canAccessClient } from '@/lib/auth-utils'
import { z } from 'zod'

const createAssessmentSchema = z.object({
  injuryType: z.string().min(1),
  bodyPart: z.string().min(1),
  side: z.enum(['LEFT', 'RIGHT', 'BILATERAL', 'CENTRAL']).optional(),
  painLevel: z.number().int().min(0).max(10),
  mechanism: z.string().optional(),
  phase: z.enum(['ACUTE', 'SUBACUTE', 'CHRONIC']).default('ACUTE'),
  delawarePainRuleTriggered: z.boolean().default(false),
  delawareRule: z.string().optional(),
  description: z.string().optional(),
  functionalLimitations: z.array(z.string()).optional(),
  redFlags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Also create a training restriction
  createRestriction: z.boolean().default(false),
  restrictionType: z.enum([
    'NO_RUNNING',
    'NO_JUMPING',
    'NO_IMPACT',
    'NO_UPPER_BODY',
    'NO_LOWER_BODY',
    'REDUCED_VOLUME',
    'REDUCED_INTENSITY',
    'MODIFIED_ONLY',
    'SPECIFIC_EXERCISES',
    'CUSTOM',
  ]).optional(),
  restrictionSeverity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'COMPLETE']).optional(),
  restrictionEndDate: z.string().datetime().optional(),
})

/**
 * POST /api/injury/acute-report/[id]/assess
 * Create a full InjuryAssessment from an acute injury report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only physios and coaches can create assessments
    if (user.role !== 'ADMIN' && user.role !== 'PHYSIO' && user.role !== 'COACH') {
      return NextResponse.json(
        { error: 'Only physios and coaches can create injury assessments' },
        { status: 403 }
      )
    }

    const { id: reportId } = await params
    const body = await request.json()
    const validatedData = createAssessmentSchema.parse(body)

    // Check if report exists
    const report = await prisma.acuteInjuryReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check if already assessed
    if (report.injuryId) {
      return NextResponse.json(
        { error: 'This report has already been assessed' },
        { status: 400 }
      )
    }

    // Check access
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = await canAccessAthleteAsPhysio(user.id, report.clientId)
    } else if (user.role === 'COACH') {
      hasAccess = await canAccessClient(user.id, report.clientId)
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to assess this report' },
        { status: 403 }
      )
    }

    // Create assessment and optionally restriction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the injury assessment
      const injury = await tx.injuryAssessment.create({
        data: {
          clientId: report.clientId,
          assessedById: user.id,
          injuryType: validatedData.injuryType,
          bodyPart: validatedData.bodyPart,
          side: validatedData.side,
          painLevel: validatedData.painLevel,
          mechanism: validatedData.mechanism || report.mechanism,
          phase: validatedData.phase,
          delawarePainRuleTriggered: validatedData.delawarePainRuleTriggered,
          delawareRule: validatedData.delawareRule,
          description: validatedData.description || report.description,
          functionalLimitations: validatedData.functionalLimitations || [],
          redFlags: validatedData.redFlags || [],
          notes: validatedData.notes,
          resolved: false,
        },
      })

      // Link report to injury and update status
      await tx.acuteInjuryReport.update({
        where: { id: reportId },
        data: {
          injuryId: injury.id,
          status: 'REVIEWED',
        },
      })

      // Create restriction if requested
      let restriction = null
      if (validatedData.createRestriction && validatedData.restrictionType) {
        restriction = await tx.trainingRestriction.create({
          data: {
            clientId: report.clientId,
            createdById: user.id,
            injuryId: injury.id,
            type: validatedData.restrictionType,
            severity: validatedData.restrictionSeverity || 'MODERATE',
            source: user.role === 'PHYSIO' ? 'PHYSIO_MANUAL' : 'COACH_MANUAL',
            bodyParts: [validatedData.bodyPart],
            endDate: validatedData.restrictionEndDate
              ? new Date(validatedData.restrictionEndDate)
              : undefined,
            reason: `Created from acute injury assessment: ${validatedData.injuryType}`,
            isActive: true,
          },
        })
      }

      return { injury, restriction }
    })

    // Fetch the full injury with relations
    const fullInjury = await prisma.injuryAssessment.findUnique({
      where: { id: result.injury.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assessedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        restrictions: {
          select: {
            id: true,
            type: true,
            severity: true,
          },
        },
      },
    })

    return NextResponse.json({
      injury: fullInjury,
      restriction: result.restriction,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating injury assessment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create injury assessment' },
      { status: 500 }
    )
  }
}
