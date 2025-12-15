/**
 * Comprehensive data fetcher for Athlete Profile Page
 * Fetches all athlete data in parallel for optimal performance
 */

import { prisma } from '@/lib/prisma'

// Type definitions for the profile data structure
export interface AthleteProfileData {
  identity: {
    client: ClientData | null
    sportProfile: SportProfileData | null
    athleteProfile: AthleteProfileDetails | null
  }
  physiology: {
    tests: TestData[]
    fieldTests: FieldTestData[]
    thresholdCalculations: ThresholdCalculationData[]
    selfReportedLactates: SelfReportedLactateData[]
  }
  performance: {
    raceResults: RaceResultData[]
    progressionTracking: ProgressionTrackingData[]
    oneRepMaxHistory: OneRepMaxHistoryData[]
  }
  bodyComposition: {
    measurements: BodyCompositionData[]
  }
  training: {
    programs: TrainingProgramData[]
    trainingLoads: TrainingLoadData[]
    workoutLogs: WorkoutLogSummary[]
  }
  health: {
    injuryAssessments: InjuryAssessmentData[]
    crossTrainingSessions: CrossTrainingSessionData[]
    dailyCheckIns: DailyCheckInData[]
    dailyMetrics: DailyMetricsData[]
  }
  menstrual: {
    cycles: MenstrualCycleData[]
    dailyLogs: MenstrualDailyLogData[]
  }
  technique: {
    videoAnalyses: VideoAnalysisData[]
    gaitAnalyses: RunningGaitAnalysisData[]
  }
  meta: {
    fetchedAt: Date
  }
}

// Sub-type definitions
interface ClientData {
  id: string
  name: string
  email: string | null
  phone: string | null
  gender: string
  birthDate: Date
  height: number
  weight: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
  team: { id: string; name: string } | null
  athleteAccount: { id: string; userId: string } | null
}

interface SportProfileData {
  id: string
  primarySport: string
  secondarySports: string[]
  onboardingCompleted: boolean
  runningSettings: Record<string, unknown> | null
  cyclingSettings: Record<string, unknown> | null
  swimmingSettings: Record<string, unknown> | null
  triathlonSettings: Record<string, unknown> | null
  hyroxSettings: Record<string, unknown> | null
  skiingSettings: Record<string, unknown> | null
  generalFitnessSettings: Record<string, unknown> | null
  runningExperience: string | null
  cyclingExperience: string | null
  swimmingExperience: string | null
  strengthExperience: string | null
  currentGoal: string | null
  targetDate: Date | null
  targetMetric: { type: string; value: number; unit: string } | null
}

interface AthleteProfileDetails {
  id: string
  category: string | null
  currentVDOT: number | null
  vdotSource: string | null
  vdotConfidence: number | null
  vdotLastUpdated: Date | null
  maxLactate: number | null
  lt2Speed: number | null
  lt2HeartRate: number | null
  lactateTestDate: Date | null
  metabolicType: string | null
  hrvBaseline: number | null
  rhrBaseline: number | null
  yearsRunning: number | null
  typicalWeeklyKm: number | null
  longestLongRun: number | null
  hasLactateMeter: boolean
  hasHRVMonitor: boolean
  hasPowerMeter: boolean
}

interface TestData {
  id: string
  testDate: Date
  testType: string
  status: string
  location: string | null
  testLeader: string | null
  maxHR: number | null
  maxLactate: number | null
  vo2max: number | null
  aerobicThreshold: Record<string, unknown> | null
  anaerobicThreshold: Record<string, unknown> | null
  trainingZones: Record<string, unknown>[] | null
  notes: string | null
  testStages: TestStageData[]
}

interface TestStageData {
  id: string
  sequence: number
  duration: number | null
  speed: number | null
  power: number | null
  pace: string | null
  heartRate: number | null
  lactate: number | null
  vo2: number | null
  economy: number | null
}

interface FieldTestData {
  id: string
  testType: string
  date: Date
  conditions: Record<string, unknown> | null
  results: Record<string, unknown> | null
  lt1Pace: string | null
  lt1HR: number | null
  lt2Pace: string | null
  lt2HR: number | null
  confidence: number | null
  valid: boolean
  notes: string | null
}

interface ThresholdCalculationData {
  id: string
  method: string
  testDate: Date
  confidence: string
  lt1Intensity: number
  lt1Lactate: number
  lt1Hr: number
  lt2Intensity: number
  lt2Lactate: number
  lt2Hr: number
  dmaxIntensity: number | null
  dmaxLactate: number | null
  warnings: Record<string, unknown>[] | null
}

interface SelfReportedLactateData {
  id: string
  date: Date
  measurementType: string
  lactate: number
  heartRate: number | null
  intensity: string | null
  rpe: number | null
  validated: boolean
  validatedBy: string | null
}

interface RaceResultData {
  id: string
  raceName: string | null
  raceDate: Date
  distance: string
  customDistanceKm: number | null
  timeMinutes: number
  timeFormatted: string | null
  avgPace: string | null
  avgHeartRate: number | null
  maxHeartRate: number | null
  vdot: number | null
  vdotAdjusted: number | null
  goalTime: string | null
  goalAchieved: boolean
  raceType: string | null
  athleteNotes: string | null
  coachNotes: string | null
}

interface ProgressionTrackingData {
  id: string
  date: Date
  sets: number
  repsCompleted: number
  repsTarget: number
  actualLoad: number
  rpe: number | null
  estimated1RM: number | null
  progressionStatus: string
  weeksAtCurrentLoad: number
  nextRecommendedLoad: number | null
  strengthPhase: string | null
  exercise: {
    id: string
    name: string
    nameSv: string | null
    biomechanicalPillar: string
  }
}

interface OneRepMaxHistoryData {
  id: string
  date: Date
  oneRepMax: number
  source: string
  bodyWeight: number | null
  strengthPhase: string | null
  exercise: {
    id: string
    name: string
    nameSv: string | null
  }
}

interface BodyCompositionData {
  id: string
  measurementDate: Date
  weightKg: number | null
  bodyFatPercent: number | null
  muscleMassKg: number | null
  visceralFat: number | null
  boneMassKg: number | null
  waterPercent: number | null
  bmrKcal: number | null
  metabolicAge: number | null
  bmi: number | null
  ffmi: number | null
  deviceBrand: string | null
  measurementTime: string | null
}

interface TrainingProgramData {
  id: string
  name: string
  description: string | null
  goalType: string | null
  goalRace: string | null
  goalDate: Date | null
  startDate: Date
  endDate: Date
  isActive: boolean
  _count: { weeks: number }
}

interface TrainingLoadData {
  id: string
  date: Date
  dailyLoad: number
  loadType: string
  acuteLoad: number | null
  chronicLoad: number | null
  acwr: number | null
  acwrZone: string | null
  injuryRisk: string | null
  duration: number | null
  distance: number | null
  workoutType: string | null
}

interface WorkoutLogSummary {
  id: string
  completedAt: Date | null
  duration: number | null
  distance: number | null
  avgPace: string | null
  avgHR: number | null
  perceivedEffort: number | null
  feeling: string | null
}

interface InjuryAssessmentData {
  id: string
  date: Date
  injuryType: string | null
  status: string
  painLevel: number
  painLocation: string | null
  phase: string | null
  gaitAffected: boolean
  assessment: string
  recommendedProtocol: Record<string, unknown> | null
  estimatedTimeOff: string | null
  resolved: boolean
  resolvedDate: Date | null
  notes: string | null
}

interface CrossTrainingSessionData {
  id: string
  date: Date
  modality: string
  duration: number
  distance: number | null
  avgHR: number | null
  rpe: number | null
  intensity: string | null
  reason: string
  injuryType: string | null
  tssEquivalent: number | null
  effectiveness: number | null
}

interface DailyCheckInData {
  id: string
  date: Date
  sleepQuality: number | null
  sleepHours: number | null
  soreness: number | null
  fatigue: number | null
  stress: number | null
  mood: number | null
  motivation: number | null
  restingHR: number | null
  hrv: number | null
  readinessScore: number | null
  readinessDecision: string | null
}

interface DailyMetricsData {
  id: string
  date: Date
  hrvRMSSD: number | null
  hrvStatus: string | null
  hrvPercent: number | null
  hrvTrend: string | null
  restingHR: number | null
  restingHRStatus: string | null
  wellnessScore: number | null
  wellnessStatus: string | null
  readinessScore: number | null
  readinessLevel: string | null
  recommendedAction: string | null
  redFlags: string[] | null
  yellowFlags: string[] | null
}

interface MenstrualCycleData {
  id: string
  cycleNumber: number
  startDate: Date
  endDate: Date | null
  cycleLength: number | null
  currentPhase: string | null
  ovulationDate: Date | null
  phaseRecommendations: Record<string, unknown> | null
}

interface MenstrualDailyLogData {
  id: string
  date: Date
  flowIntensity: number | null
  cramps: number | null
  fatigue: number | null
  moodScore: number | null
  perceivedEffort: number | null
  actualVsPlanned: string | null
}

interface VideoAnalysisData {
  id: string
  createdAt: Date
  videoType: string
  duration: number | null
  status: string
  formScore: number | null
  issuesDetected: Record<string, unknown>[] | null
  recommendations: Record<string, unknown>[] | null
  aiAnalysis: string | null
  exercise: {
    id: string
    name: string
    nameSv: string | null
  } | null
}

interface RunningGaitAnalysisData {
  id: string
  createdAt: Date
  cadence: number | null
  groundContactTime: number | null
  verticalOscillation: number | null
  strideLength: number | null
  footStrikePattern: string | null
  asymmetryPercent: number | null
  injuryRiskLevel: string | null
  injuryRiskScore: number | null
  runningEfficiency: string | null
  overallScore: number | null
  summary: string | null
  coachingCues: Record<string, unknown>[] | null
}

/**
 * Fetch all athlete profile data in parallel
 */
export async function fetchAthleteProfileData(clientId: string): Promise<AthleteProfileData> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    // Identity
    client,
    sportProfile,
    athleteProfile,

    // Physiology
    tests,
    fieldTests,
    thresholdCalculations,
    selfReportedLactates,

    // Performance
    raceResults,
    progressionTracking,
    oneRepMaxHistory,

    // Body Composition
    bodyCompositions,

    // Training
    trainingPrograms,
    trainingLoads,
    workoutLogs,

    // Health
    injuryAssessments,
    crossTrainingSessions,
    dailyCheckIns,
    dailyMetrics,

    // Menstrual
    menstrualCycles,
    menstrualDailyLogs,

    // Technique
    videoAnalyses,
    gaitAnalyses,

  ] = await Promise.all([
    // Identity queries
    prisma.client.findUnique({
      where: { id: clientId },
      include: {
        team: { select: { id: true, name: true } },
        athleteAccount: { select: { id: true, userId: true } },
      },
    }),

    prisma.sportProfile.findUnique({
      where: { clientId },
    }),

    prisma.athleteProfile.findUnique({
      where: { clientId },
    }),

    // Physiology queries
    prisma.test.findMany({
      where: { clientId },
      orderBy: { testDate: 'desc' },
      take: 50,
      include: {
        testStages: {
          orderBy: { sequence: 'asc' },
        },
      },
    }),

    prisma.fieldTest.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 20,
    }),

    prisma.thresholdCalculation.findMany({
      where: { test: { clientId } },
      orderBy: { testDate: 'desc' },
    }),

    prisma.selfReportedLactate.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 50,
    }),

    // Performance queries
    prisma.raceResult.findMany({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
    }),

    prisma.progressionTracking.findMany({
      where: { clientId },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true, biomechanicalPillar: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 200,
    }),

    prisma.oneRepMaxHistory.findMany({
      where: { clientId },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true },
        },
      },
      orderBy: { date: 'desc' },
    }),

    // Body Composition
    prisma.bodyComposition.findMany({
      where: { clientId },
      orderBy: { measurementDate: 'desc' },
      take: 52, // ~1 year of weekly measurements
    }),

    // Training queries
    prisma.trainingProgram.findMany({
      where: { clientId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { weeks: true } },
      },
    }),

    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
    }),

    prisma.workoutLog.findMany({
      where: {
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
        completed: true,
      },
      select: {
        id: true,
        completedAt: true,
        duration: true,
        distance: true,
        avgPace: true,
        avgHR: true,
        perceivedEffort: true,
        feeling: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 100,
    }),

    // Health queries
    prisma.injuryAssessment.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
    }),

    prisma.crossTrainingSession.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 50,
    }),

    prisma.dailyCheckIn.findMany({
      where: {
        clientId,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
    }),

    prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
    }),

    // Menstrual queries
    prisma.menstrualCycle.findMany({
      where: { clientId },
      orderBy: { startDate: 'desc' },
      take: 12,
    }),

    prisma.menstrualDailyLog.findMany({
      where: {
        cycle: { clientId },
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
    }),

    // Technique queries
    prisma.videoAnalysis.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
      },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    prisma.runningGaitAnalysis.findMany({
      where: { videoAnalysis: { athleteId: clientId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return {
    identity: {
      client: client as ClientData | null,
      sportProfile: sportProfile as SportProfileData | null,
      athleteProfile: athleteProfile as AthleteProfileDetails | null,
    },
    physiology: {
      tests: tests as TestData[],
      fieldTests: fieldTests as FieldTestData[],
      thresholdCalculations: thresholdCalculations as ThresholdCalculationData[],
      selfReportedLactates: selfReportedLactates as SelfReportedLactateData[],
    },
    performance: {
      raceResults: raceResults as RaceResultData[],
      progressionTracking: progressionTracking as ProgressionTrackingData[],
      oneRepMaxHistory: oneRepMaxHistory as OneRepMaxHistoryData[],
    },
    bodyComposition: {
      measurements: bodyCompositions as BodyCompositionData[],
    },
    training: {
      programs: trainingPrograms as TrainingProgramData[],
      trainingLoads: trainingLoads as TrainingLoadData[],
      workoutLogs: workoutLogs as WorkoutLogSummary[],
    },
    health: {
      injuryAssessments: injuryAssessments as InjuryAssessmentData[],
      crossTrainingSessions: crossTrainingSessions as CrossTrainingSessionData[],
      dailyCheckIns: dailyCheckIns as DailyCheckInData[],
      dailyMetrics: dailyMetrics as DailyMetricsData[],
    },
    menstrual: {
      cycles: menstrualCycles as MenstrualCycleData[],
      dailyLogs: menstrualDailyLogs as MenstrualDailyLogData[],
    },
    technique: {
      videoAnalyses: videoAnalyses as VideoAnalysisData[],
      gaitAnalyses: gaitAnalyses as RunningGaitAnalysisData[],
    },
    meta: {
      fetchedAt: new Date(),
    },
  }
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Get sport display name in Swedish
 */
export function getSportDisplayName(sport: string): string {
  const sportNames: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    SKIING: 'Längdskidåkning',
    GENERAL_FITNESS: 'Allmän fitness',
    STRENGTH: 'Styrketräning',
  }
  return sportNames[sport] || sport
}
