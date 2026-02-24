/**
 * Program Infographic Generation
 *
 * Generates visual infographics for AI-created training programs
 * using Gemini's native image generation capabilities.
 */

import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { PROGRAM_INFOGRAPHICS_BUCKET } from '@/lib/storage/supabase-storage'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { ParsedProgram } from '@/lib/ai/program-parser'

export const ALLOWED_IMAGE_MODELS = [
  GEMINI_MODELS.IMAGE_GENERATION,
  GEMINI_MODELS.IMAGE_GENERATION_PRO,
] as const

export type ImageModel = (typeof ALLOWED_IMAGE_MODELS)[number]

export interface GenerateInfographicOptions {
  programId: string
  programData: InfographicProgramData
  coachId: string
  locale: string
  model?: string
}

export interface InfographicProgramData {
  name: string
  description?: string
  goalType?: string | null
  totalWeeks: number
  methodology?: string
  phases: {
    name: string
    weeks: string
    focus: string
    sessionsPerWeek?: number
    keyWorkouts?: string[]
  }[]
}

export async function resolveGoogleApiKey(coachId: string): Promise<string | null> {
  try {
    const keys = await getResolvedAiKeys(coachId)
    if (keys.googleKey) return keys.googleKey
  } catch {
    // Fall through to env
  }
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || null
}

export function buildInfographicPrompt(program: InfographicProgramData, locale: string): string {
  const isSv = locale.startsWith('sv')

  const phaseDescriptions = program.phases.map((p) => {
    const parts = [`${p.name} (${isSv ? 'veckor' : 'weeks'} ${p.weeks}): ${p.focus}`]
    if (p.sessionsPerWeek) {
      parts.push(`${p.sessionsPerWeek} ${isSv ? 'pass/vecka' : 'sessions/week'}`)
    }
    if (p.keyWorkouts?.length) {
      parts.push(`${isSv ? 'Nyckelpass' : 'Key workouts'}: ${p.keyWorkouts.join(', ')}`)
    }
    return parts.join(' | ')
  }).join('\n')

  const title = isSv ? 'Programöversikt' : 'Program Overview'
  const lang = isSv ? 'Swedish' : 'English'

  return `Create a clean, professional sports training program infographic image.

${title}: "${program.name}"
${program.description ? `${isSv ? 'Beskrivning' : 'Description'}: ${program.description}` : ''}
${program.goalType ? `${isSv ? 'Mål' : 'Goal'}: ${program.goalType}` : ''}
${isSv ? 'Antal veckor' : 'Total weeks'}: ${program.totalWeeks}
${program.methodology ? `${isSv ? 'Metod' : 'Methodology'}: ${program.methodology}` : ''}

${isSv ? 'Faser' : 'Phases'}:
${phaseDescriptions}

Design requirements:
- Horizontal layout (16:9 aspect ratio)
- Program name and goal prominently at the top
- A horizontal timeline bar showing phase progression (e.g., Base → Build → Peak → Taper)
- Each phase should be color-coded (e.g., blue for base, orange for build, red for peak, green for taper/recovery)
- Show weeks per phase and sessions per week under each phase block
- List 2-3 key workout types per phase in small text
- Clean, modern fitness/sports design aesthetic with subtle gradient background
- All text in ${lang}
- Professional typography, no clipart
- Use dark background with light text for a premium look`
}

export async function generateProgramInfographic(
  options: GenerateInfographicOptions
): Promise<string> {
  const { programId, programData, coachId, locale, model } = options
  const selectedModel = model || GEMINI_MODELS.IMAGE_GENERATION

  const apiKey = await resolveGoogleApiKey(coachId)
  if (!apiKey) {
    logger.warn('No Google API key available for infographic generation', { programId, coachId })
    throw new Error('NO_API_KEY')
  }

  const ai = new GoogleGenAI({ apiKey })
  const prompt = buildInfographicPrompt(programData, locale)

  let response
  try {
    response = await ai.models.generateContent({
      model: selectedModel,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    })
  } catch (geminiError) {
    const msg = geminiError instanceof Error ? geminiError.message : String(geminiError)
    logger.error('Gemini API call failed', { programId, model: selectedModel, error: msg }, geminiError)
    throw new Error(`GEMINI_ERROR: ${msg}`)
  }

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts
  const imagePart = parts?.find(
    (part) => part.inlineData?.mimeType?.startsWith('image/')
  )

  if (!imagePart?.inlineData?.data) {
    logger.warn('No image in Gemini response', {
      programId,
      model: selectedModel,
      hasCandidates: !!response.candidates?.length,
      partTypes: parts?.map((p) => p.text ? 'text' : p.inlineData ? 'inlineData' : 'unknown'),
    })
    throw new Error('NO_IMAGE_IN_RESPONSE')
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
  const mimeType = imagePart.inlineData.mimeType || 'image/png'
  const extension = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const storagePath = `${programId}/${Date.now()}.${extension}`

  // Upload to Supabase Storage
  const admin = createAdminSupabaseClient()
  const { error: uploadError } = await admin.storage
    .from(PROGRAM_INFOGRAPHICS_BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (uploadError) {
    logger.error('Failed to upload infographic to storage', { programId, storagePath }, uploadError)
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = admin.storage
    .from(PROGRAM_INFOGRAPHICS_BUCKET)
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl

  // Update program record
  await prisma.trainingProgram.update({
    where: { id: programId },
    data: {
      infographicUrl: publicUrl,
      infographicModel: selectedModel,
    },
  })

  return publicUrl
}

export async function reconstructProgramForInfographic(
  programId: string
): Promise<InfographicProgramData | null> {
  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    select: {
      name: true,
      description: true,
      goalType: true,
      weeks: {
        select: {
          weekNumber: true,
          phase: true,
          focus: true,
          days: {
            select: {
              workouts: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { weekNumber: 'asc' },
      },
    },
  })

  if (!program) return null

  // Group weeks by phase to reconstruct phases
  const phaseMap = new Map<string, {
    name: string
    weekNumbers: number[]
    focus: string
    workoutTypes: Set<string>
    totalDaysWithWorkouts: number
    totalWeeks: number
  }>()

  for (const week of program.weeks) {
    const phaseName = week.phase
    const existing = phaseMap.get(phaseName)

    const workoutNames = week.days
      .flatMap((d) => d.workouts.map((w) => w.name || w.type))
      .filter(Boolean)

    if (existing) {
      existing.weekNumbers.push(week.weekNumber)
      existing.totalWeeks++
      for (const wt of workoutNames) existing.workoutTypes.add(wt)
      existing.totalDaysWithWorkouts += week.days.filter((d) => d.workouts.length > 0).length
    } else {
      phaseMap.set(phaseName, {
        name: phaseName,
        weekNumbers: [week.weekNumber],
        focus: week.focus || phaseName,
        workoutTypes: new Set(workoutNames),
        totalDaysWithWorkouts: week.days.filter((d) => d.workouts.length > 0).length,
        totalWeeks: 1,
      })
    }
  }

  const phases = Array.from(phaseMap.values()).map((p) => {
    const minWeek = Math.min(...p.weekNumbers)
    const maxWeek = Math.max(...p.weekNumbers)
    const avgSessionsPerWeek = p.totalWeeks > 0
      ? Math.round(p.totalDaysWithWorkouts / p.totalWeeks)
      : 0

    return {
      name: p.name,
      weeks: minWeek === maxWeek ? `${minWeek}` : `${minWeek}-${maxWeek}`,
      focus: p.focus,
      sessionsPerWeek: avgSessionsPerWeek,
      keyWorkouts: Array.from(p.workoutTypes).slice(0, 3),
    }
  })

  return {
    name: program.name,
    description: program.description || undefined,
    goalType: program.goalType,
    totalWeeks: program.weeks.length,
    phases,
  }
}

/**
 * Convert a ParsedProgram (from AI output) to InfographicProgramData.
 */
export function parsedProgramToInfographicData(parsed: ParsedProgram): InfographicProgramData {
  return {
    name: parsed.name,
    description: parsed.description,
    totalWeeks: parsed.totalWeeks,
    methodology: parsed.methodology,
    phases: parsed.phases.map((p) => ({
      name: p.name,
      weeks: p.weeks,
      focus: p.focus,
      sessionsPerWeek: parsed.weeklySchedule?.sessionsPerWeek,
      keyWorkouts: p.keyWorkouts,
    })),
  }
}
