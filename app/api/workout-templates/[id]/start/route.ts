import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

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

const SECTION_LABELS: Record<AppLocale, Record<TemplateSection['type'], string>> = {
  en: {
    WARMUP: 'Warm-up',
    MAIN: 'Main session',
    CORE: 'Core',
    COOLDOWN: 'Cooldown',
  },
  sv: {
    WARMUP: 'Uppvärmning',
    MAIN: 'Huvuddel',
    CORE: 'Core',
    COOLDOWN: 'Nedvarvning',
  },
}

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bVila\b/g, 'Rest'],
  [/\bvila\b/g, 'rest'],
  [/\bLugnt tempo\b/g, 'Easy pace'],
  [/\blugnt tempo\b/g, 'easy pace'],
  [/\bLugn jogg\b/g, 'Easy jog'],
  [/\blugn jogg\b/g, 'easy jog'],
  [/\bLugn nedvarvning\b/g, 'Easy cooldown'],
  [/\blugn nedvarvning\b/g, 'easy cooldown'],
  [/\bGradvis uppvärmning\b/g, 'Gradual warm-up'],
  [/\bGradvis öka fart\b/g, 'Gradually increase pace'],
  [/\bFokus på arbetade muskler\b/g, 'Focus on worked muscles'],
  [/\bPer sida\b/g, 'Per side'],
  [/\bper sida\b/g, 'per side'],
  [/\bper riktning\b/g, 'per direction'],
  [/\bKroppsvikt\b/g, 'Bodyweight'],
  [/\bHantlar\b/g, 'Dumbbells'],
  [/\bHantel\b/g, 'Dumbbell'],
  [/\bMedicinboll\b/g, 'Medicine ball'],
  [/\bLätt-medel\b/g, 'Light-moderate'],
  [/\bMedel-tungt\b/g, 'Moderately heavy'],
  [/\bLätt\b/g, 'Light'],
  [/\bMedel\b/g, 'Moderate'],
  [/\bTungt\b/g, 'Heavy'],
  [/\bhårt\b/g, 'hard'],
  [/\bHögt tempo\b/g, 'High pace'],
  [/\bhög intensitet\b/g, 'high intensity'],
  [/\bhög kadens\b/g, 'high cadence'],
  [/\blugn kadens\b/g, 'easy cadence'],
  [/\baktiv vila\b/g, 'active rest'],
  [/\bplatt mark\b/g, 'flat ground'],
  [/\brask promenad\b/g, 'brisk walk'],
  [/\bRask promenad\b/g, 'Brisk walk'],
  [/\bBörja försiktigt\b/g, 'Start carefully'],
]

function localizeExerciseName(exercise: TemplateExercise, locale: AppLocale): string {
  return locale === 'sv' ? exercise.nameSv || exercise.name : exercise.name || exercise.nameSv
}

function localizeSectionLabel(section: TemplateSection, locale: AppLocale): string {
  return SECTION_LABELS[locale][section.type] ?? section.label
}

function localizeTemplateText(value: string | undefined, locale: AppLocale): string | undefined {
  if (!value || locale === 'sv') return value
  return TEXT_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(req, user.language)
    const { id } = await params

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: t(locale, 'Template not found', 'Mallen hittades inte') }, { status: 404 })
    }

    const sections = template.sections as unknown as TemplateSection[]
    const workoutName = locale === 'sv' ? template.nameSv : template.name

    // Build raw text from template sections for the ad-hoc workout
    const rawText = sections
      .map((s) => {
        const header = `## ${localizeSectionLabel(s, locale)}`
        const exercises = s.exercises
          .map((ex) => {
            const parts = [localizeExerciseName(ex, locale)]
            if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}`)
            else if (ex.duration) parts.push(`${ex.duration}s`)
            const weight = localizeTemplateText(ex.weight, locale)
            if (weight) parts.push(`(${weight})`)
            if (ex.rest) parts.push(`${locale === 'sv' ? 'Vila' : 'Rest'}: ${ex.rest}s`)
            const notes = localizeTemplateText(ex.notes, locale)
            if (notes) parts.push(`- ${notes}`)
            return `- ${parts.join(' ')}`
          })
          .join('\n')
        return `${header}\n${exercises}`
      })
      .join('\n\n')

    // Build parsed structure matching the AdHocWorkout parsedStructure format
    const parsedStructure = {
      type: template.workoutType,
      name: workoutName,
      sections: sections.map((s) => ({
        type: s.type,
        label: localizeSectionLabel(s, locale),
        exercises: s.exercises.map((ex) => ({
          name: localizeExerciseName(ex, locale),
          sets: ex.sets,
          reps: localizeTemplateText(String(ex.reps ?? ''), locale) || ex.reps,
          duration: ex.duration,
          rest: ex.rest,
          weight: localizeTemplateText(ex.weight, locale),
          notes: localizeTemplateText(ex.notes, locale),
        })),
      })),
    }

    const [adHocWorkout] = await prisma.$transaction([
      prisma.adHocWorkout.create({
        data: {
          athleteId: clientId,
          inputType: 'MANUAL_FORM',
          workoutDate: new Date(),
          workoutName,
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
      workoutName,
    })
  } catch (error) {
    console.error('Error starting workout from template:', error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
