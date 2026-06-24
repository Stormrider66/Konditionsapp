import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

export const updateLiveWorkoutFeedbackInputSchema = z.object({
  assignmentId: z.string().uuid().optional(),
  sessionLogId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  note: z.string().max(1000).optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  painBodyPart: z.string().min(2).max(80).optional(),
  targetAdjustment: z.string().max(240).optional(),
}).superRefine((value, ctx) => {
  const hasFeedback = Boolean(
    value.rpe != null ||
    value.note ||
    value.painLevel != null ||
    value.painBodyPart ||
    value.targetAdjustment
  )
  if (!hasFeedback) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Provide workout feedback, RPE, pain, or target adjustment.' })
  }
})

export type UpdateLiveWorkoutFeedbackInput = z.infer<typeof updateLiveWorkoutFeedbackInputSchema>

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function parseWorkoutDate(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00.000Z`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function dayEnd(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

function detailsFrom(parts: Array<string | null | undefined>): string[] {
  return parts.filter((part): part is string => Boolean(part))
}

function feedbackLines(input: UpdateLiveWorkoutFeedbackInput, locale: AppLocale): string[] {
  return detailsFrom([
    input.rpe != null ? `RPE: ${input.rpe}/10` : null,
    input.painLevel != null || input.painBodyPart
      ? `${t(locale, 'Pain', 'Smärta')}: ${input.painBodyPart || t(locale, 'not specified', 'ej angivet')}${input.painLevel != null ? ` ${input.painLevel}/10` : ''}`
      : null,
    input.targetAdjustment ? `${t(locale, 'Target note', 'Målnotering')}: ${input.targetAdjustment}` : null,
    input.note ? `${t(locale, 'Note', 'Notering')}: ${input.note}` : null,
  ])
}

function feedbackNote(input: UpdateLiveWorkoutFeedbackInput, locale: AppLocale): string {
  return feedbackLines(input, locale).join('\n')
}

function appendNotes(existing: string | null | undefined, addition: string): string {
  return [existing, addition].filter(Boolean).join('\n\n')
}

export function buildUpdateLiveWorkoutFeedbackPreview(input: UpdateLiveWorkoutFeedbackInput, locale: AppLocale) {
  const date = input.date || new Date().toISOString().slice(0, 10)
  return {
    title: t(locale, 'Update workout feedback', 'Uppdatera passfeedback'),
    description: t(
      locale,
      'Review this live workout feedback before it is added to the current session.',
      'Granska den här livefeedbacken innan den läggs till på aktuellt pass.'
    ),
    targetLabel: detailsFrom([
      input.assignmentId ? t(locale, 'assigned workout', 'tilldelat pass') : null,
      input.sessionLogId ? t(locale, 'live session log', 'livepasslogg') : null,
      date,
    ]).join(' · '),
    body: input.note || input.targetAdjustment || null,
    details: [
      `${t(locale, 'Date', 'Datum')}: ${date}`,
      ...feedbackLines(input, locale),
    ],
    confirmLabel: t(locale, 'Save feedback', 'Spara feedback'),
  }
}

export async function executeUpdateLiveWorkoutFeedback(
  clientId: string,
  input: UpdateLiveWorkoutFeedbackInput,
  locale: AppLocale
) {
  try {
    const start = parseWorkoutDate(input.date)
    const end = dayEnd(start)
    const note = feedbackNote(input, locale)

    const log = input.sessionLogId
      ? await prisma.cardioSessionLog.findFirst({
          where: { id: input.sessionLogId, athleteId: clientId },
          select: { id: true, assignmentId: true, notes: true, session: { select: { name: true } } },
        })
      : await prisma.cardioSessionLog.findFirst({
          where: {
            athleteId: clientId,
            ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
            startedAt: { gte: start, lte: end },
            status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
          },
          select: { id: true, assignmentId: true, notes: true, session: { select: { name: true } } },
          orderBy: { startedAt: 'desc' },
        })

    if (log) {
      await prisma.cardioSessionLog.update({
        where: { id: log.id },
        data: {
          notes: appendNotes(log.notes, note),
          ...(input.rpe != null ? { sessionRPE: input.rpe } : {}),
        },
      })

      if (log.assignmentId) {
        const assignment = await prisma.cardioSessionAssignment.findFirst({
          where: { id: log.assignmentId, athleteId: clientId },
          select: { id: true, notes: true },
        })
        if (assignment) {
          await prisma.cardioSessionAssignment.update({
            where: { id: assignment.id },
            data: { notes: appendNotes(assignment.notes, note) },
          })
        }
      }

      return {
        success: true,
        sessionLogId: log.id,
        assignmentId: log.assignmentId,
        name: log.session.name,
        message: t(locale, 'Workout feedback was saved to the live session.', 'Passfeedback sparades på livepasset.'),
      }
    }

    const assignment = await prisma.cardioSessionAssignment.findFirst({
      where: {
        athleteId: clientId,
        ...(input.assignmentId ? { id: input.assignmentId } : {}),
        assignedDate: { gte: start, lte: end },
        status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
      },
      select: { id: true, notes: true, session: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    if (!assignment) {
      return {
        success: false,
        error: t(locale, 'No current cardio workout was found for that feedback.', 'Inget aktuellt konditionspass hittades för feedbacken.'),
      }
    }

    await prisma.cardioSessionAssignment.update({
      where: { id: assignment.id },
      data: { notes: appendNotes(assignment.notes, note) },
    })

    return {
      success: true,
      assignmentId: assignment.id,
      name: assignment.session.name,
      message: t(locale, 'Workout feedback was saved to the assigned session.', 'Passfeedback sparades på det tilldelade passet.'),
    }
  } catch (error) {
    logger.error('updateLiveWorkoutFeedback tool failed', { clientId }, error)
    return {
      success: false,
      error: t(locale, 'Could not save workout feedback.', 'Kunde inte spara passfeedback.'),
    }
  }
}
