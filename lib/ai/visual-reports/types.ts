/**
 * Visual Report Types
 *
 * TypeScript interfaces for the generic visual report service.
 */

export type ReportType = 'progression' | 'training-summary' | 'test-report' | 'program'

export interface GenerateVisualReportOptions {
  reportType: ReportType
  clientId: string
  coachId: string
  locale: string
  model?: string
  testId?: string
  programId?: string
  periodStart?: Date
  periodEnd?: Date
}

export interface VisualReportResult {
  id: string
  imageUrl: string
  reportType: string
  sportType: string | null
  model: string
  createdAt: Date
}

// --- Data interfaces per report type ---

export interface ProgressionReportData {
  clientName: string
  sportType: string | null
  tests: {
    date: string
    testType: string
    vo2max?: number | null
    anaerobicThreshold?: { value: number; unit: string } | null
    aerobicThreshold?: { value: number; unit: string } | null
    maxHR?: number | null
  }[]
  fieldTests: {
    date: string
    testType: string
    results: Record<string, unknown>
  }[]
  raceResults: {
    date: string
    raceName: string
    distance?: string | null
    finishTime?: string | null
    paceOrSpeed?: string | null
  }[]
}

export interface TrainingSummaryReportData {
  clientName: string
  sportType: string | null
  weekStart: string
  weekEnd: string
  totalTSS: number
  totalDistance: number
  totalDuration: number
  workoutCount: number
  compliancePercent: number | null
  easyMinutes: number
  moderateMinutes: number
  hardMinutes: number
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
  zone4Minutes: number
  zone5Minutes: number
  acuteLoad?: number | null
  chronicLoad?: number | null
  acwr?: number | null
}

export interface TestReportData {
  clientName: string
  sportType: string | null
  testDate: string
  testType: string
  vo2max: number | null
  maxHR: number | null
  maxLactate: number | null
  aerobicThreshold: { hr?: number; value?: number; unit?: string } | null
  anaerobicThreshold: { hr?: number; value?: number; unit?: string } | null
  trainingZones: { zone: number; name: string; min: number; max: number; unit: string }[]
  previousTest?: {
    testDate: string
    vo2max: number | null
    anaerobicThreshold: { value?: number; unit?: string } | null
  } | null
}

export interface ProgramReportData {
  name: string
  description?: string
  goalType?: string | null
  totalWeeks: number
  methodology?: string
  phases: {
    name: string
    weeks: string
    focus: string
    sessionsPerWeek?: number
    keyWorkouts?: string[]
  }[]
}
