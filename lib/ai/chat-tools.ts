/**
 * AI Chat Tool Calling
 *
 * Vercel AI SDK tools that the AI can invoke during athlete chat conversations.
 * Supports creating workouts (WODs) and full training programs from the chat.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { buildWODContext } from '@/lib/ai/wod-context-builder'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import {
  calculatePhases,
  estimateGenerationMinutes,
  generateMultiPartProgram,
  type GenerationContext,
} from '@/lib/ai/program-generator'
import { resolveModel } from '@/types/ai-models'
import { logger } from '@/lib/logger'
import { lookupOrGenerateExercise } from '@/lib/ai/exercise-generator'

/** Capabilities that control which tools are available */
export interface ChatToolCapabilities {
  canGenerateProgram?: boolean
}

/**
 * Create all chat tools for an athlete session.
 * Uses closure to capture clientId and optional conversationId.
 * The capabilities param controls which tools are included.
 */
export function createChatTools(
  clientId: string,
  conversationId?: string,
  capabilities?: ChatToolCapabilities
) {
  const tools: Record<string, any> = { // eslint-disable-line
    createTodayWorkout: tool({
      description:
        'Skapa ett träningspass åt atleten för idag. Passet sparas på dashboarden och i kalendern. ' +
        'Använd detta verktyg när atleten ber dig skapa, skriva, föreslå eller ge dem ett pass.',
      inputSchema: z.object({
        title: z.string().describe('Kort, motiverande svensk titel (t.ex. "Explosiv Styrka")'),
        subtitle: z.string().optional().describe('Motiverande undertitel'),
        description: z.string().describe('Kort beskrivning av vad passet fokuserar på'),
        workoutType: z.enum(['strength', 'cardio', 'mixed', 'core']).describe('Passtyp'),
        duration: z.number().min(10).max(180).describe('Total duration i minuter'),
        intensity: z.enum(['recovery', 'easy', 'moderate', 'threshold']).optional()
          .describe('Intensitetsnivå baserat på atletens beredskap'),
        sections: z.array(z.object({
          type: z.enum(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN']).describe('Sektionstyp'),
          name: z.string().describe('Svenskt sektionsnamn (t.ex. "Uppvärmning")'),
          duration: z.number().describe('Sektionens längd i minuter'),
          exercises: z.array(z.object({
            name: z.string().describe('Övningsnamn på engelska'),
            nameSv: z.string().describe('Övningsnamn på svenska'),
            sets: z.number().optional(),
            reps: z.string().optional().describe('"10" eller "10-12" eller "AMRAP"'),
            weight: z.string().optional().describe('"Bodyweight", "Light", "Moderate", "60% 1RM"'),
            restSeconds: z.number().optional(),
            duration: z.number().optional().describe('Tid i sekunder (för cardio)'),
            distance: z.number().optional().describe('Distans i meter'),
            zone: z.number().min(1).max(5).optional().describe('Pulszon 1-5'),
            notes: z.string().optional().describe('Korta instruktioner'),
          })),
        })),
      }),
      execute: async ({ title, subtitle, description, workoutType, duration, intensity, sections }) => {
        const startTime = Date.now()

        try {
          // Fetch athlete context for readiness-aware creation
          const context = await buildWODContext(clientId)

          // Calculate totals
          const totalExercises = sections.reduce(
            (sum, s) => sum + s.exercises.length, 0
          )
          const totalSets = sections.reduce(
            (sum, s) => s.exercises.reduce((eSum, e) => eSum + (e.sets || 1), 0) + sum, 0
          )

          // Build workoutJson matching WODWorkout format
          const workoutJson = {
            title,
            subtitle: subtitle || '',
            description,
            sections: sections.map(s => ({
              type: s.type,
              name: s.name,
              duration: s.duration,
              exercises: s.exercises.map(e => ({
                name: e.name,
                nameSv: e.nameSv,
                sets: e.sets,
                reps: e.reps,
                weight: e.weight,
                restSeconds: e.restSeconds,
                duration: e.duration,
                distance: e.distance,
                zone: e.zone,
                instructions: e.notes,
              })),
            })),
            coachNotes: `Skapat via AI-chatt baserat på atletens önskemål.`,
            totalDuration: duration,
            totalExercises,
            totalSets,
          }

          // Save to database (same pattern as app/api/ai/wod/route.ts)
          const savedWOD = await prisma.aIGeneratedWOD.create({
            data: {
              clientId,
              mode: 'STRUCTURED',
              workoutType,
              requestedDuration: duration,
              title,
              subtitle,
              description,
              workoutJson: JSON.parse(JSON.stringify(workoutJson)),
              readinessAtGeneration: context?.readinessScore ?? null,
              intensityAdjusted: intensity || null,
              primarySport: context?.primarySport ?? null,
              generationTimeMs: Date.now() - startTime,
              source: 'chat',
              chatConversationId: conversationId || null,
            },
          })

          logger.info('WOD created via chat tool', {
            wodId: savedWOD.id,
            clientId,
            workoutType,
            duration,
            exerciseCount: totalExercises,
          })

          // Fetch existing exercise images for preview (non-blocking best-effort)
          const exerciseNamesEn = sections.flatMap(s => s.exercises.map(e => e.name))
          const exerciseNamesSv = sections.flatMap(s => s.exercises.map(e => e.nameSv))
          let previewImages: string[] = []
          try {
            const existingExercises = await prisma.exercise.findMany({
              where: {
                OR: [
                  { nameEn: { in: exerciseNamesEn, mode: 'insensitive' } },
                  { nameSv: { in: exerciseNamesSv, mode: 'insensitive' } },
                  { name: { in: exerciseNamesEn, mode: 'insensitive' } },
                ],
                imageUrls: { not: { equals: null } },
              },
              select: { imageUrls: true },
              take: 6,
            })
            previewImages = existingExercises
              .flatMap(e => Array.isArray(e.imageUrls) ? e.imageUrls as string[] : [])
              .slice(0, 6)
          } catch (imgErr) {
            logger.warn('Failed to fetch preview images', { wodId: savedWOD.id }, imgErr)
          }

          // Fire-and-forget: generate exercise images in background
          // This avoids blocking the chat response (Vercel 60s timeout)
          const clientRecord = await prisma.client.findUnique({
            where: { id: clientId },
            select: { userId: true }
          })
          const coachId = clientRecord?.userId || ''

          void (async () => {
            try {
              for (const section of sections) {
                for (const ex of section.exercises) {
                  const isComplex = ['burpee', 'clean', 'snatch', 'get-up'].some(kw =>
                    ex.name.toLowerCase().includes(kw) || ex.nameSv.toLowerCase().includes(kw)
                  )
                  await lookupOrGenerateExercise({
                    exerciseNameSv: ex.nameSv,
                    exerciseNameEn: ex.name,
                    muscleGroups: [workoutType],
                    isComplexMovement: isComplex,
                    coachId
                  })
                }
              }
            } catch (err) {
              logger.error('Background exercise image generation failed', { wodId: savedWOD.id, err })
            }
          })()

          return {
            success: true,
            wodId: savedWOD.id,
            title,
            subtitle: subtitle || null,
            duration,
            workoutType,
            intensity: intensity || null,
            exerciseCount: totalExercises,
            sectionCount: sections.length,
            previewImages,
          }
        } catch (error) {
          logger.error('Failed to create WOD via chat tool', { clientId }, error)
          return {
            success: false,
            error: 'Kunde inte skapa passet. Försök igen.',
          }
        }
      },
    }),

    // ── Meal logging tool ──────────────────────────────────────────────
    logMeal: tool({
      description:
        'Logga en måltid åt atleten. Använd detta verktyg när atleten berättar vad de ätit ' +
        'eller ber dig registrera en måltid. Uppskatta kalorier och makron baserat på beskrivningen.',
      inputSchema: z.object({
        date: z.string().optional().describe('Datum i ISO-format (YYYY-MM-DD). Standard: idag.'),
        mealType: z.enum([
          'BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK',
          'PRE_WORKOUT', 'POST_WORKOUT', 'DINNER', 'EVENING_SNACK',
        ]).describe('Måltidstyp'),
        time: z.string().optional().describe('Tid i HH:MM-format'),
        description: z.string().describe('Beskrivning av måltiden'),
        calories: z.number().int().positive().optional().describe('Uppskattade kalorier'),
        proteinGrams: z.number().positive().optional().describe('Protein i gram'),
        carbsGrams: z.number().positive().optional().describe('Kolhydrater i gram'),
        fatGrams: z.number().positive().optional().describe('Fett i gram'),
        isPreWorkout: z.boolean().optional(),
        isPostWorkout: z.boolean().optional(),
      }),
      execute: async ({ date, mealType, time, description, calories, proteinGrams, carbsGrams, fatGrams, isPreWorkout, isPostWorkout }) => {
        try {
          const mealDate = date || new Date().toISOString().split('T')[0]
          const isHighProtein = proteinGrams != null && proteinGrams >= 20

          const meal = await prisma.mealLog.create({
            data: {
              clientId,
              date: new Date(mealDate),
              mealType,
              time: time || null,
              description,
              calories: calories || null,
              proteinGrams: proteinGrams || null,
              carbsGrams: carbsGrams || null,
              fatGrams: fatGrams || null,
              isHighProtein,
              isPreWorkout: isPreWorkout || false,
              isPostWorkout: isPostWorkout || false,
            },
          })

          logger.info('Meal logged via chat tool', { mealId: meal.id, clientId, mealType })

          return {
            success: true,
            mealId: meal.id,
            description,
            mealType,
            calories: calories || null,
            proteinGrams: proteinGrams || null,
            carbsGrams: carbsGrams || null,
            fatGrams: fatGrams || null,
          }
        } catch (error) {
          logger.error('Failed to log meal via chat tool', { clientId }, error)
          return { success: false, error: 'Kunde inte logga måltiden. Försök igen.' }
        }
      },
    }),

    // ── Meal editing tool ─────────────────────────────────────────────
    updateMeal: tool({
      description:
        'Uppdatera en befintlig måltid. Använd detta verktyg när atleten vill ändra en loggad måltid, ' +
        't.ex. korrigera beskrivning, kalorier eller makron. Du behöver måltids-ID:t.',
      inputSchema: z.object({
        mealId: z.string().describe('ID för måltiden som ska uppdateras'),
        mealType: z.enum([
          'BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK',
          'PRE_WORKOUT', 'POST_WORKOUT', 'DINNER', 'EVENING_SNACK',
        ]).optional().describe('Ny måltidstyp'),
        time: z.string().nullable().optional().describe('Ny tid i HH:MM-format'),
        description: z.string().optional().describe('Ny beskrivning'),
        calories: z.number().int().positive().nullable().optional().describe('Nya kalorier'),
        proteinGrams: z.number().positive().nullable().optional().describe('Nytt protein i gram'),
        carbsGrams: z.number().positive().nullable().optional().describe('Nya kolhydrater i gram'),
        fatGrams: z.number().positive().nullable().optional().describe('Nytt fett i gram'),
      }),
      execute: async (input) => {
        try {
          const { mealId, mealType, time, description, calories, proteinGrams, carbsGrams, fatGrams } = input

          // Verify meal belongs to athlete
          const existing = await prisma.mealLog.findFirst({
            where: { id: mealId, clientId },
          })

          if (!existing) {
            return { success: false, error: 'Måltiden hittades inte.' }
          }

          const data: Record<string, unknown> = {}
          if (mealType !== undefined) data.mealType = mealType
          if (time !== undefined) data.time = time
          if (description !== undefined) data.description = description
          if (calories !== undefined) data.calories = calories
          if (carbsGrams !== undefined) data.carbsGrams = carbsGrams
          if (fatGrams !== undefined) data.fatGrams = fatGrams
          if (proteinGrams !== undefined) {
            data.proteinGrams = proteinGrams
            data.isHighProtein = proteinGrams !== null && proteinGrams >= 20
          }

          const meal = await prisma.mealLog.update({
            where: { id: mealId },
            data,
          })

          logger.info('Meal updated via chat tool', { mealId, clientId })

          return {
            success: true,
            mealId: meal.id,
            description: meal.description,
            calories: meal.calories,
          }
        } catch (error) {
          logger.error('Failed to update meal via chat tool', { clientId, mealId: input.mealId }, error)
          return { success: false, error: 'Kunde inte uppdatera måltiden. Försök igen.' }
        }
      },
    }),

    // ── Meal deletion tool ────────────────────────────────────────────
    deleteMeal: tool({
      description:
        'Ta bort en loggad måltid. Använd detta verktyg när atleten vill radera en felaktig måltid.',
      inputSchema: z.object({
        mealId: z.string().describe('ID för måltiden som ska tas bort'),
      }),
      execute: async ({ mealId }) => {
        try {
          const existing = await prisma.mealLog.findFirst({
            where: { id: mealId, clientId },
          })

          if (!existing) {
            return { success: false, error: 'Måltiden hittades inte.' }
          }

          await prisma.mealLog.delete({ where: { id: mealId } })

          logger.info('Meal deleted via chat tool', { mealId, clientId })
          return { success: true, mealId, message: 'Måltiden har tagits bort.' }
        } catch (error) {
          logger.error('Failed to delete meal via chat tool', { clientId, mealId }, error)
          return { success: false, error: 'Kunde inte ta bort måltiden. Försök igen.' }
        }
      },
    }),

    // ── List recent meals tool ────────────────────────────────────────
    listRecentMeals: tool({
      description:
        'Hämta atletens senaste måltider. Använd detta verktyg för att hitta måltids-ID:n ' +
        'innan du uppdaterar eller tar bort en måltid, eller för att ge näringsfeedback.',
      inputSchema: z.object({
        date: z.string().optional().describe('Datum att hämta måltider för (YYYY-MM-DD). Standard: idag.'),
        limit: z.number().min(1).max(20).optional().describe('Max antal måltider att hämta (standard: 10)'),
      }),
      execute: async ({ date, limit }) => {
        try {
          const queryDate = date ? new Date(date) : new Date()
          const startOfDay = new Date(queryDate)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(queryDate)
          endOfDay.setHours(23, 59, 59, 999)

          const meals = await prisma.mealLog.findMany({
            where: {
              clientId,
              date: { gte: startOfDay, lte: endOfDay },
            },
            orderBy: { createdAt: 'desc' },
            take: limit || 10,
            select: {
              id: true,
              mealType: true,
              time: true,
              description: true,
              calories: true,
              proteinGrams: true,
              carbsGrams: true,
              fatGrams: true,
            },
          })

          return {
            success: true,
            date: queryDate.toISOString().split('T')[0],
            meals: meals.map(m => ({
              id: m.id,
              mealType: m.mealType,
              time: m.time,
              description: m.description,
              calories: m.calories,
              proteinGrams: m.proteinGrams,
              carbsGrams: m.carbsGrams,
              fatGrams: m.fatGrams,
            })),
            totalCalories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
          }
        } catch (error) {
          logger.error('Failed to list meals via chat tool', { clientId }, error)
          return { success: false, error: 'Kunde inte hämta måltider.' }
        }
      },
    }),

    // ── Daily check-in tool ───────────────────────────────────────────
    logDailyCheckIn: tool({
      description:
        'Logga en daglig check-in åt atleten. Använd detta verktyg när atleten berättar hur de mår, ' +
        'sov, eller hur kroppen känns. Samla in så mycket information som möjligt från samtalet.',
      inputSchema: z.object({
        date: z.string().optional().describe('Datum i YYYY-MM-DD-format. Standard: idag.'),
        sleepQuality: z.number().min(1).max(10).describe('Sömnkvalitet 1-10'),
        sleepHours: z.number().min(0).max(24).optional().describe('Antal timmars sömn'),
        soreness: z.number().min(1).max(10).describe('Muskelömhet 1=ingen, 10=extrem'),
        fatigue: z.number().min(1).max(10).describe('Trötthet 1=ingen, 10=extrem'),
        stress: z.number().min(1).max(10).describe('Stressnivå 1=ingen, 10=extrem'),
        mood: z.number().min(1).max(10).describe('Humör 1=dåligt, 10=utmärkt'),
        motivation: z.number().min(1).max(10).describe('Motivation 1=ingen, 10=maximal'),
        restingHR: z.number().optional().describe('Vilopuls i bpm'),
        hrv: z.number().optional().describe('HRV (RMSSD) i ms'),
        notes: z.string().optional().describe('Fritext-anteckningar från atleten'),
      }),
      execute: async ({ date, sleepQuality, sleepHours, soreness, fatigue, stress, mood, motivation, restingHR, hrv, notes }) => {
        try {
          const checkInDate = date ? new Date(date) : new Date()
          checkInDate.setHours(0, 0, 0, 0)

          // Calculate readiness score (weighted average, inverse for negative metrics)
          const readinessScore = Math.round(
            (sleepQuality * 20 + mood * 15 + motivation * 15 +
             (11 - soreness) * 15 + (11 - fatigue) * 20 + (11 - stress) * 15) / 100 * 10
          )

          const readinessDecision = readinessScore >= 7 ? 'PROCEED'
            : readinessScore >= 5 ? 'REDUCE'
            : readinessScore >= 3 ? 'EASY'
            : 'REST'

          const checkIn = await prisma.dailyCheckIn.upsert({
            where: { clientId_date: { clientId, date: checkInDate } },
            update: {
              sleepQuality,
              sleepHours: sleepHours || null,
              soreness,
              fatigue,
              stress,
              mood,
              motivation,
              restingHR: restingHR || null,
              hrv: hrv || null,
              notes: notes || null,
              readinessScore,
              readinessDecision,
            },
            create: {
              clientId,
              date: checkInDate,
              sleepQuality,
              sleepHours: sleepHours || null,
              soreness,
              fatigue,
              stress,
              mood,
              motivation,
              restingHR: restingHR || null,
              hrv: hrv || null,
              notes: notes || null,
              readinessScore,
              readinessDecision,
            },
          })

          logger.info('Daily check-in logged via chat tool', { checkInId: checkIn.id, clientId, readinessScore })

          return {
            success: true,
            checkInId: checkIn.id,
            readinessScore,
            readinessDecision,
            sleepQuality,
            mood,
            fatigue,
          }
        } catch (error) {
          logger.error('Failed to log daily check-in via chat tool', { clientId }, error)
          return { success: false, error: 'Kunde inte logga check-in. Försök igen.' }
        }
      },
    }),

    // ── Injury reporting tool ─────────────────────────────────────────
    reportInjury: tool({
      description:
        'Rapportera en skada eller smärta. Använd detta verktyg när atleten nämner smärta, skada, ' +
        'obehag eller begränsningar. Ställ följdfrågor om kroppsdel, sida, smärtnivå och omständigheter.',
      inputSchema: z.object({
        bodyPart: z.string().describe('Kroppsdel (t.ex. "KNEE", "ANKLE", "SHOULDER", "LOWER_BACK", "HIP", "CALF", "HAMSTRING", "QUADRICEPS", "SHIN")'),
        side: z.enum(['LEFT', 'RIGHT', 'BILATERAL', 'CENTRAL']).describe('Vilken sida'),
        painLevel: z.number().min(0).max(10).describe('Smärtnivå 0-10'),
        description: z.string().describe('Beskrivning av skadan/smärtan'),
        mechanism: z.string().optional().describe('Hur skadan uppstod'),
        painTiming: z.enum([
          'DURING_WARMUP', 'DURING_WORKOUT', 'AFTER_WORKOUT',
          'AT_REST', 'IN_MORNING', 'CONSTANT',
        ]).optional().describe('När smärtan uppträder'),
        gaitAffected: z.boolean().optional().describe('Påverkas gången? (röd flagga)'),
        swelling: z.boolean().optional().describe('Finns svullnad?'),
      }),
      execute: async ({ bodyPart, side, painLevel, description, mechanism, painTiming, gaitAffected, swelling }) => {
        try {
          // Determine phase and assessment based on pain level
          const phase = painLevel >= 7 ? 'ACUTE' : painLevel >= 4 ? 'SUBACUTE' : 'CHRONIC'
          const assessment = gaitAffected || painLevel >= 8 ? 'REST_1_DAY'
            : painLevel >= 6 ? 'MODIFY'
            : 'CONTINUE'

          const injury = await prisma.injuryAssessment.create({
            data: {
              clientId,
              bodyPart,
              side,
              painLevel,
              description,
              mechanism: mechanism || null,
              painTiming: painTiming || null,
              gaitAffected: gaitAffected || false,
              swelling: swelling || false,
              phase,
              assessment,
              status: 'ACTIVE',
              delawarePainRuleTriggered: gaitAffected || false,
            },
          })

          logger.info('Injury reported via chat tool', { injuryId: injury.id, clientId, bodyPart, painLevel })

          return {
            success: true,
            injuryId: injury.id,
            bodyPart,
            side,
            painLevel,
            phase,
            assessment,
            warning: gaitAffected
              ? 'RÖDA FLAGGOR: Gångpåverkan detekterad. Rekommendera vila och professionell bedömning.'
              : painLevel >= 7
                ? 'Hög smärtnivå. Rekommendera anpassad träning och uppföljning.'
                : null,
          }
        } catch (error) {
          logger.error('Failed to report injury via chat tool', { clientId }, error)
          return { success: false, error: 'Kunde inte registrera skadan. Försök igen.' }
        }
      },
    }),

    // ── Profile update tool ───────────────────────────────────────────
    updateAthleteProfile: tool({
      description:
        'Uppdatera atletens profil. Använd detta verktyg när atleten ger ny information om sig själv, ' +
        't.ex. ny vikt, ny sport, nya mål, eller utrustning.',
      inputSchema: z.object({
        weight: z.number().positive().optional().describe('Ny vikt i kg'),
        height: z.number().positive().optional().describe('Ny längd i cm'),
        primarySport: z.enum([
          'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON',
          'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
          'HOCKEY', 'FOOTBALL', 'HANDBALL', 'FLOORBALL',
          'BASKETBALL', 'VOLLEYBALL', 'TENNIS', 'PADEL',
        ]).optional().describe('Primär sport'),
        currentGoal: z.string().optional().describe('Nytt träningsmål'),
        targetDate: z.string().optional().describe('Måldatum (YYYY-MM-DD)'),
        aiInstructions: z.string().optional().describe('Speciella instruktioner för AI-coachen (t.ex. kroniska tillstånd, preferenser)'),
        manualVo2max: z.number().optional().describe('Manuellt VO2max-värde (ml/kg/min)'),
        manualMaxHR: z.number().int().optional().describe('Manuellt maxpulsvärde (bpm)'),
      }),
      execute: async ({ weight, height, primarySport, currentGoal, targetDate, aiInstructions, manualVo2max, manualMaxHR }) => {
        try {
          const updates: Record<string, unknown>[] = []

          // Update Client fields (weight, height, aiInstructions, manualVo2max, manualMaxHR)
          const clientData: Record<string, unknown> = {}
          if (weight !== undefined) clientData.weight = weight
          if (height !== undefined) clientData.height = height
          if (aiInstructions !== undefined) clientData.aiInstructions = aiInstructions
          if (manualVo2max !== undefined) clientData.manualVo2max = manualVo2max
          if (manualMaxHR !== undefined) clientData.manualMaxHR = manualMaxHR

          if (Object.keys(clientData).length > 0) {
            await prisma.client.update({
              where: { id: clientId },
              data: clientData,
            })
            updates.push(clientData)
          }

          // Update SportProfile fields (primarySport, currentGoal, targetDate)
          if (primarySport || currentGoal || targetDate) {
            const sportData: Record<string, unknown> = {}
            if (primarySport) sportData.primarySport = primarySport
            if (currentGoal) sportData.currentGoal = currentGoal
            if (targetDate) sportData.targetDate = new Date(targetDate)

            await prisma.sportProfile.upsert({
              where: { clientId },
              update: sportData,
              create: { clientId, ...sportData },
            })
            updates.push(sportData)
          }

          logger.info('Athlete profile updated via chat tool', { clientId, fields: Object.keys(clientData) })

          return {
            success: true,
            updatedFields: [
              ...Object.keys(clientData),
              ...(primarySport ? ['primarySport'] : []),
              ...(currentGoal ? ['currentGoal'] : []),
              ...(targetDate ? ['targetDate'] : []),
            ],
          }
        } catch (error) {
          logger.error('Failed to update athlete profile via chat tool', { clientId }, error)
          return { success: false, error: 'Kunde inte uppdatera profilen. Försök igen.' }
        }
      },
    }),

    // ── Calendar event tool ───────────────────────────────────────────
    createCalendarEvent: tool({
      description:
        'Skapa en kalenderhändelse som påverkar träningsplaneringen. Använd detta verktyg ' +
        'när atleten nämner semester, resa, sjukdom, arbetskonflikt eller träningsläger.',
      inputSchema: z.object({
        type: z.enum([
          'ALTITUDE_CAMP', 'TRAINING_CAMP', 'TRAVEL', 'ILLNESS',
          'VACATION', 'WORK_BLOCKER', 'PERSONAL_BLOCKER', 'EXTERNAL_EVENT',
        ]).describe('Typ av händelse'),
        title: z.string().describe('Kort titel för händelsen'),
        description: z.string().optional().describe('Beskrivning'),
        startDate: z.string().describe('Startdatum (YYYY-MM-DD)'),
        endDate: z.string().optional().describe('Slutdatum (YYYY-MM-DD). Standard: samma som start.'),
        allDay: z.boolean().optional().describe('Heldagshändelse? Standard: true'),
        startTime: z.string().optional().describe('Starttid (HH:mm) om inte heldag'),
        endTime: z.string().optional().describe('Sluttid (HH:mm) om inte heldag'),
        trainingImpact: z.enum(['NO_TRAINING', 'REDUCED', 'MODIFIED', 'NORMAL']).optional()
          .describe('Påverkan på träning. Standard: NO_TRAINING'),
        impactNotes: z.string().optional().describe('Detaljer om påverkan (t.ex. "Bara morgonpass")'),
      }),
      execute: async ({ type, title, description, startDate, endDate, allDay, startTime, endTime, trainingImpact, impactNotes }) => {
        try {
          // Get the userId for createdById
          const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { userId: true },
          })

          if (!client) {
            return { success: false, error: 'Kunde inte hitta atletens profil.' }
          }

          const event = await prisma.calendarEvent.create({
            data: {
              clientId,
              type,
              title,
              description: description || null,
              status: 'SCHEDULED',
              startDate: new Date(startDate),
              endDate: new Date(endDate || startDate),
              allDay: allDay !== false,
              startTime: startTime || null,
              endTime: endTime || null,
              trainingImpact: trainingImpact || 'NO_TRAINING',
              impactNotes: impactNotes || null,
              createdById: client.userId,
            },
          })

          logger.info('Calendar event created via chat tool', { eventId: event.id, clientId, type })

          return {
            success: true,
            eventId: event.id,
            type,
            title,
            startDate,
            endDate: endDate || startDate,
            trainingImpact: trainingImpact || 'NO_TRAINING',
          }
        } catch (error) {
          logger.error('Failed to create calendar event via chat tool', { clientId }, error)
          return { success: false, error: 'Kunde inte skapa händelsen. Försök igen.' }
        }
      },
    }),
  }

  // Only include program generation tool when the athlete has the capability
  if (capabilities?.canGenerateProgram) {
    tools.generateTrainingProgram = tool({
      description:
        'Starta generering av ett komplett flervekkors träningsprogram åt atleten. ' +
        'Programmet genereras i bakgrunden (1-10 min). ' +
        'Använd detta verktyg EFTER att du samlat in sport, mål, programlängd och pass per vecka från atleten.',
      inputSchema: z.object({
        sport: z.string().describe('Primär sport (t.ex. "Running", "Cycling", "Swimming", "HYROX")'),
        totalWeeks: z.number().min(1).max(52).describe('Programlängd i veckor'),
        sessionsPerWeek: z.number().min(1).max(14).optional()
          .describe('Antal träningspass per vecka'),
        goal: z.string().describe('Atletens huvudmål (t.ex. "Springa ett marathon under 3:30")'),
        goalDate: z.string().optional()
          .describe('Måldatum i ISO-format (t.ex. "2026-06-15")'),
        methodology: z.enum(['POLARIZED', 'NORWEGIAN', 'CANOVA', 'PYRAMIDAL', 'GENERAL']).optional()
          .describe('Träningsmetodik'),
        notes: z.string().optional()
          .describe('Ytterligare önskemål eller begränsningar från atleten'),
      }),
      execute: async ({ sport, totalWeeks, sessionsPerWeek, goal, goalDate, methodology, notes }) => {
        try {
          // Check for active generation session
          const activeSession = await prisma.programGenerationSession.findFirst({
            where: {
              athleteId: clientId,
              status: {
                in: ['PENDING', 'GENERATING_OUTLINE', 'GENERATING_PHASE', 'MERGING'],
              },
            },
            select: { id: true, status: true },
          })

          if (activeSession) {
            return {
              success: false,
              error: 'Det pågår redan en programgenerering. Vänta tills den är klar innan du startar en ny.',
              activeSessionId: activeSession.id,
            }
          }

          // Fetch client record to get coach user ID (needed for API keys + coachId)
          const clientRecord = await prisma.client.findUnique({
            where: { id: clientId },
            select: {
              id: true,
              userId: true,
              name: true,
              sportProfile: true,
            },
          })

          if (!clientRecord?.userId) {
            return {
              success: false,
              error: 'Kunde inte hitta din profil. Kontakta support.',
            }
          }

          const coachUserId = clientRecord.userId

          // Check feature access
          const access = await checkAthleteFeatureAccess(clientId, 'program_generation')
          if (!access.allowed) {
            return {
              success: false,
              error: access.reason || 'Programgenerering kräver en STANDARD- eller PRO-prenumeration.',
              code: access.code,
            }
          }

          // Get API keys (coach's keys)
          const apiKeys = await getResolvedAiKeys(coachUserId)
          const resolved = resolveModel(apiKeys, 'powerful')
          if (!resolved) {
            return {
              success: false,
              error: 'Inga AI-nycklar konfigurerade. Be din coach konfigurera API-nycklar.',
            }
          }

          // Build generation context from tool params + athlete data
          const sportProfile = clientRecord.sportProfile as Record<string, unknown> | null

          // Fetch athlete test data for zones/thresholds
          const [latestTest, injuries] = await Promise.all([
            prisma.test.findFirst({
              where: { clientId },
              orderBy: { testDate: 'desc' },
              select: {
                vo2max: true,
                maxHR: true,
                anaerobicThreshold: true,
                testStages: {
                  orderBy: { sequence: 'asc' },
                  select: { heartRate: true, speed: true, power: true },
                },
              },
            }),
            prisma.injuryAssessment.findMany({
              where: {
                clientId,
                status: { in: ['ACTIVE', 'MONITORING'] },
              },
              select: { injuryType: true, status: true, notes: true },
            }),
          ])

          const generationContext: GenerationContext = {
            sport,
            totalWeeks,
            sessionsPerWeek,
            methodology: methodology || undefined,
            goal,
            goalDate: goalDate || undefined,
            athleteId: clientId,
            athleteName: clientRecord.name || undefined,
            athleteAge: sportProfile?.age as number | undefined,
            athleteWeight: sportProfile?.weight as number | undefined,
            athleteHeight: sportProfile?.height as number | undefined,
            experienceLevel: sportProfile?.experienceLevel as string | undefined,
            vo2max: latestTest?.vo2max ?? undefined,
            maxHR: latestTest?.maxHR ?? undefined,
            lactateThreshold: latestTest?.anaerobicThreshold
              ? { hr: (latestTest.anaerobicThreshold as { hr?: number })?.hr }
              : undefined,
            injuries: injuries.map(i => ({
              type: i.injuryType || 'unknown',
              status: i.status,
              notes: i.notes || undefined,
            })),
            notes: notes || undefined,
          }

          // Calculate phases and estimate time
          const phases = calculatePhases(totalWeeks)
          const totalPhases = phases.length
          const estimatedMinutes = estimateGenerationMinutes(totalPhases)

          // Map provider to uppercase format expected by orchestrator
          const providerUpperMap: Record<string, 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'> = {
            anthropic: 'ANTHROPIC',
            google: 'GOOGLE',
            openai: 'OPENAI',
          }
          const providerUpper = providerUpperMap[resolved.provider] || 'ANTHROPIC'

          // Create ProgramGenerationSession
          const session = await prisma.programGenerationSession.create({
            data: {
              coachId: coachUserId,
              athleteId: clientId,
              conversationId: conversationId || null,
              query: `${sport} program: ${goal}`,
              totalWeeks,
              sport,
              methodology: methodology || null,
              athleteContext: generationContext as unknown as object,
              status: 'PENDING',
              totalPhases,
              provider: providerUpper,
              modelUsed: resolved.modelId,
            },
          })

          // Fire-and-forget: start generation in background
          // On Vercel, the poll-program-generation cron picks up PENDING sessions
          generateMultiPartProgram({
            sessionId: session.id,
            context: generationContext,
            apiKey: resolved.apiKey,
            provider: providerUpper,
            modelId: resolved.modelId,
          }).catch((error) => {
            logger.error('Background program generation failed', {
              sessionId: session.id,
              clientId,
            }, error)
          })

          logger.info('Program generation started via chat tool', {
            sessionId: session.id,
            clientId,
            sport,
            totalWeeks,
            totalPhases,
            estimatedMinutes,
          })

          return {
            success: true,
            sessionId: session.id,
            totalPhases,
            estimatedMinutes,
            sport,
            totalWeeks,
            goal,
          }
        } catch (error) {
          logger.error('Failed to start program generation via chat tool', { clientId }, error)
          return {
            success: false,
            error: 'Kunde inte starta programgenereringen. Försök igen.',
          }
        }
      },
    })
  }

  return tools
}
