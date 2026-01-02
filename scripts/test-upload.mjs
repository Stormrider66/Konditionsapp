import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

config({ path: '.env.local' })

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'exercise-images'

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Parse filename to get slug
function parseFilename(fileName) {
  const match = fileName.match(/^(.+)-(\d+)\.(webp|png|jpg|jpeg)$/i)
  if (!match) return null
  return { slug: match[1].toLowerCase(), index: parseInt(match[2], 10) }
}

// Scan for images
function scanImages(sourceDir) {
  const images = []
  if (!fs.existsSync(sourceDir)) {
    console.log('Source directory not found:', sourceDir)
    return images
  }

  const categories = fs.readdirSync(sourceDir)
  for (const category of categories) {
    const categoryPath = path.join(sourceDir, category)
    if (!fs.statSync(categoryPath).isDirectory()) continue

    const files = fs.readdirSync(categoryPath)
    for (const fileName of files) {
      const parsed = parseFilename(fileName)
      if (!parsed) {
        console.log('  Skipping (invalid format):', fileName)
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

// Manual slug mappings for tricky matches
const SLUG_TO_EXERCISE = {
  'knaboj': 'Knäböj',
  'bankpress': 'Bänkpress',
  'bulgarisk-utfallsboj': 'Bulgarisk utfallsböj',
  'enbenig-rumansk-marklyft': 'Enbenig rumänsk marklyft',
  'hip-thrust-med-skivstang': 'Hip Thrust med skivstång',
  'assault-bike-calories': 'Assault Bike (Kalorier)',
  'row-calories': 'Rodd (Kalorier)',
  'clean-jerk': 'Clean & Jerk',
  'handstand-push-up': 'Handstand Push-Up',
  'muscle-up-bar': 'Muscle-Up (Bar)',
  'muscle-up-ring': 'Muscle-Up (Ring)',
  'dumbbell-snatch-fem': 'DB Snatch',
  'l-sit': 'L-Sit',
  'pull-up': 'Pull-Up',
  'push-up': 'Push-Up',
  'farmers-carry': 'Farmers Walk',
  'step-up': 'Step-Up',
  'tahavningar-bojda-ben': 'Tåhävningar (böjda ben)',
  'tahavningar-raka-ben': 'Tåhävningar (raka ben)',
  'bred-hopp-max': 'Bred hopp (max)',
  // Additional mappings for new images
  'farmers-carry-hyrox': 'Farmers Carry (HYROX)',
  'ghd-sit-up': 'GHD Sit-Up',
  'bike-calories': 'Cykel (Kalorier)',
  'cable-pull-through': 'Cable Pull-Through',
  'turkish-get-up': 'Turkish Get-Up',
  'step-ups-med-knadrive': 'Step-Ups med Knädrive',
  'burpee-pull-up': 'Burpee Pull-Up',
  'butterfly-pull-up': 'Butterfly Pull-Up',
  'chest-to-bar-pull-up': 'Chest-to-Bar Pull-Up',
}

async function findExercise(slug) {
  // Check manual mapping first
  const mappedName = SLUG_TO_EXERCISE[slug]
  if (mappedName) {
    const exercise = await prisma.exercise.findFirst({
      where: {
        OR: [
          { name: { equals: mappedName, mode: 'insensitive' } },
          { nameSv: { equals: mappedName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, nameSv: true },
    })
    if (exercise) return exercise
  }

  // Try slug with spaces
  let exercise = await prisma.exercise.findFirst({
    where: {
      OR: [
        { name: { contains: slug.replace(/-/g, ' '), mode: 'insensitive' } },
        { nameSv: { contains: slug.replace(/-/g, ' '), mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, nameSv: true },
  })

  if (exercise) return exercise

  // Try with the slug directly
  exercise = await prisma.exercise.findFirst({
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

async function uploadImage(filePath, storagePath) {
  const fileBuffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const contentType = ext === '.webp' ? 'image/webp' :
                      ext === '.png' ? 'image/png' : 'image/jpeg'

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: true })

  if (error) {
    console.log('  Upload error:', error.message)
    return false
  }
  return true
}

async function main() {
  const args = process.argv.slice(2)
  const sourceIndex = args.indexOf('--source')
  const dryRun = args.includes('--dry-run')

  if (sourceIndex === -1 || !args[sourceIndex + 1]) {
    console.log('Usage: node scripts/test-upload.mjs --source ./public/images [--dry-run]')
    process.exit(1)
  }

  const sourceDir = args[sourceIndex + 1]

  console.log('\n=== Exercise Image Upload ===\n')
  console.log('Source:', sourceDir)
  console.log('Mode:', dryRun ? 'DRY RUN' : 'LIVE UPLOAD')
  console.log('')

  // Scan images
  console.log('Scanning for images...')
  const images = scanImages(sourceDir)
  console.log(`Found ${images.length} images\n`)

  if (images.length === 0) return

  // Group by slug
  const bySlug = new Map()
  for (const img of images) {
    const existing = bySlug.get(img.slug) || []
    existing.push(img)
    bySlug.set(img.slug, existing)
  }

  console.log(`Grouped into ${bySlug.size} unique exercises\n`)
  console.log('Matching to database...\n')

  const matches = new Map()
  const unmatched = []

  for (const [slug, imgFiles] of bySlug) {
    const exercise = await findExercise(slug)

    if (!exercise) {
      unmatched.push(slug)
      console.log(`[NOT FOUND] ${slug}`)
      continue
    }

    console.log(`[MATCHED] ${slug} -> ${exercise.nameSv || exercise.name}`)
    matches.set(exercise.id, {
      exercise,
      images: imgFiles.sort((a, b) => a.index - b.index),
    })
  }

  console.log(`\n=== Summary ===`)
  console.log(`Matched: ${matches.size} exercises`)
  console.log(`Unmatched: ${unmatched.length} slugs`)

  if (unmatched.length > 0) {
    console.log(`\nUnmatched: ${unmatched.join(', ')}`)
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made.')
    return
  }

  // Upload
  console.log('\n=== Uploading ===\n')

  let uploaded = 0
  let errors = 0

  for (const [exerciseId, data] of matches) {
    const { exercise, images: imgFiles } = data
    console.log(`Processing: ${exercise.nameSv || exercise.name}`)

    const uploadedPaths = []

    for (const img of imgFiles) {
      const storagePath = `system/${img.category}/${img.fileName}`
      console.log(`  Uploading: ${img.fileName}`)

      const success = await uploadImage(img.filePath, storagePath)
      if (success) {
        uploadedPaths.push(storagePath)
        uploaded++
      } else {
        errors++
      }
    }

    // Update database
    if (uploadedPaths.length > 0) {
      await prisma.exercise.update({
        where: { id: exerciseId },
        data: { imageUrls: uploadedPaths, primaryImageIndex: 0 },
      })
      console.log(`  Updated DB: ${uploadedPaths.length} images`)
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Uploaded: ${uploaded}`)
  console.log(`Errors: ${errors}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
