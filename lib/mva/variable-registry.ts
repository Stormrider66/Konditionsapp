import type { MVAVariable, VariableCategory, AthleteDataBundle, SportTestSummary } from './types'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import {
  trendSlope,
  coefficientOfVariation,
  extractTimeSeries,
  countRecent,
} from './temporal-helpers'

/**
 * Helper: get best sport test result by category and protocol(s).
 * Prefers bestAttempt=true, falls back to most recent.
 */
function getBestSportTest(
  bundle: AthleteDataBundle,
  category: string,
  protocols: string[],
  getter: (t: SportTestSummary) => number | null
): number | null {
  const tests = bundle.sportTests
  if (!tests || tests.length === 0) return null
  const matching = tests.filter(
    (t) => t.category === category && protocols.includes(t.protocol)
  )
  if (matching.length === 0) return null
  // Prefer best attempt
  const best = matching.find((t) => t.bestAttempt)
  if (best) return getter(best)
  // Fall back to most recent (already sorted desc by testDate)
  return getter(matching[0])
}

/**
 * Helper: get the most recent test of any type
 */
function getLatestTest(data: AthleteProfileData) {
  const tests = data.physiology.tests
  return tests.length > 0 ? tests[0] : null // already sorted desc by testDate
}

function getLatestHockeyTest(bundle: AthleteDataBundle) {
  return bundle.hockeyTests && bundle.hockeyTests.length > 0 ? bundle.hockeyTests[0] : null
}

function getHockeyMaximaValue(bundle: AthleteDataBundle, key: string): number | null {
  const latest = getLatestHockeyTest(bundle)
  const maxima = latest?.muscleLabMaxima
  if (!maxima || typeof maxima !== 'object') return null
  const value = (maxima as Record<string, unknown>)[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function bestHockeySide(left: number | null | undefined, right: number | null | undefined, lowerIsBetter = false): number | null {
  const values = [left, right].filter((value): value is number => value != null && Number.isFinite(value))
  if (values.length === 0) return null
  return lowerIsBetter ? Math.min(...values) : Math.max(...values)
}

/**
 * Helper: mean of recent daily metrics (last 30 days worth of data available)
 */
function meanOfRecent<T>(arr: T[], getter: (item: T) => number | null, maxItems = 30): number | null {
  const values: number[] = []
  for (let i = 0; i < Math.min(arr.length, maxItems); i++) {
    const v = getter(arr[i])
    if (v != null) values.push(v)
  }
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Helper: latest body composition
 */
function getLatestBodyComp(data: AthleteProfileData) {
  const measurements = data.bodyComposition.measurements
  return measurements.length > 0 ? measurements[0] : null
}

/**
 * Helper: get latest training load record
 */
function getLatestTrainingLoad(data: AthleteProfileData) {
  const loads = data.training.trainingLoads
  return loads.length > 0 ? loads[0] : null
}

/**
 * The variable registry — the extensibility backbone.
 * Each variable has an extractor that pulls a single numeric value from an AthleteDataBundle.
 * Phase 2: 63 variables across 10 categories.
 */
export const MVA_VARIABLE_REGISTRY: MVAVariable[] = [
  // ==================== PHYSIOLOGICAL ====================
  {
    id: 'vo2max',
    name: 'VO2max',
    nameSv: 'VO2max',
    category: 'PHYSIOLOGICAL',
    unit: 'ml/kg/min',
    extractor: (bundle) => {
      const data = bundle.data
      const test = getLatestTest(data)
      if (test?.vo2max) return test.vo2max
      return data.identity.athleteProfile?.currentVDOT ?? data.identity.client?.manualVo2max ?? null
    },
  },
  {
    id: 'lt2_hr',
    name: 'LT2 Heart Rate',
    nameSv: 'LT2 puls',
    category: 'PHYSIOLOGICAL',
    unit: 'bpm',
    extractor: (bundle) => {
      const data = bundle.data
      const threshold = data.physiology.thresholdCalculations[0]
      if (threshold) return threshold.lt2Hr
      return data.identity.athleteProfile?.lt2HeartRate ?? null
    },
  },
  {
    id: 'lt1_hr',
    name: 'LT1 Heart Rate',
    nameSv: 'LT1 puls',
    category: 'PHYSIOLOGICAL',
    unit: 'bpm',
    extractor: (bundle) => {
      const data = bundle.data
      const threshold = data.physiology.thresholdCalculations[0]
      return threshold?.lt1Hr ?? null
    },
  },
  {
    id: 'lt2_speed',
    name: 'LT2 Speed',
    nameSv: 'LT2 hastighet',
    category: 'PHYSIOLOGICAL',
    unit: 'km/h',
    extractor: (bundle) => {
      const data = bundle.data
      const threshold = data.physiology.thresholdCalculations[0]
      if (threshold) return threshold.lt2Intensity
      return data.identity.athleteProfile?.lt2Speed ?? null
    },
    sportRelevance: ['RUNNING', 'TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL'],
  },
  {
    id: 'lt2_power',
    name: 'LT2 Power',
    nameSv: 'LT2 effekt',
    category: 'PHYSIOLOGICAL',
    unit: 'W',
    extractor: (bundle) => {
      const data = bundle.data
      const test = getLatestTest(data)
      if (test?.testType === 'CYCLING') {
        const threshold = data.physiology.thresholdCalculations[0]
        return threshold?.lt2Intensity ?? null
      }
      return null
    },
    sportRelevance: ['CYCLING', 'TRIATHLON'],
  },
  {
    id: 'max_hr',
    name: 'Max Heart Rate',
    nameSv: 'Maxpuls',
    category: 'PHYSIOLOGICAL',
    unit: 'bpm',
    extractor: (bundle) => {
      const data = bundle.data
      const test = getLatestTest(data)
      if (test?.maxHR) return test.maxHR
      return data.identity.client?.manualMaxHR ?? null
    },
  },
  {
    id: 'max_lactate',
    name: 'Max Lactate',
    nameSv: 'Max laktat',
    category: 'PHYSIOLOGICAL',
    unit: 'mmol/L',
    extractor: (bundle) => {
      const data = bundle.data
      const test = getLatestTest(data)
      if (test?.maxLactate) return test.maxLactate
      return data.identity.athleteProfile?.maxLactate ?? null
    },
  },
  {
    id: 'resting_hr',
    name: 'Resting Heart Rate',
    nameSv: 'Vilopuls',
    category: 'PHYSIOLOGICAL',
    unit: 'bpm',
    extractor: (bundle) => {
      const data = bundle.data
      return data.identity.athleteProfile?.rhrBaseline ?? null
    },
  },

  // ==================== BODY COMPOSITION ====================
  {
    id: 'weight',
    name: 'Body Weight',
    nameSv: 'Vikt',
    category: 'BODY_COMPOSITION',
    unit: 'kg',
    extractor: (bundle) => {
      const data = bundle.data
      const bc = getLatestBodyComp(data)
      if (bc?.weightKg) return bc.weightKg
      return data.identity.client?.weight ?? null
    },
  },
  {
    id: 'body_fat_pct',
    name: 'Body Fat',
    nameSv: 'Kroppsfett',
    category: 'BODY_COMPOSITION',
    unit: '%',
    extractor: (bundle) => {
      const data = bundle.data
      const bc = getLatestBodyComp(data)
      return bc?.bodyFatPercent ?? null
    },
  },
  {
    id: 'muscle_mass',
    name: 'Muscle Mass',
    nameSv: 'Muskelmassa',
    category: 'BODY_COMPOSITION',
    unit: 'kg',
    extractor: (bundle) => {
      const data = bundle.data
      const bc = getLatestBodyComp(data)
      return bc?.muscleMassKg ?? null
    },
  },
  {
    id: 'bmi',
    name: 'BMI',
    nameSv: 'BMI',
    category: 'BODY_COMPOSITION',
    unit: 'kg/m²',
    extractor: (bundle) => {
      const data = bundle.data
      const bc = getLatestBodyComp(data)
      return bc?.bmi ?? null
    },
  },
  {
    id: 'ffmi',
    name: 'FFMI',
    nameSv: 'FFMI',
    category: 'BODY_COMPOSITION',
    unit: 'kg/m²',
    extractor: (bundle) => {
      const data = bundle.data
      const bc = getLatestBodyComp(data)
      return bc?.ffmi ?? null
    },
  },
  {
    id: 'water_pct',
    name: 'Body Water',
    nameSv: 'Kroppsvätska',
    category: 'BODY_COMPOSITION',
    unit: '%',
    extractor: (bundle) => {
      const data = bundle.data
      const bc = getLatestBodyComp(data)
      return bc?.waterPercent ?? null
    },
  },
  {
    id: 'height_cm',
    name: 'Height',
    nameSv: 'Längd',
    category: 'BODY_COMPOSITION',
    unit: 'cm',
    extractor: (bundle) => {
      const data = bundle.data
      return data.identity.client?.height ?? null
    },
  },
  {
    id: 'visceral_fat',
    name: 'Visceral Fat',
    nameSv: 'Visceralt fett',
    category: 'BODY_COMPOSITION',
    unit: 'level',
    extractor: (bundle) => {
      const data = bundle.data
      const bc = getLatestBodyComp(data)
      return bc?.visceralFat ?? null
    },
  },

  // ==================== TRAINING LOAD ====================
  {
    id: 'daily_load_mean',
    name: 'Avg Daily Load',
    nameSv: 'Snitt daglig belastning',
    category: 'TRAINING_LOAD',
    unit: 'TSS',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.training.trainingLoads, (tl) => tl.dailyLoad)
    },
  },
  {
    id: 'acute_load',
    name: 'Acute Load',
    nameSv: 'Akut belastning',
    category: 'TRAINING_LOAD',
    unit: 'TSS',
    extractor: (bundle) => {
      const data = bundle.data
      const tl = getLatestTrainingLoad(data)
      return tl?.acuteLoad ?? null
    },
  },
  {
    id: 'chronic_load',
    name: 'Chronic Load',
    nameSv: 'Kronisk belastning',
    category: 'TRAINING_LOAD',
    unit: 'TSS',
    extractor: (bundle) => {
      const data = bundle.data
      const tl = getLatestTrainingLoad(data)
      return tl?.chronicLoad ?? null
    },
  },
  {
    id: 'acwr',
    name: 'ACWR',
    nameSv: 'ACWR',
    category: 'TRAINING_LOAD',
    unit: 'ratio',
    extractor: (bundle) => {
      const data = bundle.data
      const tl = getLatestTrainingLoad(data)
      return tl?.acwr ?? null
    },
  },

  // ==================== DAILY MONITORING ====================
  {
    id: 'hrv_mean',
    name: 'HRV (mean)',
    nameSv: 'HRV (snitt)',
    category: 'DAILY_MONITORING',
    unit: 'ms',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyMetrics, (dm) => dm.hrvRMSSD)
    },
  },
  {
    id: 'sleep_quality_mean',
    name: 'Sleep Quality (mean)',
    nameSv: 'Sömnkvalitet (snitt)',
    category: 'DAILY_MONITORING',
    unit: '1-5',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyCheckIns, (dc) => dc.sleepQuality)
    },
  },
  {
    id: 'sleep_hours_mean',
    name: 'Sleep Hours (mean)',
    nameSv: 'Sömntimmar (snitt)',
    category: 'DAILY_MONITORING',
    unit: 'h',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyCheckIns, (dc) => dc.sleepHours)
    },
  },
  {
    id: 'soreness_mean',
    name: 'Soreness (mean)',
    nameSv: 'Träningsömhet (snitt)',
    category: 'DAILY_MONITORING',
    unit: '1-5',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyCheckIns, (dc) => dc.soreness)
    },
  },
  {
    id: 'fatigue_mean',
    name: 'Fatigue (mean)',
    nameSv: 'Trötthet (snitt)',
    category: 'DAILY_MONITORING',
    unit: '1-5',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyCheckIns, (dc) => dc.fatigue)
    },
  },
  {
    id: 'stress_mean',
    name: 'Stress (mean)',
    nameSv: 'Stress (snitt)',
    category: 'DAILY_MONITORING',
    unit: '1-5',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyCheckIns, (dc) => dc.stress)
    },
  },
  {
    id: 'readiness_mean',
    name: 'Readiness (mean)',
    nameSv: 'Beredskap (snitt)',
    category: 'DAILY_MONITORING',
    unit: '0-100',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyMetrics, (dm) => dm.readinessScore)
    },
  },
  {
    id: 'wellness_mean',
    name: 'Wellness Score (mean)',
    nameSv: 'Välmående (snitt)',
    category: 'DAILY_MONITORING',
    unit: '0-100',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyMetrics, (dm) => dm.wellnessScore)
    },
  },

  // ==================== PERFORMANCE (6 new) ====================
  {
    id: 'race_vdot',
    name: 'Race VDOT',
    nameSv: 'Tävlings-VDOT',
    category: 'PERFORMANCE',
    unit: 'VDOT',
    extractor: (bundle) => {
      const data = bundle.data
      const race = data.performance.raceResults[0]
      return race?.vdot ?? null
    },
    sportRelevance: ['RUNNING', 'TRIATHLON'],
  },
  {
    id: 'race_avg_hr',
    name: 'Race Avg HR',
    nameSv: 'Tävling snitt-puls',
    category: 'PERFORMANCE',
    unit: 'bpm',
    extractor: (bundle) => {
      const data = bundle.data
      const race = data.performance.raceResults[0]
      return race?.avgHeartRate ?? null
    },
    sportRelevance: ['RUNNING', 'TRIATHLON', 'CYCLING'],
  },
  {
    id: 'lt_hr_separation',
    name: 'LT HR Separation',
    nameSv: 'LT puls-separation',
    category: 'PERFORMANCE',
    unit: 'bpm',
    extractor: (bundle) => {
      const data = bundle.data
      const threshold = data.physiology.thresholdCalculations[0]
      if (!threshold) return null
      return threshold.lt2Hr - threshold.lt1Hr
    },
  },
  {
    id: 'workout_count_30d',
    name: 'Workouts (30d)',
    nameSv: 'Träningspass (30d)',
    category: 'PERFORMANCE',
    unit: 'count',
    extractor: (bundle) => {
      const data = bundle.data
      return countRecent(data.training.workoutLogs, (w) => w.completedAt ?? new Date(0), 30)
    },
  },
  {
    id: 'workout_avg_rpe',
    name: 'Workout Avg RPE',
    nameSv: 'Träning snitt-RPE',
    category: 'PERFORMANCE',
    unit: '1-10',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.training.workoutLogs, (w) => w.perceivedEffort, 20)
    },
  },
  {
    id: 'workout_compliance_pct',
    name: 'Workout Compliance',
    nameSv: 'Följsamhet',
    category: 'PERFORMANCE',
    unit: '%',
    extractor: (bundle) => {
      const summaries = bundle.weeklySummaries
      if (!summaries || summaries.length === 0) return null
      const recent = summaries[0]
      return recent.compliancePercent ?? null
    },
  },

  // ==================== STRENGTH (6 new) ====================
  {
    id: 'avg_estimated_1rm',
    name: 'Avg Estimated 1RM',
    nameSv: 'Snitt estimerad 1RM',
    category: 'STRENGTH',
    unit: 'kg',
    extractor: (bundle) => {
      const data = bundle.data
      const history = data.performance.oneRepMaxHistory
      if (history.length === 0) return null
      const sum = history.reduce((a, h) => a + h.oneRepMax, 0)
      return sum / history.length
    },
  },
  {
    id: 'progression_avg_rpe',
    name: 'Strength Avg RPE',
    nameSv: 'Styrka snitt-RPE',
    category: 'STRENGTH',
    unit: '1-10',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.performance.progressionTracking, (p) => p.rpe, 20)
    },
  },
  {
    id: 'plateau_weeks_max',
    name: 'Max Plateau Weeks',
    nameSv: 'Max platå veckor',
    category: 'STRENGTH',
    unit: 'weeks',
    extractor: (bundle) => {
      const data = bundle.data
      const tracking = data.performance.progressionTracking
      if (tracking.length === 0) return null
      return Math.max(...tracking.map((p) => p.weeksAtCurrentLoad))
    },
  },
  {
    id: 'strength_sessions_30d',
    name: 'Strength Sessions (30d)',
    nameSv: 'Styrkepass (30d)',
    category: 'STRENGTH',
    unit: 'count',
    extractor: (bundle) => {
      const data = bundle.data
      return countRecent(data.performance.progressionTracking, (p) => p.date, 30)
    },
  },
  {
    id: 'relative_strength',
    name: 'Relative Strength',
    nameSv: 'Relativ styrka',
    category: 'STRENGTH',
    unit: 'ratio',
    extractor: (bundle) => {
      const data = bundle.data
      const history = data.performance.oneRepMaxHistory
      if (history.length === 0) return null
      const best = Math.max(...history.map((h) => h.oneRepMax))
      const weight = data.identity.client?.weight
      if (!weight || weight === 0) return null
      return best / weight
    },
  },
  {
    id: 'exercises_tracked',
    name: 'Exercises Tracked',
    nameSv: 'Övningar spårade',
    category: 'STRENGTH',
    unit: 'count',
    extractor: (bundle) => {
      const data = bundle.data
      const exercises = new Set(data.performance.progressionTracking.map((p) => p.exercise.id))
      return exercises.size > 0 ? exercises.size : null
    },
  },

  // ==================== RECOVERY (4 new) ====================
  {
    id: 'mood_mean',
    name: 'Mood (mean)',
    nameSv: 'Humör (snitt)',
    category: 'RECOVERY',
    unit: '1-5',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyCheckIns, (dc) => dc.mood)
    },
  },
  {
    id: 'motivation_mean',
    name: 'Motivation (mean)',
    nameSv: 'Motivation (snitt)',
    category: 'RECOVERY',
    unit: '1-5',
    extractor: (bundle) => {
      const data = bundle.data
      return meanOfRecent(data.health.dailyCheckIns, (dc) => dc.motivation)
    },
  },
  {
    id: 'injury_count_active',
    name: 'Active Injuries',
    nameSv: 'Aktiva skador',
    category: 'RECOVERY',
    unit: 'count',
    extractor: (bundle) => {
      const data = bundle.data
      const active = data.health.injuryAssessments.filter((ia) => !ia.resolved)
      return active.length
    },
  },
  {
    id: 'cross_training_30d',
    name: 'Cross-training (30d)',
    nameSv: 'Korsträning (30d)',
    category: 'RECOVERY',
    unit: 'count',
    extractor: (bundle) => {
      const data = bundle.data
      return countRecent(data.health.crossTrainingSessions, (ct) => ct.date, 30)
    },
  },

  // ==================== GAIT (6 new) ====================
  {
    id: 'gait_cadence',
    name: 'Running Cadence',
    nameSv: 'Stegfrekvens',
    category: 'GAIT',
    unit: 'spm',
    extractor: (bundle) => {
      const data = bundle.data
      const gait = data.technique.gaitAnalyses[0]
      return gait?.cadence ?? null
    },
    sportRelevance: ['RUNNING', 'TRIATHLON'],
  },
  {
    id: 'gait_ground_contact',
    name: 'Ground Contact Time',
    nameSv: 'Markkontakttid',
    category: 'GAIT',
    unit: 'ms',
    extractor: (bundle) => {
      const data = bundle.data
      const gait = data.technique.gaitAnalyses[0]
      return gait?.groundContactTime ?? null
    },
    sportRelevance: ['RUNNING'],
  },
  {
    id: 'gait_vertical_osc',
    name: 'Vertical Oscillation',
    nameSv: 'Vertikal oscillation',
    category: 'GAIT',
    unit: 'cm',
    extractor: (bundle) => {
      const data = bundle.data
      const gait = data.technique.gaitAnalyses[0]
      return gait?.verticalOscillation ?? null
    },
    sportRelevance: ['RUNNING'],
  },
  {
    id: 'gait_stride_length',
    name: 'Stride Length',
    nameSv: 'Steglängd',
    category: 'GAIT',
    unit: 'm',
    extractor: (bundle) => {
      const data = bundle.data
      const gait = data.technique.gaitAnalyses[0]
      return gait?.strideLength ?? null
    },
    sportRelevance: ['RUNNING'],
  },
  {
    id: 'gait_asymmetry',
    name: 'Gait Asymmetry',
    nameSv: 'Gång-asymmetri',
    category: 'GAIT',
    unit: '%',
    extractor: (bundle) => {
      const data = bundle.data
      const gait = data.technique.gaitAnalyses[0]
      return gait?.asymmetryPercent ?? null
    },
    sportRelevance: ['RUNNING'],
  },
  {
    id: 'gait_score',
    name: 'Gait Score',
    nameSv: 'Löpteknikpoäng',
    category: 'GAIT',
    unit: '0-100',
    extractor: (bundle) => {
      const data = bundle.data
      const gait = data.technique.gaitAnalyses[0]
      return gait?.overallScore ?? null
    },
    sportRelevance: ['RUNNING'],
  },

  // ==================== INTEGRATION (6 new) ====================
  {
    id: 'strava_distance_30d',
    name: 'Strava Distance (30d)',
    nameSv: 'Strava distans (30d)',
    category: 'INTEGRATION',
    unit: 'km',
    extractor: (bundle) => {
      const activities = bundle.strava
      if (!activities || activities.length === 0) return null
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      let total = 0
      for (const a of activities) {
        if (a.startDate >= cutoff && a.distance) {
          total += a.distance / 1000 // meters to km
        }
      }
      return total > 0 ? total : null
    },
  },
  {
    id: 'strava_count_30d',
    name: 'Strava Activities (30d)',
    nameSv: 'Strava aktiviteter (30d)',
    category: 'INTEGRATION',
    unit: 'count',
    extractor: (bundle) => {
      const activities = bundle.strava
      if (!activities || activities.length === 0) return null
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      let count = 0
      for (const a of activities) {
        if (a.startDate >= cutoff) count++
      }
      return count > 0 ? count : null
    },
  },
  {
    id: 'strava_avg_hr',
    name: 'Strava Avg HR',
    nameSv: 'Strava snitt-puls',
    category: 'INTEGRATION',
    unit: 'bpm',
    extractor: (bundle) => {
      const activities = bundle.strava
      if (!activities || activities.length === 0) return null
      const values = activities
        .filter((a) => a.averageHeartrate != null)
        .map((a) => a.averageHeartrate!)
      if (values.length === 0) return null
      return values.reduce((a, b) => a + b, 0) / values.length
    },
  },
  {
    id: 'garmin_training_effect_mean',
    name: 'Garmin Training Effect',
    nameSv: 'Garmin träningseffekt',
    category: 'INTEGRATION',
    unit: '1-5',
    extractor: (bundle) => {
      const activities = bundle.garmin
      if (!activities || activities.length === 0) return null
      const values = activities
        .filter((a) => a.trainingEffect != null)
        .map((a) => a.trainingEffect!)
      if (values.length === 0) return null
      return values.reduce((a, b) => a + b, 0) / values.length
    },
  },
  {
    id: 'garmin_distance_30d',
    name: 'Garmin Distance (30d)',
    nameSv: 'Garmin distans (30d)',
    category: 'INTEGRATION',
    unit: 'km',
    extractor: (bundle) => {
      const activities = bundle.garmin
      if (!activities || activities.length === 0) return null
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      let total = 0
      for (const a of activities) {
        if (a.startDate >= cutoff && a.distance) {
          total += a.distance / 1000
        }
      }
      return total > 0 ? total : null
    },
  },
  {
    id: 'concept2_sessions_30d',
    name: 'Concept2 Sessions (30d)',
    nameSv: 'Concept2 pass (30d)',
    category: 'INTEGRATION',
    unit: 'count',
    extractor: (bundle) => {
      const results = bundle.concept2
      if (!results || results.length === 0) return null
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      let count = 0
      for (const r of results) {
        if (r.date >= cutoff) count++
      }
      return count > 0 ? count : null
    },
  },

  // ==================== TEMPORAL (6 new) ====================
  {
    id: 'hrv_trend_slope',
    name: 'HRV Trend',
    nameSv: 'HRV-trend',
    category: 'TEMPORAL',
    unit: 'ms/day',
    extractor: (bundle) => {
      const data = bundle.data
      const series = extractTimeSeries(
        data.health.dailyMetrics,
        (dm) => dm.date,
        (dm) => dm.hrvRMSSD,
        60
      )
      return trendSlope(series, 5)
    },
  },
  {
    id: 'hrv_cv',
    name: 'HRV Variability (CV)',
    nameSv: 'HRV-variabilitet (CV)',
    category: 'TEMPORAL',
    unit: 'ratio',
    extractor: (bundle) => {
      const data = bundle.data
      const values: number[] = []
      for (let i = 0; i < Math.min(data.health.dailyMetrics.length, 30); i++) {
        const v = data.health.dailyMetrics[i].hrvRMSSD
        if (v != null) values.push(v)
      }
      return coefficientOfVariation(values)
    },
  },
  {
    id: 'sleep_quality_trend',
    name: 'Sleep Quality Trend',
    nameSv: 'Sömnkvalitet-trend',
    category: 'TEMPORAL',
    unit: '/day',
    extractor: (bundle) => {
      const data = bundle.data
      const series = extractTimeSeries(
        data.health.dailyCheckIns,
        (dc) => dc.date,
        (dc) => dc.sleepQuality,
        60
      )
      return trendSlope(series, 5)
    },
  },
  {
    id: 'fatigue_trend',
    name: 'Fatigue Trend',
    nameSv: 'Trötthets-trend',
    category: 'TEMPORAL',
    unit: '/day',
    extractor: (bundle) => {
      const data = bundle.data
      const series = extractTimeSeries(
        data.health.dailyCheckIns,
        (dc) => dc.date,
        (dc) => dc.fatigue,
        60
      )
      return trendSlope(series, 5)
    },
  },
  {
    id: 'load_trend_slope',
    name: 'Training Load Trend',
    nameSv: 'Belastnings-trend',
    category: 'TEMPORAL',
    unit: 'TSS/day',
    extractor: (bundle) => {
      const data = bundle.data
      const series = extractTimeSeries(
        data.training.trainingLoads,
        (tl) => tl.date,
        (tl) => tl.dailyLoad,
        60
      )
      return trendSlope(series, 5)
    },
  },
  {
    id: 'readiness_trend',
    name: 'Readiness Trend',
    nameSv: 'Beredskaps-trend',
    category: 'TEMPORAL',
    unit: '/day',
    extractor: (bundle) => {
      const data = bundle.data
      const series = extractTimeSeries(
        data.health.dailyMetrics,
        (dm) => dm.date,
        (dm) => dm.readinessScore,
        60
      )
      return trendSlope(series, 5)
    },
  },

  // ==================== SPEED & AGILITY (new) ====================
  {
    id: 'sprint_20m_best',
    name: 'Sprint 20m Best',
    nameSv: 'Sprint 20m bästa',
    category: 'PERFORMANCE',
    unit: 's',
    extractor: (bundle) => {
      return getBestSportTest(bundle, 'SPEED', ['SPRINT_20M'], (t) => t.primaryResult)
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL'],
  },
  {
    id: 'sprint_10m_split',
    name: 'Sprint 10m Split',
    nameSv: 'Sprint 10m split',
    category: 'PERFORMANCE',
    unit: 's',
    extractor: (bundle) => {
      return getBestSportTest(bundle, 'SPEED', ['SPRINT_10M'], (t) => t.primaryResult)
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'],
  },
  {
    id: 'agility_t_test',
    name: 'T-Test Agility',
    nameSv: 'T-test agility',
    category: 'PERFORMANCE',
    unit: 's',
    extractor: (bundle) => {
      return getBestSportTest(bundle, 'AGILITY', ['T_TEST'], (t) => t.primaryResult)
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL'],
  },
  {
    id: 'sprint_max_velocity',
    name: 'Max Sprint Velocity',
    nameSv: 'Max sprinthastighet',
    category: 'PERFORMANCE',
    unit: 'm/s',
    extractor: (bundle) => {
      const tests = bundle.sportTests
      if (!tests || tests.length === 0) return null
      const speeds = tests
        .filter((t) => t.category === 'SPEED' && t.maxVelocity != null)
        .map((t) => t.maxVelocity!)
      return speeds.length > 0 ? Math.max(...speeds) : null
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'],
  },

  // ==================== POWER & JUMP (new) ====================
  {
    id: 'cmj_height',
    name: 'CMJ Jump Height',
    nameSv: 'CMJ hopphöjd',
    category: 'STRENGTH',
    unit: 'cm',
    extractor: (bundle) => {
      return getBestSportTest(bundle, 'POWER', ['VERTICAL_JUMP_CMJ'], (t) => t.primaryResult)
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TEAM_HANDBALL'],
  },
  {
    id: 'standing_long_jump',
    name: 'Standing Long Jump',
    nameSv: 'Stående längdhopp',
    category: 'STRENGTH',
    unit: 'm',
    extractor: (bundle) => {
      return getBestSportTest(bundle, 'POWER', ['STANDING_LONG_JUMP'], (t) => t.primaryResult)
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'],
  },
  {
    id: 'jump_relative_power',
    name: 'Jump Relative Power',
    nameSv: 'Hopp relativ effekt',
    category: 'STRENGTH',
    unit: 'W/kg',
    extractor: (bundle) => {
      const tests = bundle.sportTests
      if (!tests || tests.length === 0) return null
      const powerTests = tests
        .filter((t) => t.category === 'POWER' && t.relativePower != null)
      if (powerTests.length === 0) return null
      return Math.max(...powerTests.map((t) => t.relativePower!))
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL'],
  },
  {
    id: 'hockey_musclelab_power_wkg',
    name: 'Hockey MuscleLab Power',
    nameSv: 'Hockey MuscleLab effekt',
    category: 'STRENGTH',
    unit: 'W/kg',
    extractor: (bundle) => getHockeyMaximaValue(bundle, 'maxAveragePowerPerBodyMass'),
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },
  {
    id: 'hockey_musclelab_max_force',
    name: 'Hockey MuscleLab Force',
    nameSv: 'Hockey MuscleLab kraft',
    category: 'STRENGTH',
    unit: 'N',
    extractor: (bundle) => getHockeyMaximaValue(bundle, 'maxAverageForceN'),
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },
  {
    id: 'hockey_back_squat_1rm',
    name: 'Back Squat 1RM',
    nameSv: 'Knäböj 1RM',
    category: 'STRENGTH',
    unit: 'kg',
    extractor: (bundle) => getLatestHockeyTest(bundle)?.backSquat1RM ?? null,
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },
  {
    id: 'hockey_power_clean_1rm',
    name: 'Power Clean 1RM',
    nameSv: 'Power clean 1RM',
    category: 'STRENGTH',
    unit: 'kg',
    extractor: (bundle) => getLatestHockeyTest(bundle)?.powerClean1RM ?? null,
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },
  {
    id: 'hockey_bench_press_1rm',
    name: 'Bench Press 1RM',
    nameSv: 'Bänkpress 1RM',
    category: 'STRENGTH',
    unit: 'kg',
    extractor: (bundle) => getLatestHockeyTest(bundle)?.benchPress1RM ?? null,
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },
  {
    id: 'hockey_grip_strength_max',
    name: 'Max Grip Strength',
    nameSv: 'Max greppstyrka',
    category: 'STRENGTH',
    unit: 'kg',
    extractor: (bundle) => {
      const latest = getLatestHockeyTest(bundle)
      return latest ? bestHockeySide(latest.gripStrengthLeft, latest.gripStrengthRight) : null
    },
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },
  {
    id: 'hockey_ice_sprint_10m',
    name: 'Ice Sprint 10m',
    nameSv: 'Issprint 10m',
    category: 'PERFORMANCE',
    unit: 's',
    extractor: (bundle) => getLatestHockeyTest(bundle)?.sprint10m ?? null,
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },
  {
    id: 'hockey_ice_agility_5_10_5',
    name: 'Ice Agility 5-10-5',
    nameSv: 'Isagility 5-10-5',
    category: 'PERFORMANCE',
    unit: 's',
    extractor: (bundle) => {
      const latest = getLatestHockeyTest(bundle)
      return latest ? bestHockeySide(latest.agility505Left, latest.agility505Right, true) : null
    },
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },

  // ==================== ENDURANCE FIELD TESTS (new) ====================
  {
    id: 'yo_yo_ir1_distance',
    name: 'Yo-Yo IR1 Distance',
    nameSv: 'Yo-Yo IR1 distans',
    category: 'PERFORMANCE',
    unit: 'm',
    extractor: (bundle) => {
      return getBestSportTest(bundle, 'ENDURANCE_FIELD', ['YO_YO_IR1'], (t) => t.distance ?? t.primaryResult)
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_BASKETBALL', 'TEAM_FLOORBALL'],
  },
  {
    id: 'beep_test_level',
    name: 'Beep Test Level',
    nameSv: 'Beep-test nivå',
    category: 'PERFORMANCE',
    unit: 'level',
    extractor: (bundle) => {
      return getBestSportTest(bundle, 'ENDURANCE_FIELD', ['BEEP_TEST'], (t) => t.level ?? t.primaryResult)
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_BASKETBALL'],
  },
  {
    id: 'hockey_beep_test_level',
    name: 'Hockey Beep Test Level',
    nameSv: 'Hockey beep-test nivå',
    category: 'PERFORMANCE',
    unit: 'level',
    extractor: (bundle) => {
      const latest = getLatestHockeyTest(bundle)
      if (!latest?.beepTestLevel) return null
      return latest.beepTestLevel + ((latest.beepTestShuttle ?? 0) / 10)
    },
    sportRelevance: ['TEAM_ICE_HOCKEY'],
  },

  // ==================== ERGOMETER (new) ====================
  {
    id: 'ergo_critical_power',
    name: 'Critical Power',
    nameSv: 'Kritisk effekt',
    category: 'PHYSIOLOGICAL',
    unit: 'W',
    extractor: (bundle) => {
      const tests = bundle.ergometerTests
      if (!tests || tests.length === 0) return null
      const cp = tests.find((t) => t.criticalPower != null)
      return cp?.criticalPower ?? null
    },
    sportRelevance: ['CYCLING', 'TRIATHLON'],
  },
  {
    id: 'ergo_peak_power',
    name: 'Ergometer Peak Power',
    nameSv: 'Ergometer toppeffekt',
    category: 'PHYSIOLOGICAL',
    unit: 'W',
    extractor: (bundle) => {
      const tests = bundle.ergometerTests
      if (!tests || tests.length === 0) return null
      const powers = tests.filter((t) => t.peakPower != null).map((t) => t.peakPower!)
      return powers.length > 0 ? Math.max(...powers) : null
    },
  },
  {
    id: 'ergo_avg_power',
    name: 'Ergometer Avg Power',
    nameSv: 'Ergometer snitteffekt',
    category: 'PHYSIOLOGICAL',
    unit: 'W',
    extractor: (bundle) => {
      const tests = bundle.ergometerTests
      if (!tests || tests.length === 0) return null
      const latest = tests[0] // sorted by testDate desc
      return latest.avgPower ?? null
    },
  },
  {
    id: 'ergo_w_prime',
    name: 'W\' (Anaerobic Capacity)',
    nameSv: 'W\' (anaerob kapacitet)',
    category: 'PHYSIOLOGICAL',
    unit: 'kJ',
    extractor: (bundle) => {
      const tests = bundle.ergometerTests
      if (!tests || tests.length === 0) return null
      const wp = tests.find((t) => t.wPrime != null)
      return wp?.wPrime ?? null
    },
    sportRelevance: ['CYCLING', 'TRIATHLON'],
  },

  // ==================== TIMING GATES (new) ====================
  {
    id: 'timing_gate_best_time',
    name: 'Best Sprint Time (Gates)',
    nameSv: 'Bästa sprinttid (grindar)',
    category: 'PERFORMANCE',
    unit: 's',
    extractor: (bundle) => {
      const results = bundle.timingGateResults
      if (!results || results.length === 0) return null
      const valid = results.filter((r) => r.valid && r.totalTime > 0)
      if (valid.length === 0) return null
      return Math.min(...valid.map((r) => r.totalTime))
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'],
  },
  {
    id: 'timing_gate_max_velocity',
    name: 'Max Velocity (Gates)',
    nameSv: 'Max hastighet (grindar)',
    category: 'PERFORMANCE',
    unit: 'm/s',
    extractor: (bundle) => {
      const results = bundle.timingGateResults
      if (!results || results.length === 0) return null
      const speeds = results
        .filter((r) => r.valid && r.maxVelocity != null)
        .map((r) => r.maxVelocity!)
      return speeds.length > 0 ? Math.max(...speeds) : null
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL'],
  },
  {
    id: 'timing_gate_cod_deficit',
    name: 'COD Deficit',
    nameSv: 'COD-deficit',
    category: 'PERFORMANCE',
    unit: '%',
    extractor: (bundle) => {
      const results = bundle.timingGateResults
      if (!results || results.length === 0) return null
      const cod = results.find((r) => r.valid && r.codDeficit != null)
      return cod?.codDeficit ?? null
    },
    sportRelevance: ['TEAM_FOOTBALL', 'TEAM_HANDBALL', 'TEAM_BASKETBALL'],
  },

  // ==================== MOVEMENT QUALITY (new) ====================
  {
    id: 'movement_screen_score',
    name: 'Movement Screen Score',
    nameSv: 'Rörelsescreening poäng',
    category: 'RECOVERY',
    unit: '0-21',
    extractor: (bundle) => {
      const screens = bundle.movementScreens
      if (!screens || screens.length === 0) return null
      return screens[0].totalScore ?? null
    },
  },
  {
    id: 'movement_asymmetry',
    name: 'Movement Asymmetry',
    nameSv: 'Rörelseasymmetri',
    category: 'RECOVERY',
    unit: '0/1',
    extractor: (bundle) => {
      const screens = bundle.movementScreens
      if (!screens || screens.length === 0) return null
      return screens[0].asymmetryFlag ? 1 : 0
    },
  },
]

/**
 * Get variables by category
 */
export function getVariablesByCategory(category: VariableCategory): MVAVariable[] {
  return MVA_VARIABLE_REGISTRY.filter((v) => v.category === category)
}

/**
 * Get a variable by ID
 */
export function getVariableById(id: string): MVAVariable | undefined {
  return MVA_VARIABLE_REGISTRY.find((v) => v.id === id)
}

/**
 * Category display names in Swedish
 */
export const CATEGORY_NAMES_SV: Record<VariableCategory, string> = {
  PHYSIOLOGICAL: 'Fysiologiska',
  BODY_COMPOSITION: 'Kroppssammansättning',
  TRAINING_LOAD: 'Träningsbelastning',
  DAILY_MONITORING: 'Daglig uppföljning',
  PERFORMANCE: 'Prestation',
  STRENGTH: 'Styrka',
  RECOVERY: 'Återhämtning',
  GAIT: 'Löpteknik',
  INTEGRATION: 'Integrationer',
  TEMPORAL: 'Trender',
}
