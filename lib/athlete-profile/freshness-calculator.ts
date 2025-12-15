/**
 * Data Freshness Calculator for Athlete Profile
 * Calculates staleness of different data sources for AI context panel
 */

export type FreshnessStatus = 'fresh' | 'stale' | 'expired' | 'missing'

export interface DataSourceStatus {
  name: string
  nameSv: string
  available: boolean
  recordCount: number
  lastUpdated: Date | null
  freshnessStatus: FreshnessStatus
  freshnessLabel: string
  daysOld: number | null
}

// Freshness thresholds in days (fresh, stale - beyond stale is expired)
const FRESHNESS_THRESHOLDS: Record<string, { fresh: number; stale: number }> = {
  // High-frequency data (daily/weekly)
  dailyCheckIn: { fresh: 1, stale: 7 },
  dailyMetrics: { fresh: 1, stale: 7 },
  trainingLoad: { fresh: 3, stale: 14 },
  workoutLog: { fresh: 7, stale: 30 },

  // Medium-frequency data (monthly)
  bodyComposition: { fresh: 30, stale: 90 },
  fieldTest: { fresh: 30, stale: 60 },
  videoAnalysis: { fresh: 30, stale: 90 },
  selfReportedLactate: { fresh: 14, stale: 30 },
  menstrualCycle: { fresh: 35, stale: 70 },

  // Low-frequency data (quarterly/yearly)
  test: { fresh: 90, stale: 180 },
  raceResult: { fresh: 180, stale: 365 },
  thresholdCalculation: { fresh: 90, stale: 180 },

  // Status-based (not time-based)
  injuryAssessment: { fresh: 30, stale: 90 },
  crossTrainingSession: { fresh: 30, stale: 90 },

  // Profile data (rarely changes)
  sportProfile: { fresh: 365, stale: 730 },
  athleteProfile: { fresh: 180, stale: 365 },
  trainingProgram: { fresh: 90, stale: 180 },
}

/**
 * Calculate freshness status for a single data source
 */
export function calculateFreshness(
  lastDate: Date | null,
  type: keyof typeof FRESHNESS_THRESHOLDS
): { status: FreshnessStatus; daysOld: number | null } {
  if (!lastDate) {
    return { status: 'missing', daysOld: null }
  }

  const now = new Date()
  const diffMs = now.getTime() - new Date(lastDate).getTime()
  const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const thresholds = FRESHNESS_THRESHOLDS[type]
  if (!thresholds) {
    return { status: 'fresh', daysOld }
  }

  if (daysOld <= thresholds.fresh) {
    return { status: 'fresh', daysOld }
  }
  if (daysOld <= thresholds.stale) {
    return { status: 'stale', daysOld }
  }
  return { status: 'expired', daysOld }
}

/**
 * Get Swedish label for freshness status
 */
export function getFreshnessLabel(status: FreshnessStatus, daysOld: number | null): string {
  switch (status) {
    case 'fresh':
      if (daysOld === 0) return 'Idag'
      if (daysOld === 1) return 'Igår'
      return `${daysOld} dagar sedan`
    case 'stale':
      if (daysOld && daysOld < 30) return `${daysOld} dagar sedan`
      if (daysOld && daysOld < 60) return `~${Math.round(daysOld / 7)} veckor sedan`
      return `~${Math.round((daysOld || 0) / 30)} månader sedan`
    case 'expired':
      if (daysOld && daysOld < 365) return `~${Math.round(daysOld / 30)} månader sedan`
      return `>${Math.round((daysOld || 0) / 365)} år sedan`
    case 'missing':
      return 'Ingen data'
  }
}

/**
 * Get color class for freshness status
 */
export function getFreshnessColorClass(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh':
      return 'text-green-600 bg-green-100'
    case 'stale':
      return 'text-yellow-600 bg-yellow-100'
    case 'expired':
      return 'text-orange-600 bg-orange-100'
    case 'missing':
      return 'text-gray-400 bg-gray-100'
  }
}

/**
 * Get dot color class for freshness indicator
 */
export function getFreshnessDotClass(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh':
      return 'bg-green-500'
    case 'stale':
      return 'bg-yellow-500'
    case 'expired':
      return 'bg-orange-500'
    case 'missing':
      return 'bg-gray-300'
  }
}

/**
 * Build data source status for AI context sidebar
 */
export function buildDataSourceStatuses(data: {
  tests: { testDate: Date }[]
  fieldTests: { date: Date }[]
  raceResults: { raceDate: Date }[]
  bodyCompositions: { measurementDate: Date }[]
  dailyCheckIns: { date: Date }[]
  dailyMetrics: { date: Date }[]
  videoAnalyses: { createdAt: Date }[]
  injuryAssessments: { date: Date }[]
  trainingLoads: { date: Date }[]
  progressionTracking: { date: Date }[]
  menstrualCycles: { startDate: Date }[]
  sportProfile: { id: string } | null
  athleteProfile: { id: string } | null
}): DataSourceStatus[] {
  const sources: DataSourceStatus[] = []

  // Lab Tests
  const latestTest = data.tests[0]?.testDate || null
  const testFreshness = calculateFreshness(latestTest, 'test')
  sources.push({
    name: 'test',
    nameSv: 'Labbtest',
    available: data.tests.length > 0,
    recordCount: data.tests.length,
    lastUpdated: latestTest,
    freshnessStatus: testFreshness.status,
    freshnessLabel: getFreshnessLabel(testFreshness.status, testFreshness.daysOld),
    daysOld: testFreshness.daysOld,
  })

  // Field Tests
  const latestFieldTest = data.fieldTests[0]?.date || null
  const fieldTestFreshness = calculateFreshness(latestFieldTest, 'fieldTest')
  sources.push({
    name: 'fieldTest',
    nameSv: 'Fälttest',
    available: data.fieldTests.length > 0,
    recordCount: data.fieldTests.length,
    lastUpdated: latestFieldTest,
    freshnessStatus: fieldTestFreshness.status,
    freshnessLabel: getFreshnessLabel(fieldTestFreshness.status, fieldTestFreshness.daysOld),
    daysOld: fieldTestFreshness.daysOld,
  })

  // Race Results
  const latestRace = data.raceResults[0]?.raceDate || null
  const raceFreshness = calculateFreshness(latestRace, 'raceResult')
  sources.push({
    name: 'raceResult',
    nameSv: 'Tävlingsresultat',
    available: data.raceResults.length > 0,
    recordCount: data.raceResults.length,
    lastUpdated: latestRace,
    freshnessStatus: raceFreshness.status,
    freshnessLabel: getFreshnessLabel(raceFreshness.status, raceFreshness.daysOld),
    daysOld: raceFreshness.daysOld,
  })

  // Body Composition
  const latestBodyComp = data.bodyCompositions[0]?.measurementDate || null
  const bodyCompFreshness = calculateFreshness(latestBodyComp, 'bodyComposition')
  sources.push({
    name: 'bodyComposition',
    nameSv: 'Kroppssammansättning',
    available: data.bodyCompositions.length > 0,
    recordCount: data.bodyCompositions.length,
    lastUpdated: latestBodyComp,
    freshnessStatus: bodyCompFreshness.status,
    freshnessLabel: getFreshnessLabel(bodyCompFreshness.status, bodyCompFreshness.daysOld),
    daysOld: bodyCompFreshness.daysOld,
  })

  // Daily Check-ins
  const latestCheckIn = data.dailyCheckIns[0]?.date || null
  const checkInFreshness = calculateFreshness(latestCheckIn, 'dailyCheckIn')
  sources.push({
    name: 'dailyCheckIn',
    nameSv: 'Daglig incheckning',
    available: data.dailyCheckIns.length > 0,
    recordCount: data.dailyCheckIns.length,
    lastUpdated: latestCheckIn,
    freshnessStatus: checkInFreshness.status,
    freshnessLabel: getFreshnessLabel(checkInFreshness.status, checkInFreshness.daysOld),
    daysOld: checkInFreshness.daysOld,
  })

  // Video Analysis
  const latestVideo = data.videoAnalyses[0]?.createdAt || null
  const videoFreshness = calculateFreshness(latestVideo, 'videoAnalysis')
  sources.push({
    name: 'videoAnalysis',
    nameSv: 'Videoanalys',
    available: data.videoAnalyses.length > 0,
    recordCount: data.videoAnalyses.length,
    lastUpdated: latestVideo,
    freshnessStatus: videoFreshness.status,
    freshnessLabel: getFreshnessLabel(videoFreshness.status, videoFreshness.daysOld),
    daysOld: videoFreshness.daysOld,
  })

  // Injury Assessments
  const latestInjury = data.injuryAssessments[0]?.date || null
  const injuryFreshness = calculateFreshness(latestInjury, 'injuryAssessment')
  sources.push({
    name: 'injuryAssessment',
    nameSv: 'Skadebedömning',
    available: data.injuryAssessments.length > 0,
    recordCount: data.injuryAssessments.length,
    lastUpdated: latestInjury,
    freshnessStatus: injuryFreshness.status,
    freshnessLabel: getFreshnessLabel(injuryFreshness.status, injuryFreshness.daysOld),
    daysOld: injuryFreshness.daysOld,
  })

  // Training Load
  const latestLoad = data.trainingLoads[0]?.date || null
  const loadFreshness = calculateFreshness(latestLoad, 'trainingLoad')
  sources.push({
    name: 'trainingLoad',
    nameSv: 'Träningsbelastning',
    available: data.trainingLoads.length > 0,
    recordCount: data.trainingLoads.length,
    lastUpdated: latestLoad,
    freshnessStatus: loadFreshness.status,
    freshnessLabel: getFreshnessLabel(loadFreshness.status, loadFreshness.daysOld),
    daysOld: loadFreshness.daysOld,
  })

  // Strength Progression
  const latestProgression = data.progressionTracking[0]?.date || null
  const progressionFreshness = calculateFreshness(latestProgression, 'workoutLog')
  sources.push({
    name: 'strengthProgression',
    nameSv: 'Styrke-PRs',
    available: data.progressionTracking.length > 0,
    recordCount: data.progressionTracking.length,
    lastUpdated: latestProgression,
    freshnessStatus: progressionFreshness.status,
    freshnessLabel: getFreshnessLabel(progressionFreshness.status, progressionFreshness.daysOld),
    daysOld: progressionFreshness.daysOld,
  })

  // Menstrual Tracking (only include if data exists)
  if (data.menstrualCycles.length > 0) {
    const latestCycle = data.menstrualCycles[0]?.startDate || null
    const cycleFreshness = calculateFreshness(latestCycle, 'menstrualCycle')
    sources.push({
      name: 'menstrualCycle',
      nameSv: 'Menscykel',
      available: true,
      recordCount: data.menstrualCycles.length,
      lastUpdated: latestCycle,
      freshnessStatus: cycleFreshness.status,
      freshnessLabel: getFreshnessLabel(cycleFreshness.status, cycleFreshness.daysOld),
      daysOld: cycleFreshness.daysOld,
    })
  }

  return sources
}

/**
 * Calculate overall data quality score (0-100)
 */
export function calculateDataQualityScore(statuses: DataSourceStatus[]): number {
  if (statuses.length === 0) return 0

  const weights: Record<string, number> = {
    test: 15,
    raceResult: 12,
    bodyComposition: 10,
    dailyCheckIn: 10,
    fieldTest: 8,
    videoAnalysis: 8,
    trainingLoad: 8,
    strengthProgression: 8,
    injuryAssessment: 5,
    menstrualCycle: 5,
  }

  let totalWeight = 0
  let weightedScore = 0

  for (const status of statuses) {
    const weight = weights[status.name] || 5
    totalWeight += weight

    let score = 0
    if (status.freshnessStatus === 'fresh') score = 100
    else if (status.freshnessStatus === 'stale') score = 60
    else if (status.freshnessStatus === 'expired') score = 30
    // missing = 0

    weightedScore += score * weight
  }

  return Math.round(weightedScore / totalWeight)
}

/**
 * Get data quality label
 */
export function getDataQualityLabel(score: number): { label: string; colorClass: string } {
  if (score >= 80) return { label: 'Utmärkt', colorClass: 'text-green-600' }
  if (score >= 60) return { label: 'Bra', colorClass: 'text-blue-600' }
  if (score >= 40) return { label: 'Godkänd', colorClass: 'text-yellow-600' }
  if (score >= 20) return { label: 'Bristfällig', colorClass: 'text-orange-600' }
  return { label: 'Otillräcklig', colorClass: 'text-red-600' }
}
