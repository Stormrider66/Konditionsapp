/**
 * AI Chat Tools for Coach
 *
 * Vercel AI SDK tools the AI can invoke during coach chat conversations.
 * Supports generating strength sessions and programs from the Strength Studio.
 *
 * This file is the single public entry point. The tool definitions live in
 * focused modules under `coach-tools/`; this factory builds the shared context
 * and merges every tool group into the same tool-set it has always returned.
 */

import { type CoachToolContext } from './coach-tools/shared'
import { createStrengthTools } from './coach-tools/strength-tools'
import { createAthleteTools } from './coach-tools/athlete-tools'
import { createCalendarTools } from './coach-tools/calendar-tools'
import { createWorkoutTools } from './coach-tools/workout-tools'
import { createNavigationTools } from './coach-tools/navigation-tools'
import { createMessagingTools } from './coach-tools/messaging-tools'

/**
 * Create all chat tools for a coach session.
 */
export function createCoachChatTools(coachUserId: string, businessSlug?: string, locale: 'en' | 'sv' = 'en') {
  const ctx: CoachToolContext = { coachUserId, businessSlug, locale }

  return {
    ...createStrengthTools(ctx),
    ...createAthleteTools(ctx),
    ...createCalendarTools(ctx),
    ...createWorkoutTools(ctx),
    ...createNavigationTools(ctx),
    ...createMessagingTools(ctx),
  }
}
