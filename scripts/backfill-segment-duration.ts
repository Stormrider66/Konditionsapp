/**
 * Backfill duration on WorkoutSegments
 *
 * This script fixes segments that were created before the HYROX generator
 * was updated to properly set duration on all segment types.
 *
 * It calculates duration from:
 * 1. distance + pace (for running segments)
 * 2. description text parsing (for rest segments like "Vila 2 min")
 *
 * Run with: npx tsx scripts/backfill-segment-duration.ts
 * Dry run:  npx tsx scripts/backfill-segment-duration.ts --dry-run
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const isDryRun = process.argv.includes('--dry-run')

/**
 * Parse pace string to seconds per km
 * Handles formats: "393" (seconds), "6:33" (min:sec), "6:33/km"
 */
function parsePaceToSeconds(pace: string): number | null {
  if (!pace) return null

  // Remove "/km" suffix if present
  const cleanPace = pace.replace(/\/km$/i, '').trim()

  // Check if it's already in seconds (just a number)
  if (/^\d+$/.test(cleanPace)) {
    return parseInt(cleanPace, 10)
  }

  // Parse MM:SS format
  if (cleanPace.includes(':')) {
    const [min, sec] = cleanPace.split(':').map(Number)
    if (!isNaN(min) && !isNaN(sec)) {
      return min * 60 + sec
    }
  }

  return null
}

/**
 * Parse duration from description text
 * Handles formats: "Vila 2 min", "(10 min)", "90 sek vila", etc.
 */
function parseDurationFromDescription(description: string | null): number | null {
  if (!description) return null

  // Match patterns like "2 min", "(10 min)", "5 minuter"
  const minMatch = description.match(/(\d+)\s*min/i)
  if (minMatch) {
    return parseInt(minMatch[1], 10)
  }

  // Match patterns like "90 sek", "120 sekunder"
  const sekMatch = description.match(/(\d+)\s*sek/i)
  if (sekMatch) {
    const seconds = parseInt(sekMatch[1], 10)
    return Math.round(seconds / 60) || 1 // At least 1 minute
  }

  return null
}

/**
 * Parse pace from description text
 * Handles formats: "@ 3:52/km", "@ 6:33/km", etc.
 */
function parsePaceFromDescription(description: string | null): number | null {
  if (!description) return null

  // Match patterns like "@ 3:52/km", "@ 6:33/km", "@ 5:00"
  const paceMatch = description.match(/@\s*(\d+):(\d+)(?:\/km)?/i)
  if (paceMatch) {
    const min = parseInt(paceMatch[1], 10)
    const sec = parseInt(paceMatch[2], 10)
    return min * 60 + sec
  }

  return null
}

/**
 * Parse distance from description text
 * Handles formats: "1km", "16.4 km", "100m", etc.
 */
function parseDistanceFromDescription(description: string | null): number | null {
  if (!description) return null

  // Match patterns like "1km", "16.4 km", "5.9 km"
  const kmMatch = description.match(/(\d+(?:\.\d+)?)\s*km/i)
  if (kmMatch) {
    return parseFloat(kmMatch[1])
  }

  // Match patterns like "100m", "400m" (convert to km)
  const mMatch = description.match(/(\d+)\s*m(?!\w)/i)
  if (mMatch) {
    return parseInt(mMatch[1], 10) / 1000
  }

  return null
}

/**
 * Calculate duration from distance and pace
 */
function calculateDurationFromDistanceAndPace(
  distance: number | null,
  pace: string | null
): number | null {
  if (!distance || !pace) return null

  const paceSeconds = parsePaceToSeconds(pace)
  if (!paceSeconds || paceSeconds <= 0) return null

  // duration (min) = distance (km) * pace (sec/km) / 60
  const durationMinutes = (distance * paceSeconds) / 60
  return Math.round(durationMinutes)
}

async function backfillSegmentDurations() {
  console.log('=== Backfilling WorkoutSegment Durations ===')
  console.log(isDryRun ? '(DRY RUN - no changes will be made)\n' : '\n')

  // Find all segments without duration
  const segmentsWithoutDuration = await prisma.workoutSegment.findMany({
    where: {
      duration: null,
    },
    select: {
      id: true,
      type: true,
      duration: true,
      distance: true,
      pace: true,
      description: true,
      workout: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  console.log(`Found ${segmentsWithoutDuration.length} segments without duration\n`)

  let updatedFromDistancePace = 0
  let updatedFromDescription = 0
  let skipped = 0

  for (const segment of segmentsWithoutDuration) {
    let calculatedDuration: number | null = null
    let source = ''

    // Get distance - use stored value or parse from description
    let distance = segment.distance
    if (!distance || distance === 0) {
      distance = parseDistanceFromDescription(segment.description)
    }

    // Get pace - use stored value or parse from description
    // Note: pace stored as "0" means it wasn't set properly
    let paceSeconds: number | null = null
    if (segment.pace && segment.pace !== '0' && segment.pace !== '0.0') {
      paceSeconds = parsePaceToSeconds(segment.pace)
    }
    if (!paceSeconds || paceSeconds <= 0) {
      paceSeconds = parsePaceFromDescription(segment.description)
    }

    // First, try to calculate from distance and pace
    if (distance && distance > 0 && paceSeconds && paceSeconds > 0) {
      calculatedDuration = calculateDurationFromDistanceAndPace(distance, paceSeconds.toString())
      if (calculatedDuration) {
        source = `distance(${distance}km)+pace(${Math.floor(paceSeconds/60)}:${(paceSeconds%60).toString().padStart(2,'0')}/km)`
      }
    }

    // If still no duration, try to parse duration directly from description
    if (!calculatedDuration && segment.description) {
      calculatedDuration = parseDurationFromDescription(segment.description)
      if (calculatedDuration) {
        source = 'description-duration'
      }
    }

    if (calculatedDuration && calculatedDuration > 0) {
      console.log(
        `${isDryRun ? '[DRY RUN] Would update' : 'Updating'} segment ${segment.id.slice(0, 8)}... ` +
        `(${segment.type}) → ${calculatedDuration} min (from ${source})`
      )
      console.log(`  Workout: ${segment.workout.name}`)
      console.log(`  Description: ${segment.description || 'N/A'}`)
      console.log(`  Distance: ${segment.distance || 'N/A'}, Pace: ${segment.pace || 'N/A'}`)
      console.log('')

      if (!isDryRun) {
        await prisma.workoutSegment.update({
          where: { id: segment.id },
          data: { duration: calculatedDuration },
        })
      }

      if (source.startsWith('distance')) {
        updatedFromDistancePace++
      } else {
        updatedFromDescription++
      }
    } else {
      skipped++
      if (segment.type === 'rest' || segment.type === 'warmup' || segment.type === 'cooldown') {
        console.log(
          `WARNING: Could not determine duration for ${segment.type} segment ${segment.id.slice(0, 8)}...`
        )
        console.log(`  Workout: ${segment.workout.name}`)
        console.log(`  Description: ${segment.description || 'N/A'}`)
        console.log('')
      }
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Updated from distance+pace: ${updatedFromDistancePace}`)
  console.log(`Updated from description: ${updatedFromDescription}`)
  console.log(`Skipped (no data to calculate): ${skipped}`)
  console.log(`Total processed: ${segmentsWithoutDuration.length}`)

  if (isDryRun) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.')
  }
}

async function main() {
  try {
    await backfillSegmentDurations()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
