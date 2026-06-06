// components/coach/athlete-profile/types.ts
//
// Shared types for the coach-mode athlete profile (coach/clients/[id]).
// Extracted from the page component during Phase 0 of the IA redesign.

import type { Client, Team, Test } from '@/types'

export interface ClientWithTests extends Client {
  tests?: Test[]
  athleteAccount?: {
    id: string
    userId: string
    user?: {
      email: string
      createdAt: string | Date
    }
    authStatus?: {
      isActive: boolean
      hasLoggedIn: boolean
      hasSetPasswordAndLoggedIn: boolean
      lastSignInAt: string | null
      passwordUpdatedAt: string | null
    } | null
  } | null
  team?: Team | null
  position?: string | null
}

export interface ProgramSummary {
  id: string
  name: string
  goalType: string
  startDate: string | Date
  endDate: string | Date
  _count?: {
    weeks?: number
  }
}

export interface SportProfileSummary {
  id: string
  primarySport: string
  secondarySports: string[]
  hockeySettings?: Record<string, unknown>
  [key: string]: unknown
}

export interface ThresholdSummary {
  heartRate?: number | null
}

export interface RecentTestEntry {
  id: string
  date: string
  kind: 'TEST' | 'HOCKEY_PHYSICAL' | 'CUSTOM'
  label: string
  summary: string | null
}

export interface RecentTestCounts {
  test: number
  hockey: number
  custom: number
}

export type SortField = 'date' | 'type' | 'vo2max' | 'status'
export type SortDirection = 'asc' | 'desc'
export type CoachSnapshotTone = 'good' | 'caution' | 'setup'
export type CoachSnapshotAction = {
  id: string
  title: string
  description: string
  href?: string
  dialog?: 'createAccount' | 'sendInvite' | 'createPlan'
}
