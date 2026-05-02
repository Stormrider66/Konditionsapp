/**
 * Pilot: Generate 3 exercise images with OpenAI tuned for the mobile workout view.
 *
 * Target: components/themed/ExerciseImage.tsx → 9:16 at 360x640 on bg-black/90
 * with object-cover. Multi-phase images auto-animate (Remotion, 300 frames
 * @ 30fps = ~10s loop) so the 3 phases MUST match in framing / athlete /
 * lighting — only the pose changes. We enforce this by generating phase 1
 * with images.generate and then using images.edit with phase 1 as a reference
 * for phases 2 and 3.
 *
 * Usage:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL|OPENAI_API_KEY|OPENAI_IMAGE_MODEL)=' .env.local | xargs)
 *   npx tsx scripts/pilot-openai-exercise-images.ts
 *
 * Output: tmp/exercise-preview/*.png + prints current Gemini URLs for diff.
 * Does NOT write to Supabase or Prisma.
 */

import 'dotenv/config'
import OpenAI, { toFile } from 'openai'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
const OUTPUT_DIR = path.resolve('tmp/exercise-preview')

type Phase = 'start' | 'middle' | 'end'

type PilotExercise = {
  slug: string
  nameEn: string
  nameSv: string
  muscles: string[]
  phaseDescriptions: Record<Phase, string>
}

const EXERCISES: PilotExercise[] = [
  {
    slug: 'back-squat',
    nameEn: 'Back Squat',
    nameSv: 'Knäböj',
    muscles: ['quadriceps', 'gluteus maximus', 'erector spinae', 'hamstrings'],
    phaseDescriptions: {
      start: 'standing tall under the barbell resting on the upper trapezius, hips and knees fully extended, chest up, neutral spine',
      middle: 'in the deep bottom position, thighs parallel to or below horizontal, knees tracking over toes, torso upright, barbell balanced over mid-foot',
      end: 'driving up out of the hole, hips and knees partially extended, barbell rising, posterior chain engaged',
    },
  },
  {
    slug: 'bench-press',
    nameEn: 'Bench Press',
    nameSv: 'Bänkpress',
    muscles: ['pectoralis major', 'triceps brachii', 'anterior deltoid'],
    phaseDescriptions: {
      start: 'lying supine on a flat bench, feet planted, shoulder blades retracted, barbell held at arms length directly above the chest with locked elbows',
      middle: 'barbell touching the mid-chest, elbows tucked to about 45 to 70 degrees, wrists stacked over elbows, upper back tight against the bench',
      end: 'pressing the barbell up and slightly back toward the shoulders, elbows almost locked, chest fully engaged',
    },
  },
  {
    slug: 'deadlift',
    nameEn: 'Deadlift',
    nameSv: 'Marklyft',
    muscles: ['erector spinae', 'gluteus maximus', 'hamstrings', 'latissimus dorsi', 'trapezius'],
    phaseDescriptions: {
      start: 'hinged at the hips over a loaded barbell on the floor, shins close to the bar, neutral spine, shoulders just in front of the bar, arms straight',
      middle: 'barbell lifted to just below the knees, hips and knees extending together, torso angle maintained, bar hugging the legs',
      end: 'standing fully upright at lockout, hips and knees fully extended, barbell held against the thighs, shoulders back, neutral spine',
    },
  },
]

const BASE_STYLE = [
  'Modern anatomical illustration, clean editorial sports-science style.',
  'Single athletic adult figure, muscular, neutral ethnicity, wearing plain athletic shorts and a fitted tank (deadlift and squat) or shirtless for bench press clarity.',
  'The figure fills the vertical frame from head to mid-shin, centered, with safe padding so nothing critical is clipped when the image is cropped by object-cover into a 9:16 viewport.',
  'Active muscles highlighted with a warm orange-to-red translucent glow (matches UI accent rgba(251,146,60,1)). Inactive muscles in cool neutral gray so the recruitment pattern reads at a glance.',
  'Subtle dark charcoal studio backdrop with a faint radial vignette — not pure black, so it does not blend into the UI container. No floor line, no gym clutter, no logos, no bar plates with branding.',
  'Absolutely NO text, NO letters, NO numbers, NO muscle labels, NO watermarks, NO captions. The UI renders all labels separately.',
  'Photoreal-leaning illustration, soft rim light from upper left, muted shadows. Vertical 9:16 portrait composition.',
].join(' ')

function buildPhasePrompt(ex: PilotExercise, phase: Phase): string {
  return [
    `Subject: athlete performing ${ex.nameEn}, ${ex.phaseDescriptions[phase]}.`,
    `Active muscles to highlight with orange-red glow: ${ex.muscles.join(', ')}.`,
    BASE_STYLE,
  ].join(' ')
}

function buildEditPrompt(ex: PilotExercise, phase: Phase): string {
  return [
    `Using the reference image, keep the SAME athlete, SAME camera angle, SAME framing, SAME lighting, SAME background, SAME barbell and clothing.`,
    `Only change the pose to: ${ex.phaseDescriptions[phase]}.`,
    `Preserve the orange-red muscle glow on: ${ex.muscles.join(', ')}. No text or labels anywhere.`,
  ].join(' ')
}

async function generatePhase1(client: OpenAI, ex: PilotExercise) {
  const prompt = buildPhasePrompt(ex, 'start')
  const started = Date.now()

  const res = await client.images.generate({
    model: MODEL,
    prompt,
    size: '1024x1536',
    quality: 'high',
    n: 1,
  })

  const first = res.data?.[0]
  if (!first?.b64_json) throw new Error(`No b64_json for ${ex.slug} start`)

  const buf = Buffer.from(first.b64_json, 'base64')
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  const outPath = path.join(OUTPUT_DIR, `${ex.slug}-start.png`)
  await fs.writeFile(outPath, buf)
  return { buf, outPath, elapsed }
}

async function editPhase(
  client: OpenAI,
  ex: PilotExercise,
  phase: Exclude<Phase, 'start'>,
  reference: Buffer,
) {
  const prompt = buildEditPrompt(ex, phase)
  const started = Date.now()

  const refFile = await toFile(reference, `${ex.slug}-start.png`, { type: 'image/png' })

  const res = await client.images.edit({
    model: MODEL,
    image: refFile,
    prompt,
    size: '1024x1536',
    quality: 'high',
    n: 1,
  })

  const first = res.data?.[0]
  if (!first?.b64_json) throw new Error(`No b64_json for ${ex.slug} ${phase}`)

  const buf = Buffer.from(first.b64_json, 'base64')
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  const outPath = path.join(OUTPUT_DIR, `${ex.slug}-${phase}.png`)
  await fs.writeFile(outPath, buf)
  return { outPath, elapsed, bytes: buf.length }
}

async function findCurrentDbImages(ex: PilotExercise) {
  const row = await prisma.exercise.findFirst({
    where: {
      OR: [
        { name: { equals: ex.nameEn, mode: 'insensitive' } },
        { name: { equals: ex.nameSv, mode: 'insensitive' } },
        { name: { contains: ex.nameEn, mode: 'insensitive' } },
        { name: { contains: ex.nameSv, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, imageUrls: true, primaryImageIndex: true },
  })
  return row
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY. Add it to .env.local and re-export before running.')
    process.exit(1)
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  console.log(`\nModel: ${MODEL}`)
  console.log(`Size: 1024x1536 (9:16 to match mobile workout view at 360x640)`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  for (const ex of EXERCISES) {
    console.log(`── ${ex.nameEn} (${ex.nameSv}) ─────────`)

    const current = await findCurrentDbImages(ex)
    if (current) {
      const urls = (current.imageUrls as string[] | null) || []
      console.log(`  DB row: ${current.name} (id=${current.id})`)
      console.log(`  Current Gemini URLs (${urls.length}):`)
      urls.forEach((u, i) => console.log(`    [${i}] ${u}`))
    } else {
      console.log('  (no existing DB row)')
    }

    try {
      const { buf, outPath, elapsed } = await generatePhase1(client, ex)
      console.log(`  ✓ start  ${(buf.length / 1024).toFixed(0).padStart(4)} KB  ${elapsed}s  → ${outPath}`)

      for (const phase of ['middle', 'end'] as const) {
        try {
          const { outPath: p, elapsed: e, bytes } = await editPhase(client, ex, phase, buf)
          console.log(`  ✓ ${phase.padEnd(6)} ${(bytes / 1024).toFixed(0).padStart(4)} KB  ${e}s  → ${p}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`  ✗ ${phase.padEnd(6)} FAILED: ${msg}`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ start  FAILED: ${msg}`)
    }
    console.log()
  }

  await prisma.$disconnect()
  console.log(`Done. Open ${OUTPUT_DIR} to review.`)
  console.log(`Tip: drop them into a 360x640 black container with object-cover to preview the mobile crop.`)
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
