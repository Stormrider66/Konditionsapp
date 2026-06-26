import type { StaffPermissions } from '@/lib/permissions/staff-roles'
import type { AthleteCapabilities } from '@/lib/ai/athlete-prompts'

export type AiCapabilityRole = 'COACH' | 'ATHLETE'
export type AiCapabilitySurface = 'coach_chat' | 'athlete_chat'
export type AiCapabilityActionType = 'read' | 'navigation' | 'write' | 'send' | 'delete' | 'major_edit'
export type AiCapabilityRiskLevel = 'low' | 'medium' | 'high'

export interface AiCapabilityDefinition {
  id: string
  label: string
  description: string
  role: AiCapabilityRole
  surface: AiCapabilitySurface
  actionType: AiCapabilityActionType
  riskLevel: AiCapabilityRiskLevel
  requiresConfirmation: boolean
  requiredStaffPermissions?: Array<keyof StaffPermissions>
  requiresAthleteConsent?: boolean
  requiresAthleteProgramGeneration?: boolean
  confirmLabel?: string
  reviewHref?: string
  internal?: boolean
}

export interface AiCapabilityFilterContext {
  role: AiCapabilityRole
  operationsEnabled: boolean
  staffPermissions?: StaffPermissions
  athleteCapabilities?: AthleteCapabilities
  hasAthleteConsent?: boolean
}

export const AI_CAPABILITY_REGISTRY: AiCapabilityDefinition[] = [
  {
    id: 'listAthletes',
    label: 'List athletes',
    description: 'Find athletes the coach can access.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'findAthleteByName',
    label: 'Find athlete',
    description: 'Resolve one athlete by name or id.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'getLatestCompletedWorkout',
    label: 'Latest completed workout',
    description: 'Read an athlete latest completed workout.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'getTeamCalendarBriefing',
    label: 'Team calendar briefing',
    description: 'Summarize team calendar planning state.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewCalendar'],
  },
  {
    id: 'getTeamPlannedWorkout',
    label: 'Get planned team workout',
    description: 'Read a planned team calendar workout.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewCalendar'],
  },
  {
    id: 'suggestCoachNavigation',
    label: 'Navigation shortcut',
    description: 'Suggest a safe coach navigation target.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'navigation',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'getAthletesNeedingAttention',
    label: 'Athletes needing attention',
    description: 'Read active coach alerts (readiness drops, missed check-ins/workouts, pain, high ACWR).',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'getAthleteStatusSummary',
    label: 'Athlete status summary',
    description: 'Read one athlete\'s latest readiness, ACWR, and active injuries.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'getAthleteReadinessHistory',
    label: 'Athlete readiness history',
    description: 'Read an athlete\'s daily check-in history.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'getAthleteTrainingLoad',
    label: 'Athlete training load',
    description: 'Read an athlete\'s training load totals and latest ACWR.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'getAthleteTestResults',
    label: 'Athlete test results',
    description: 'Read an athlete\'s physiological test results and thresholds.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiredStaffPermissions: ['canViewAthletes'],
  },
  {
    id: 'getTrainingCaptureGuide',
    label: 'Team cardio guide',
    description: 'Explain Team cardio, Workout Evaluation, Garmin, Concept2 PM5, Wattbike/air-bike receivers, Bluetooth HR, and troubleshooting.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'generateStrengthSession',
    label: 'Generate strength session',
    description: 'Create and save a strength session.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canAccessAI', 'canAccessStudios'],
    confirmLabel: 'Create session',
  },
  {
    id: 'createComplementaryStrengthSession',
    label: 'Create complementary strength',
    description: 'Create a complementary strength session for a context.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canAccessAI', 'canAccessStudios'],
    confirmLabel: 'Create session',
  },
  {
    id: 'modifyStrengthSession',
    label: 'Modify strength session',
    description: 'Modify an existing strength session.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'major_edit',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canAccessAI', 'canAccessStudios'],
    confirmLabel: 'Modify session',
  },
  {
    id: 'generateTrainingProgram',
    label: 'Generate training program',
    description: 'Start multi-week program generation.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'major_edit',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canAccessAI', 'canEditPrograms'],
    requiresAthleteConsent: true,
    confirmLabel: 'Start generation',
  },
  {
    id: 'createCardioSession',
    label: 'Create cardio session',
    description: 'Create and save a cardio or interval session.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canAccessAI', 'canAccessStudios'],
    confirmLabel: 'Create session',
  },
  {
    id: 'createHybridWorkout',
    label: 'Create hybrid workout',
    description: 'Create and save a hybrid workout.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canAccessAI', 'canAccessStudios'],
    confirmLabel: 'Create workout',
  },
  {
    id: 'createSportWorkout',
    label: 'Create sport workout',
    description: 'Create and save a sport-specific workout.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canAccessAI', 'canAccessStudios'],
    confirmLabel: 'Create workout',
  },
  {
    id: 'planTeamWorkoutInCalendar',
    label: 'Plan team workout',
    description: 'Plan an existing session in the team calendar.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canCreateEvents'],
    confirmLabel: 'Plan in calendar',
  },
  {
    id: 'prepareCoachMessageDraft',
    label: 'Send coach message',
    description: 'Send a prepared message to an athlete or team after confirmation.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'send',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canViewAthletes'],
    confirmLabel: 'Send message',
    reviewHref: '/coach/messages',
  },
  {
    id: 'prepareCoachDailyBriefing',
    label: 'Coach daily briefing',
    description: 'Prepare a review card for athletes needing attention before follow-up actions.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canViewAthletes'],
    confirmLabel: 'Mark reviewed',
    reviewHref: '/coach/dashboard',
  },
  {
    id: 'assignSessionToAthlete',
    label: 'Assign session to athlete',
    description: 'Assign an existing library session to an athlete on a date (with calendar event).',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canViewAthletes', 'canCreateEvents'],
    confirmLabel: 'Assign session',
  },
  {
    id: 'createAndAssignCardioWorkout',
    label: 'Create and assign cardio',
    description: 'Create a new cardio workout and assign it to athletes after confirmation.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canViewAthletes', 'canCreateEvents', 'canAccessStudios'],
    confirmLabel: 'Create and assign',
    reviewHref: '/coach/cardio',
  },
  {
    id: 'modifyCardioAssignment',
    label: 'Modify cardio assignment',
    description: 'Modify one planned cardio assignment after confirmation.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'major_edit',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canViewAthletes', 'canCreateEvents', 'canAccessStudios'],
    confirmLabel: 'Modify assignment',
    reviewHref: '/coach/cardio',
  },
  {
    id: 'repeatPreviousCardioWorkout',
    label: 'Repeat cardio workout',
    description: 'Copy a previous cardio workout structure and assign it after confirmation.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'write',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canViewAthletes', 'canCreateEvents', 'canAccessStudios'],
    confirmLabel: 'Repeat and assign',
    reviewHref: '/coach/cardio',
  },
  {
    id: 'modifyTeamCardioAssignments',
    label: 'Modify team cardio',
    description: 'Modify multiple planned cardio assignments after confirmation.',
    role: 'COACH',
    surface: 'coach_chat',
    actionType: 'major_edit',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiredStaffPermissions: ['canViewAthletes', 'canCreateEvents', 'canAccessStudios'],
    confirmLabel: 'Modify assignments',
    reviewHref: '/coach/cardio',
  },
  {
    id: 'listRecentMeals',
    label: 'List recent meals',
    description: 'Read recent athlete meal logs.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiresAthleteConsent: true,
  },
  {
    id: 'getMyWeekPlan',
    label: 'Read week plan',
    description: 'Read planned workouts, assigned sessions, and calendar events for a date range.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiresAthleteConsent: true,
  },
  {
    id: 'getMyTestResults',
    label: 'Read test results',
    description: 'Read physiological test results: VO2max, max HR, thresholds.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiresAthleteConsent: true,
  },
  {
    id: 'getMyTrainingLoad',
    label: 'Read training load',
    description: 'Read daily training load totals and latest ACWR with zone.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiresAthleteConsent: true,
  },
  {
    id: 'getMyReadinessHistory',
    label: 'Read readiness history',
    description: 'Read daily check-in history: readiness, sleep, fatigue, HRV.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiresAthleteConsent: true,
  },
  {
    id: 'getMyPersonalRecords',
    label: 'Read personal records',
    description: 'Read latest personal records per exercise.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiresAthleteConsent: true,
  },
  {
    id: 'getMyActiveInjuries',
    label: 'Read active injuries',
    description: 'Read active and monitored injury reports.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'read',
    riskLevel: 'low',
    requiresConfirmation: false,
    requiresAthleteConsent: true,
  },
  {
    id: 'createTodayWorkout',
    label: 'Create today workout',
    description: 'Create and save a workout for today.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Create workout',
  },
  {
    id: 'logCompletedWorkout',
    label: 'Log completed workout',
    description: 'Log a workout done outside the plan to history and training load.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Log workout',
  },
  {
    id: 'completeAssignedWorkout',
    label: 'Complete assigned workout',
    description: 'Mark an assigned session or AI workout as completed with RPE and duration.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Complete workout',
  },
  {
    id: 'updateLiveWorkoutFeedback',
    label: 'Update workout feedback',
    description: 'Save live workout feedback, RPE, pain notes, or target adjustment notes.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Save feedback',
  },
  {
    id: 'createCardioWorkout',
    label: 'Create cardio workout',
    description: 'Create a structured cardio/erg session and assign it, startable in focus mode.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Create cardio workout',
  },
  {
    id: 'createImportedWorkout',
    label: 'Create imported workout',
    description: 'Create a planned strength, cardio, or hybrid workout from a pasted or uploaded source.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Create workout',
    internal: true,
  },
  {
    id: 'logMeal',
    label: 'Log meal',
    description: 'Create a meal log entry.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Log meal',
  },
  {
    id: 'updateMeal',
    label: 'Update meal',
    description: 'Update an existing meal log.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Update meal',
  },
  {
    id: 'deleteMeal',
    label: 'Delete meal',
    description: 'Delete an existing meal log.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'delete',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Delete meal',
  },
  {
    id: 'logPlannedMeal',
    label: 'Log planned meal',
    description: 'Log a planned meal from the Performance Meal Guide as eaten, using the planned macros.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Log meal',
  },
  {
    id: 'regeneratePerformanceGuide',
    label: 'Regenerate meal guide',
    description: 'Rebuild the Performance Meal Guide (planned meals and recipes) for the week.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'major_edit',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Regenerate guide',
  },
  {
    id: 'logDailyCheckIn',
    label: 'Log daily check-in',
    description: 'Save a daily readiness check-in.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Save check-in',
  },
  {
    id: 'reportInjury',
    label: 'Report injury',
    description: 'Create an injury report.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Report injury',
  },
  {
    id: 'updateAthleteProfile',
    label: 'Update profile',
    description: 'Update athlete profile fields.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Update profile',
  },
  {
    id: 'createCalendarEvent',
    label: 'Create calendar event',
    description: 'Create a calendar blocker or planning event.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'write',
    riskLevel: 'medium',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    confirmLabel: 'Create event',
  },
  {
    id: 'generateTrainingProgram',
    label: 'Generate training program',
    description: 'Start self-coached athlete program generation.',
    role: 'ATHLETE',
    surface: 'athlete_chat',
    actionType: 'major_edit',
    riskLevel: 'high',
    requiresConfirmation: true,
    requiresAthleteConsent: true,
    requiresAthleteProgramGeneration: true,
    confirmLabel: 'Start generation',
  },
]

export function findAiCapability(
  id: string,
  role?: AiCapabilityRole
): AiCapabilityDefinition | undefined {
  return AI_CAPABILITY_REGISTRY.find((capability) =>
    capability.id === id && (!role || capability.role === role)
  )
}

export function getAvailableAiCapabilities(
  context: AiCapabilityFilterContext
): AiCapabilityDefinition[] {
  return AI_CAPABILITY_REGISTRY.filter((capability) => {
    if (capability.internal) return false
    if (capability.role !== context.role) return false

    if (capability.requiresConfirmation && !context.operationsEnabled) return false

    if (capability.requiresAthleteConsent && context.hasAthleteConsent === false) {
      return false
    }

    if (
      capability.requiresAthleteProgramGeneration &&
      !context.athleteCapabilities?.canGenerateProgram
    ) {
      return false
    }

    if (capability.requiredStaffPermissions?.length) {
      if (!context.staffPermissions) return false
      return capability.requiredStaffPermissions.every(
        (permission) => context.staffPermissions?.[permission] === true
      )
    }

    return true
  })
}

export function getConfirmedAiCapabilityIds(role: AiCapabilityRole): string[] {
  return AI_CAPABILITY_REGISTRY
    .filter((capability) => capability.role === role && capability.requiresConfirmation && !capability.internal)
    .map((capability) => capability.id)
}

export function formatAiCapabilitiesForPrompt(
  capabilities: AiCapabilityDefinition[],
  locale: 'en' | 'sv' = 'en'
): string {
  if (capabilities.length === 0) return ''

  const lines = capabilities.map((capability) => {
    const mode = capability.requiresConfirmation
      ? (locale === 'sv' ? 'kraver bekräftelse' : 'requires confirmation')
      : (locale === 'sv' ? 'kan köras direkt' : 'can run directly')
    return `- ${capability.id}: ${capability.label} (${mode}) - ${capability.description}`
  })

  const title = locale === 'sv'
    ? '## TILLGÄNGLIGA AI-FÖRMÅGOR'
    : '## AVAILABLE AI CAPABILITIES'

  const policy = locale === 'sv'
    ? 'Använd bara dessa registrerade förmågor. Åtgärder som kräver bekräftelse får inte beskrivas som utförda förrän användaren har bekräftat kortet.'
    : 'Use only these registered capabilities. Actions that require confirmation must not be described as executed until the user confirms the card.'

  return `${title}\n${policy}\n${lines.join('\n')}`
}
