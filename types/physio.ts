// types/physio.ts

import type { UserRole } from './core'

// ==================== PHYSIOTHERAPIST SYSTEM ====================

export type TreatmentType =
  | 'ASSESSMENT'
  | 'MANUAL_THERAPY'
  | 'DRY_NEEDLING'
  | 'EXERCISE_THERAPY'
  | 'ELECTROTHERAPY'
  | 'TAPING'
  | 'EDUCATION'
  | 'DISCHARGE'
  | 'OTHER'

export type PhysioAssignmentRole = 'PRIMARY' | 'SECONDARY' | 'CONSULTANT'

export type RehabPhase =
  | 'ACUTE'
  | 'SUBACUTE'
  | 'REMODELING'
  | 'FUNCTIONAL'
  | 'RETURN_TO_SPORT'

export type RestrictionType =
  | 'NO_RUNNING'
  | 'NO_JUMPING'
  | 'NO_IMPACT'
  | 'NO_UPPER_BODY'
  | 'NO_LOWER_BODY'
  | 'REDUCED_VOLUME'
  | 'REDUCED_INTENSITY'
  | 'MODIFIED_ONLY'
  | 'SPECIFIC_EXERCISES'
  | 'CUSTOM'

export type RestrictionSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'COMPLETE'

export type RestrictionSource =
  | 'INJURY_CASCADE'
  | 'PHYSIO_MANUAL'
  | 'COACH_MANUAL'
  | 'SYSTEM_AUTO'

export type InjuryMechanism = 'CONTACT' | 'NON_CONTACT' | 'OVERUSE' | 'UNKNOWN'

export type InjuryUrgency = 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'LOW'

export type CareTeamThreadStatus = 'OPEN' | 'RESOLVED' | 'ARCHIVED'

export type CareTeamThreadPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'

export type MovementScreenType = 'FMS' | 'SFMA' | 'Y_BALANCE' | 'CUSTOM'

export interface PhysioAssignment {
  id: string
  physioUserId: string
  clientId?: string | null
  teamId?: string | null
  organizationId?: string | null
  businessId?: string | null
  locationId?: string | null
  role: PhysioAssignmentRole
  canModifyPrograms: boolean
  canCreateRestrictions: boolean
  canViewFullHistory: boolean
  isActive: boolean
  startDate: string
  endDate?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  physio?: {
    id: string
    name: string
    email: string
  }
  client?: {
    id: string
    name: string
  } | null
  team?: {
    id: string
    name: string
  } | null
}

export interface TreatmentSession {
  id: string
  physioUserId: string
  clientId: string
  injuryId?: string | null
  sessionDate: string
  duration?: number | null
  treatmentType: TreatmentType
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  painBefore?: number | null
  painAfter?: number | null
  romMeasurements?: Record<string, unknown> | null
  modalitiesUsed: string[]
  followUpRequired: boolean
  followUpDate?: string | null
  followUpNotes?: string | null
  isBillable: boolean
  billingCode?: string | null
  createdAt: string
  updatedAt: string
  physio?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

export interface RehabProgram {
  id: string
  physioUserId: string
  clientId: string
  injuryId?: string | null
  name: string
  description?: string | null
  currentPhase: RehabPhase
  phaseStartDate: string
  startDate: string
  estimatedEndDate?: string | null
  actualEndDate?: string | null
  shortTermGoals: string[]
  longTermGoals: string[]
  contraindications: string[]
  precautions: string[]
  acceptablePainDuring: number
  acceptablePainAfter: number
  status: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  exercises?: RehabExercise[]
  milestones?: RehabMilestone[]
  physio?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

export interface RehabExercise {
  id: string
  programId: string
  exerciseId: string
  sets?: number | null
  reps?: string | null
  duration?: number | null
  frequency?: string | null
  intensity?: string | null
  progressionCriteria?: string | null
  regressionCriteria?: string | null
  phases: RehabPhase[]
  order: number
  notes?: string | null
  cuePoints: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  exercise?: {
    id: string
    name: string
    videoUrl?: string | null
  }
}

export interface RehabMilestone {
  id: string
  programId: string
  name: string
  description?: string | null
  criteria?: string | null
  criteriaJson?: Record<string, unknown> | null
  phase: RehabPhase
  targetDate?: string | null
  achievedDate?: string | null
  isAchieved: boolean
  notes?: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface RehabProgressLog {
  id: string
  programId: string
  clientId: string
  date: string
  exercisesCompleted: string[]
  completionPercent?: number | null
  painDuring?: number | null
  painAfter?: number | null
  difficultyRating?: number | null
  notes?: string | null
  physioReviewed: boolean
  physioNotes?: string | null
  physioReviewedAt?: string | null
  physioReviewedBy?: string | null
  createdAt: string
}

export interface TrainingRestriction {
  id: string
  clientId: string
  createdById: string
  injuryId?: string | null
  type: RestrictionType
  severity: RestrictionSeverity
  source: RestrictionSource
  bodyParts: string[]
  affectedWorkoutTypes: string[]
  affectedExerciseIds: string[]
  startDate: string
  endDate?: string | null
  volumeReductionPercent?: number | null
  maxIntensityZone?: number | null
  description?: string | null
  reason?: string | null
  isActive: boolean
  clearedAt?: string | null
  clearedById?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
}

export interface MovementScreen {
  id: string
  physioUserId: string
  clientId: string
  screenDate: string
  screenType: MovementScreenType
  results: Record<string, unknown>
  totalScore?: number | null
  asymmetryFlag: boolean
  previousScreenId?: string | null
  improvement?: string | null
  recommendations: string[]
  priorityAreas: string[]
  notes?: string | null
  createdAt: string
  updatedAt: string
  physio?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

export interface AcuteInjuryReport {
  id: string
  reporterId: string
  clientId: string
  injuryId?: string | null
  reportDate: string
  incidentDate: string
  incidentTime?: string | null
  mechanism: InjuryMechanism
  bodyPart: string
  side?: string | null
  description?: string | null
  urgency: InjuryUrgency
  initialSeverity: number
  activityType?: string | null
  surfaceType?: string | null
  equipmentInvolved?: string | null
  immediateCareGiven?: string | null
  iceApplied: boolean
  removedFromPlay: boolean
  ambulanceCalled: boolean
  referralNeeded: boolean
  referralType?: string | null
  referralUrgency?: string | null
  physioNotified: boolean
  physioNotifiedAt?: string | null
  coachNotified: boolean
  coachNotifiedAt?: string | null
  followUpScheduled?: string | null
  status: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  reporter?: {
    id: string
    name: string
    role: UserRole
  }
  client?: {
    id: string
    name: string
  }
}

export interface CareTeamThread {
  id: string
  clientId: string
  createdById: string
  subject: string
  description?: string | null
  injuryId?: string | null
  rehabProgramId?: string | null
  restrictionId?: string | null
  status: CareTeamThreadStatus
  priority: CareTeamThreadPriority
  lastMessageAt?: string | null
  resolvedAt?: string | null
  resolvedById?: string | null
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
  messages?: CareTeamMessage[]
  participants?: CareTeamParticipant[]
}

export interface CareTeamMessage {
  id: string
  threadId: string
  senderId: string
  content: string
  mentionedUserIds: string[]
  attachments?: { url: string; name: string; type: string }[] | null
  readByUserIds: string[]
  createdAt: string
  updatedAt: string
  sender?: {
    id: string
    name: string
    role: UserRole
  }
}

export interface CareTeamParticipant {
  id: string
  threadId: string
  userId: string
  role: string
  notifyEmail: boolean
  notifyPush: boolean
  lastReadAt?: string | null
  lastViewedAt?: string | null
  isActive: boolean
  mutedUntil?: string | null
  joinedAt: string
  user?: {
    id: string
    name: string
    role: UserRole
  }
}
