// lib/auth-utils.ts
//
// Barrel re-export. The implementation was decomposed into lib/auth/* as part
// of Phase 7 (sub-500 LOC target). The 697 existing import sites keep
// working unchanged.
//
// Prefer importing from the specific module at new call sites:
//   import { getCurrentUser } from '@/lib/auth/current-user'
//   import { requireCoach } from '@/lib/auth/require-role'
//   import { canAccessClient } from '@/lib/auth/can-access'

export {
  getCurrentUser,
  isAuthenticated,
  hasRole,
  getAthleteClientId,
  getRequestedBusinessScope,
  requireAthleteOrCoachInAthleteMode,
  resolveAthleteClientId,
  type RequestedBusinessScope,
  type AthleteOrCoachInAthleteModeResult,
} from './auth/current-user'

export {
  requireRole,
  requireCoach,
  requireAthlete,
  requireAdmin,
  requireAdminRole,
  hasAdminRole,
  requirePhysio,
  requirePhysioWithAssignments,
  requirePhysioOrAdmin,
  type AdminUser,
  type PhysioUser,
} from './auth/require-role'

export {
  canAccessProgram,
  canAccessWorkout,
  canAccessClient,
  canAccessExercise,
  canAccessAthleteAsPhysio,
  getAccessiblePrograms,
  requireClientOwnership,
  canCreateRestrictions,
  canModifyProgramsAsPhysio,
} from './auth/can-access'

export {
  getBusinessContext,
  requireBusinessAdminRole,
  hasBusinessAdminRole,
  requireBusinessMembership,
} from './auth/business'

export {
  getPhysioAthletes,
  getPhysioBusinessContext,
} from './auth/physio'

export {
  hasReachedAthleteLimit,
  getSubscriptionTier,
  hasActiveSubscription,
} from './auth/subscription'

export {
  getTesterForUser,
  isPrivateTester,
  getTestPrivacyFilter,
  applyTesterPrivacy,
  canAccessTestAsTester,
} from './auth/tester-privacy'
