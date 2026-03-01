import { GoogleGenAI } from '@google/genai'
import { prisma } from '../lib/prisma'
import { createAdminSupabaseClient } from '../lib/supabase/admin'
import { GEMINI_MODELS } from '../lib/ai/gemini-config'

const EXERCISE_IMAGES_BUCKET = 'exercise-images'

// Loop Optimization: We only need to generate the "Start" and "Middle" phases.
// By saving the array to the database as [Start, Middle, Start], the Remotion player 
// will create a perfect, seamless loop back to the exact same starting pixel!
const BARBELL_SEQUENCES = [
  {
    nameSv: 'Knäböj',
    nameEn: 'Barbell Back Squat',
    muscles: 'QUADRICEPS, GLUTEUS MAXIMUS',
    phases: [
      { id: 'start', desc: 'Standing straight with barbell resting on upper back/shoulders.' },
      { id: 'middle', desc: 'Deep squat position with barbell on upper back, hips below knees.' }
    ]
  },
  {
    nameSv: 'Marklyft',
    nameEn: 'Barbell Deadlift',
    muscles: 'GLUTEUS MAXIMUS, ERECTOR SPINAE, HAMSTRINGS',
    phases: [
      { id: 'start', desc: 'Bent over gripping barbell on the floor, flat back.' },
      { id: 'middle', desc: 'Standing tall, hips fully extended, holding barbell at hip level.' }
    ]
  },
  {
    nameSv: 'Bänkpress',
    nameEn: 'Barbell Bench Press',
    muscles: 'PECTORALIS MAJOR, TRICEPS BRACHII',
    phases: [
      { id: 'start', desc: 'Lying flat on bench holding barbell with straight arms over chest.' },
      { id: 'middle', desc: 'Lying flat on bench with barbell lowered and touching the mid-chest.' }
    ]
  },
  {
    nameSv: 'Axelpress',
    nameEn: 'Barbell Overhead Press',
    muscles: 'DELTOIDS, TRICEPS BRACHII',
    phases: [
      { id: 'start', desc: 'Standing straight holding barbell at upper chest/clavicle level.' },
      { id: 'middle', desc: 'Standing straight with barbell pressed directly overhead, arms locked out.' }
    ]
  },
  {
    nameSv: 'Skivstångsrodd',
    nameEn: 'Barbell Bent Over Row',
    muscles: 'LATISSIMUS DORSI, RHOMBOIDS',
    phases: [
      { id: 'start', desc: 'Bent over at 45 degree angle holding barbell with arms fully extended downwards.' },
      { id: 'middle', desc: 'Bent over pulling barbell tightly against the lower torso/stomach.' }
    ]
  }
]

function buildPrompt(name: string, muscles: string, phaseDesc: string): string {
  return `Athletic person performing ${name}. ${phaseDesc}
Highlight ${muscles} with orange/red glow. 
Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio. 
Modern anatomical illustration style. Latin muscle labels only. No text or title.`
}

async function main() {
  console.log('🏋️ Starting Barbell Sequence Generation...')

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.')
    process.exit(1)
  }

  const ai = new GoogleGenAI({ apiKey })
  const admin = createAdminSupabaseClient()
  const model = GEMINI_MODELS.IMAGE_GENERATION_PRO // Nano Banana 2

  for (const exercise of BARBELL_SEQUENCES) {
    console.log(`\n===========================================`)
    console.log(`🎬 Processing: ${exercise.nameSv} (${exercise.nameEn})`)
    
    // Check if it exists in DB
    const dbExercise = await prisma.exercise.findFirst({
      where: { name: exercise.nameSv }
    })

    if (!dbExercise) {
      console.log(`⚠️  Exercise "${exercise.nameSv}" not found in database. Skipping...`)
      continue
    }

    const generatedUrls: string[] = []

    for (const phase of exercise.phases) {
      console.log(`   Genererar phase: [${phase.id}]...`)
      const prompt = buildPrompt(exercise.nameEn, exercise.muscles, phase.desc)
      
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseModalities: ['IMAGE'] },
        })

        const imagePart = response.candidates?.[0]?.content?.parts?.find(
          (part) => part.inlineData?.mimeType?.startsWith('image/')
        )

        if (!imagePart?.inlineData?.data) {
          throw new Error('No image data in response')
        }

        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
        const mimeType = imagePart.inlineData.mimeType || 'image/png'
        const extension = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/jpeg' ? 'jpg' : 'png'
        
        const fileName = `sequences/barbell/${exercise.nameEn.toLowerCase().replace(/\s+/g, '-')}-${phase.id}-${Date.now()}.${extension}`
        
        const { error: uploadError } = await admin.storage
          .from(EXERCISE_IMAGES_BUCKET)
          .upload(fileName, imageBuffer, { contentType: mimeType })

        if (uploadError) throw uploadError

        const { data: urlData } = admin.storage
          .from(EXERCISE_IMAGES_BUCKET)
          .getPublicUrl(fileName)

        generatedUrls.push(urlData.publicUrl)
        console.log(`   ✅ Phase [${phase.id}] saved: ${urlData.publicUrl}`)
      } catch (err) {
        console.error(`   ❌ Failed phase [${phase.id}]:`, err)
      }
    }

    // Loop Optimization: If we successfully got both Start and Middle, array them as [Start, Middle, Start]
    if (generatedUrls.length === 2) {
      const loopingSequence = [generatedUrls[0], generatedUrls[1], generatedUrls[0]]
      
      await prisma.exercise.update({
        where: { id: dbExercise.id },
        data: {
          imageUrls: loopingSequence,
          primaryImageIndex: 0
        }
      })
      console.log(`✅ Successfully updated ${exercise.nameSv} in DB with 3-part looping sequence!`)
    } else {
      console.log(`⚠️  Did not get both images for ${exercise.nameSv}, skipping DB update.`)
    }
  }

  console.log('\n🎉 All sequences processed!')
}

main().catch(console.error)
