import type { SportType } from '@prisma/client'

// Type definitions for athlete data
interface AthleteData {
  id: string;
  name: string;
  gender: string | null;
  birthDate: Date | null;
  height: number | null;
  weight: number | null;
  sportProfile: SportProfile | null;
  tests: TestData[];
  raceResults: RaceResult[];
  trainingPrograms: TrainingProgram[];
  injuryAssessments: InjuryAssessment[];
  fieldTests?: FieldTest[];
  dailyCheckIns?: DailyCheckIn[];
  bodyCompositions?: BodyComposition[];
  videoAnalyses?: VideoAnalysis[];
  // Integration data (PRO tier)
  stravaActivities?: StravaActivityData[];
  garminMetrics?: GarminMetricsData;
  // Additional context data (NEW)
  trainingLoad?: TrainingLoadData;
  strengthSessions?: StrengthSessionData[];
  athleteProfile?: AthleteProfileData;
  complianceRate?: number;
  coachNotes?: CoachNoteData[];
}

// Training load / ACWR data
interface TrainingLoadData {
  date: Date;
  acuteLoad: number | null;
  chronicLoad: number | null;
  acwr: number | null;
  acwrZone: string | null;
  injuryRisk: string | null;
}

// Strength session data
interface StrengthSessionData {
  name: string;
  phase: string;
  assignedDate: Date;
  exercises: Array<{ exerciseName?: string }> | null;
}

// Athlete self-description profile
interface AthleteProfileData {
  trainingBackground: string | null;
  longTermAmbitions: string | null;
  seasonalFocus: string | null;
  personalMotivations: string | null;
  trainingPreferences: string | null;
  constraints: string | null;
  dietaryNotes: string | null;
}

// Coach notes
interface CoachNoteData {
  content: string;
  createdAt: Date;
}

// Strava activity data
interface StravaActivityData {
  name: string;
  type: string;
  startDate: Date;
  distance: number | null;
  movingTime: number | null;
  averageHeartrate: number | null;
  averageSpeed: number | null;
  tss: number | null;
  mappedType: string | null;
}

// Garmin metrics summary
interface GarminMetricsData {
  recentDays: {
    date: Date;
    sleepHours: number | null;
    sleepQuality: number | null;
    hrv: number | null;
    restingHR: number | null;
    steps: number | null;
    activeMinutes: number | null;
    stressLevel: number | null;
  }[];
  weeklyTSS: number;
  readinessScore: number | null;
}

interface AIPoseAnalysis {
  interpretation?: string;
  technicalFeedback?: Array<{
    area: string;
    observation: string;
    impact: string;
    suggestion: string;
  }>;
  patterns?: Array<{
    pattern: string;
    significance: string;
  }>;
  recommendations?: Array<{
    priority: number;
    title: string;
    description: string;
    exercises: string[];
  }>;
  overallAssessment?: string;
  score?: number;
}

interface VideoAnalysis {
  id: string;
  createdAt: Date;
  videoType: string | null;
  cameraAngle: string | null;
  formScore: number | null;
  issuesDetected: unknown[] | null;
  recommendations: unknown[] | null;
  aiPoseAnalysis: AIPoseAnalysis | null;
  runningGaitAnalysis: RunningGaitAnalysis | null;
}

interface RunningGaitAnalysis {
  id: string;
  cadence: number | null;
  groundContactTime: number | null;
  verticalOscillation: number | null;
  strideLength: number | null;
  footStrikePattern: string | null;
  asymmetryPercent: number | null;
  leftContactTime: number | null;
  rightContactTime: number | null;
  injuryRiskLevel: string | null;
  injuryRiskScore: number | null;
  injuryRiskFactors: unknown[] | null;
  runningEfficiency: string | number | null;
  energyLeakages: unknown[] | null;
  coachingCues: unknown[] | null;
  drillRecommendations: unknown[] | null;
  overallScore: number | null;
  summary: string | null;
}

interface BodyComposition {
  measurementDate: Date;
  weightKg: number | null;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  visceralFat: number | null;
  boneMassKg: number | null;
  waterPercent: number | null;
  bmrKcal: number | null;
  metabolicAge: number | null;
}

interface SportProfile {
  primarySport: SportType;
  secondarySports: SportType[] | null;
  runningSettings: RunningSettings | null;
  cyclingSettings: CyclingSettings | null;
  swimmingSettings: SwimmingSettings | null;
  triathlonSettings: TriathlonSettings | null;
  hyroxSettings: HyroxSettings | null;
  skiingSettings: SkiingSettings | null;
  generalFitnessSettings: GeneralFitnessSettings | null;
  functionalFitnessSettings: FunctionalFitnessSettings | null;
  hockeySettings: HockeySettings | null;
  footballSettings: FootballSettings | null;
  runningExperience: string | null;
  cyclingExperience: string | null;
  swimmingExperience: string | null;
  strengthExperience: string | null;
  functionalFitnessExperience: string | null;
}

interface RunningSettings {
  targetRace?: string;
  weeklyVolume?: number;
  preferredMethodology?: string;
  longestRun?: number;
  terrainPreference?: string;
  currentPaces?: {
    easy?: string;
    tempo?: string;
    threshold?: string;
    interval?: string;
  };
}

interface CyclingSettings {
  currentFtp?: number;
  weight?: number;
  bikeTypes?: string[];
  indoorOutdoorRatio?: number;
  primaryDiscipline?: string;
}

interface SwimmingSettings {
  currentCss?: string;
  poolLength?: number;
  primaryStroke?: string;
  openWaterExperience?: boolean;
  weeklyDistance?: number;
}

interface TriathlonSettings {
  targetDistance?: string;
  swimCss?: string;
  bikeFtp?: number;
  runVdot?: number;
  weakestDiscipline?: string;
  strongestDiscipline?: string;
}

interface HyroxSettings {
  targetCategory?: string;
  targetTime?: string;
  stationTimes?: {
    skiErg?: number;
    sledPush?: number;
    sledPull?: number;
    burpeeBroadJump?: number;
    rowing?: number;
    farmersCarry?: number;
    lunges?: number;
    wallBalls?: number;
  };
  runSplits?: number[];
  strengthPRs?: {
    deadlift?: number;
    squat?: number;
    benchPress?: number;
  };
}

interface SkiingSettings {
  technique?: 'CLASSIC' | 'SKATE' | 'BOTH';
  equipment?: string[];
  preferredTerrain?: string;
  raceDistances?: string[];
}

interface GeneralFitnessSettings {
  goals?: string[];
  activityTypes?: string[];
  limitations?: string[];
  targetWeight?: number;
  currentBodyFat?: number;
}

interface FunctionalFitnessSettings {
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'competitor';
  yearsTraining?: number;
  primaryFocus?: 'general' | 'strength' | 'endurance' | 'gymnastics' | 'competition';
  gymType?: 'commercial' | 'functional_box' | 'home' | 'garage';
  equipmentAvailable?: string[];
  benchmarks?: {
    fran?: number | null;
    grace?: number | null;
    diane?: number | null;
    helen?: number | null;
    murph?: number | null;
    cleanAndJerk1RM?: number | null;
    snatch1RM?: number | null;
    backSquat1RM?: number | null;
    deadlift1RM?: number | null;
    strictPress1RM?: number | null;
    frontSquat1RM?: number | null;
    maxPullUps?: number | null;
    maxMuscleUps?: number | null;
    maxHSPU?: number | null;
    maxDoubleUnders?: number | null;
  };
  gymnasticsSkills?: {
    pullUps?: string;
    handstandPushUps?: string;
    toeToBar?: string;
    doubleUnders?: string;
    ropeClimbs?: string;
    ringDips?: string;
    handstandWalk?: string;
  };
  olympicLiftingLevel?: 'none' | 'learning' | 'competent' | 'proficient';
  preferredWODDuration?: number;
  weeklyTrainingDays?: number;
  competitionInterest?: boolean;
}

interface HockeySettings {
  position?: 'center' | 'wing' | 'defense' | 'goalie';
  teamName?: string;
  leagueLevel?: 'recreational' | 'junior' | 'division_3' | 'division_2' | 'division_1' | 'shl' | 'hockeyallsvenskan' | 'hockeyettan';
  seasonPhase?: 'off_season' | 'pre_season' | 'in_season' | 'playoffs';
  averageIceTimeMinutes?: number;
  shiftsPerGame?: number;
  playStyle?: 'offensive' | 'defensive' | 'two_way' | 'physical' | 'skill';
  strengthFocus?: string[];
  weaknesses?: string[];
  injuryHistory?: string[];
  yearsPlaying?: number;
}

interface FootballSettings {
  position?: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  teamName?: string;
  leagueLevel?: 'recreational' | 'division_4' | 'division_3' | 'division_2' | 'division_1' | 'superettan' | 'allsvenskan';
  avgMatchDistanceKm?: number;
  avgSprintDistanceKm?: number;
  gpsProvider?: string;
  playStyle?: 'possession' | 'counter' | 'pressing' | 'physical';
}

interface TestData {
  id: string;
  testDate: Date;
  testType: string;
  maxHR: number | null;
  vo2max: number | null;
  qualityReviewStatus?: string | null;
  aerobicThreshold: { hr?: number; value?: number; unit?: string } | null;
  anaerobicThreshold: { hr?: number; value?: number; unit?: string } | null;
  testStages: TestStage[];
}

interface TestStage {
  sequence: number;
  speed?: number | null;
  power?: number | null;
  pace?: string | null;
  heartRate: number | null;
  lactate: number | null;
}

interface RaceResult {
  id: string;
  raceName: string | null;
  raceDate: Date;
  distance: string;
  timeFormatted: string | null;
  vdot: number | null;
  avgHeartRate?: number | null;
  notes?: string | null;
}

interface TrainingProgram {
  id: string;
  name: string;
  goalType: string | null;
  goalRace: string | null;
  startDate: Date;
  endDate: Date;
}

interface InjuryAssessment {
  id: string;
  injuryType: string;
  status: string;
  painLevel: number;
  affectedArea?: string | null;
}

interface FieldTest {
  id: string;
  testType: string;
  date: Date;
  results: Record<string, unknown> | null;
}

interface DailyCheckIn {
  date: Date;
  sleepQuality: number | null;
  sleepHours: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  restingHR: number | null;
  hrv: number | null;
}

export type {
  AthleteData,
  AthleteProfileData,
  BodyComposition,
  CoachNoteData,
  CyclingSettings,
  DailyCheckIn,
  FieldTest,
  FootballSettings,
  FunctionalFitnessSettings,
  GarminMetricsData,
  GeneralFitnessSettings,
  HockeySettings,
  HyroxSettings,
  InjuryAssessment,
  RaceResult,
  RunningGaitAnalysis,
  RunningSettings,
  SkiingSettings,
  SportProfile,
  StravaActivityData,
  StrengthSessionData,
  SwimmingSettings,
  TestData,
  TestStage,
  TrainingLoadData,
  TrainingProgram,
  TriathlonSettings,
  VideoAnalysis,
  AIPoseAnalysis,
}
