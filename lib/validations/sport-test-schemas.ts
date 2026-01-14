/**
 * Sport Test Validation Schemas
 *
 * Zod schemas for all sport-specific physical tests.
 */

import { z } from 'zod'

// ==================== Enums ====================

export const sportTestCategorySchema = z.enum([
  'POWER',
  'SPEED',
  'AGILITY',
  'STRENGTH',
  'ENDURANCE_FIELD',
  'SPORT_SPECIFIC',
])

export const sportTestProtocolSchema = z.enum([
  // Power Tests
  'VERTICAL_JUMP_CMJ',
  'VERTICAL_JUMP_SJ',
  'VERTICAL_JUMP_DJ',
  'STANDING_LONG_JUMP',
  'SPIKE_JUMP',
  'BLOCK_JUMP',
  'MEDICINE_BALL_THROW',
  // Speed Tests
  'SPRINT_5M',
  'SPRINT_10M',
  'SPRINT_20M',
  'SPRINT_30M',
  'SPRINT_40M',
  'FLYING_10M',
  'RSA_6X30M',
  // Agility Tests
  'T_TEST',
  'ILLINOIS_AGILITY',
  'PRO_AGILITY_5_10_5',
  'LANE_AGILITY',
  'ARROWHEAD_AGILITY',
  // Endurance Tests
  'YOYO_IR1',
  'YOYO_IR2',
  'BEEP_TEST',
  'COOPER_TEST',
  'TIME_TRIAL_5K',
  'TIME_TRIAL_10K',
  // Strength Tests
  'BENCH_PRESS_1RM',
  'SQUAT_1RM',
  'DEADLIFT_1RM',
  'LEG_PRESS_1RM',
  'OVERHEAD_PRESS_1RM',
  // Swimming Tests
  'CSS_TEST',
  'SWOLF_TEST',
  'SWIM_TIME_TRIAL_100M',
  'SWIM_TIME_TRIAL_400M',
  // HYROX Tests
  'HYROX_SKIERG_1K',
  'HYROX_ROW_1K',
  'HYROX_SLED_PUSH',
  'HYROX_SLED_PULL',
  'HYROX_BURPEE_BROAD_JUMP',
  'HYROX_FARMERS_CARRY',
  'HYROX_SANDBAG_LUNGE',
  'HYROX_WALL_BALLS',
  // Sport-Specific Tests
  'SERVE_SPEED',
  'SHOT_SPEED',
])

export const sportTypeSchema = z.enum([
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
  'HYROX',
  'GENERAL_FITNESS',
  'FUNCTIONAL_FITNESS',
  'STRENGTH',
  'TEAM_FOOTBALL',
  'TEAM_ICE_HOCKEY',
  'TEAM_HANDBALL',
  'TEAM_FLOORBALL',
  'TEAM_BASKETBALL',
  'TEAM_VOLLEYBALL',
  'TENNIS',
  'PADEL',
])

// ==================== Base Schemas ====================

export const conditionsSchema = z.object({
  temperature: z.number().min(-20).max(45).optional(),
  humidity: z.number().min(0).max(100).optional(),
  surface: z.enum(['TRACK', 'TURF', 'INDOOR', 'COURT', 'GRASS', 'SAND']).optional(),
  wind: z.enum(['NONE', 'LIGHT', 'MODERATE', 'STRONG']).optional(),
  altitude: z.number().min(0).max(4000).optional(),
}).optional()

// ==================== Power Test Schemas ====================

export const verticalJumpSchema = z.object({
  protocol: z.enum(['VERTICAL_JUMP_CMJ', 'VERTICAL_JUMP_SJ', 'VERTICAL_JUMP_DJ']),
  jumpHeight: z.number().min(10).max(120), // cm
  bodyWeight: z.number().min(30).max(200), // kg
  armSwing: z.boolean().optional(), // For CMJ
  dropHeight: z.number().min(20).max(60).optional(), // For DJ, cm
  contactTime: z.number().min(100).max(500).optional(), // For DJ, ms
  attempts: z.array(z.number().min(0).max(120)).optional(),
  notes: z.string().optional(),
})

export const standingLongJumpSchema = z.object({
  protocol: z.literal('STANDING_LONG_JUMP'),
  jumpDistance: z.number().min(100).max(400), // cm
  bodyWeight: z.number().min(30).max(200), // kg
  attempts: z.array(z.number().min(0).max(400)).optional(),
  notes: z.string().optional(),
})

export const medicineBallThrowSchema = z.object({
  protocol: z.literal('MEDICINE_BALL_THROW'),
  throwDistance: z.number().min(3).max(20), // meters
  ballWeight: z.number().min(1).max(5), // kg
  throwType: z.enum(['OVERHEAD', 'CHEST', 'ROTATIONAL']).optional(),
  attempts: z.array(z.number().min(0).max(20)).optional(),
  notes: z.string().optional(),
})

// ==================== Speed Test Schemas ====================

export const sprintTestSchema = z.object({
  protocol: z.enum(['SPRINT_5M', 'SPRINT_10M', 'SPRINT_20M', 'SPRINT_30M', 'SPRINT_40M', 'FLYING_10M']),
  totalTime: z.number().min(0.5).max(10), // seconds
  splits: z.array(z.object({
    distance: z.number().min(0).max(100),
    time: z.number().min(0).max(15),
  })).optional(),
  surface: z.enum(['TRACK', 'TURF', 'INDOOR', 'COURT']).optional(),
  startType: z.enum(['STANDING', 'BLOCK', 'SPLIT', 'FLYING']).optional(),
  attempts: z.array(z.number().min(0).max(15)).optional(),
  notes: z.string().optional(),
})

export const rsaTestSchema = z.object({
  protocol: z.literal('RSA_6X30M'),
  sprintTimes: z.array(z.number().min(3).max(10)).min(4).max(10), // 4-10 sprints
  restTime: z.number().min(15).max(60).default(25), // seconds
  distance: z.number().min(20).max(50).default(30), // meters
  notes: z.string().optional(),
})

// ==================== Agility Test Schemas ====================

export const agilityTestSchema = z.object({
  protocol: z.enum(['T_TEST', 'ILLINOIS_AGILITY', 'PRO_AGILITY_5_10_5', 'LANE_AGILITY', 'ARROWHEAD_AGILITY']),
  time: z.number().min(3).max(30), // seconds
  attempts: z.array(z.number().min(0).max(30)).optional(),
  surface: z.enum(['COURT', 'TURF', 'INDOOR', 'TRACK']).optional(),
  notes: z.string().optional(),
})

// ==================== Endurance Test Schemas ====================

export const yoyoTestSchema = z.object({
  protocol: z.enum(['YOYO_IR1', 'YOYO_IR2']),
  level: z.number().min(5).max(23),
  shuttle: z.number().min(1).max(8),
  notes: z.string().optional(),
})

export const beepTestSchema = z.object({
  protocol: z.literal('BEEP_TEST'),
  level: z.number().min(1).max(21),
  shuttle: z.number().min(1).max(16),
  notes: z.string().optional(),
})

export const cooperTestSchema = z.object({
  protocol: z.literal('COOPER_TEST'),
  distance: z.number().min(1000).max(5000), // meters in 12 minutes
  notes: z.string().optional(),
})

export const timeTrialSchema = z.object({
  protocol: z.enum(['TIME_TRIAL_5K', 'TIME_TRIAL_10K']),
  time: z.number().min(600).max(7200), // seconds (10 min to 2 hours)
  notes: z.string().optional(),
})

// ==================== Strength Test Schemas ====================

export const oneRepMaxSchema = z.object({
  protocol: z.enum(['BENCH_PRESS_1RM', 'SQUAT_1RM', 'DEADLIFT_1RM', 'LEG_PRESS_1RM', 'OVERHEAD_PRESS_1RM']),
  weight: z.number().min(20).max(500), // kg
  reps: z.number().min(1).max(12).optional(), // For estimated 1RM
  isEstimated: z.boolean().default(false),
  bodyWeight: z.number().min(30).max(200), // For relative strength
  notes: z.string().optional(),
})

// ==================== Swimming Test Schemas ====================

export const cssTestSchema = z.object({
  protocol: z.literal('CSS_TEST'),
  time400m: z.number().min(180).max(900), // seconds (3-15 min)
  time200m: z.number().min(90).max(450), // seconds (1.5-7.5 min)
  poolLength: z.enum(['25', '50']),
  stroke: z.enum(['freestyle', 'backstroke', 'breaststroke', 'butterfly']).default('freestyle'),
  notes: z.string().optional(),
})

export const swolfTestSchema = z.object({
  protocol: z.literal('SWOLF_TEST'),
  time: z.number().min(10).max(600), // seconds
  strokes: z.number().min(10).max(500),
  distance: z.number().min(25).max(400), // meters
  poolLength: z.enum(['25', '50']),
  stroke: z.enum(['freestyle', 'backstroke', 'breaststroke', 'butterfly']).default('freestyle'),
  notes: z.string().optional(),
})

export const swimTimeTrialSchema = z.object({
  protocol: z.enum(['SWIM_TIME_TRIAL_100M', 'SWIM_TIME_TRIAL_400M']),
  time: z.number().min(30).max(900), // seconds
  poolLength: z.enum(['25', '50']),
  stroke: z.enum(['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'IM']).default('freestyle'),
  notes: z.string().optional(),
})

// ==================== HYROX Test Schemas ====================

export const hyroxStationSchema = z.object({
  protocol: z.enum([
    'HYROX_SKIERG_1K',
    'HYROX_ROW_1K',
    'HYROX_SLED_PUSH',
    'HYROX_SLED_PULL',
    'HYROX_BURPEE_BROAD_JUMP',
    'HYROX_FARMERS_CARRY',
    'HYROX_SANDBAG_LUNGE',
    'HYROX_WALL_BALLS',
  ]),
  time: z.number().min(30).max(900), // seconds
  weight: z.number().min(0).max(250).optional(), // For weighted stations
  reps: z.number().min(0).max(150).optional(), // For wall balls
  category: z.enum(['OPEN', 'PRO']).default('OPEN'),
  notes: z.string().optional(),
})

// ==================== Sport-Specific Test Schemas ====================

export const serveSpeedSchema = z.object({
  protocol: z.literal('SERVE_SPEED'),
  speed: z.number().min(50).max(300), // km/h
  attempts: z.array(z.number().min(0).max(300)).optional(),
  serveType: z.enum(['FLAT', 'SLICE', 'KICK', 'TOPSPIN']).optional(),
  notes: z.string().optional(),
})

export const shotSpeedSchema = z.object({
  protocol: z.literal('SHOT_SPEED'),
  speed: z.number().min(50).max(200), // km/h
  attempts: z.array(z.number().min(0).max(200)).optional(),
  shotType: z.enum(['WRIST', 'SLAP', 'SNAP']).optional(),
  notes: z.string().optional(),
})

// ==================== Main Create Schema ====================

export const createSportTestSchema = z.object({
  clientId: z.string().uuid(),
  testDate: z.string().or(z.date()),
  category: sportTestCategorySchema,
  protocol: sportTestProtocolSchema,
  sport: sportTypeSchema.optional(),
  conditions: conditionsSchema,
  rawData: z.record(z.unknown()), // Protocol-specific data
  notes: z.string().optional(),
})

// ==================== Type Exports ====================

export type SportTestCategory = z.infer<typeof sportTestCategorySchema>
export type SportTestProtocol = z.infer<typeof sportTestProtocolSchema>
export type SportType = z.infer<typeof sportTypeSchema>
export type Conditions = z.infer<typeof conditionsSchema>
export type VerticalJumpData = z.infer<typeof verticalJumpSchema>
export type StandingLongJumpData = z.infer<typeof standingLongJumpSchema>
export type MedicineBallThrowData = z.infer<typeof medicineBallThrowSchema>
export type SprintTestData = z.infer<typeof sprintTestSchema>
export type RSATestData = z.infer<typeof rsaTestSchema>
export type AgilityTestData = z.infer<typeof agilityTestSchema>
export type YoYoTestData = z.infer<typeof yoyoTestSchema>
export type BeepTestData = z.infer<typeof beepTestSchema>
export type CooperTestData = z.infer<typeof cooperTestSchema>
export type TimeTrialData = z.infer<typeof timeTrialSchema>
export type OneRepMaxData = z.infer<typeof oneRepMaxSchema>
export type CSSTestData = z.infer<typeof cssTestSchema>
export type SwolfTestData = z.infer<typeof swolfTestSchema>
export type SwimTimeTrialData = z.infer<typeof swimTimeTrialSchema>
export type HYROXStationData = z.infer<typeof hyroxStationSchema>
export type ServeSpeedData = z.infer<typeof serveSpeedSchema>
export type ShotSpeedData = z.infer<typeof shotSpeedSchema>
export type CreateSportTestData = z.infer<typeof createSportTestSchema>
