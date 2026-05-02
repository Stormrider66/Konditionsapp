/**
 * Pilot: generate the first 10 v2 exercise images with OpenAI GPT Image 2.
 *
 * This is intentionally safe:
 * - writes only to tmp/exercise-image-v2-pilot/<timestamp>/
 * - does not upload to Supabase
 * - does not update Prisma
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx tsx scripts/pilot-openai-exercise-images-v2.ts
 *
 * Optional:
 *   OPENAI_IMAGE_MODEL=gpt-image-2 npx tsx scripts/pilot-openai-exercise-images-v2.ts --limit=10
 */

import OpenAI, { toFile } from 'openai'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

type PilotExercise = {
  slug: string
  nameEn: string
  nameSv: string
  category: string
  muscles: string[]
  scene: string
  avoid?: string
}

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
const SIZE = '1024x1024'
const QUALITY = 'high'
const STYLE_REFERENCE = path.resolve('public/images/foot-ankle/bike-calories-1.png')
const OUTPUT_ROOT = path.resolve('tmp/exercise-image-v2-pilot')

const PILOT_EXERCISES: PilotExercise[] = [
  {
    slug: 'bar-facing-burpee',
    nameEn: 'Bar Facing Burpee',
    nameSv: 'Bar Facing Burpee',
    category: 'posterior-chain',
    muscles: ['pectoralis major', 'triceps brachii', 'rectus abdominis', 'quadriceps', 'gluteus maximus'],
    scene: 'athlete in the bottom push-up phase of a bar-facing burpee, chest close to the floor, hands planted, feet extended behind, entire body on one side of the barbell. The barbell lies horizontally on the floor directly in front of the head and hands, clearly separated from the body, ready for the athlete to jump over after standing up',
    avoid: 'no body parts crossing over the bar, no hands on one side and feet on the other side, no flying pose, no extra barbells, no distorted hands, no impossible plank angle',
  },
  {
    slug: 'childs-pose',
    nameEn: "Child's Pose",
    nameSv: 'Barnets position',
    category: 'mobility',
    muscles: ['latissimus dorsi', 'erector spinae', 'gluteus maximus'],
    scene: 'athlete performing child pose on the floor, knees bent, hips resting toward heels, arms extended forward, forehead close to the mat, calm mobility posture',
    avoid: 'no yoga studio props, no kneeling prayer pose, no extra limbs',
  },
  {
    slug: 'leg-press',
    nameEn: 'Leg Press',
    nameSv: 'Benpress',
    category: 'knee-dominance',
    muscles: ['quadriceps', 'gluteus maximus', 'hamstrings'],
    scene: 'athlete seated in a 45-degree leg press machine, feet shoulder-width on the sled platform, knees bent about 90 degrees, hands holding side handles, machine shown clearly and realistically',
    avoid: 'no floating platform, no missing machine rails, no impossible knee position',
  },
  {
    slug: 'leg-swings',
    nameEn: 'Leg Swings',
    nameSv: 'Bensving',
    category: 'posterior-chain',
    muscles: ['hip flexors', 'hamstrings', 'gluteus maximus'],
    scene: 'athlete standing upright beside a simple support, one hand lightly touching the support, one leg swinging forward in a controlled mobility drill, torso tall, clear side view',
    avoid: 'no split leap, no dance pose, no blurred duplicate legs',
  },
  {
    slug: 'bent-over-row',
    nameEn: 'Bent Over Row',
    nameSv: 'Böjd rodd',
    category: 'upper-body',
    muscles: ['latissimus dorsi', 'rhomboids', 'trapezius', 'biceps brachii'],
    scene: 'athlete performing a bent-over barbell row, torso hinged about 45 degrees, neutral spine, barbell pulled toward lower ribs, elbows driving back, feet planted',
    avoid: 'no deadlift lockout, no rounded back, no mismatched barbell plates',
  },
  {
    slug: 'bicycle-crunches',
    nameEn: 'Bicycle Crunches',
    nameSv: 'Cykelcrunches',
    category: 'core',
    muscles: ['rectus abdominis', 'external obliques', 'iliopsoas'],
    scene: 'athlete lying on the floor performing bicycle crunches, one knee drawn toward opposite elbow, other leg extended, shoulder blades lifted, clear core rotation',
    avoid: 'no actual bicycle, no poster or framed picture, no folded torso anatomy',
  },
  {
    slug: 'bike-calories',
    nameEn: 'Bike Calories',
    nameSv: 'Cykel (Kalorier)',
    category: 'foot-ankle',
    muscles: ['quadriceps femoris', 'gluteus maximus', 'hamstrings', 'gastrocnemius', 'soleus'],
    scene: 'athlete riding an indoor stationary bike, side view, hands on handlebars, one knee flexed and one leg extending through the pedal stroke, bike geometry realistic',
    avoid: 'no outdoor road bike, no extra pedals, no unreadable dashboard text',
  },
  {
    slug: 'back-squat',
    nameEn: 'Back Squat',
    nameSv: 'Knäböj',
    category: 'knee-dominance',
    muscles: ['quadriceps', 'gluteus maximus', 'erector spinae', 'hamstrings'],
    scene: 'athlete performing a back squat in the bottom position, barbell resting on upper back, thighs at or just below parallel, knees tracking over toes, torso braced',
    avoid: 'no front squat, no smith machine, no collapsed knees, no warped barbell',
  },
  {
    slug: 'deadlift',
    nameEn: 'Deadlift',
    nameSv: 'Marklyft',
    category: 'posterior-chain',
    muscles: ['erector spinae', 'gluteus maximus', 'hamstrings', 'latissimus dorsi', 'trapezius'],
    scene: 'athlete performing a conventional barbell deadlift just below knee height, neutral spine, bar close to legs, hips and knees extending together, strong hinge position',
    avoid: 'no sumo stance, no rounded spine, no extra barbell sleeves',
  },
  {
    slug: 'push-up',
    nameEn: 'Push-Up',
    nameSv: 'Armhävning',
    category: 'upper-body',
    muscles: ['pectoralis major', 'triceps brachii', 'anterior deltoid', 'rectus abdominis'],
    scene: 'athlete performing a push-up near the bottom position, hands under shoulders, elbows bent about 45 degrees, body straight from shoulders to ankles, floor visible',
    avoid: 'no bench press, no kneeling variation, no sagging hips',
  },
]

function parseLimit() {
  const arg = process.argv.find((item) => item.startsWith('--limit='))
  if (!arg) return 10
  const value = Number(arg.split('=')[1])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10
}

function buildPrompt(exercise: PilotExercise) {
  return [
    `Create a premium exercise demonstration image for ${exercise.nameEn} (${exercise.nameSv}).`,
    `Use the provided reference image only as the visual style target: dark sports-science studio, realistic athletic woman, clean equipment, dramatic side lighting, subtle anatomical muscle glow, polished professional fitness-app quality.`,
    `Exercise scene: ${exercise.scene}.`,
    `Highlight these active muscles as broad glowing muscle groups with a translucent orange-red anatomical overlay: ${exercise.muscles.join(', ')}. The glow should cover the muscle bellies and recruitment zones, not thin nerve-like strands.`,
    `Composition: square 1:1 image, full body or full movement visible, centered subject, consistent safe padding, no important anatomy or equipment cropped, clear readable pose at mobile thumbnail size.`,
    `Style: realistic anatomical sports illustration, same mood and quality as the reference bike image, dark charcoal-blue background, no clutter, no logos, no brand marks.`,
    `Strict constraints: no text, no labels, no captions, no numbers, no watermark, no UI, no poster frame, no split screen, no duplicate athlete, no extra limbs, no anatomical impossibilities, no glowing nerve pathways, no skeleton lines, no thin fiber-only highlights.`,
    exercise.avoid ? `Avoid: ${exercise.avoid}.` : '',
  ].filter(Boolean).join(' ')
}

async function imageBufferFromResponse(response: { data?: Array<{ b64_json?: string }> }) {
  const first = response.data?.[0]
  if (!first?.b64_json) {
    throw new Error('OpenAI response did not include b64_json image data')
  }
  return Buffer.from(first.b64_json, 'base64')
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GPT_API_KEY
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY or GPT_API_KEY. Add one to .env.local or prefix the command.')
  }
  if (apiKey.startsWith('gsk-')) {
    throw new Error('GPT_API_KEY looks like a Google/Gemini key (gsk-...). GPT Image 2 requires an OpenAI Platform key, usually sk-proj-... or sk-...')
  }

  await fs.access(STYLE_REFERENCE)

  const limit = Math.min(parseLimit(), PILOT_EXERCISES.length)
  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const outputDir = path.join(OUTPUT_ROOT, runId)
  await fs.mkdir(outputDir, { recursive: true })

  const client = new OpenAI({ apiKey })
  const styleReference = await fs.readFile(STYLE_REFERENCE)
  const manifest: Array<Record<string, unknown>> = []

  console.log(`Model: ${MODEL}`)
  console.log(`Size: ${SIZE}`)
  console.log(`Quality: ${QUALITY}`)
  console.log(`Style reference: ${STYLE_REFERENCE}`)
  console.log(`Output: ${outputDir}`)
  console.log(`Exercises: ${limit}\n`)

  for (const exercise of PILOT_EXERCISES.slice(0, limit)) {
    const started = Date.now()
    const prompt = buildPrompt(exercise)
    const referenceFile = await toFile(styleReference, 'bike-calories-style-reference.png', { type: 'image/png' })

    console.log(`Generating ${exercise.nameSv} (${exercise.nameEn})...`)
    const response = await client.images.edit({
      model: MODEL,
      image: referenceFile,
      prompt,
      size: SIZE,
      quality: QUALITY,
      stream: false,
      n: 1,
    })

    const image = await imageBufferFromResponse(response)
    const fileName = `${exercise.category}/${exercise.slug}-v2-1.png`
    const outPath = path.join(outputDir, fileName)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, image)

    const elapsedSeconds = Number(((Date.now() - started) / 1000).toFixed(1))
    manifest.push({
      slug: exercise.slug,
      nameEn: exercise.nameEn,
      nameSv: exercise.nameSv,
      category: exercise.category,
      muscles: exercise.muscles,
      file: fileName,
      model: MODEL,
      size: SIZE,
      quality: QUALITY,
      elapsedSeconds,
      prompt,
    })
    console.log(`  -> ${outPath} (${Math.round(image.length / 1024)} KB, ${elapsedSeconds}s)`)
  }

  const manifestPath = path.join(outputDir, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify({ model: MODEL, size: SIZE, quality: QUALITY, styleReference: STYLE_REFERENCE, generatedAt: new Date().toISOString(), images: manifest }, null, 2))

  console.log(`\nDone. Review images in: ${outputDir}`)
  console.log(`Manifest: ${manifestPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
