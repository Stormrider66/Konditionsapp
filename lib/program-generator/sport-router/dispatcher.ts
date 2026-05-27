import { logger } from '@/lib/logger'
import type { Client, Test, CreateTrainingProgramDTO } from '@/types'
import { generateCyclingProgram, type CyclingProgramParams } from '../generators/cycling-generator'
import { generateSkiingProgram, type SkiingProgramParams } from '../generators/skiing-generator'
import { generateSwimmingProgram, type SwimmingProgramParams } from '../generators/swimming-generator'
import { generateTriathlonProgram, type TriathlonProgramParams } from '../generators/triathlon-generator'
import { generateHyroxProgram, type HyroxProgramParams } from '../generators/hyrox-generator'
import { generateStrengthProgram, type StrengthProgramParams } from '../generators/strength-generator'
import { generateFootballProgram } from '../generators/football-generator'
import { generateHockeyProgram } from '../generators/hockey-generator'
import { generateCourtSportProgram } from '../generators/court-sport-generator'
import type { SportProgramParams } from './types'
import { applyCalendarConstraints } from './calendar-constraints'
import { generateRunningProgram } from './running'
import { generateGeneralFitnessProgram } from './general-fitness'
import { validateTeamSportProgram } from '../validators/team-sport-validator'
import { validateGeneratedProgramQuality } from '../validators/program-quality-validator'


/**
 * Main sport router - routes to appropriate generator based on sport type
 */
export async function generateSportProgram(
  params: SportProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  logger.debug('[SPORT ROUTER] Generating program', {
    sport: params.sport,
    goal: params.goal,
    dataSource: params.dataSource,
    ...(params.calendarConstraints && {
      calendarBlockedDates: params.calendarConstraints.blockedDates.length,
      calendarReducedDates: params.calendarConstraints.reducedDates.length
    })
  })

  let program: CreateTrainingProgramDTO

  switch (params.sport) {
    case 'RUNNING':
      program = await generateRunningProgram(params, client, test)
      break

    case 'CYCLING':
      program = await generateCyclingProgram({
        ...params,
        ftp: params.manualFtp,
        weeklyHours: params.weeklyHours || 8,
        bikeType: params.bikeType as CyclingProgramParams['bikeType'],
      } as CyclingProgramParams, client)
      break

    case 'SKIING':
      program = await generateSkiingProgram({
        ...params,
        technique: params.technique as SkiingProgramParams['technique'],
      } as SkiingProgramParams, client, test)
      break

    case 'SWIMMING':
      program = await generateSwimmingProgram({
        ...params,
        css: params.manualCss,
        poolLength: params.poolLength as SwimmingProgramParams['poolLength'],
      } as SwimmingProgramParams, client)
      break

    case 'TRIATHLON':
      program = await generateTriathlonProgram({
        ...params,
        ftp: params.manualFtp,
        css: params.manualCss,
        vdot: params.manualVdot,
      } as TriathlonProgramParams, client, test)
      break

    case 'HYROX':
      program = await generateHyroxProgram({
        ...params,
        experienceLevel: params.experienceLevel,
        // Pass race result data for VDOT calculation (pure running races only)
        recentRaceDistance: params.recentRaceDistance,
        recentRaceTime: params.recentRaceTime,
        // Pass HYROX-specific data
        hyroxStationTimes: params.hyroxStationTimes,
        hyroxDivision: params.hyroxDivision,
        hyroxGender: params.hyroxGender,
        hyroxBodyweight: params.hyroxBodyweight,
        strengthPRs: params.strengthPRs,
      } as HyroxProgramParams, client)
      break

    case 'STRENGTH':
      program = await generateStrengthProgram({
        ...params,
      } as StrengthProgramParams, client)
      break

    case 'GENERAL_FITNESS':
      program = await generateGeneralFitnessProgram(params, client)
      break

    case 'TEAM_FOOTBALL':
      program = await generateFootballProgram(params, client)
      break

    case 'TEAM_ICE_HOCKEY':
      program = await generateHockeyProgram(params, client)
      break

    case 'TEAM_BASKETBALL':
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
    case 'TEAM_VOLLEYBALL':
    case 'TENNIS':
    case 'PADEL':
      program = await generateCourtSportProgram(params, client)
      break

    default:
      throw new Error(`Unsupported sport type: ${params.sport}`)
  }

  if (params.sport === 'TEAM_FOOTBALL' || params.sport === 'TEAM_ICE_HOCKEY') {
    const settings = params.sport === 'TEAM_FOOTBALL' ? params.footballSettings : params.hockeySettings
    const validation = validateTeamSportProgram(program, params.sport, settings)
    if (!validation.valid) {
      throw new Error(`Team sport program validation failed: ${validation.errors.join(', ')}`)
    }
    if (validation.warnings.length > 0) {
      const label = params.locale === 'sv' ? 'Valideringsnoteringar' : 'Validation notes'
      program = {
        ...program,
        notes: [program.notes, `${label}: ${validation.warnings.join(' ')}`]
          .filter(Boolean)
          .join(' '),
      }
    }
  }

  const quality = validateGeneratedProgramQuality(program, {
    sport: params.sport,
    expectedSessionsPerWeek: params.sessionsPerWeek,
    locale: params.locale,
  })
  if (!quality.valid) {
    throw new Error(`Program quality validation failed: ${quality.errors.join(', ')}`)
  }
  if (quality.warnings.length > 0) {
    const label = params.locale === 'sv' ? 'Kvalitetsnoteringar' : 'Quality notes'
    program = {
      ...program,
      notes: [program.notes, `${label}: ${quality.warnings.join(' ')}`]
        .filter(Boolean)
        .join(' '),
    }
  }

  // Apply calendar constraints - remove workouts from blocked dates
  if (params.calendarConstraints) {
    logger.debug('[SPORT ROUTER] Applying calendar constraints to program')
    program = applyCalendarConstraints(program, params.calendarConstraints)
  }

  return program
}
