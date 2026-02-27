import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const EXERCISE_IMAGES_BUCKET = 'exercise-images'

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

/**
 * Builds the exact prompt as defined in GEMINI_IMAGE_GENERATION_PROMPT.md
 */
function buildExercisePrompt(name: string, muscles: string[], phase?: string): string {
  const muscleText = muscles.join(', ').toUpperCase()
  const phaseText = phase ? ` This is the ${phase} phase of the movement.` : ''
  
  return `Athletic person performing ${name} exercise.${phaseText} 
Highlight ${muscleText} with orange/red glow. 
Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio. 
Modern anatomical illustration style. Latin muscle labels only. No text or title.`
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
  } catch (err) {
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
