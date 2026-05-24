import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Subject = 'woman' | 'man'

type BatchExercise = {
  name: string
  displayName: string
  subject: Subject
  category: string
  slug: string
  primaryImage: string
  targetFrames: 1 | 2 | 3
  muscles: string
  avoid: string
  frames: Array<{
    index: number
    role: string
    scene: string
  }>
}

const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'pilot', 'exercise-image-v2', 'frame-prompts')

const BATCH_01: BatchExercise[] = [
  {
    name: 'Knäböj',
    displayName: 'Back Squat',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'knaboj',
    primaryImage: '/images/knee-dominance/knaboj-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, erector spinae, abdominal stabilizers',
    avoid: 'front squat, Smith machine, high-bar label text, rounded back, knees collapsing inward, cropped plates',
    frames: [
      {
        index: 2,
        role: 'standing start frame',
        scene: 'standing tall at the top of a back squat with barbell across the upper back, feet shoulder-width, trunk braced, full body and plates visible',
      },
    ],
  },
  {
    name: 'Marklyft',
    displayName: 'Deadlift',
    subject: 'man',
    category: 'posterior-chain',
    slug: 'marklyft',
    primaryImage: '/images/posterior-chain/marklyft-1.png',
    targetFrames: 3,
    muscles: 'gluteus maximus, hamstrings, erector spinae, latissimus dorsi, quadriceps',
    avoid: 'sumo stance, rounded spine, bar drifting away from shins, shrugging at lockout, mixed grip emphasis, cropped barbell',
    frames: [
      {
        index: 2,
        role: 'mid-pull frame',
        scene: 'barbell at knee height during a conventional deadlift, hips and shoulders rising together, neutral spine, bar close to legs',
      },
      {
        index: 3,
        role: 'lockout finish frame',
        scene: 'standing tall at deadlift lockout with barbell held against thighs, glutes engaged, shoulders set, neutral neck',
      },
    ],
  },
  {
    name: 'Bänkpress',
    displayName: 'Bench Press',
    subject: 'man',
    category: 'upper-body',
    slug: 'bankpress',
    primaryImage: '/images/upper-body/bankpress-1.png',
    targetFrames: 2,
    muscles: 'pectoralis major, anterior deltoid, triceps brachii, serratus anterior',
    avoid: 'spotter hands on bar, vertical poster composition, warped barbell, excessive arch, elbows flared straight sideways, cropped bench',
    frames: [
      {
        index: 2,
        role: 'chest-touch bottom frame',
        scene: 'lying on a flat bench with barbell lightly touching the lower chest, wrists stacked, shoulder blades retracted, feet planted',
      },
    ],
  },
  {
    name: 'Split Squat',
    displayName: 'Split Squat',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'split-squat',
    primaryImage: '/images/knee-dominance/split-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, soleus, abdominal stabilizers',
    avoid: 'front knee collapsing inward, rear foot floating, torso folded forward, cropped rear foot, lunge jump',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'split squat top position with front and rear feet planted, knees nearly extended, torso tall, hands clasped for balance',
      },
    ],
  },
  {
    name: 'Benpress',
    displayName: 'Leg Press',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'benpress',
    primaryImage: '/images/knee-dominance/benpress-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, hamstrings, adductor magnus',
    avoid: 'locked knees, knees caving inward, unrealistic machine rails, feet leaving platform, cropped sled',
    frames: [
      {
        index: 2,
        role: 'pressed position frame',
        scene: 'leg press with sled pressed away, knees almost extended but not locked, feet flat on platform, back supported on pad',
      },
    ],
  },
  {
    name: 'Pull-Up',
    displayName: 'Pull-Up',
    subject: 'man',
    category: 'upper-body',
    slug: 'pull-up',
    primaryImage: '/images/upper-body/pull-up-1.png',
    targetFrames: 3,
    muscles: 'latissimus dorsi, biceps brachii, lower trapezius, rhomboids, abdominal stabilizers',
    avoid: 'kipping swing, bent knees dominating the frame, cropped hands, chin-up underhand grip, impossible shoulder position',
    frames: [
      {
        index: 2,
        role: 'mid-pull frame',
        scene: 'mid-pull position with elbows driving down, chest rising toward the bar, shoulder blades depressed, body controlled',
      },
      {
        index: 3,
        role: 'chin-over-bar finish frame',
        scene: 'top pull-up position with chin just above bar, elbows bent, ribs down, full grip and bar visible',
      },
    ],
  },
  {
    name: 'Push-Up',
    displayName: 'Push-Up',
    subject: 'woman',
    category: 'upper-body',
    slug: 'push-up',
    primaryImage: '/images/upper-body/push-up-1.png',
    targetFrames: 2,
    muscles: 'pectoralis major, triceps brachii, anterior deltoid, rectus abdominis, serratus anterior',
    avoid: 'sagging hips, piked hips, elbows flared to 90 degrees, cropped hands, knees on floor',
    frames: [
      {
        index: 2,
        role: 'bottom frame',
        scene: 'push-up bottom position with chest close to floor, elbows bent about 45 degrees, body straight from head to heels',
      },
    ],
  },
  {
    name: 'Hip Thrust med skivstång',
    displayName: 'Barbell Hip Thrust',
    subject: 'woman',
    category: 'posterior-chain',
    slug: 'hip-thrust-med-skivstang',
    primaryImage: '/images/posterior-chain/hip-thrust-med-skivstang-1.png',
    targetFrames: 2,
    muscles: 'gluteus maximus, hamstrings, adductor magnus, erector spinae, abdominal stabilizers',
    avoid: 'barbell floating, bench too high, overextended lumbar spine, feet too far away, cropped bar plates',
    frames: [
      {
        index: 2,
        role: 'bottom setup frame',
        scene: 'barbell hip thrust bottom position with upper back on bench, barbell across hips, hips lowered under control, feet planted',
      },
    ],
  },
  {
    name: 'Single Under',
    displayName: 'Single Under',
    subject: 'man',
    category: 'unilateral',
    slug: 'single-under',
    primaryImage: '/images/unilateral/single-under-1.png',
    targetFrames: 3,
    muscles: 'gastrocnemius, soleus, tibialis anterior, quadriceps, shoulder stabilizers',
    avoid: 'double rope image, rope not connected to handles, exaggerated tuck jump, cropped rope path, cartoon motion trails',
    frames: [
      {
        index: 2,
        role: 'rope-pass airborne frame',
        scene: 'small vertical jump during single under as rope passes under both feet, ankles stiff, knees softly bent, rope arc visible',
      },
      {
        index: 3,
        role: 'landing reset frame',
        scene: 'controlled landing after rope pass with feet close together, rope continuing behind body, posture tall and relaxed',
      },
    ],
  },
  {
    name: 'Kettlebell Swing',
    displayName: 'Kettlebell Swing',
    subject: 'man',
    category: 'posterior-chain',
    slug: 'kettlebell-swing',
    primaryImage: '/images/posterior-chain/kettlebell-swing-1.png',
    targetFrames: 3,
    muscles: 'gluteus maximus, hamstrings, erector spinae, latissimus dorsi, abdominal stabilizers',
    avoid: 'front raise, deep squat, rounded back, kettlebell overhead, arms lifting without hip snap, cropped kettlebell',
    frames: [
      {
        index: 2,
        role: 'backswing frame',
        scene: 'kettlebell swing backswing with hips hinged, kettlebell passing high between the thighs, shins nearly vertical, spine neutral',
      },
      {
        index: 3,
        role: 'float frame',
        scene: 'kettlebell swing float phase with hips fully snapped open, kettlebell at chest height, arms relaxed, ribs down',
      },
    ],
  },
]

function promptFor(exercise: BatchExercise, frame: BatchExercise['frames'][number]): string {
  return [
    `Create one premium mobile exercise demonstration image for ${exercise.displayName}.`,
    '',
    `Subject: realistic athletic adult ${exercise.subject} performing ${exercise.displayName}. Use a clean, coached, biomechanically correct pose: ${frame.scene}.`,
    '',
    `Frame role: ${frame.role}. This is frame ${frame.index} of ${exercise.targetFrames} for the same sequence as ${exercise.primaryImage}. Keep the same visual family as the approved hero image: same dark charcoal-blue sports-science gym mood, similar side or three-quarter camera angle, similar lighting, realistic athletic clothing style, and consistent subject proportions.`,
    '',
    `Highlight these active muscles with a broad translucent orange-red anatomical overlay: ${exercise.muscles}. The glow should cover muscle bellies and recruitment zones, not thin nerve lines.`,
    '',
    'Background and mood: dark charcoal-blue sports-science gym or studio, dramatic side lighting, subtle floor contact shadow, premium fitness app quality, no clutter.',
    '',
    'Composition: square 1:1 image, mobile-first, centered subject, full movement and necessary equipment visible, safe padding around hands, feet, equipment, and labels.',
    '',
    'Anatomy labels: optional small uppercase Latin anatomy labels with thin leader lines are allowed for the highlighted muscles. Do not include the exercise name, UI text, numbers, captions, logos, watermarks, or brand marks.',
    '',
    'Strict constraints: no exercise title, no app interface, no poster frame, no split screen, no duplicate athlete, no extra limbs, no warped equipment, no impossible joint angles, no cropped important anatomy.',
    '',
    `Avoid: ${exercise.avoid}.`,
  ].join('\n')
}

function buildRows() {
  return BATCH_01.flatMap(exercise =>
    exercise.frames.map(frame => ({
      exercise: exercise.name,
      displayName: exercise.displayName,
      subject: exercise.subject,
      category: exercise.category,
      slug: exercise.slug,
      outputPath: `/images/${exercise.category}/${exercise.slug}-${frame.index}.png`,
      heroReference: exercise.primaryImage,
      frameIndex: frame.index,
      targetFrames: exercise.targetFrames,
      frameRole: frame.role,
      scene: frame.scene,
      prompt: promptFor(exercise, frame),
    }))
  )
}

function toMarkdown(rows: ReturnType<typeof buildRows>) {
  const lines = [
    '# Batch 01 Sequence Frame Prompts',
    '',
    'These prompts generate the remaining sequence frames for production batch 01. They are for Codex built-in image generation unless an explicit API pipeline is chosen later.',
    '',
    '| Exercise | Frame | Output | Subject | Role |',
    '| --- | ---: | --- | --- | --- |',
    ...rows.map(row => `| ${row.exercise} | ${row.frameIndex}/${row.targetFrames} | \`${row.outputPath}\` | ${row.subject} | ${row.frameRole} |`),
    '',
  ]

  for (const row of rows) {
    lines.push(`## ${row.exercise} - frame ${row.frameIndex}`)
    lines.push('')
    lines.push(`Output: \`${row.outputPath}\``)
    lines.push('')
    lines.push('```text')
    lines.push(row.prompt)
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

async function verifyBatchScope() {
  const rows = await prisma.exercise.findMany({
    where: {
      coachId: null,
      businessId: null,
      isPublic: true,
      OR: BATCH_01.flatMap(exercise => [
        { name: exercise.name },
        { nameSv: exercise.name },
        { nameEn: exercise.name },
      ]),
    },
    select: { name: true },
  })

  if (rows.length !== BATCH_01.length) {
    throw new Error(`Expected ${BATCH_01.length} global public exercises, found ${rows.length}`)
  }
}

async function main() {
  const shouldWrite = process.argv.includes('--write')
  const rows = buildRows()

  await verifyBatchScope()

  if (!shouldWrite) {
    console.log(toMarkdown(rows))
    return
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'batch-01.json'), `${JSON.stringify(rows, null, 2)}\n`)
  await writeFile(path.join(OUTPUT_DIR, 'batch-01.md'), toMarkdown(rows))
  console.log(`Wrote ${rows.length} frame prompts to ${OUTPUT_DIR}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
