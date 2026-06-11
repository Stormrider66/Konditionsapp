/**
 * Coach chat tools for strength sessions and full training programs.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { generateText } from 'ai'
import { createModelInstance } from '@/lib/ai/create-model'
import { withAiContext } from '@/lib/ai/usage-logger'
import { prisma } from '@/lib/prisma'
import { generateStrengthSession, generateWeeklyProgram, type AutoGenerateParams } from '@/lib/training-engine/generators/auto-strength-generator'
import { calculatePhases, estimateGenerationMinutes, generateMultiPartProgram, type GenerationContext } from '@/lib/ai/program-generator'
import { modifyStrengthSessionPrompt } from '@/lib/ai/strength-program-prompts'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { logger } from '@/lib/logger'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { strengthSessionAccessWhere } from '@/lib/strength/session-business-scope'
import { getStrengthBusinessTag } from '@/lib/strength/session-business-tags'
import { getProgramSportSettings, normalizeProgramSport } from '@/lib/ai/program-generator/sport-normalization'
import type { Prisma, StrengthPhase } from '@prisma/client'
import {
  type CoachToolContext,
  type CoachToolTeam,
  VALID_STRENGTH_PHASES,
  toolText,
  findAccessibleCoachTeam,
  resolveCoachToolBusinessId,
  sumStrengthSets,
  normalizeStrengthSection,
  extractJsonObject,
} from './shared'

export function createStrengthTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    generateStrengthSession: tool({
      description: toolText(
        locale,
        'Generate a strength session automatically based on goal, phase, equipment, and athlete profile. Can create a single session or a weekly program (2-3 sessions A/B/C). The session is saved to the database and can then be edited in Strength Studio.',
        'Generera ett styrkepass automatiskt baserat på mål, fas, utrustning och atletprofil. Kan skapa enskilt pass eller veckoprogram (2-3 pass A/B/C). Passet sparas i databasen och kan sedan redigeras i Strength Studio.'
      ),
      inputSchema: z.object({
        clientId: z.string().optional().describe(toolText(locale, 'Athlete client ID if the session should be personalized for a specific athlete.', 'Atletens client-ID om passet ska anpassas efter en specifik atlet')),
        goal: z.enum(['strength', 'power', 'injury-prevention', 'running-economy']).describe(toolText(locale, 'Training goal: strength=general strength, power=power and explosiveness, injury-prevention=injury prevention, running-economy=running economy.', 'Träningsmål: strength=generell styrka, power=kraft & explosivitet, injury-prevention=skadeförebyggande, running-economy=löpekonomi')),
        phase: z.enum(['ANATOMICAL_ADAPTATION', 'MAXIMUM_STRENGTH', 'POWER', 'MAINTENANCE', 'TAPER']).describe(toolText(locale, 'Training phase/periodization.', 'Träningsfas/periodisering')),
        athleteLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).default('INTERMEDIATE').describe(toolText(locale, 'Athlete level.', 'Atletens nivå')),
        sessionsPerWeek: z.enum(['1', '2', '3']).default('2').describe(toolText(locale, 'Number of sessions per week (1, 2, or 3).', 'Antal pass per vecka (1, 2 eller 3)')),
        timePerSession: z.enum(['20', '30', '45', '60', '75', '90']).default('45').describe(toolText(locale, 'Time per session in minutes.', 'Tid per pass i minuter')),
        equipmentAvailable: z.array(z.string()).default(['barbell', 'dumbbell', 'bodyweight']).describe(toolText(locale, 'Available equipment: barbell, dumbbell, kettlebell, bodyweight, cable, machine, bands, box.', 'Tillgänglig utrustning: barbell, dumbbell, kettlebell, bodyweight, cable, machine, bands, box')),
        mode: z.enum(['single', 'weekly']).default('single').describe(toolText(locale, 'single=single session, weekly=weekly program with A/B/C variation.', 'single=enskilt pass, weekly=veckoprogram med A/B/C variation')),
        includeWarmup: z.boolean().default(true),
        includePrehab: z.boolean().optional().describe(toolText(locale, 'Include a separate stability/prehab section. If omitted, it is enabled automatically for hockey, injury-prevention goals, or active risk areas.', 'Inkludera separat stabilitet/prehab-sektion. Om utelämnad aktiveras den automatiskt för hockey, skadeförebyggande mål eller aktiva riskområden.')),
        includeCore: z.boolean().default(true),
        includeCooldown: z.boolean().default(true),
      }),
      execute: async (params) => {
        try {
          const {
            clientId,
            goal,
            phase,
            athleteLevel,
            sessionsPerWeek: sessionsPerWeekStr,
            timePerSession: timePerSessionStr,
            equipmentAvailable,
            mode,
            includeWarmup,
            includePrehab,
            includeCore,
            includeCooldown,
          } = params
          const sessionsPerWeek = parseInt(sessionsPerWeekStr) as 1 | 2 | 3
          const timePerSession = parseInt(timePerSessionStr)

          // Fetch athlete context if clientId provided
          let recentExerciseIds: string[] = []
          let oneRmData: Record<string, number> = {}
          let restrictedExerciseIds: string[] = []
          let restrictionTypes: string[] = []
          let restrictedBodyParts: string[] = []
          let athleteSport: string | null = null

          if (clientId) {
            const twoWeeksAgo = new Date()
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

            try {
              const recentLogs = await prisma.progressionTracking.findMany({
                where: { clientId, date: { gte: twoWeeksAgo } },
                select: { exerciseId: true },
                distinct: ['exerciseId'],
              })
              recentExerciseIds = recentLogs.map((l) => l.exerciseId)
            } catch { /* skip */ }

            try {
              const oneRmHistory = await prisma.oneRepMaxHistory.findMany({
                where: { clientId },
                orderBy: { date: 'desc' },
                distinct: ['exerciseId'],
                select: { exerciseId: true, oneRepMax: true },
              })
              oneRmData = oneRmHistory.reduce((acc, rm) => {
                acc[rm.exerciseId] = rm.oneRepMax
                return acc
              }, {} as Record<string, number>)
            } catch { /* skip */ }

            try {
              const sportProfile = await prisma.sportProfile.findFirst({
                where: { clientId },
                select: { primarySport: true },
              })
              athleteSport = sportProfile?.primarySport || null
            } catch { /* skip */ }

            try {
              const restrictions = await prisma.trainingRestriction.findMany({
                where: {
                  clientId,
                  isActive: true,
                  OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
                },
                select: { type: true, bodyParts: true, affectedExerciseIds: true },
              })
              restrictedExerciseIds = restrictions.flatMap((r) => r.affectedExerciseIds || [])
              restrictedBodyParts = restrictions.flatMap((r) => r.bodyParts || [])
              restrictionTypes = restrictions.map((r) => r.type)
            } catch { /* skip */ }
          }

          // Fetch and filter exercise library
          const exerciseLibrary = await prisma.exercise.findMany({
            where: {
              OR: [{ isPublic: true }, { coachId: coachUserId }],
            },
            select: {
              id: true,
              name: true,
              nameSv: true,
              nameEn: true,
              biomechanicalPillar: true,
              progressionLevel: true,
              equipment: true,
              category: true,
              isRehabExercise: true,
              targetBodyParts: true,
              contraindications: true,
            },
          })

          const filtered = exerciseLibrary
            .filter((ex) => {
              if (restrictedExerciseIds.includes(ex.id)) return false
              if (restrictedBodyParts.length > 0 && ex.targetBodyParts?.length) {
                if (ex.targetBodyParts.some((part: string) =>
                  restrictedBodyParts.some((r) => part.toLowerCase().includes(r.toLowerCase()))
                )) return false
              }
              if (restrictionTypes.includes('NO_JUMPING') && ex.category === 'PLYOMETRIC') return false
              if (restrictionTypes.includes('NO_UPPER_BODY') && ex.biomechanicalPillar === 'UPPER_BODY') return false
              if (restrictionTypes.includes('NO_LOWER_BODY') &&
                ['POSTERIOR_CHAIN', 'KNEE_DOMINANCE', 'FOOT_ANKLE'].includes(ex.biomechanicalPillar || '')) return false
              return true
            })
            .map((ex) => ({ ...ex, isPlyometric: ex.category === 'PLYOMETRIC' }))

          const generateParams: AutoGenerateParams = {
            athleteId: clientId || coachUserId,
            goal,
            phase: phase as StrengthPhase,
            sessionsPerWeek,
            timePerSession,
            equipmentAvailable,
            athleteLevel,
            includeWarmup,
            includePrehab: includePrehab ?? undefined,
            includeCore,
            includeCooldown,
            sport: athleteSport,
            riskBodyParts: restrictedBodyParts,
            locale,
            recentExerciseIds,
            oneRmData,
          }

          if (mode === 'weekly') {
            const sessions = await generateWeeklyProgram(generateParams, filtered)

            // Save all sessions to database
            const savedIds: string[] = []
            for (const session of sessions) {
              const mainExercises = session.sections.find((s) => s.type === 'MAIN')?.exercises || []
              const warmupData = session.sections.find((s) => s.type === 'WARMUP')
              const prehabData = session.sections.find((s) => s.type === 'PREHAB')
              const coreData = session.sections.find((s) => s.type === 'CORE')
              const cooldownData = session.sections.find((s) => s.type === 'COOLDOWN')

              const saved = await prisma.strengthSession.create({
                data: {
                  name: session.name,
                  description: session.description,
                  phase: session.phase,
                  estimatedDuration: session.estimatedDuration,
                  exercises: mainExercises as any,
                  warmupData: warmupData ? { exercises: warmupData.exercises, notes: warmupData.notes, duration: warmupData.duration } as any : undefined,
                  prehabData: prehabData ? { exercises: prehabData.exercises, notes: prehabData.notes, duration: prehabData.duration } as any : undefined,
                  coreData: coreData ? { exercises: coreData.exercises, notes: coreData.notes, duration: coreData.duration } as any : undefined,
                  cooldownData: cooldownData ? { exercises: cooldownData.exercises, notes: cooldownData.notes, duration: cooldownData.duration } as any : undefined,
                  totalSets: session.totalSets,
                  totalExercises: session.totalExercises,
                  coachId: coachUserId,
                },
              })
              savedIds.push(saved.id)
            }

            return {
              success: true,
              mode: 'weekly',
              sessionsGenerated: sessions.length,
              savedSessionIds: savedIds,
              sessions: sessions.map((s) => ({
                name: s.name,
                description: s.description,
                totalExercises: s.totalExercises,
                totalSets: s.totalSets,
                rationale: s.rationale,
                mainExercises: s.exercises
                  .filter((e) => e.section === 'MAIN')
                  .map((e) => `${e.exerciseName} (${e.sets}x${e.reps})`),
              })),
              message: toolText(
                locale,
                `${sessions.length} sessions created and saved in the workout library.`,
                `${sessions.length} pass skapade och sparade i Passbiblioteket.`,
              ),
            }
          }

          // Single session
          const session = await generateStrengthSession(generateParams, filtered)

          const mainExercises = session.sections.find((s) => s.type === 'MAIN')?.exercises || []
          const warmupData = session.sections.find((s) => s.type === 'WARMUP')
          const prehabData = session.sections.find((s) => s.type === 'PREHAB')
          const coreData = session.sections.find((s) => s.type === 'CORE')
          const cooldownData = session.sections.find((s) => s.type === 'COOLDOWN')

          const saved = await prisma.strengthSession.create({
            data: {
              name: session.name,
              description: session.description,
              phase: session.phase,
              estimatedDuration: session.estimatedDuration,
              exercises: mainExercises as any,
              warmupData: warmupData ? { exercises: warmupData.exercises, notes: warmupData.notes, duration: warmupData.duration } as any : undefined,
              prehabData: prehabData ? { exercises: prehabData.exercises, notes: prehabData.notes, duration: prehabData.duration } as any : undefined,
              coreData: coreData ? { exercises: coreData.exercises, notes: coreData.notes, duration: coreData.duration } as any : undefined,
              cooldownData: cooldownData ? { exercises: cooldownData.exercises, notes: cooldownData.notes, duration: cooldownData.duration } as any : undefined,
              totalSets: session.totalSets,
              totalExercises: session.totalExercises,
              coachId: coachUserId,
            },
          })

          return {
            success: true,
            mode: 'single',
            savedSessionId: saved.id,
            name: session.name,
            description: session.description,
            totalExercises: session.totalExercises,
            totalSets: session.totalSets,
            rationale: session.rationale,
            mainExercises: session.exercises
              .filter((e) => e.section === 'MAIN')
              .map((e) => `${e.exerciseName} (${e.sets}x${e.reps}${e.weight ? ` @ ${e.weight}kg` : ''})`),
            message: toolText(
              locale,
              `Session "${session.name}" created and saved in the workout library.`,
              `Pass "${session.name}" skapat och sparat i Passbiblioteket.`,
            ),
          }
        } catch (error) {
          logger.error('Error in generateStrengthSession tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not generate the strength session. Please try again.', 'Kunde inte generera styrkepass. Försök igen.'),
          }
        }
      },
    }),

    createComplementaryStrengthSession: tool({
      description: toolText(
        locale,
        'Create and save a new strength session that complements an existing strength session. Use after getTeamPlannedWorkout when the coach wants a second session later in the week that supports or balances the first. The tool reads the source session, avoids unnecessary exercise duplication, and saves the result in Strength Studio.',
        'Skapa och spara ett nytt styrkepass som kompletterar ett befintligt styrkepass. Använd efter getTeamPlannedWorkout när coachen vill ha ett andra pass senare i veckan som stödjer eller balanserar det första. Verktyget läser källpasset, undviker onödig övningsdubbling och sparar resultatet i Strength Studio.'
      ),
      inputSchema: z.object({
        sourceSessionId: z.string().optional().describe('ID for an existing StrengthSession if known.'),
        sourceTeamEventId: z.string().optional().describe('ID for a team calendar event with a linked strength session.'),
        teamId: z.string().optional().describe('Team id for context/access if known.'),
        teamName: z.string().optional().describe('Team name if id is missing.'),
        targetDay: z.string().optional().describe('Planned day for the new session, for example Friday or 2026-05-29.'),
        focus: z.string().optional().describe('Desired complementary direction, for example posterior chain, unilateral, prehab, or power.'),
        estimatedDuration: z.number().int().min(15).max(120).optional().describe('Desired duration in minutes. Defaults to the source session or 45 minutes.'),
        equipmentAvailable: z.array(z.string()).optional().describe('Available equipment, for example barbell, dumbbell, bands, or bodyweight.'),
      }),
      execute: async ({ sourceSessionId, sourceTeamEventId, teamId, teamName, targetDay, focus, estimatedDuration, equipmentAvailable }) => {
        try {
          const businessId = await resolveCoachToolBusinessId(coachUserId, businessSlug)
          if (businessId === null) {
            return {
              success: false,
              error: toolText(locale, 'The business could not be verified for this coach.', 'Verksamheten kunde inte verifieras för den här coachen.'),
            }
          }

          let sourceEvent: {
            id: string
            title: string
            teamId: string
            linkedWorkoutId: string | null
            linkedWorkoutType: string | null
            startDate: Date
            team: { id: string; name: string; sportType: string | null }
          } | null = null

          if (sourceTeamEventId) {
            const event = await prisma.teamEvent.findFirst({
              where: { id: sourceTeamEventId },
              select: {
                id: true,
                title: true,
                teamId: true,
                linkedWorkoutId: true,
                linkedWorkoutType: true,
                startDate: true,
                team: { select: { id: true, name: true, sportType: true } },
              },
            })
            if (!event) {
              return {
                success: false,
                error: toolText(locale, 'The source event was not found.', 'Källhändelsen hittades inte.'),
              }
            }
            const accessibleTeam = await getAccessibleTeam(coachUserId, event.teamId, businessSlug)
            if (!accessibleTeam) {
              return {
                success: false,
                error: toolText(locale, 'You do not have access to the team calendar.', 'Du har inte behörighet till lagets kalender.'),
              }
            }
            if (event.linkedWorkoutType !== 'STRENGTH' || !event.linkedWorkoutId) {
              return {
                success: false,
                error: toolText(locale, 'The source event does not have a linked strength session.', 'Källhändelsen har inget kopplat styrkepass.'),
              }
            }
            sourceEvent = event
            sourceSessionId = event.linkedWorkoutId
          }

          let teamContext: CoachToolTeam | null = sourceEvent?.team ?? null
          if (!teamContext && (teamId || teamName)) {
            const resolved = await findAccessibleCoachTeam(coachUserId, { teamId, teamName, businessSlug })
            if (!resolved.team) {
              return {
                success: false,
                needsClarification: resolved.candidates.length > 1,
                error: resolved.candidates.length > 1
                  ? toolText(
                      locale,
                      `I found several possible teams${teamName ? ` for "${teamName}"` : ''}.`,
                      `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                    )
                  : toolText(locale, 'I need to know which team the session is for.', 'Jag behöver veta vilket lag passet gäller.'),
                candidates: resolved.candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  sportType: candidate.sportType,
                })),
              }
            }
            teamContext = resolved.team
          }

          if (!sourceSessionId) {
            return {
              success: false,
              error: toolText(locale, 'I need an existing strength session or calendar event to start from.', 'Jag behöver ett befintligt styrkepass eller en kalenderhändelse att utgå från.'),
            }
          }

          const sourceSession = await prisma.strengthSession.findFirst({
            where: { id: sourceSessionId, AND: [strengthSessionAccessWhere(coachUserId, businessId)] },
            select: {
              id: true,
              name: true,
              description: true,
              phase: true,
              estimatedDuration: true,
              exercises: true,
              warmupData: true,
              prehabData: true,
              coreData: true,
              cooldownData: true,
              totalSets: true,
              totalExercises: true,
            },
          })

          if (!sourceSession) {
            return {
              success: false,
              error: toolText(locale, 'The source session was not found or is outside your access.', 'Källpasset hittades inte eller saknar behörighet.'),
            }
          }

          const exerciseLibrary = await prisma.exercise.findMany({
            where: { OR: [{ isPublic: true }, { coachId: coachUserId }] },
            select: {
              id: true,
              name: true,
              nameSv: true,
              nameEn: true,
              category: true,
              biomechanicalPillar: true,
              progressionLevel: true,
              equipment: true,
              targetBodyParts: true,
            },
            orderBy: { name: 'asc' },
            take: 260,
          })

          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'balanced')
          if (!resolved) {
            return {
              success: false,
              error: toolText(locale, 'No AI keys are configured.', 'Inga AI-nycklar konfigurerade.'),
            }
          }

          // createModelInstance applies the usage-logging middleware so this
          // call lands in AIUsageLog (raw provider factories bypass it).
          const aiModel = createModelInstance(resolved)

          const prompt = `Create a complementary strength session for a hockey/team-sport context.

Return ONLY valid JSON in this exact shape:
{
  "name": "string",
  "description": "string",
  "phase": "ANATOMICAL_ADAPTATION|MAXIMUM_STRENGTH|POWER|MAINTENANCE|TAPER",
  "estimatedDuration": 45,
  "rationale": "short explanation",
  "sections": {
    "warmup": {"duration": 8, "notes": "string", "exercises": [{"exerciseId": "optional", "exerciseName": "string", "sets": 2, "reps": "8", "restSeconds": 30, "notes": "string"}]},
    "main": {"notes": "string", "exercises": [{"exerciseId": "optional", "exerciseName": "string", "sets": 3, "reps": "5", "restSeconds": 120, "notes": "string"}]},
    "prehab": {"duration": 8, "notes": "string", "exercises": []},
    "core": {"duration": 8, "notes": "string", "exercises": []},
    "cooldown": {"duration": 5, "notes": "string", "exercises": []}
  }
}

Rules:
- Build a second session that supports the source session, not a duplicate.
- Prefer different exact exercises where possible while keeping the same training goal.
- For hockey teams, balance posterior chain, unilateral strength, trunk/anti-rotation, adductors/groin, hip stability, deceleration and shoulder robustness.
- Keep volume realistic for team planning.
- Use exerciseId from the library when a suitable match exists.
- Language: ${locale === 'sv' ? 'Write all user-facing names, descriptions, rationale, notes, and section text in Swedish.' : 'Write all user-facing names, descriptions, rationale, notes, and section text in English. Exercise library entries may contain Swedish aliases; use them only for matching unless an exercise has no English equivalent.'}

Team context:
${JSON.stringify(teamContext ?? null, null, 2)}

Source calendar event:
${JSON.stringify(sourceEvent ? { id: sourceEvent.id, title: sourceEvent.title, startDate: sourceEvent.startDate } : null, null, 2)}

Target day/date:
${targetDay || 'not specified'}

Requested focus:
${focus || 'Complement and support the source session'}

Target duration:
${estimatedDuration ?? sourceSession.estimatedDuration ?? 45} minutes

Available equipment:
${JSON.stringify(equipmentAvailable ?? ['barbell', 'dumbbell', 'bodyweight', 'bands', 'cable', 'machine'], null, 2)}

Source session:
${JSON.stringify(sourceSession, null, 2)}

Exercise library:
${JSON.stringify(exerciseLibrary, null, 2)}
`

          const result = await withAiContext(
            { userId: coachUserId, category: 'coach_strength_session' },
            () => generateText({
              model: aiModel,
              system: 'You are an elite hockey strength and conditioning coach. Return only valid JSON.',
              prompt,
              maxOutputTokens: 5000,
            }),
          )

          const generated = extractJsonObject(result.text) as Record<string, unknown>
          const sectionsValue = generated.sections && typeof generated.sections === 'object'
            ? generated.sections as Record<string, unknown>
            : {}
          const sectionFromArray = (type: string) => Array.isArray(generated.sections)
            ? (generated.sections as Array<Record<string, unknown>>).find((section) => String(section.type || '').toLowerCase() === type)
            : undefined
          const sectionValue = (key: string) => sectionsValue[key] ?? sectionFromArray(key)

          const mainSection = normalizeStrengthSection(
            sectionValue('main') ?? { exercises: generated.exercises },
            exerciseLibrary
          )
          if (mainSection.exercises.length === 0) {
            return {
              success: false,
              error: toolText(locale, 'AI could not create a complete main session.', 'AI kunde inte skapa ett komplett huvudpass.'),
            }
          }

          const warmupSection = normalizeStrengthSection(sectionValue('warmup'), exerciseLibrary)
          const prehabSection = normalizeStrengthSection(sectionValue('prehab'), exerciseLibrary)
          const coreSection = normalizeStrengthSection(sectionValue('core'), exerciseLibrary)
          const cooldownSection = normalizeStrengthSection(sectionValue('cooldown'), exerciseLibrary)

          const phaseCandidate = String(generated.phase || sourceSession.phase)
          const phase = VALID_STRENGTH_PHASES.includes(phaseCandidate as typeof VALID_STRENGTH_PHASES[number])
            ? phaseCandidate as StrengthPhase
            : sourceSession.phase
          const duration = typeof generated.estimatedDuration === 'number' && Number.isFinite(generated.estimatedDuration)
            ? Math.round(generated.estimatedDuration)
            : estimatedDuration ?? sourceSession.estimatedDuration ?? 45
          const tags = businessId ? [getStrengthBusinessTag(businessId), 'ai-complementary'] : ['ai-complementary']

          const saved = await prisma.strengthSession.create({
            data: {
              name: typeof generated.name === 'string' && generated.name.trim()
                ? generated.name.trim()
                : toolText(locale, `Complementary session - ${sourceSession.name}`, `Kompletterande pass - ${sourceSession.name}`),
              description: typeof generated.description === 'string'
                ? generated.description
                : toolText(locale, `Complementary strength session based on ${sourceSession.name}.`, `Kompletterande styrkepass baserat på ${sourceSession.name}.`),
              phase,
              estimatedDuration: duration,
              exercises: mainSection.exercises as Prisma.InputJsonValue,
              warmupData: warmupSection.exercises.length || warmupSection.notes
                ? { exercises: warmupSection.exercises, notes: warmupSection.notes, duration: warmupSection.duration } as Prisma.InputJsonValue
                : undefined,
              prehabData: prehabSection.exercises.length || prehabSection.notes
                ? { exercises: prehabSection.exercises, notes: prehabSection.notes, duration: prehabSection.duration } as Prisma.InputJsonValue
                : undefined,
              coreData: coreSection.exercises.length || coreSection.notes
                ? { exercises: coreSection.exercises, notes: coreSection.notes, duration: coreSection.duration } as Prisma.InputJsonValue
                : undefined,
              cooldownData: cooldownSection.exercises.length || cooldownSection.notes
                ? { exercises: cooldownSection.exercises, notes: cooldownSection.notes, duration: cooldownSection.duration } as Prisma.InputJsonValue
                : undefined,
              totalSets: sumStrengthSets([
                ...mainSection.exercises,
                ...warmupSection.exercises,
                ...prehabSection.exercises,
                ...coreSection.exercises,
                ...cooldownSection.exercises,
              ]),
              totalExercises: mainSection.exercises.length + warmupSection.exercises.length + prehabSection.exercises.length + coreSection.exercises.length + cooldownSection.exercises.length,
              coachId: coachUserId,
              tags,
            },
          })

          return {
            success: true,
            sourceSessionId: sourceSession.id,
            sourceTeamEventId: sourceEvent?.id ?? null,
            savedSessionId: saved.id,
            name: saved.name,
            description: saved.description,
            phase,
            estimatedDuration: duration,
            rationale: typeof generated.rationale === 'string' ? generated.rationale : null,
            mainExercises: mainSection.exercises.map((exercise) => `${exercise.exerciseName} (${exercise.sets}x${exercise.reps})`),
            message: toolText(
              locale,
              `I created "${saved.name}" as a complementary strength session in Strength Studio.`,
              `Jag skapade "${saved.name}" som ett kompletterande styrkepass i Strength Studio.`
            ),
          }
        } catch (error) {
          logger.error('Error in createComplementaryStrengthSession tool', {
            coachUserId,
            businessSlug,
            sourceSessionId,
            sourceTeamEventId,
            teamId,
            teamName,
          }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create a complementary strength session right now.', 'Kunde inte skapa ett kompletterande styrkepass just nu.'),
          }
        }
      },
    }),

    modifyStrengthSession: tool({
      description: toolText(
        locale,
        'Modify an existing strength session with AI. Can replace exercises, adjust volume/intensity, adapt for injuries, make it easier/harder, etc. Requires sessionId.',
        'Modifiera ett befintligt styrkepass med AI. Kan byta ut övningar, justera volym/intensitet, anpassa för skador, göra lättare/svårare etc. Kräver sessionId.'
      ),
      inputSchema: z.object({
        sessionId: z.string().describe('Strength session ID.'),
        modification: z.string().describe('What should change, for example "replace squats with leg press", "make the session easier", or "remove all jumping exercises".'),
      }),
      execute: async ({ sessionId, modification }) => {
        try {
          // Fetch current session
          const session = await prisma.strengthSession.findUnique({
            where: { id: sessionId },
            select: {
              id: true,
              name: true,
              description: true,
              phase: true,
              exercises: true,
              warmupData: true,
              prehabData: true,
              coreData: true,
              cooldownData: true,
              coachId: true,
            },
          })

          if (!session) {
            return {
              success: false,
              error: toolText(locale, 'The session was not found.', 'Passet hittades inte.'),
            }
          }

          if (session.coachId !== coachUserId) {
            return {
              success: false,
              error: toolText(locale, 'You do not have access to this session.', 'Du har inte tillgång till detta pass.'),
            }
          }

          // Build the AI prompt
          const sessionJson = JSON.stringify({
            name: session.name,
            description: session.description,
            phase: session.phase,
            exercises: session.exercises,
            warmupData: session.warmupData,
            prehabData: session.prehabData,
            coreData: session.coreData,
            cooldownData: session.cooldownData,
          }, null, 2)

          const prompt = modifyStrengthSessionPrompt(sessionJson, modification, locale)

          // Get AI model
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'balanced')
          if (!resolved) {
            return {
              success: false,
              error: toolText(locale, 'No AI keys are configured.', 'Inga AI-nycklar konfigurerade.'),
            }
          }

          // Create model instance (usage-logging middleware applied)
          const aiModel = createModelInstance(resolved)

          // Call AI
          const result = await withAiContext(
            { userId: coachUserId, category: 'coach_strength_session' },
            () => generateText({
              model: aiModel,
              system: locale === 'sv'
                ? 'Du är en expert på styrketräning. Returnera ALLTID ett giltigt JSON-objekt i ett ```json``` kodblock.'
                : 'You are an expert in strength training. ALWAYS return a valid JSON object in a ```json``` code block. Write every user-facing string in English.',
              prompt,
              maxOutputTokens: 4096,
            }),
          )

          // Parse the JSON from the response
          const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
          if (!jsonMatch?.[1]) {
            return {
              success: false,
              error: toolText(locale, 'AI could not generate a valid modified session.', 'AI kunde inte generera ett giltigt modifierat pass.'),
              aiResponse: result.text.slice(0, 500),
            }
          }

          const modified = JSON.parse(jsonMatch[1])

          // Update the session
          await prisma.strengthSession.update({
            where: { id: sessionId },
            data: {
              name: modified.name || session.name,
              description: modified.description || session.description,
              exercises: modified.exercises || session.exercises,
              warmupData: modified.warmupData ?? session.warmupData,
              prehabData: modified.prehabData ?? session.prehabData,
              coreData: modified.coreData ?? session.coreData,
              cooldownData: modified.cooldownData ?? session.cooldownData,
            },
          })

          // Extract explanation from AI response (text after JSON block)
          const explanation = result.text.split('```').pop()?.trim() || toolText(locale, 'The session has been updated.', 'Passet har uppdaterats.')

          return {
            success: true,
            sessionId,
            name: modified.name || session.name,
            modification,
            explanation,
            message: toolText(
              locale,
              `The session "${modified.name || session.name}" was modified: ${modification}`,
              `Passet "${modified.name || session.name}" har modifierats: ${modification}`
            ),
          }
        } catch (error) {
          logger.error('Error in modifyStrengthSession tool', {}, error)
          return {
            success: false,
            error: toolText(locale, 'Could not modify the session.', 'Kunde inte modifiera passet.'),
          }
        }
      },
    }),

    generateTrainingProgram: tool({
      description: toolText(
        locale,
        'Start generation of a complete multi-week training program for an athlete. The program is generated in the background (1-10 min) with AI and saved automatically. Supports all sports and methodologies (Polarized, Norwegian, Canova, Pyramidal). Requires the athlete clientId; use listAthletes first if you do not have it.',
        'Starta generering av ett komplett flervekkors träningsprogram åt en atlet. Programmet genereras i bakgrunden (1-10 min) med AI och sparas automatiskt. Stödjer alla sporter och metodiker (Polarized, Norwegian, Canova, Pyramidal). Kräver atletens clientId — använd listAthletes först om du inte har det.'
      ),
      inputSchema: z.object({
        clientId: z.string().describe('Athlete client ID (fetch with listAthletes).'),
        sport: z.string().describe('Primary sport. Supports Running, Cycling, Swimming, HYROX, Triathlon, Football, Ice hockey, Handball, Floorball, Basketball, Volleyball, Tennis, Padel, and more.'),
        totalWeeks: z.number().min(1).max(52).describe('Program length in weeks.'),
        sessionsPerWeek: z.number().min(1).max(14).optional().describe('Number of sessions per week.'),
        goal: z.string().describe('Athlete main goal, for example "Run a marathon under 3:30".'),
        goalDate: z.string().optional().describe('Goal date in ISO format, for example "2026-06-15".'),
        methodology: z.enum(['POLARIZED', 'NORWEGIAN', 'CANOVA', 'PYRAMIDAL', 'GENERAL']).optional().describe('Training methodology.'),
        notes: z.string().optional().describe('Additional wishes or limitations.'),
      }),
      execute: async ({ clientId, sport, totalWeeks, sessionsPerWeek, goal, goalDate, methodology, notes }) => {
        try {
          const normalizedSport = normalizeProgramSport(sport)

          // Check for active generation
          const activeSession = await prisma.programGenerationSession.findFirst({
            where: {
              athleteId: clientId,
              status: { in: ['PENDING', 'GENERATING_OUTLINE', 'GENERATING_PHASE', 'MERGING'] },
            },
            select: { id: true, status: true },
          })

          if (activeSession) {
            return {
              success: false,
              error: toolText(
                locale,
                'A program generation is already running for this athlete. Wait until it is finished.',
                'Det pågår redan en programgenerering för denna atlet. Vänta tills den är klar.'
              ),
            }
          }

          // Fetch client data
          const clientRecord = await prisma.client.findUnique({
            where: { id: clientId },
            select: {
              id: true,
              name: true,
              weight: true,
              height: true,
              birthDate: true,
              sportProfile: {
                select: {
                  hockeySettings: true,
                  footballSettings: true,
                  handballSettings: true,
                  floorballSettings: true,
                  basketballSettings: true,
                  volleyballSettings: true,
                  tennisSettings: true,
                  padelSettings: true,
                },
              },
            },
          })

          if (!clientRecord) {
            return {
              success: false,
              error: toolText(locale, 'The athlete was not found.', 'Atleten hittades inte.'),
            }
          }

          // Get coach's API keys
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'powerful')
          if (!resolved) {
            return {
              success: false,
              error: toolText(
                locale,
                'No AI keys are configured. Go to Settings -> AI to add API keys.',
                'Inga AI-nycklar konfigurerade. Gå till Inställningar → AI för att lägga till API-nycklar.'
              ),
            }
          }

          // Fetch test data and injuries
          const [latestTest, injuries] = await Promise.all([
            prisma.test.findFirst({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              select: { vo2max: true, maxHR: true, anaerobicThreshold: true },
            }),
            prisma.injuryAssessment.findMany({
              where: { clientId, status: { in: ['ACTIVE', 'MONITORING'] } },
              select: { injuryType: true, status: true, notes: true },
            }),
          ])

          // Calculate age
          const age = clientRecord.birthDate
            ? Math.floor((Date.now() - new Date(clientRecord.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : undefined
          const sportProfile = clientRecord.sportProfile as Record<string, unknown> | null
          const sportSettings = getProgramSportSettings(normalizedSport, sportProfile)

          const generationContext: GenerationContext = {
            sport: normalizedSport,
            totalWeeks,
            locale,
            sessionsPerWeek,
            methodology: methodology || undefined,
            goal,
            goalDate: goalDate || undefined,
            athleteId: clientId,
            athleteName: clientRecord.name || undefined,
            athleteAge: age,
            athleteWeight: clientRecord.weight || undefined,
            athleteHeight: clientRecord.height || undefined,
            vo2max: latestTest?.vo2max ?? undefined,
            maxHR: latestTest?.maxHR ?? undefined,
            lactateThreshold: latestTest?.anaerobicThreshold
              ? { hr: (latestTest.anaerobicThreshold as { hr?: number })?.hr }
              : undefined,
            injuries: injuries.map((i) => ({
              type: i.injuryType || 'unknown',
              status: i.status,
              notes: i.notes || undefined,
            })),
            hockeySettings: normalizedSport === 'TEAM_ICE_HOCKEY' ? sportSettings : undefined,
            footballSettings: normalizedSport === 'TEAM_FOOTBALL' ? sportSettings : undefined,
            handballSettings: normalizedSport === 'TEAM_HANDBALL' ? sportSettings : undefined,
            floorballSettings: normalizedSport === 'TEAM_FLOORBALL' ? sportSettings : undefined,
            basketballSettings: normalizedSport === 'TEAM_BASKETBALL' ? sportSettings : undefined,
            volleyballSettings: normalizedSport === 'TEAM_VOLLEYBALL' ? sportSettings : undefined,
            tennisSettings: normalizedSport === 'TENNIS' ? sportSettings : undefined,
            padelSettings: normalizedSport === 'PADEL' ? sportSettings : undefined,
            notes: notes || undefined,
          }

          const phases = calculatePhases(totalWeeks)
          const totalPhases = phases.length
          const estimatedMinutes = estimateGenerationMinutes(totalPhases)

          const providerUpperMap: Record<string, 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'> = {
            anthropic: 'ANTHROPIC', google: 'GOOGLE', openai: 'OPENAI',
          }
          const providerUpper = providerUpperMap[resolved.provider] || 'ANTHROPIC'

          const session = await prisma.programGenerationSession.create({
            data: {
              coachId: coachUserId,
              athleteId: clientId,
              query: `${normalizedSport} program: ${goal}`,
              totalWeeks,
              sport: normalizedSport,
              methodology: methodology || null,
              athleteContext: generationContext as unknown as object,
              status: 'PENDING',
              totalPhases,
              provider: providerUpper,
              modelUsed: resolved.modelId,
            },
          })

          // Fire-and-forget background generation
          generateMultiPartProgram({
            sessionId: session.id,
            context: generationContext,
            apiKey: resolved.apiKey,
            provider: providerUpper,
            modelId: resolved.modelId,
          }).catch((error) => {
            logger.error('Background program generation failed', { sessionId: session.id, clientId }, error)
          })

          return {
            success: true,
            sessionId: session.id,
            athleteName: clientRecord.name,
            sport: normalizedSport,
            totalWeeks,
            totalPhases,
            estimatedMinutes,
            goal,
            message: toolText(
              locale,
              `Program generation started for ${clientRecord.name}. ${totalWeeks} weeks of ${normalizedSport}, ${totalPhases} phases. Estimated time: ${estimatedMinutes} minutes. The program will appear automatically on the athlete profile when it is ready.`,
              `Programgenerering startad för ${clientRecord.name}! ${totalWeeks} veckor ${normalizedSport}, ${totalPhases} faser. Beräknad tid: ${estimatedMinutes} minuter. Programmet dyker upp automatiskt på atletens profil när det är klart.`
            ),
          }
        } catch (error) {
          logger.error('Failed to start program generation via coach chat', { coachUserId }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not start program generation. Please try again.', 'Kunde inte starta programgenereringen. Försök igen.'),
          }
        }
      },
    }),
  }
}
