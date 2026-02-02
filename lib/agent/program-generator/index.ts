/**
 * AI Program Generator
 *
 * Generates personalized training programs for AI-coached athletes.
 * Wraps the existing program-generator with AI-specific logic.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { PeriodPhase } from '@prisma/client'

export interface AIGenerateProgramParams {
  clientId: string
  primarySport: string
  experienceLevel: string
  trainingGoal: string
  weeklyHours: number
  trainingDaysPerWeek: number
  targetEvent?: string
  targetEventDate?: Date | null
  hasGymAccess: boolean
  hasPoolAccess: boolean
}

interface GeneratedProgram {
  id: string
  name: string
  methodology: string
  totalWeeks: number
  startDate: Date
}

/**
 * Map sport to goal type
 */
function mapSportToGoalType(
  sport: string,
  goal: string
): 'marathon' | 'half-marathon' | '10k' | '5k' | 'fitness' | 'cycling' | 'skiing' | 'custom' {
  // Race-specific goals
  if (goal === 'RACE_PREP') {
    switch (sport) {
      case 'RUNNING':
        return 'half-marathon' // Default to half-marathon
      case 'CYCLING':
        return 'cycling'
      case 'CROSS_COUNTRY_SKIING':
        return 'skiing'
      default:
        return 'fitness'
    }
  }

  // Sport-specific defaults
  switch (sport) {
    case 'RUNNING':
      return goal === 'SPEED' ? '5k' : goal === 'ENDURANCE' ? 'half-marathon' : 'fitness'
    case 'CYCLING':
      return 'cycling'
    case 'CROSS_COUNTRY_SKIING':
      return 'skiing'
    default:
      return 'fitness'
  }
}

/**
 * Map experience level
 */
function mapExperienceLevel(level: string): 'beginner' | 'intermediate' | 'advanced' {
  switch (level) {
    case 'BEGINNER':
      return 'beginner'
    case 'INTERMEDIATE':
      return 'intermediate'
    case 'ADVANCED':
    case 'ELITE':
      return 'advanced'
    default:
      return 'intermediate'
  }
}

/**
 * Select appropriate methodology based on athlete profile
 */
function selectMethodology(
  sport: string,
  goal: string,
  experienceLevel: string,
  weeklyHours: number
): 'POLARIZED' | 'NORWEGIAN' | 'NORWEGIAN_SINGLE' | 'CANOVA' | 'PYRAMIDAL' {
  // Beginners get Polarized (simple 80/20 split)
  if (experienceLevel === 'BEGINNER') {
    return 'POLARIZED'
  }

  // Low volume athletes get Pyramidal (more moderate intensity)
  if (weeklyHours < 5) {
    return 'PYRAMIDAL'
  }

  // Race-specific and advanced athletes
  if (goal === 'RACE_PREP' || goal === 'SPEED') {
    if (experienceLevel === 'ELITE' && weeklyHours >= 10) {
      return 'NORWEGIAN' // Double threshold for elites
    }
    if (sport === 'RUNNING') {
      return 'CANOVA' // Marathon-specific pacing
    }
  }

  // Endurance goals
  if (goal === 'ENDURANCE') {
    return 'POLARIZED' // Classic endurance approach
  }

  // Default to Polarized for most athletes
  return 'POLARIZED'
}

/**
 * Calculate program duration based on goal and target date
 */
function calculateProgramWeeks(
  goal: string,
  targetDate?: Date | null,
  experienceLevel: string = 'INTERMEDIATE'
): number {
  // If target date provided, calculate weeks until then
  if (targetDate) {
    const now = new Date()
    const diffTime = targetDate.getTime() - now.getTime()
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    return Math.max(4, Math.min(24, diffWeeks)) // 4-24 weeks
  }

  // Default durations by goal
  switch (goal) {
    case 'RACE_PREP':
      return experienceLevel === 'BEGINNER' ? 16 : 12
    case 'GENERAL_FITNESS':
    case 'WEIGHT_LOSS':
      return 8
    case 'ENDURANCE':
    case 'STRENGTH_GAIN':
      return 12
    case 'SPEED':
      return 8
    case 'COMEBACK':
      return 6
    default:
      return 8
  }
}

/**
 * Generate a training program for an AI-coached athlete
 */
export async function generateAIProgram(params: AIGenerateProgramParams): Promise<GeneratedProgram> {
  const {
    clientId,
    primarySport,
    experienceLevel,
    trainingGoal,
    weeklyHours,
    trainingDaysPerWeek,
    targetEvent,
    targetEventDate,
    hasGymAccess,
    hasPoolAccess,
  } = params

  logger.info('Generating AI program', { clientId, primarySport, trainingGoal })

  // Calculate program parameters
  const goalType = mapSportToGoalType(primarySport, trainingGoal)
  const mappedLevel = mapExperienceLevel(experienceLevel)
  const methodology = selectMethodology(primarySport, trainingGoal, experienceLevel, weeklyHours)
  const durationWeeks = calculateProgramWeeks(trainingGoal, targetEventDate, experienceLevel)

  // Start date is tomorrow
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  // End date
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + durationWeeks * 7)

  // Generate program name
  const sportLabel = primarySport.charAt(0) + primarySport.slice(1).toLowerCase().replace(/_/g, ' ')
  const goalLabel = trainingGoal.charAt(0) + trainingGoal.slice(1).toLowerCase().replace(/_/g, ' ')
  const programName = targetEvent
    ? `${targetEvent} Preparation`
    : `AI ${sportLabel} - ${goalLabel}`

  // Get the client's userId to use as coachId (for AI-coached athletes, they are their own coach)
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { userId: true },
  })

  if (!client?.userId) {
    throw new Error('Client does not have an associated user')
  }

  // Store methodology and settings in description as JSON for reference
  const programDescription = JSON.stringify({
    methodology,
    goalType,
    experienceLevel: mappedLevel,
    weeklyHours,
    totalWeeks: durationWeeks,
    autoGenerated: true,
    generatedBy: 'AI_AGENT',
  })

  // Create the program in database
  const program = await prisma.$transaction(async (tx) => {
    // Create program
    const newProgram = await tx.trainingProgram.create({
      data: {
        clientId,
        coachId: client.userId,
        name: programName,
        description: programDescription,
        goalType,
        startDate,
        endDate,
        isActive: true,
        generatedFromTest: false,
      },
    })

    // Generate weeks and days structure
    for (let weekNum = 1; weekNum <= durationWeeks; weekNum++) {
      const weekStartDate = new Date(startDate)
      weekStartDate.setDate(weekStartDate.getDate() + (weekNum - 1) * 7)

      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 6)

      // Determine phase
      let phase: PeriodPhase
      const weekProgress = weekNum / durationWeeks
      if (weekProgress <= 0.25) {
        phase = PeriodPhase.BASE
      } else if (weekProgress <= 0.6) {
        phase = PeriodPhase.BUILD
      } else if (weekProgress <= 0.85) {
        phase = PeriodPhase.PEAK
      } else {
        phase = PeriodPhase.TAPER
      }

      // Check if deload week (every 4th week typically)
      const isDeloadWeek = weekNum % 4 === 0

      const week = await tx.trainingWeek.create({
        data: {
          programId: newProgram.id,
          weekNumber: weekNum,
          startDate: weekStartDate,
          endDate: weekEndDate,
          phase: isDeloadWeek ? PeriodPhase.RECOVERY : phase,
          focus: isDeloadWeek ? 'Recovery week' : undefined,
          notes: isDeloadWeek ? 'Recovery week - reduced volume' : undefined,
        },
      })

      // Create days for the week
      for (let dayNum = 1; dayNum <= 7; dayNum++) {
        const dayDate = new Date(weekStartDate)
        dayDate.setDate(dayDate.getDate() + dayNum - 1)

        // Determine if this is a training day
        const isTrainingDay = dayNum <= trainingDaysPerWeek

        await tx.trainingDay.create({
          data: {
            weekId: week.id,
            dayNumber: dayNum,
            date: dayDate,
            notes: isTrainingDay ? undefined : 'Rest day',
          },
        })
      }
    }

    return newProgram
  })

  logger.info('AI program generated', {
    programId: program.id,
    clientId,
    methodology,
    durationWeeks,
  })

  return {
    id: program.id,
    name: program.name,
    methodology,
    totalWeeks: durationWeeks,
    startDate: program.startDate,
  }
}

/**
 * Adjust an existing program based on performance data
 */
export async function adjustAIProgram(
  programId: string,
  adjustments: {
    reason: string
    volumeChange?: number // -50 to +50 percent
    intensityChange?: number // -50 to +50 percent
  }
): Promise<void> {
  logger.info('Adjusting AI program', { programId, adjustments })

  // Get program
  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    include: {
      weeks: {
        where: {
          startDate: { gte: new Date() },
        },
        orderBy: { weekNumber: 'asc' },
        take: 4, // Adjust next 4 weeks
      },
    },
  })

  if (!program) {
    throw new Error('Program not found')
  }

  // Update program description with adjustment log
  const existingDesc = program.description || ''
  const adjustmentLog = `\n[AI Adjustment ${new Date().toISOString()}]: ${adjustments.reason}`
  await prisma.trainingProgram.update({
    where: { id: programId },
    data: {
      description: existingDesc + adjustmentLog,
    },
  })

  logger.info('AI program adjusted', { programId })
}
