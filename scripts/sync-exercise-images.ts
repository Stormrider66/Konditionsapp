// scripts/sync-exercise-images.ts
// Syncs exercise images from public/images to database
// Run with: npx ts-node scripts/sync-exercise-images.ts

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Directory containing exercise images
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images')

// Helper: Convert Swedish characters to ASCII for file matching
function normalizeForFile(name: string): string {
  return name
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/'/g, '')
    .replace(/&/g, '-')
    .replace(/--+/g, '-')
    .replace(/-$/, '')
    .replace(/^-/, '')
}

// Prisma stores imageUrls as Json?; make sure we only treat it as string[] when it's actually an array.
function coerceStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  // Filter out non-strings (defensive against bad legacy data)
  return value.filter((v): v is string => typeof v === 'string')
}

function isSameStringArray(a: string[] | null, b: string[]): boolean {
  if (!a) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function addUsedImageNames(used: Set<string>, imageUrls: string[]) {
  for (const img of imageUrls) {
    const name = img.replace(/.*\//, '').replace(/-\d+\.png$/, '')
    used.add(name)
  }
}

// Get all image files from the images directory
function getAllImages(): { path: string; name: string; category: string }[] {
  const images: { path: string; name: string; category: string }[] = []

  const categories = fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const category of categories) {
    const categoryPath = path.join(IMAGES_DIR, category)
    const files = fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.png'))

    for (const file of files) {
      images.push({
        path: `/images/${category}/${file}`,
        name: file.replace(/-\d+\.png$/, ''), // Remove -1.png, -2.png suffix
        category
      })
    }
  }

  return images
}

// Explicit mapping for exercises with non-standard file names
const EXPLICIT_MAPPINGS: Record<string, string[]> = {
  // Swedish name -> file name patterns
  'Höftbrygga': ['hoftbrygga'],
  'Enbensbrygga': ['enbensbrygga'],
  'Hip Thrust med skivstång': ['hip-thrust-med-skivstang'],
  'Rumänsk marklyft': ['romanian-deadlift'],
  'Enbenig rumänsk marklyft': ['enbenig-rumansk-marklyft'],
  'Good Mornings': ['good-morning'],
  'Knäböj': ['knaboj'],
  'Bänkpress': ['bankpress'],
  'Armhävningar': ['armhavningar', 'push-up'],
  'Tåhävningar (raka ben)': ['tahavningar-raka-ben'],
  'Tåhävningar (böjda ben)': ['tahavningar-bojda-ben'],
  'Enbenig tåhävning': ['enbenig-tahavning'],
  'Farmer\'s Walk': ['farmers-carry'],
  'Farmer\'s Carry (HYROX)': ['farmers-carry-hyrox'],
  'Hopprep': ['hopprep', 'jump-rope'],
  'Låga lådhopp': ['laga-ladhopp', 'low-box-jumps'],
  'Lådhopp (18-24")': ['ladhopp-18-24', 'box-jump'],
  'Lådhopp': ['box-jump'],
  'Bred hopp (max)': ['bred-hopp-max'],
  'Bulgarisk utfallsböj': ['bulgarisk-utfallsboj'],
  'Utfallssteg': ['utfallssteg', 'lunge'],
  'Bakåtlunges': ['bakatlunges', 'reverse-lunge', 'lunge'],
  'Step-Ups (låg)': ['step-up'],
  'Step-Ups (hög)': ['step-ups-hog'],
  'Step-Ups med knädrive': ['step-ups-med-knadrive'],
  'Enbenig benpress': ['enbenig-benpress'],
  'Enbenhopp (Bounds)': ['enbenhopp-bounds', 'single-leg-bounds'],
  'Höftcirklar': ['hoftcirklar'],
  'Världens bästa stretch': ['varldens-basta-stretch'],
  'Katt-Ko': ['katt-ko'],
  'Ankelrörlighet': ['ankelrorlighet'],
  'Sumo Squats': ['sumo-squats'],
  'Wall Angels': ['wall-angels'],
  'Prone Y-raise': ['prone-y-raise'],
  'Frivändning': ['clean'],
  'Hängande Frivändning': ['hang-clean'],
  'Hängande Ryck': ['hang-snatch'],
  'Power Frivändning': ['power-clean'],
  'Power Ryck': ['power-snatch'],
  'Ryck': ['snatch'],
  'Stöt': ['clean-jerk'],
  'Hantel Ryck': ['dumbbell-snatch-fem'],
  'Slädragning': ['sled-pull'],
  'Slädtryckning': ['sled-push'],
  'Sled Push (HYROX)': ['sled-push-hyrox'],
  'Rodd (Kalorier)': ['row-calories'],
  'Rodd': ['rodd', 'bent-over-row'],
  'Row (Meters)': ['row-meters'],
  'Rowing (HYROX)': ['rowing-hyrox'],
  'SkiErg': ['skierg'],
  'Bike (Calories)': ['bike-calories'],
  'Bike (Meters)': ['bike-meters'],
  'Assault Bike (Kalorier)': ['assault-bike-calories'],
  'Muscle-Up (Stång)': ['muscle-up-bar'],
  'Muscle-Up (Ringar)': ['muscle-up-ring'],
  'Handstående Armhävning': ['handstand-push-up'],
  'Strict Handstand Push-Up': ['strict-handstand-push-up'],
  'Handstand Walk': ['handstand-walk'],
  'Ring Dip': ['ring-dip'],
  'Ring Row': ['ring-row'],
  'Box Dips': ['box-dip'],
  'Bar Dip': ['bar-dip'],
  'Chest-to-Bar Pull-Up': ['chest-to-bar-pull-up'],
  'Butterfly Pull-Up': ['butterfly-pull-up'],
  'Kipping Pull-Up': ['kipping-pull-up'],
  'Burpee Pull-Up': ['burpee-pull-up'],
  'Devil Press': ['devil-press'],
  'DB Push Press': ['db-push-press'],
  'DB Row': ['db-row'],
  'DB Strict Press': ['db-strict-press'],
  'DB Clean': ['db-clean'],
  'DB Deadlift': ['db-deadlift'],
  'DB Thruster': ['db-thruster'],
  'DB Box Step-Over': ['db-box-step-over'],
  'KB Clean': ['kb-clean'],
  'KB Snatch': ['kb-snatch'],
  'KB Thruster': ['kb-thruster'],
  'KB Windmill': ['kb-windmill'],
  'American Kettlebell Swing': ['american-kettlebell-swing'],
  'Sandbag Clean': ['sandbag-clean'],
  'Sandbag Lunges (HYROX)': ['sandbag-lunges-hyrox'],
  'Sandbag Carry': ['sandbag-carry'],
  'Sandbag Over Shoulder': ['sandbag-over-shoulder'],
  'Wall Ball': ['wall-ball'],
  'Wall Balls (HYROX)': ['wall-balls-hyrox'],
  'Med Ball Clean': ['med-ball-clean'],
  'Thruster': ['thruster'],
  'Cluster': ['cluster'],
  'Push Jerk': ['push-jerk'],
  'Split Jerk': ['split-jerk'],
  'Hang Power Clean': ['hang-power-clean'],
  'Hang Power Snatch': ['hang-power-snatch'],
  'Squat Clean': ['squat-clean'],
  'Squat Snatch': ['squat-snatch'],
  'Sumo Deadlift': ['sumo-deadlift'],
  'Sumo Deadlift High Pull': ['sumo-deadlift-high-pull'],
  'Pendlay Row': ['pendlay-row'],
  'Man Maker': ['man-maker'],
  'Toes-to-Bar': ['toes-to-bar'],
  'Knees-to-Elbow': ['knees-to-elbow'],
  'Hanging Knee Raise': ['hanging-knee-raise'],
  'GHD Sit-Up': ['ghd-sit-up'],
  'Back Extension': ['back-extension'],
  'Hip Extension': ['hip-extension'],
  'Yoke Carry': ['yoke-carry'],
  'Rope Climb': ['rope-climb'],
  'Legless Rope Climb': ['legless-rope-climb'],
  'Air Squat': ['air-squat'],
  'Overhead Squat': ['overhead-squat'],
  'Overhead Lunge': ['overhead-lunge'],
  'Bar Facing Burpee': ['bar-facing-burpee'],
  'Burpee Broad Jump': ['burpee-broad-jump'],
  'Burpee Box Jump Over': ['burpee-box-jump-over'],
  'Depth to Broad Jump': ['depth-to-broad-jump'],
  'Running': ['running'],
  'Swimming': ['swimming'],
  'Double Under': ['double-under'],
  'Single Under': ['single-under'],
  'Box Pistol': ['box-pistol'],
  'Pistol Squat Progression': ['pistol-squat-progression'],
  'Skipping': ['skipping'],
  'L-Sit': ['l-sit'],
  'V-ups': ['v-up'],
  'Sit-ups': ['sit-up'],
  'Crunches': ['crunches'],
  'Plank': ['plank'],
  'Sidplank': ['sidplank'],
  'Copenhagen Plank': ['copenhagen-plank'],
  'Russian Twist': ['russian-twist'],
  'Ab Wheel Rollouts': ['ab-wheel-rollouts'],
  'Stir the Pot': ['stir-the-pot'],
  'Dead Bug': ['dead-bug'],
  'Bird Dog': ['bird-dog'],
  'Pallof Press': ['pallof-press'],
  'Pallof Press (band)': ['pallof-press-band'],
  'Suitcase Carry': ['suitcase-carry'],
  'Mountain Climbers': ['mountain-climber'],
  'Bicycle Crunches': ['bicycle-crunches'],
  'Leg Raises': ['leg-raises'],
  'Hollow Hold': ['hollow-hold'],
  'Inchworm': ['inchworm'],
  'High Knees': ['high-knees'],
  'Butt Kicks': ['butt-kicks'],
  'Jumping Jacks': ['jumping-jacks'],
  'Burpees': ['burpee'],
  'Run': ['running'],
  'Swim': ['swimming'],
  'Ski Erg (Calories)': ['skierg'],
  'Ski Erg (Meters)': ['skierg'],
  'DB Squat': ['db-squat'],
  'Pike Push-Up': ['pike-push-up'],
  'Push Press': ['push-press'],
  'Sled Pull (HYROX)': ['sled-pull'],
  'Strict Press': ['db-strict-press', 'axelpress'],
  'Strict Ring Dip': ['strict-ring-dip'],
  'Triple Under': ['triple-under'],
  'Wall Walk': ['wall-walk'],
  'Squat Jumps': ['squat-jumps'],
  'Countermovement Jumps': ['countermovement-jumps'],
  'Lateral Bounds': ['lateral-bounds'],
  'Tuck Jumps': ['tuck-jumps'],
  'Split Jumps': ['split-jumps'],
  'Hurdle Hops': ['hurdle-hops'],
  'Triple Jump': ['triple-jump'],
  'Depth Jumps (30cm)': ['depth-jumps-30cm'],
  'Depth Jumps (40cm)': ['depth-jumps-40cm'],
  'Drop Jumps': ['drop-jumps'],
  'Repeated Bounds': ['repeated-bounds'],
  'Chins': ['chins', 'pull-up'],
  'Dips': ['dips', 'bar-dip'],
  'Inverterad rodd': ['inverterad-rodd'],
  'Face Pulls': ['face-pulls'],
  'Latsdrag': ['latsdrag'],
  'Axelpress': ['axelpress'],
  'Bensving': ['bensving'],
  'Glute Kickbacks': ['glute-kickbacks'],
  'Superman': ['superman'],
  'Nordic Hamstring': ['nordic-hamstring'],
  'Foam Rolling': ['foam-rolling'],
  'Reverse Hyperextension': ['reverse-hyperextension'],
  'Fire Hydrants': ['fire-hydrants'],
  'Hip hikes': ['hip-hikes'],
  'Clamshells med band': ['clamshells-med-band'],
  'Cable Pull-Through': ['cable-pull-through'],
  'Kettlebell Swing': ['kettlebell-swing'],
  'Marklyft': ['marklyft'],
  'Goblet Squat': ['goblet-squat'],
  'Front Squat': ['front-squat'],
  'Split Squat': ['split-squat'],
  'Benpress': ['benpress'],
  'Cyclist Squat': ['cyclist-squat'],
  'Hoppsquat': ['hoppsquat'],
  'Lateral Lunges': ['lateral-lunges'],
  'Curtsy Lunges': ['curtsy-lunges'],
  'Skater Squats': ['skater-squats'],
  'Ankelhopp': ['ankelhopp', 'ankle-hops'],
  'Toe Yoga': ['toe-yoga'],
  'Marmor-pickups': ['marmor-pickups', 'marble-pickups'],
  'Ankel dorsalflexion (band)': ['ankel-dorsalflexion-band'],
  'Hälgång': ['halgang'],
  'Pogo Jumps': ['pogo-jumps'],
  'Lateral Hops': ['lateral-hops'],
  'Wall Sit': ['wall-sit'],
  'Pistol Squat': ['pistol-squat'],
  'Box Jump Over': ['box-jump-over'],
  'Turkish Get-Up': ['turkish-get-up'],
  'Hip Bridge': ['hoftbrygga', 'hip-bridge'],
  'Single-Leg Bridge': ['enbensbrygga', 'single-leg-bridge'],
}

// Find images for an exercise
function findImagesForExercise(
  exercise: { name: string; nameSv?: string | null; nameEn?: string | null },
  allImages: { path: string; name: string; category: string }[]
): string[] {
  const matchingImages: string[] = []

  // Try explicit mappings first
  const explicitPatterns = EXPLICIT_MAPPINGS[exercise.name] ||
                           (exercise.nameSv && EXPLICIT_MAPPINGS[exercise.nameSv]) ||
                           (exercise.nameEn && EXPLICIT_MAPPINGS[exercise.nameEn])

  if (explicitPatterns) {
    for (const pattern of explicitPatterns) {
      const matches = allImages.filter(img => img.name === pattern)
      for (const match of matches) {
        if (!matchingImages.includes(match.path)) {
          matchingImages.push(match.path)
        }
      }
    }
  }

  // If we found images via explicit mapping, return them
  if (matchingImages.length > 0) {
    return matchingImages.sort()
  }

  // Try normalized name matching
  const normalizedName = normalizeForFile(exercise.name)
  const normalizedNameSv = exercise.nameSv ? normalizeForFile(exercise.nameSv) : null
  const normalizedNameEn = exercise.nameEn ? normalizeForFile(exercise.nameEn) : null

  for (const img of allImages) {
    if (img.name === normalizedName ||
        img.name === normalizedNameSv ||
        img.name === normalizedNameEn) {
      if (!matchingImages.includes(img.path)) {
        matchingImages.push(img.path)
      }
    }
  }

  return matchingImages.sort()
}

async function main() {
  console.log('🖼️  Exercise Image Sync Script\n')
  console.log('=' .repeat(60))

  // Get all images
  const allImages = getAllImages()
  console.log(`📁 Found ${allImages.length} images in public/images/\n`)

  // Group images by category for summary
  const imagesByCategory: Record<string, number> = {}
  for (const img of allImages) {
    imagesByCategory[img.category] = (imagesByCategory[img.category] || 0) + 1
  }
  console.log('📊 Images by category:')
  Object.entries(imagesByCategory).sort().forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`)
  })
  console.log()

  // Get all exercises from database
  const exercises = await prisma.exercise.findMany({
    where: { coachId: null }, // System exercises only
    orderBy: { name: 'asc' }
  })
  console.log(`🏋️  Found ${exercises.length} system exercises in database\n`)

  let updated = 0
  let skipped = 0
  let noImage = 0
  const unmatchedExercises: string[] = []
  const usedImageNames = new Set<string>()

  for (const exercise of exercises) {
    const images = findImagesForExercise(exercise, allImages)
    const currentImagesRaw = coerceStringArray(exercise.imageUrls)

    // Bug 2 fix: unused-image detection must include images from *all* exercises,
    // including those skipped in this run (already up-to-date) and even those
    // where our matching found nothing but the DB still has images.
    addUsedImageNames(usedImageNames, images.length > 0 ? images : (currentImagesRaw || []))

    if (images.length === 0) {
      unmatchedExercises.push(exercise.name)
      noImage++
      continue
    }

    // Check if update is needed
    // Bug 1 fix: imageUrls is Json?; don't assume it's string[].
    const currentSorted = currentImagesRaw ? [...currentImagesRaw].sort() : null
    const desiredSorted = [...images].sort()
    const needsUpdate = !isSameStringArray(currentSorted, desiredSorted)

    if (needsUpdate) {
      await prisma.exercise.update({
        where: { id: exercise.id },
        data: {
          imageUrls: desiredSorted,
          primaryImageIndex: 0
        }
      })
      console.log(`✅ Updated: ${exercise.name} (${images.length} image${images.length > 1 ? 's' : ''})`)
      updated++
    } else {
      skipped++
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log('📊 Sync Summary')
  console.log('=' .repeat(60))
  console.log(`✅ Updated: ${updated} exercises`)
  console.log(`⏭️  Skipped: ${skipped} exercises (already up-to-date)`)
  console.log(`❌ No image: ${noImage} exercises`)

  if (unmatchedExercises.length > 0 && unmatchedExercises.length <= 20) {
    console.log('\n⚠️  Exercises without images:')
    unmatchedExercises.forEach(name => console.log(`   - ${name}`))
  } else if (unmatchedExercises.length > 20) {
    console.log(`\n⚠️  ${unmatchedExercises.length} exercises without images (showing first 20):`)
    unmatchedExercises.slice(0, 20).forEach(name => console.log(`   - ${name}`))
  }

  // Show unused images (based on all exercises with images, not just updated ones)
  const unusedImages = allImages.filter(img => !usedImageNames.has(img.name))
  if (unusedImages.length > 0) {
    console.log(`\n📷 ${unusedImages.length} unused images in public/images/:`)
    const uniqueUnused = [...new Set(unusedImages.map(img => img.name))].sort()
    uniqueUnused.slice(0, 10).forEach(name => console.log(`   - ${name}`))
    if (uniqueUnused.length > 10) {
      console.log(`   ... and ${uniqueUnused.length - 10} more`)
    }
  }

  console.log('\n✨ Image sync complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error syncing images:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })