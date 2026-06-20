import { describe, expect, it } from 'vitest'
import {
  AI_CAPABILITY_REGISTRY,
  getAvailableAiCapabilities,
  type AiCapabilityActionType,
} from './registry'
import type { StaffPermissions } from '@/lib/permissions/staff-roles'

const allStaffPermissions: StaffPermissions = {
  role: 'COACH',
  roleLabel: 'Head coach',
  isTeamScoped: false,
  canViewAthletes: true,
  canViewTestResults: true,
  canViewProgress: true,
  canEditPrograms: true,
  canRunIntervals: true,
  canRunTests: true,
  canAccessStudios: true,
  canAccessAI: true,
  canViewCalendar: true,
  canCreateEvents: true,
  canInviteStaff: false,
  canAssignTeams: false,
  canManageBilling: false,
  canManageSettings: false,
  assignedTeamIds: [],
}

describe('AI capability registry', () => {
  it('requires confirmation for every write-like registered capability', () => {
    const writeLike = new Set<AiCapabilityActionType>(['write', 'send', 'delete', 'major_edit'])

    const unsafe = AI_CAPABILITY_REGISTRY.filter(
      (capability) => writeLike.has(capability.actionType) && !capability.requiresConfirmation
    )

    expect(unsafe).toEqual([])
  })

  it('hides confirmed operations when the beta flag is disabled', () => {
    const capabilities = getAvailableAiCapabilities({
      role: 'COACH',
      operationsEnabled: false,
      staffPermissions: allStaffPermissions,
      hasAthleteConsent: true,
    })

    expect(capabilities.some((capability) => capability.requiresConfirmation)).toBe(false)
    expect(capabilities.map((capability) => capability.id)).toContain('listAthletes')
    expect(capabilities.map((capability) => capability.id)).toContain('getTrainingCaptureGuide')
  })

  it('filters coach capabilities by staff permissions', () => {
    const capabilities = getAvailableAiCapabilities({
      role: 'COACH',
      operationsEnabled: true,
      staffPermissions: {
        ...allStaffPermissions,
        canEditPrograms: false,
        canAccessStudios: false,
      },
      hasAthleteConsent: true,
    }).map((capability) => capability.id)

    expect(capabilities).not.toContain('generateTrainingProgram')
    expect(capabilities).not.toContain('createCardioSession')
    expect(capabilities).toContain('listAthletes')
  })

  it('filters athlete program generation by athlete capability', () => {
    const withoutProgramGeneration = getAvailableAiCapabilities({
      role: 'ATHLETE',
      operationsEnabled: true,
      hasAthleteConsent: true,
      athleteCapabilities: {
        canGenerateProgram: false,
        hasActiveProgram: false,
        subscriptionTier: 'FREE',
        isSelfCoached: true,
      },
    }).map((capability) => capability.id)

    expect(withoutProgramGeneration).not.toContain('generateTrainingProgram')

    const withProgramGeneration = getAvailableAiCapabilities({
      role: 'ATHLETE',
      operationsEnabled: true,
      hasAthleteConsent: true,
      athleteCapabilities: {
        canGenerateProgram: true,
        hasActiveProgram: false,
        subscriptionTier: 'STANDARD',
        isSelfCoached: true,
      },
    }).map((capability) => capability.id)

    expect(withProgramGeneration).toContain('generateTrainingProgram')
  })
})
