// types/video-analysis.ts

// ============================================
// Skiing Video Analysis Types
// ============================================

export type SkiingVideoType = 'SKIING_CLASSIC' | 'SKIING_SKATING' | 'SKIING_DOUBLE_POLE'
export type SkiingTechniqueType = 'CLASSIC' | 'SKATING' | 'DOUBLE_POLE'
export type SkatingVariant = 'V1' | 'V2' | 'V2_ALT'
export type PoleTiming = 'EARLY' | 'ON_TIME' | 'LATE'
export type ForceApplication = 'GOOD' | 'WEAK' | 'INCONSISTENT'
export type KickExtension = 'FULL' | 'PARTIAL' | 'INCOMPLETE'
export type EngagementLevel = 'GOOD' | 'MODERATE' | 'POOR'
export type RecoveryPattern = 'EFFICIENT' | 'MODERATE' | 'INEFFICIENT'
export type LegPath = 'COMPACT' | 'WIDE' | 'INCONSISTENT'
export type CompressionDepth = 'SHALLOW' | 'OPTIMAL' | 'EXCESSIVE'
export type ReturnSpeed = 'FAST' | 'MODERATE' | 'SLOW'
export type LegDriveContribution = 'SIGNIFICANT' | 'MODERATE' | 'MINIMAL'
export type LegDriveTiming = 'SYNCHRONIZED' | 'EARLY' | 'LATE'
export type TerrainType = 'FLAT' | 'UPHILL' | 'DOWNHILL'

export interface SkiingDrill {
  drill: string
  focus: string
  priority: number
}

export interface SkiingTechniqueAnalysis {
  id: string
  videoAnalysisId: string
  techniqueType: SkiingTechniqueType
  skatingVariant?: SkatingVariant
  terrainType?: TerrainType

  // Overall scores (0-100)
  overallScore?: number
  balanceScore?: number
  timingScore?: number
  efficiencyScore?: number

  // Pole mechanics
  poleAngleAtPlant?: number
  poleAngleAtRelease?: number
  polePlantTiming?: PoleTiming
  poleForceApplication?: ForceApplication
  armSwingSymmetry?: number

  // Hip and core
  hipPositionScore?: number
  hipHeightConsistency?: number
  coreEngagement?: EngagementLevel
  forwardLean?: number

  // Weight transfer
  weightTransferScore?: number
  weightShiftTiming?: PoleTiming
  lateralStability?: number

  // Classic-specific
  kickTimingScore?: number
  kickExtension?: KickExtension
  glidePhaseDuration?: number
  legRecoveryPattern?: RecoveryPattern
  waxPocketEngagement?: EngagementLevel

  // Skating-specific
  edgeAngleLeft?: number
  edgeAngleRight?: number
  edgeAngleSymmetry?: number
  pushOffAngle?: number
  vPatternWidth?: number
  skateFrequency?: number
  recoveryLegPath?: LegPath

  // Double pole-specific
  trunkFlexionRange?: number
  compressionDepth?: CompressionDepth
  returnPhaseSpeed?: ReturnSpeed
  legDriveContribution?: LegDriveContribution
  rhythmConsistency?: number

  // AI insights
  primaryStrengths?: string[]
  primaryWeaknesses?: string[]
  techniqueDrills?: SkiingDrill[]
  comparisonToElite?: string

  createdAt: Date
  updatedAt: Date
}

// ============================================
// HYROX Video Analysis Types
// ============================================

export type HyroxStationType =
  | 'SKIERG'
  | 'SLED_PUSH'
  | 'SLED_PULL'
  | 'BURPEE_BROAD_JUMP'
  | 'ROWING'
  | 'FARMERS_CARRY'
  | 'SANDBAG_LUNGE'
  | 'WALL_BALLS'

export type BreathingPattern = 'GOOD' | 'INCONSISTENT' | 'POOR'
export type BenchmarkLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'

// SkiErg specific
export type PullLength = 'SHORT' | 'OPTIMAL' | 'LONG'
export type HipHingeDepth = 'SHALLOW' | 'OPTIMAL' | 'EXCESSIVE'
export type ArmExtension = 'INCOMPLETE' | 'FULL' | 'OVEREXTENDED'

// Sled Push specific
export type ArmLockout = 'BENT' | 'LOCKED' | 'OVEREXTENDED'
export type StrideLength = 'SHORT' | 'OPTIMAL' | 'OVERSTRIDING'
export type DrivePhase = 'WEAK' | 'GOOD' | 'POWERFUL'

// Sled Pull specific
export type PullTechnique = 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'MIXED'
export type RopePath = 'STRAIGHT' | 'DIAGONAL' | 'INCONSISTENT'
export type AnchorStability = 'STABLE' | 'SHIFTING' | 'UNSTABLE'

// Burpee Broad Jump specific
export type BurpeeDepth = 'SHALLOW' | 'FULL' | 'EXCESSIVE'
export type JumpDistance = 'SHORT' | 'GOOD' | 'EXCELLENT'
export type TransitionSpeed = 'SLOW' | 'MODERATE' | 'FAST'
export type LandingMechanics = 'POOR' | 'ACCEPTABLE' | 'GOOD'

// Rowing specific
export type DriveSequence = 'CORRECT' | 'ARMS_EARLY' | 'BACK_EARLY'
export type CatchPosition = 'COMPRESSED' | 'OPTIMAL' | 'OVERREACHING'
export type PowerApplication = 'FRONT_LOADED' | 'EVEN' | 'BACK_LOADED'

// Farmers Carry specific
export type ShoulderPack = 'ELEVATED' | 'PACKED' | 'DEPRESSED'
export type TrunkPosture = 'UPRIGHT' | 'LEANING' | 'SWAYING'
export type StridePattern = 'SHORT_CHOPPY' | 'SMOOTH' | 'OVERSTRIDING'
export type GripFatigue = 'NONE' | 'MODERATE' | 'SIGNIFICANT'

// Sandbag Lunge specific
export type BagPosition = 'HIGH_CHEST' | 'SHOULDER' | 'DROPPING'
export type KneeTracking = 'GOOD' | 'VALGUS' | 'VARUS'
export type TorsoPosition = 'UPRIGHT' | 'FORWARD_LEAN' | 'EXCESSIVE_LEAN'

// Wall Balls specific
export type SquatDepth = 'SHALLOW' | 'PARALLEL' | 'DEEP'
export type ThrowMechanics = 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'COORDINATED'
export type WallBallCatchHeight = 'HIGH' | 'OPTIMAL' | 'LOW'

export interface HyroxDrill {
  drill: string
  focus: string
  priority: number
}

export interface HyroxFatigueIndicators {
  earlyPhase: string[]
  latePhase: string[]
}

export interface HyroxStationAnalysis {
  id: string
  videoAnalysisId: string
  stationType: HyroxStationType

  // Overall assessment (0-100)
  overallScore?: number
  efficiencyScore?: number
  formScore?: number
  paceConsistency?: number

  // Movement quality
  coreStability?: number
  breathingPattern?: BreathingPattern
  movementEconomy?: number

  // Pace analysis
  movementCadence?: number
  cadenceVariation?: number
  restPauses?: number

  // Fatigue indicators
  fatigueIndicators?: HyroxFatigueIndicators
  formDegradation?: number

  // Station-specific metrics (varies by station)
  stationMetrics?: Record<string, unknown>

  // SkiErg specific
  pullLength?: PullLength
  hipHingeDepth?: HipHingeDepth
  armExtension?: ArmExtension
  legDriveContribution?: LegDriveContribution

  // Sled Push specific
  bodyAngle?: number
  armLockout?: ArmLockout
  strideLength?: StrideLength
  drivePhase?: DrivePhase

  // Sled Pull specific
  pullTechnique?: PullTechnique
  ropePath?: RopePath
  anchorStability?: AnchorStability

  // Burpee Broad Jump specific
  burpeeDepth?: BurpeeDepth
  jumpDistance?: JumpDistance
  transitionSpeed?: TransitionSpeed
  landingMechanics?: LandingMechanics

  // Rowing specific
  driveSequence?: DriveSequence
  laybackAngle?: number
  catchPosition?: CatchPosition
  strokeRate?: number
  powerApplication?: PowerApplication

  // Farmers Carry specific
  shoulderPack?: ShoulderPack
  trunkPosture?: TrunkPosture
  stridePattern?: StridePattern
  gripFatigue?: GripFatigue

  // Sandbag Lunge specific
  bagPosition?: BagPosition
  kneeTracking?: KneeTracking
  stepLength?: StrideLength
  torsoPosition?: TorsoPosition

  // Wall Balls specific
  squatDepth?: SquatDepth
  throwMechanics?: ThrowMechanics
  wallBallCatchHeight?: WallBallCatchHeight
  rhythmConsistency?: number

  // Benchmark comparison
  benchmarkLevel?: BenchmarkLevel
  estimatedStationTime?: number

  // Athlete profile integration
  isWeakStation?: boolean
  isStrongStation?: boolean

  // AI insights
  primaryStrengths?: string[]
  primaryWeaknesses?: string[]
  improvementDrills?: HyroxDrill[]
  raceStrategyTips?: string[]

  createdAt: Date
  updatedAt: Date
}
