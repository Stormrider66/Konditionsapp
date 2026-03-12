import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'

interface TemplateExercise {
  name: string
  nameSv: string
  sets?: number
  reps?: number | string
  duration?: number
  rest?: number
  weight?: string
  notes?: string
}

interface TemplateSection {
  type: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  label: string
  exercises: TemplateExercise[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved
    const { id } = await params

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const sections = template.sections as unknown as TemplateSection[]

    // Build raw text from template sections for the ad-hoc workout
    const rawText = sections
      .map((s) => {
        const header = `## ${s.label}`
        const exercises = s.exercises
          .map((ex) => {
            const parts = [ex.nameSv]
            if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}`)
            else if (ex.duration) parts.push(`${ex.duration}s`)
            if (ex.weight) parts.push(`(${ex.weight})`)
            if (ex.rest) parts.push(`Vila: ${ex.rest}s`)
            return `- ${parts.join(' ')}`
          })
          .join('\n')
        return `${header}\n${exercises}`
      })
      .join('\n\n')

    // Build parsed structure matching the AdHocWorkout parsedStructure format
    const parsedStructure = {
      type: template.workoutType,
      name: template.nameSv,
      sections: sections.map((s) => ({
        type: s.type,
        label: s.label,
        exercises: s.exercises.map((ex) => ({
          name: ex.nameSv,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
          rest: ex.rest,
          weight: ex.weight,
          notes: ex.notes,
        })),
      })),
    }

    const [adHocWorkout] = await prisma.$transaction([
      prisma.adHocWorkout.create({
        data: {
          athleteId: clientId,
          inputType: 'MANUAL_FORM',
          workoutDate: new Date(),
          workoutName: template.nameSv,
          rawInputText: rawText,
          parsedType: template.workoutType,
          parsedStructure: parsedStructure as never,
          parsingConfidence: 1.0,
          status: 'CONFIRMED',
          athleteReviewed: true,
        },
      }),
      prisma.workoutTemplate.update({
        where: { id },
        data: { usageCount: { increment: 1 } },
      }),
    ])

    return NextResponse.json({
      adHocWorkoutId: adHocWorkout.id,
      workoutName: template.nameSv,
    })
  } catch (error) {
    console.error('Error starting workout from template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
