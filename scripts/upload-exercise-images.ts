/**
 * Batch Upload Script for Exercise Images
 *
 * This script:
 * 1. Reads images from a local folder (organized by biomechanical pillar)
 * 2. Parses filename to match exercise: {exercise-slug}-{index}.webp
 * 3. Uploads to Supabase 'exercise-images' bucket
 * 4. Updates Exercise records with image paths
 *
 * Naming convention:
 * - hofbrygga-1.webp -> matches "Höftbrygga"
 * - squat-1.webp, squat-2.webp -> matches "Squat" with 2 images
 *
 * Folder structure expected:
 * /images/
 *   /posterior-chain/
 *     hofbrygga-1.webp
 *     rdl-1.webp
 *   /knee-dominance/
 *     squat-1.webp
 *     squat-2.webp
 *   /etc...
 *
 * Usage:
 *   npx ts-node scripts/upload-exercise-images.ts --source ./images --dry-run
 *   npx ts-node scripts/upload-exercise-images.ts --source ./images
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET = 'exercise-images'

// Slug to exercise name mapping for Swedish characters
const SLUG_MAPPINGS: Record<string, string[]> = {
  'hofbrygga': ['Höftbrygga', 'Hip Bridge', 'Glute Bridge'],
  'balansbrada': ['Balansbräda', 'Balance Board'],
  'bankpress': ['Bänkpress', 'Bench Press'],
  'knalyft': ['Knälyft', 'Knee Raise'],
  'axelpress': ['Axelpress', 'Shoulder Press', 'Strict Press'],
  'halsittup': ['Hälsit-up', 'Heel Sit-up'],
  'hopprep': ['Hopprep', 'Jump Rope'],
  'radrodd': ['Rådrodd', 'Barbell Row'],
  'hantelrodd': ['Hantelrodd', 'Dumbbell Row'],
  'marklyft': ['Marklyft', 'Deadlift'],
  'frontsquat': ['Front Squat', 'Frontsquat'],
  'backsquat': ['Back Squat', 'Backsquat', 'Knäböj'],
  'squat': ['Squat', 'Knäböj'],
  'pullup': ['Pull-Up', 'Pull Up', 'Pullup', 'Chins'],
  'pushup': ['Push-Up', 'Push Up', 'Pushup', 'Armhävningar'],
  'planka': ['Planka', 'Plank'],
  'utfall': ['Utfall', 'Lunge'],
  'bulgarian': ['Bulgarian Split Squat', 'Bulgarskt utfall'],
  'steghop': ['Steghopp', 'Step Hop'],
  'boxhopp': ['Boxhopp', 'Box Jump'],
  'sidoplanaka': ['Sidoplanka', 'Side Plank'],
  'deadbug': ['Dead Bug', 'Deadbug'],
  'pallofpress': ['Pallof Press'],
  'vadpress': ['Vadpress', 'Calf Raise', 'Tåhävning'],
  'nordic': ['Nordic Curl', 'Nordic Hamstring'],
  'rdl': ['RDL', 'Romanian Deadlift', 'Rumänsk marklyft'],
  'goodmorning': ['Good Morning'],
  'hyperextension': ['Hyperextension', 'Ryggresning'],
  'stepup': ['Step-Up', 'Step Up', 'Stepup'],
  'pistol': ['Pistol Squat', 'Pistols'],
  'laterallunge': ['Lateral Lunge', 'Sidoutfall'],
  'reverseutfall': ['Reverse Lunge', 'Bakåtutfall'],
  'goblet': ['Goblet Squat'],
  'legpress': ['Leg Press', 'Benpress'],
  'legcurl': ['Leg Curl', 'Bencurl'],
  'legextension': ['Leg Extension', 'Bensträck'],
}

interface ImageFile {
  filePath: string
  fileName: string
  slug: string
  index: number
  category: string
}

interface MatchResult {
  exerciseId: string
  exerciseName: string
  nameSv: string | null
  storagePath: string
  imageIndex: number
}

/**
 * Parse filename to extract slug and index
 * e.g., "squat-1.webp" -> { slug: "squat", index: 1 }
 */
function parseFilename(fileName: string): { slug: string; index: number } | null {
  const match = fileName.match(/^(.+)-(\d+)\.(webp|png|jpg|jpeg)$/i)
  if (!match) return null
  return {
    slug: match[1].toLowerCase(),
    index: parseInt(match[2], 10),
  }
}

/**
 * Scan source directory for image files
 */
function scanImageDirectory(sourceDir: string): ImageFile[] {
  const images: ImageFile[] = []

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`)
    return images
  }

  // Scan category subdirectories
  const categories = fs.readdirSync(sourceDir)

  for (const category of categories) {
    const categoryPath = path.join(sourceDir, category)
    if (!fs.statSync(categoryPath).isDirectory()) continue

    const files = fs.readdirSync(categoryPath)

    for (const fileName of files) {
      const parsed = parseFilename(fileName)
      if (!parsed) {
        console.log(`  Skipping: ${fileName} (invalid format)`)
        continue
      }

      images.push({
        filePath: path.join(categoryPath, fileName),
        fileName,
        slug: parsed.slug,
        index: parsed.index,
        category,
      })
    }
  }

  return images
}

/**
 * Find matching exercise for a slug
 */
async function findExerciseForSlug(slug: string): Promise<{ id: string; name: string; nameSv: string | null } | null> {
  // First, check our slug mappings
  const possibleNames = SLUG_MAPPINGS[slug] || [slug]

  // Search in database
  for (const name of possibleNames) {
    const exercise = await prisma.exercise.findFirst({
      where: {
        OR: [
          { name: { contains: name, mode: 'insensitive' } },
          { nameSv: { contains: name, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, nameSv: true },
    })

    if (exercise) {
      return exercise
    }
  }

  // Try fuzzy match - slug might be a substring
  const exercise = await prisma.exercise.findFirst({
    where: {
      OR: [
        { name: { contains: slug, mode: 'insensitive' } },
        { nameSv: { contains: slug, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, nameSv: true },
  })

  return exercise
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImage(filePath: string, storagePath: string): Promise<boolean> {
  const fileBuffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()

  const contentType = ext === '.webp' ? 'image/webp' :
                      ext === '.png' ? 'image/png' :
                      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      'application/octet-stream'

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.error(`  Upload error: ${error.message}`)
    return false
  }

  return true
}

/**
 * Update exercise record with image paths
 */
async function updateExerciseImages(exerciseId: string, imagePaths: string[]): Promise<void> {
  await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      imageUrls: imagePaths,
      primaryImageIndex: 0,
    },
  })
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const sourceIndex = args.indexOf('--source')
  const dryRun = args.includes('--dry-run')

  if (sourceIndex === -1 || !args[sourceIndex + 1]) {
    console.log('Usage: npx ts-node scripts/upload-exercise-images.ts --source ./images [--dry-run]')
    console.log('')
    console.log('Options:')
    console.log('  --source <dir>  Source directory containing category subfolders')
    console.log('  --dry-run       Preview changes without uploading')
    process.exit(1)
  }

  const sourceDir = args[sourceIndex + 1]

  console.log(`\n=== Exercise Image Upload Script ===\n`)
  console.log(`Source: ${sourceDir}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will upload)'}`)
  console.log('')

  // Scan for images
  console.log('Scanning for images...')
  const images = scanImageDirectory(sourceDir)
  console.log(`Found ${images.length} images\n`)

  if (images.length === 0) {
    console.log('No valid images found. Exiting.')
    return
  }

  // Group images by slug
  const imagesBySlug = new Map<string, ImageFile[]>()
  for (const img of images) {
    const existing = imagesBySlug.get(img.slug) || []
    existing.push(img)
    imagesBySlug.set(img.slug, existing)
  }

  console.log(`Grouped into ${imagesBySlug.size} unique exercises\n`)

  // Match slugs to exercises
  const matches: Map<string, MatchResult[]> = new Map()
  const unmatched: string[] = []

  console.log('Matching to database exercises...')

  for (const [slug, imgFiles] of imagesBySlug) {
    const exercise = await findExerciseForSlug(slug)

    if (!exercise) {
      unmatched.push(slug)
      console.log(`  [NOT FOUND] ${slug}`)
      continue
    }

    console.log(`  [MATCHED] ${slug} -> ${exercise.nameSv || exercise.name}`)

    const results: MatchResult[] = imgFiles
      .sort((a, b) => a.index - b.index)
      .map((img) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        nameSv: exercise.nameSv,
        storagePath: `system/${img.category}/${img.fileName}`,
        imageIndex: img.index,
      }))

    matches.set(exercise.id, results)
  }

  console.log(`\n=== Summary ===`)
  console.log(`Matched: ${matches.size} exercises`)
  console.log(`Unmatched: ${unmatched.length} slugs`)

  if (unmatched.length > 0) {
    console.log(`\nUnmatched slugs: ${unmatched.join(', ')}`)
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made.')
    console.log('\nTo upload, run without --dry-run flag.')
    return
  }

  // Upload and update
  console.log('\n=== Uploading ===\n')

  let uploadedCount = 0
  let errorCount = 0

  for (const [exerciseId, results] of matches) {
    const exerciseName = results[0].nameSv || results[0].exerciseName
    console.log(`Processing: ${exerciseName}`)

    const uploadedPaths: string[] = []

    for (const result of results) {
      // Find the original image file
      const img = images.find(
        (i) => i.slug === result.storagePath.split('/').pop()?.split('-')[0]?.toLowerCase() &&
               i.index === result.imageIndex
      ) || images.find(i => `system/${i.category}/${i.fileName}` === result.storagePath)

      if (!img) {
        console.log(`  [ERROR] Could not find source file for ${result.storagePath}`)
        errorCount++
        continue
      }

      console.log(`  Uploading: ${img.fileName} -> ${result.storagePath}`)

      const success = await uploadImage(img.filePath, result.storagePath)

      if (success) {
        uploadedPaths.push(result.storagePath)
        uploadedCount++
      } else {
        errorCount++
      }
    }

    // Update exercise record
    if (uploadedPaths.length > 0) {
      await updateExerciseImages(exerciseId, uploadedPaths)
      console.log(`  Updated database: ${uploadedPaths.length} images`)
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Uploaded: ${uploadedCount} images`)
  console.log(`Errors: ${errorCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
