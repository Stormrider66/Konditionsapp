import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { estimateImageCostUsd, logAiUsage } from '@/lib/ai/usage-logger'

const EXERCISE_IMAGES_BUCKET = 'exercise-images'
const EXERCISE_IMAGE_STANDARD_VERSION = 'v2-mobile-studio'
type ExerciseSubject = 'woman' | 'man'

export interface GenerateExerciseOptions {
  exerciseNameSv: string
  exerciseNameEn: string
  muscleGroups: string[]
  isComplexMovement?: boolean
  coachId: string
}

export interface GeneratedExerciseResult {
  id: string
  name: string
  imageUrls: string[]
  isNew: boolean
}

function selectExerciseSubject(name: string): ExerciseSubject {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const hash = Array.from(normalized).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  )
  return hash % 2 === 0 ? 'woman' : 'man'
}

/**
 * Builds the prompt defined in docs/exercise-image-standard-v2.md.
 */
function buildExercisePrompt(name: string, muscles: string[], phase?: string): string {
  const muscleText = muscles
    .map((muscle) => muscle.trim())
    .filter(Boolean)
    .join(', ')
    .toUpperCase() || 'PRIMARY ACTIVE MUSCLES'
  const subject = selectExerciseSubject(name)
  const phaseText = phase
    ? `Frame role: ${phase} frame of a movement sequence. Keep camera angle, lighting, clothing style, subject proportions, and background consistent with the other frames.`
    : 'Frame role: single hero frame.'

  return [
    `Create one premium ${EXERCISE_IMAGE_STANDARD_VERSION} exercise demonstration image for ${name}.`,
    `Subject: realistic athletic adult ${subject} performing ${name} with clean coached technique.`,
    phaseText,
    `Highlight these active muscles with a broad translucent orange-red anatomical overlay: ${muscleText}. The glow should cover muscle bellies and recruitment zones, not thin nerve-like strands.`,
    'Background and mood: dark charcoal-blue sports-science gym or studio, dramatic side lighting, subtle floor contact shadow, premium fitness app quality, no clutter.',
    'Composition: square 1:1 image, mobile-first, centered subject, full movement and necessary equipment visible, safe padding around hands, feet, equipment, and labels.',
    'Anatomy labels: optional small uppercase Latin anatomy labels with thin leader lines are allowed for highlighted muscles only.',
    'Strict constraints: no exercise-name text, no title, no app UI, no numbers, no captions, no logos, no watermark, no poster frame, no split screen, no duplicate athlete, no extra limbs, no warped equipment, no impossible joint angles, no cropped important anatomy.',
  ].join(' ')
}

/**
 * Looks up an exercise or generates it using Nano Banana 2 (Gemini Image Generation) if missing.
 */
export async function lookupOrGenerateExercise(
  options: GenerateExerciseOptions
): Promise<GeneratedExerciseResult> {
  const { exerciseNameSv, exerciseNameEn, muscleGroups, isComplexMovement, coachId } = options

  // 1. Check if exercise already exists
  const existing = await prisma.exercise.findFirst({
    where: {
      OR: [
        { name: { equals: exerciseNameSv, mode: 'insensitive' } },
        { name: { equals: exerciseNameEn, mode: 'insensitive' } }
      ]
    }
  })

  // If it exists and has images, we're good!
  if (existing && existing.imageUrls && (existing.imageUrls as string[]).length > 0) {
    return {
      id: existing.id,
      name: existing.name,
      imageUrls: existing.imageUrls as string[],
      isNew: false
    }
  }

  // 2. We need to generate images. Get API keys.
  let apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  try {
    const keys = await getResolvedAiKeys(coachId)
    if (keys.googleKey) apiKey = keys.googleKey
  } catch (_err) {
    logger.warn('Failed to get coach API keys, falling back to env', { coachId })
  }

  if (!apiKey) {
    throw new Error('NO_GOOGLE_API_KEY')
  }

  const ai = new GoogleGenAI({ apiKey })
  const model = GEMINI_MODELS.IMAGE_GENERATION_PRO // Nano Banana 2

  // Determine phases (Start, Mid, End for complex)
  const phases = isComplexMovement ? ['start', 'middle', 'end'] : ['full']
  const generatedImageUrls: string[] = []
  
  const admin = createAdminSupabaseClient()

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]
    const prompt = buildExercisePrompt(exerciseNameEn, muscleGroups, isComplexMovement ? phase : undefined)
    
    // Note: To truly use Style Reference, we would pass an existing image as part of the prompt.
    // For now, the prompt is highly descriptive to match the style.
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['IMAGE'],
        },
      })

      const outputTokens =
        (response.usageMetadata?.candidatesTokenCount ?? 0) +
        (response.usageMetadata?.thoughtsTokenCount ?? 0)

      logAiUsage({
        provider: 'GOOGLE',
        model,
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens,
        estimatedCost: estimateImageCostUsd(
          model,
          response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens,
        ),
        userId: coachId,
        category: 'image_generation_exercise',
      })

      const parts = response.candidates?.[0]?.content?.parts
      const imagePart = parts?.find((part) => part.inlineData?.mimeType?.startsWith('image/'))

      if (!imagePart?.inlineData?.data) {
        throw new Error('No image returned from Gemini')
      }

      const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
      const mimeType = imagePart.inlineData.mimeType || 'image/png'
      const extension = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/jpeg' ? 'jpg' : 'png'
      
      const fileName = `${exerciseNameEn.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${phase}-${Date.now()}.${extension}`
      const storagePath = `ai-generated/${fileName}`

      const { error: uploadError } = await admin.storage
        .from(EXERCISE_IMAGES_BUCKET)
        .upload(storagePath, imageBuffer, { contentType: mimeType })

      if (uploadError) throw uploadError

      const { data: urlData } = admin.storage
        .from(EXERCISE_IMAGES_BUCKET)
        .getPublicUrl(storagePath)

      generatedImageUrls.push(urlData.publicUrl)
    } catch (error) {
      logger.error('Failed to generate exercise image', { exerciseNameEn, phase, error })
      // If we fail on a phase, we still want to continue or return what we have
    }
  }

  // 3. Save new exercise to database if it didn't exist
  let savedExerciseId = existing?.id

  if (!existing) {
    const newExercise = await prisma.exercise.create({
      data: {
        name: exerciseNameSv,
        category: 'STRENGTH', // Default fallback
        muscleGroup: muscleGroups.join(', '),
        description: `AI-genererad övning för ${exerciseNameSv}`,
        imageUrls: generatedImageUrls,
        primaryImageIndex: 0,
        isPublic: true,
      }
    })
    savedExerciseId = newExercise.id
  } else if (generatedImageUrls.length > 0) {
    // Update existing exercise with new images
    await prisma.exercise.update({
      where: { id: existing.id },
      data: {
        imageUrls: generatedImageUrls,
        primaryImageIndex: 0
      }
    })
  }

  return {
    id: savedExerciseId as string,
    name: exerciseNameSv,
    imageUrls: generatedImageUrls,
    isNew: !existing
  }
}
