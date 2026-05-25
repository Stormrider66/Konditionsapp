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

const BATCH_02: BatchExercise[] = [
  {
    name: '90-90 Hip Bridge',
    displayName: '90-90 Hip Bridge',
    subject: 'woman',
    category: 'posterior-chain',
    slug: '90-90-hip-bridge',
    primaryImage: '/images/posterior-chain/90-90-hip-bridge-1.png',
    targetFrames: 2,
    muscles: 'gluteus maximus, hamstrings, adductor magnus, abdominal stabilizers',
    avoid: 'feet sliding off bench, overarched lumbar spine, neck strain, hips sagging, cropped bench or feet',
    frames: [
      {
        index: 2,
        role: 'bottom setup frame',
        scene: 'bottom setup position for a 90-90 hip bridge with shoulders on the floor, heels on a low bench, knees bent near 90 degrees, hips lowered under control, arms relaxed on the floor',
      },
    ],
  },
  {
    name: 'Air Squat',
    displayName: 'Air Squat',
    subject: 'man',
    category: 'knee-dominance',
    slug: 'air-squat',
    primaryImage: '/images/knee-dominance/air-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'knees collapsing inward, heels lifting, rounded back, excessive forward lean, cropped feet or hands',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing tall at the top of an air squat with feet shoulder-width, arms reaching forward for balance, knees and hips extended, trunk braced',
      },
    ],
  },
  {
    name: 'Armhävningar',
    displayName: 'Push-ups',
    subject: 'woman',
    category: 'upper-body',
    slug: 'armhavningar',
    primaryImage: '/images/upper-body/armhavningar-1.png',
    targetFrames: 2,
    muscles: 'pectoralis major, triceps brachii, anterior deltoid, rectus abdominis, serratus anterior',
    avoid: 'knees on floor, sagging hips, piked hips, elbows flared straight sideways, cropped hands or feet',
    frames: [
      {
        index: 2,
        role: 'top plank frame',
        scene: 'push-up top position with arms straight, hands under shoulders, body in one line from head to heels, core braced, feet together',
      },
    ],
  },
  {
    name: 'Axelpress',
    displayName: 'Overhead Press',
    subject: 'man',
    category: 'upper-body',
    slug: 'axelpress',
    primaryImage: '/images/upper-body/axelpress-1.png',
    targetFrames: 2,
    muscles: 'deltoids, triceps brachii, upper trapezius, serratus anterior, abdominal stabilizers',
    avoid: 'push press dip, split jerk stance, excessive back arch, bar drifting forward, cropped barbell plates',
    frames: [
      {
        index: 2,
        role: 'shoulder-rack start frame',
        scene: 'strict barbell overhead press start position with barbell resting at upper chest and shoulders, elbows slightly forward, wrists stacked, body tall and braced',
      },
    ],
  },
  {
    name: 'Bakåtlunges',
    displayName: 'Reverse Lunges',
    subject: 'woman',
    category: 'unilateral',
    slug: 'bakatlunges',
    primaryImage: '/images/unilateral/bakatlunges-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, hamstrings, adductor magnus, soleus, abdominal stabilizers',
    avoid: 'front knee collapsing inward, rear knee crashing into floor, torso folded forward, jump lunge, cropped rear foot',
    frames: [
      {
        index: 2,
        role: 'standing reset frame',
        scene: 'standing reset position for a reverse lunge with feet hip-width under the hips, torso tall, hands clasped for balance, ready to step backward',
      },
    ],
  },
  {
    name: 'Bent Over Row',
    displayName: 'Bent Over Row',
    subject: 'man',
    category: 'upper-body',
    slug: 'bent-over-row',
    primaryImage: '/images/upper-body/bent-over-row-1.png',
    targetFrames: 2,
    muscles: 'latissimus dorsi, rhomboids, middle trapezius, posterior deltoid, biceps brachii, erector spinae',
    avoid: 'upright row, rounded back, shrugging shoulders, bar too far from legs, cropped barbell plates',
    frames: [
      {
        index: 2,
        role: 'arms-extended bottom frame',
        scene: 'barbell bent over row bottom position with hips hinged, neutral spine, bar hanging below shoulders, arms extended, shins nearly vertical',
      },
    ],
  },
  {
    name: 'Bulgarisk utfallsböj',
    displayName: 'Bulgarian Split Squat',
    subject: 'woman',
    category: 'unilateral',
    slug: 'bulgarisk-utfallsboj',
    primaryImage: '/images/unilateral/bulgarisk-utfallsboj-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, hamstrings, adductor magnus, soleus, abdominal stabilizers',
    avoid: 'front knee collapsing inward, rear foot floating away from bench, torso folded forward, bench too high, cropped front foot',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'Bulgarian split squat top position with front foot planted, rear foot supported on bench, knees nearly extended, torso tall, hands clasped for balance',
      },
    ],
  },
  {
    name: 'Curtsy Lunges',
    displayName: 'Curtsy Lunges',
    subject: 'man',
    category: 'unilateral',
    slug: 'curtsy-lunges',
    primaryImage: '/images/unilateral/curtsy-lunges-1.png',
    targetFrames: 2,
    muscles: 'gluteus maximus, gluteus medius, quadriceps femoris, adductor magnus, abdominal stabilizers',
    avoid: 'twisted knee, excessive side bend, rear foot too far away, jump lunge, cropped feet',
    frames: [
      {
        index: 2,
        role: 'standing start frame',
        scene: 'standing start position for a curtsy lunge with feet hip-width, torso tall, hands clasped, one leg ready to step diagonally behind the other',
      },
    ],
  },
  {
    name: 'Cyclist Squat',
    displayName: 'Cyclist Squat',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'cyclist-squat',
    primaryImage: '/images/knee-dominance/cyclist-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, vastus medialis, gluteus maximus, adductor magnus, abdominal stabilizers',
    avoid: 'feet too wide, heels off wedge, knees collapsing inward, torso folded forward, cropped wedge or feet',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing top position for a cyclist squat with heels elevated on a small wedge, feet close together, knees and hips extended, torso tall, hands clasped',
      },
    ],
  },
  {
    name: 'DB Deadlift',
    displayName: 'Dumbbell Deadlift',
    subject: 'man',
    category: 'posterior-chain',
    slug: 'db-deadlift',
    primaryImage: '/images/posterior-chain/db-deadlift-1.png',
    targetFrames: 2,
    muscles: 'gluteus maximus, hamstrings, erector spinae, latissimus dorsi, quadriceps, abdominal stabilizers',
    avoid: 'rounded spine, dumbbells drifting far forward, squat-only posture, shrugging at lockout, cropped dumbbells or feet',
    frames: [
      {
        index: 2,
        role: 'lockout finish frame',
        scene: 'standing tall at the top of a dumbbell deadlift with dumbbells held at the sides of the thighs, hips fully extended, shoulders set, neutral spine',
      },
    ],
  },
]

const BATCH_03: BatchExercise[] = [
  {
    name: 'DB Push Press',
    displayName: 'Dumbbell Push Press',
    subject: 'woman',
    category: 'upper-body',
    slug: 'db-push-press',
    primaryImage: '/images/upper-body/db-push-press-1.png',
    targetFrames: 2,
    muscles: 'deltoids, triceps brachii, quadriceps femoris, gluteus maximus, abdominal stabilizers',
    avoid: 'barbell instead of dumbbells, split jerk stance, deep squat, dumbbells drifting far forward, extreme back arch, cropped dumbbells or hands',
    frames: [
      {
        index: 2,
        role: 'dip-and-drive start frame',
        scene: 'dumbbell push press start position with two dumbbells at shoulder height, elbows slightly forward, small controlled knee dip, torso vertical and braced, feet hip-width',
      },
    ],
  },
  {
    name: 'DB Row',
    displayName: 'Dumbbell Row',
    subject: 'man',
    category: 'upper-body',
    slug: 'db-row',
    primaryImage: '/images/upper-body/db-row-1.png',
    targetFrames: 2,
    muscles: 'latissimus dorsi, rhomboids, middle trapezius, posterior deltoid, biceps brachii, erector spinae',
    avoid: 'barbell row, upright row, rounded back, shrugging shoulder, both dumbbells at once, cropped dumbbell or bench',
    frames: [
      {
        index: 2,
        role: 'arm-extended bottom frame',
        scene: 'one-arm dumbbell row bottom position with one knee and one hand supported on a flat bench, opposite foot planted, torso neutral, rowing arm hanging straight with dumbbell below shoulder',
      },
    ],
  },
  {
    name: 'DB Squat',
    displayName: 'Dumbbell Squat',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'db-squat',
    primaryImage: '/images/knee-dominance/db-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'barbell, kettlebell goblet hold, knees collapsing inward, heels lifting, rounded back, cropped dumbbells or feet',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing tall at the top of a dumbbell squat with two dumbbells held at the sides, feet shoulder-width, knees and hips extended, trunk braced',
      },
    ],
  },
  {
    name: 'DB Strict Press',
    displayName: 'Dumbbell Strict Press',
    subject: 'man',
    category: 'upper-body',
    slug: 'db-strict-press',
    primaryImage: '/images/upper-body/db-strict-press-1.png',
    targetFrames: 2,
    muscles: 'deltoids, triceps brachii, upper trapezius, serratus anterior, abdominal stabilizers',
    avoid: 'push press leg drive, bent knees, split jerk stance, excessive back arch, barbell instead of dumbbells, cropped hands or dumbbells',
    frames: [
      {
        index: 2,
        role: 'shoulder-rack start frame',
        scene: 'strict dumbbell press start position with two dumbbells held at shoulder height, knees straight, feet hip-width, ribs down, torso tall and braced',
      },
    ],
  },
  {
    name: 'Devil Press',
    displayName: 'Devil Press',
    subject: 'woman',
    category: 'upper-body',
    slug: 'devil-press',
    primaryImage: '/images/upper-body/devil-press-1.png',
    targetFrames: 2,
    muscles: 'deltoids, triceps brachii, gluteus maximus, hamstrings, quadriceps femoris, abdominal stabilizers',
    avoid: 'barbell, kettlebell, one dumbbell only, deep squat catch, arched low back, cropped dumbbells or hands',
    frames: [
      {
        index: 2,
        role: 'overhead finish frame',
        scene: 'powerful devil press finish position with two dumbbells overhead after the burpee-to-swing movement, feet shoulder-width, hips and knees extended, torso braced, dumbbells controlled above the head',
      },
    ],
  },
  {
    name: 'Enbenig benpress',
    displayName: 'Single-Leg Press',
    subject: 'man',
    category: 'unilateral',
    slug: 'enbenig-benpress',
    primaryImage: '/images/unilateral/enbenig-benpress-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, hamstrings, adductor magnus, soleus',
    avoid: 'two-leg press, knees caving inward, locked knee, foot leaving platform, unrealistic machine geometry, cropped platform or working foot',
    frames: [
      {
        index: 2,
        role: 'pressed position frame',
        scene: 'single-leg press with the working leg pressing the platform away, knee almost extended but not locked, foot flat on platform, back supported on pad, opposite leg relaxed off the platform',
      },
    ],
  },
  {
    name: 'Enbenig rumänsk marklyft',
    displayName: 'Single-Leg Romanian Deadlift',
    subject: 'woman',
    category: 'unilateral',
    slug: 'enbenig-rumansk-marklyft',
    primaryImage: '/images/unilateral/enbenig-rumansk-marklyft-1.png',
    targetFrames: 2,
    muscles: 'hamstrings, gluteus maximus, gluteus medius, erector spinae, abdominal stabilizers',
    avoid: 'two-leg deadlift, rounded spine, open hips, rear leg too high like a split, knee collapsed inward, cropped extended foot or dumbbells',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'single-leg Romanian deadlift standing top position with one foot planted, opposite foot lightly hovering or just behind, two dumbbells held at the sides, hips square, torso tall and balanced',
      },
    ],
  },
  {
    name: 'Enbenig tåhävning',
    displayName: 'Single-Leg Calf Raise',
    subject: 'man',
    category: 'foot-ankle',
    slug: 'enbenig-tahavning',
    primaryImage: '/images/foot-ankle/enbenig-tahavning-1.png',
    targetFrames: 2,
    muscles: 'gastrocnemius, soleus, tibialis anterior, intrinsic foot muscles, abdominal stabilizers',
    avoid: 'two-leg calf raise, seated calf raise, jumping, holding heavy dumbbells, cropped working foot or step',
    frames: [
      {
        index: 2,
        role: 'bottom stretch frame',
        scene: 'single-leg calf raise bottom position on a low step with the working heel lowered below the step edge, opposite leg held off the step, torso tall, one hand lightly touching a support for balance',
      },
    ],
  },
  {
    name: 'Enbensbrygga',
    displayName: 'Single-Leg Glute Bridge',
    subject: 'woman',
    category: 'posterior-chain',
    slug: 'enbensbrygga',
    primaryImage: '/images/posterior-chain/enbensbrygga-1.png',
    targetFrames: 2,
    muscles: 'gluteus maximus, hamstrings, adductor magnus, abdominal stabilizers, erector spinae',
    avoid: 'two-leg bridge, barbell hip thrust, bench support, sagging hips, overarched lumbar spine, cropped lifted foot or head',
    frames: [
      {
        index: 2,
        role: 'bottom setup frame',
        scene: 'single-leg glute bridge bottom setup position lying on the floor, one foot planted under the knee, opposite leg extended upward or slightly forward, hips lowered under control, arms relaxed on the floor',
      },
    ],
  },
  {
    name: 'Flywheel Lateral Squat',
    displayName: 'Flywheel Lateral Squat',
    subject: 'man',
    category: 'unilateral',
    slug: 'flywheel-lateral-squat',
    primaryImage: '/images/unilateral/flywheel-lateral-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, gluteus medius, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'regular bodyweight lateral lunge with no flywheel, cable machine, barbell, knee collapse, torso folded completely forward, cropped platform or feet',
    frames: [
      {
        index: 2,
        role: 'standing start frame',
        scene: 'flywheel lateral squat standing start position with feet wide, knees nearly extended, torso braced, holding a flywheel handle connected to a low compact platform between the feet',
      },
    ],
  },
]

const BATCH_04: BatchExercise[] = [
  {
    name: 'Front Squat',
    displayName: 'Front Squat',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'front-squat',
    primaryImage: '/images/knee-dominance/front-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, erector spinae, abdominal stabilizers',
    avoid: 'back squat bar position, crossed-arm front rack, Smith machine, elbows dropped, rounded upper back, heels lifting, knees collapsing inward, cropped plates',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing tall at the top of a front squat with barbell held in front rack across the shoulders, elbows high, feet shoulder-width, knees and hips extended, torso upright and braced',
      },
    ],
  },
  {
    name: 'Goblet Squat',
    displayName: 'Goblet Squat',
    subject: 'man',
    category: 'knee-dominance',
    slug: 'goblet-squat',
    primaryImage: '/images/knee-dominance/goblet-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'barbell squat, dumbbells at sides, kettlebell swing, elbows flaring outward, rounded back, cropped kettlebell or feet',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing tall at the top of a goblet squat holding one kettlebell vertically at chest height with both hands, feet shoulder-width, knees and hips extended, trunk braced',
      },
    ],
  },
  {
    name: 'Handstand Push-Up',
    displayName: 'Handstand Push-Up',
    subject: 'woman',
    category: 'upper-body',
    slug: 'handstand-push-up',
    primaryImage: '/images/upper-body/handstand-push-up-1.png',
    targetFrames: 2,
    muscles: 'deltoids, triceps brachii, upper trapezius, serratus anterior, abdominal stabilizers',
    avoid: 'freestanding handstand walk, pike push-up, kipping arch, collapsed neck, feet far off wall, cropped hands or feet, poster-like diagram',
    frames: [
      {
        index: 2,
        role: 'locked-out top frame',
        scene: 'strict wall-supported handstand push-up top position with arms straight, hands under shoulders, feet lightly touching the wall, ribs down, body tight and vertical',
      },
    ],
  },
  {
    name: 'Höftbrygga',
    displayName: 'Glute Bridge',
    subject: 'man',
    category: 'posterior-chain',
    slug: 'hoftbrygga',
    primaryImage: '/images/posterior-chain/hoftbrygga-1.png',
    targetFrames: 2,
    muscles: 'gluteus maximus, hamstrings, adductor magnus, erector spinae, abdominal stabilizers',
    avoid: 'single-leg bridge, barbell hip thrust, bench support, overarched lumbar spine, feet too far forward, cropped head or feet',
    frames: [
      {
        index: 2,
        role: 'bottom setup frame',
        scene: 'floor glute bridge bottom setup position lying on the back with knees bent, feet flat under the knees, hips resting just above the floor, arms relaxed on the floor',
      },
    ],
  },
  {
    name: 'Inverterad rodd',
    displayName: 'Inverted Row',
    subject: 'woman',
    category: 'upper-body',
    slug: 'inverterad-rodd',
    primaryImage: '/images/upper-body/inverterad-rodd-1.png',
    targetFrames: 2,
    muscles: 'latissimus dorsi, rhomboids, middle trapezius, posterior deltoid, biceps brachii, abdominal stabilizers',
    avoid: 'pull-up, seated cable row, TRX straps, bent hips, sagging body, cropped hands or bar supports',
    frames: [
      {
        index: 2,
        role: 'arm-extended bottom frame',
        scene: 'bottom position of an inverted row under a low straight bar, hands gripping shoulder-width, arms straight, body in one line from shoulders to heels, heels on the floor',
      },
    ],
  },
  {
    name: 'Kbox Bilateral Squat',
    displayName: 'Kbox Bilateral Squat',
    subject: 'man',
    category: 'knee-dominance',
    slug: 'kbox-bilateral-squat',
    primaryImage: '/images/knee-dominance/kbox-bilateral-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'normal bodyweight squat with no flywheel, cable machine, barbell, belt floating without platform, knees collapsing inward, cropped platform or handle',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing top position of a bilateral flywheel squat on a compact Kbox-style platform, feet shoulder-width, knees and hips extended, torso braced, holding the handle attached to the flywheel strap or belt',
      },
    ],
  },
  {
    name: 'Kbox Unilateral Squat',
    displayName: 'Kbox Unilateral Squat',
    subject: 'woman',
    category: 'unilateral',
    slug: 'kbox-unilateral-squat',
    primaryImage: '/images/unilateral/kbox-unilateral-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, gluteus medius, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'bilateral squat, pistol squat with no flywheel, cable machine, barbell, knee collapse, cropped working foot or platform',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing top position of a single-leg flywheel squat on a compact Kbox-style platform, working foot planted, opposite foot lightly touching behind for balance, torso braced, holding the flywheel handle',
      },
    ],
  },
  {
    name: 'Kickstand Romanian Deadlift',
    displayName: 'Kickstand Romanian Deadlift',
    subject: 'man',
    category: 'posterior-chain',
    slug: 'kickstand-romanian-deadlift',
    primaryImage: '/images/posterior-chain/kickstand-romanian-deadlift-1.png',
    targetFrames: 2,
    muscles: 'hamstrings, gluteus maximus, gluteus medius, erector spinae, abdominal stabilizers',
    avoid: 'conventional two-leg deadlift, single-leg airplane pose, barbell if dumbbells are clearer, rounded back, rear foot carrying full weight, cropped dumbbells or feet',
    frames: [
      {
        index: 2,
        role: 'standing top frame',
        scene: 'standing top position of a kickstand Romanian deadlift with most weight on the front leg, rear toes lightly touching behind, two dumbbells held at the sides, hips extended, spine neutral',
      },
    ],
  },
  {
    name: 'Landmine Lateral Squat',
    displayName: 'Landmine Lateral Squat',
    subject: 'woman',
    category: 'unilateral',
    slug: 'landmine-lateral-squat',
    primaryImage: '/images/unilateral/landmine-lateral-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, gluteus medius, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'normal side lunge with no landmine, overhead barbell, cable machine, knee collapse, torso folded completely forward, cropped bar end or extended foot',
    frames: [
      {
        index: 2,
        role: 'standing wide start frame',
        scene: 'standing start position for a landmine lateral squat with feet wide, knees nearly extended, loaded landmine bar end held at chest height, torso tall, landmine anchor and bar angle visible',
      },
    ],
  },
  {
    name: 'Landmine Skate Squat',
    displayName: 'Landmine Skate Squat',
    subject: 'man',
    category: 'unilateral',
    slug: 'landmine-skate-squat',
    primaryImage: '/images/unilateral/landmine-skate-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, gluteus medius, hamstrings, adductor magnus, abdominal stabilizers',
    avoid: 'lateral squat, side lunge, bilateral squat, Bulgarian split squat with bench, pistol squat with the free leg forward, barbell across back, knee collapse, cropped rear knee or landmine anchor',
    frames: [
      {
        index: 2,
        role: 'standing reset frame',
        scene: 'standing reset position for a landmine-assisted skate squat with working foot planted, opposite leg hovering slightly behind, hands holding landmine bar end at chest height, torso braced, bar angled from a floor anchor',
      },
    ],
  },
]

const BATCH_05: BatchExercise[] = [
  {
    name: 'Lateral Lunges',
    displayName: 'Lateral Lunges',
    subject: 'woman',
    category: 'unilateral',
    slug: 'lateral-lunges',
    primaryImage: '/images/unilateral/lateral-lunges-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, gluteus medius, adductor magnus, hamstrings, abdominal stabilizers',
    avoid: 'landmine barbell, forward lunge, curtsy lunge, deep Cossack stretch, knee collapse, torso folded completely forward, cropped extended foot',
    frames: [
      {
        index: 2,
        role: 'standing wide start frame',
        scene: 'standing start position for lateral lunges with feet wide, knees nearly extended, torso tall, hips square, hands clasped for balance, both feet flat and fully visible',
      },
    ],
  },
  {
    name: 'Lunge',
    displayName: 'Lunge',
    subject: 'man',
    category: 'knee-dominance',
    slug: 'lunge',
    primaryImage: '/images/knee-dominance/lunge-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, hamstrings, soleus, abdominal stabilizers',
    avoid: 'split squat fixed stance, reverse lunge step-back, jumping lunge, barbell, dumbbells, front knee collapse, cropped rear foot',
    frames: [
      {
        index: 2,
        role: 'standing reset frame',
        scene: 'standing reset position for a forward lunge with feet hip-width under the hips, torso upright, hands relaxed for balance, ready to step forward',
      },
    ],
  },
  {
    name: 'Overhead Lunge',
    displayName: 'Overhead Lunge',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'overhead-lunge',
    primaryImage: '/images/knee-dominance/overhead-lunge-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, deltoids, triceps brachii, abdominal stabilizers',
    avoid: 'barbell on back, dumbbells at sides, overhead squat, split jerk, elbows bent, bar drifting forward, cropped bar ends or rear foot',
    frames: [
      {
        index: 2,
        role: 'standing overhead reset frame',
        scene: 'standing reset position for an overhead lunge with feet hip-width, light barbell locked out overhead, arms straight, shoulders active, torso tall and braced',
      },
    ],
  },
  {
    name: 'Overhead Squat',
    displayName: 'Overhead Squat',
    subject: 'man',
    category: 'knee-dominance',
    slug: 'overhead-squat',
    primaryImage: '/images/knee-dominance/overhead-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, adductor magnus, deltoids, upper trapezius, abdominal stabilizers',
    avoid: 'front squat, back squat, snatch catch with unstable feet, bar too far forward, elbows bent, heels lifting, cropped barbell',
    frames: [
      {
        index: 2,
        role: 'standing overhead top frame',
        scene: 'standing tall at the top of an overhead squat with barbell locked out overhead in a wide grip, arms straight, feet shoulder-width, knees and hips extended, torso braced',
      },
    ],
  },
  {
    name: 'Pendlay Row',
    displayName: 'Pendlay Row',
    subject: 'woman',
    category: 'upper-body',
    slug: 'pendlay-row',
    primaryImage: '/images/upper-body/pendlay-row-1.png',
    targetFrames: 2,
    muscles: 'latissimus dorsi, rhomboids, middle trapezius, posterior deltoid, biceps brachii, erector spinae',
    avoid: 'upright row, deadlift lockout, cable row, rounded back, shrugging shoulders, bar far from torso, cropped plates',
    frames: [
      {
        index: 2,
        role: 'bar-on-floor start frame',
        scene: 'Pendlay row start position with torso hinged near parallel to the floor, neutral spine, arms straight, barbell resting on the floor below the shoulders, shins nearly vertical',
      },
    ],
  },
  {
    name: 'Pike Push-Up',
    displayName: 'Pike Push-Up',
    subject: 'man',
    category: 'upper-body',
    slug: 'pike-push-up',
    primaryImage: '/images/upper-body/pike-push-up-1.png',
    targetFrames: 2,
    muscles: 'deltoids, triceps brachii, upper trapezius, serratus anterior, abdominal stabilizers',
    avoid: 'handstand push-up against wall, regular push-up, knees on floor, collapsed neck, elbows flared straight sideways, cropped hands or feet',
    frames: [
      {
        index: 2,
        role: 'top pike frame',
        scene: 'top position of a pike push-up with hips high, legs straight, arms straight, hands shoulder-width on the floor, head between the upper arms',
      },
    ],
  },
  {
    name: 'Pistol Squat',
    displayName: 'Pistol Squat',
    subject: 'woman',
    category: 'knee-dominance',
    slug: 'pistol-squat',
    primaryImage: '/images/knee-dominance/pistol-squat-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, gluteus medius, hamstrings, adductor magnus, abdominal stabilizers',
    avoid: 'two-leg squat, box pistol, assisted ring pistol, heel lifted, knee collapse, rounded back, cropped extended foot',
    frames: [
      {
        index: 2,
        role: 'standing single-leg top frame',
        scene: 'standing top position of a pistol squat with one foot planted, opposite leg extended forward and hovering, arms reaching forward for balance, torso braced',
      },
    ],
  },
  {
    name: 'Pistol Squat Progression',
    displayName: 'Pistol Squat Progression',
    subject: 'man',
    category: 'unilateral',
    slug: 'pistol-squat-progression',
    primaryImage: '/images/unilateral/pistol-squat-progression-1.png',
    targetFrames: 2,
    muscles: 'quadriceps femoris, gluteus maximus, gluteus medius, hamstrings, adductor magnus, abdominal stabilizers',
    avoid: 'full unassisted pistol with no box, two-leg box squat, Bulgarian split squat, TRX straps, knee collapse, cropped box or extended foot',
    frames: [
      {
        index: 2,
        role: 'standing assisted top frame',
        scene: 'standing top position for a box-assisted pistol squat progression with one foot planted in front of a low box, opposite leg extended forward and hovering, arms reaching forward for balance',
      },
    ],
  },
  {
    name: 'Push Press',
    displayName: 'Push Press',
    subject: 'woman',
    category: 'upper-body',
    slug: 'push-press',
    primaryImage: '/images/upper-body/push-press-1.png',
    targetFrames: 2,
    muscles: 'deltoids, triceps brachii, quadriceps femoris, gluteus maximus, abdominal stabilizers',
    avoid: 'strict press with no leg drive, split jerk stance, push jerk catch, deep squat, excessive back arch, cropped barbell',
    frames: [
      {
        index: 2,
        role: 'dip-and-drive start frame',
        scene: 'push press start position with barbell resting at the shoulders in front rack, elbows slightly forward, small controlled knee dip, torso vertical and braced, feet hip-width',
      },
    ],
  },
  {
    name: 'Ring Row',
    displayName: 'Ring Row',
    subject: 'man',
    category: 'upper-body',
    slug: 'ring-row',
    primaryImage: '/images/upper-body/ring-row-1.png',
    targetFrames: 2,
    muscles: 'latissimus dorsi, rhomboids, middle trapezius, posterior deltoid, biceps brachii, abdominal stabilizers',
    avoid: 'barbell inverted row, pull-up, ring dip, TRX handles, bent hips, sagging body, cropped rings or straps',
    frames: [
      {
        index: 2,
        role: 'arm-extended bottom frame',
        scene: 'bottom position of a ring row with arms straight, hands holding gymnastic rings, body straight from shoulders to heels, heels on floor, rings suspended from visible straps',
      },
    ],
  },
]

const BATCHES: Record<string, BatchExercise[]> = {
  '01': BATCH_01,
  '02': BATCH_02,
  '03': BATCH_03,
  '04': BATCH_04,
  '05': BATCH_05,
}

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

function selectedBatchNumber(): string {
  const arg = process.argv.find(value => value.startsWith('--batch='))
  return arg?.slice('--batch='.length).padStart(2, '0') ?? '01'
}

function selectedBatch(): BatchExercise[] {
  const batchNumber = selectedBatchNumber()
  const batch = BATCHES[batchNumber]
  if (!batch) {
    throw new Error(`Unknown batch "${batchNumber}". Available batches: ${Object.keys(BATCHES).join(', ')}`)
  }
  return batch
}

function buildRows(batch: BatchExercise[]) {
  return batch.flatMap(exercise =>
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

function toMarkdown(rows: ReturnType<typeof buildRows>, batchNumber: string) {
  const lines = [
    `# Batch ${batchNumber} Sequence Frame Prompts`,
    '',
    `These prompts generate the remaining sequence frames for production batch ${batchNumber}. They are for Codex built-in image generation unless an explicit API pipeline is chosen later.`,
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

async function verifyBatchScope(batch: BatchExercise[]) {
  const rows = await prisma.exercise.findMany({
    where: {
      coachId: null,
      businessId: null,
      isPublic: true,
      OR: batch.flatMap(exercise => [
        { name: exercise.name },
        { nameSv: exercise.name },
        { nameEn: exercise.name },
      ]),
    },
    select: { name: true },
  })

  if (rows.length !== batch.length) {
    throw new Error(`Expected ${batch.length} global public exercises, found ${rows.length}`)
  }
}

async function main() {
  const shouldWrite = process.argv.includes('--write')
  const batchNumber = selectedBatchNumber()
  const batch = selectedBatch()
  const rows = buildRows(batch)

  await verifyBatchScope(batch)

  if (!shouldWrite) {
    console.log(toMarkdown(rows, batchNumber))
    return
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, `batch-${batchNumber}.json`), `${JSON.stringify(rows, null, 2)}\n`)
  await writeFile(path.join(OUTPUT_DIR, `batch-${batchNumber}.md`), toMarkdown(rows, batchNumber))
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
