/**
 * Coach chat tools for confirmable cardio assignment actions.
 */

import { tool } from 'ai'
import { logger } from '@/lib/logger'
import {
  createAndAssignCardioWorkoutInputSchema,
  executeCreateAndAssignCardioWorkout,
  executeModifyCardioAssignment,
  modifyCardioAssignmentInputSchema,
} from '@/lib/ai/coach-cardio-actions'
import { type CoachToolContext, toolText } from './shared'

export function createCardioActionTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    createAndAssignCardioWorkout: tool({
      description: toolText(
        locale,
        'Create a new cardio workout and assign it to one athlete, a whole team, a filtered team group, or selected athlete IDs. Requires confirmation when AI operations are enabled.',
        'Skapa ett nytt konditionspass och tilldela det till en atlet, ett helt lag, en filtrerad laggrupp eller valda atleter. Kräver bekräftelse när AI-åtgärder är aktiverade.'
      ),
      inputSchema: createAndAssignCardioWorkoutInputSchema,
      execute: async (input) => {
        try {
          return executeCreateAndAssignCardioWorkout(coachUserId, input, businessSlug, locale)
        } catch (error) {
          logger.error('createAndAssignCardioWorkout tool failed', { coachUserId, businessSlug }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create and assign the cardio workout.', 'Kunde inte skapa och tilldela konditionspasset.'),
          }
        }
      },
    }),

    modifyCardioAssignment: tool({
      description: toolText(
        locale,
        'Modify one planned cardio assignment: move date, shorten, change intensity, swap sport/equipment, or replace with an easier interval/steady session. Requires confirmation when AI operations are enabled.',
        'Anpassa en planerad konditionstilldelning: flytta datum, korta ner, ändra intensitet, byta sport/utrustning eller ersätta med ett lättare intervall-/distanspass. Kräver bekräftelse när AI-åtgärder är aktiverade.'
      ),
      inputSchema: modifyCardioAssignmentInputSchema,
      execute: async (input) => {
        try {
          return executeModifyCardioAssignment(coachUserId, input, businessSlug, locale)
        } catch (error) {
          logger.error('modifyCardioAssignment tool failed', { coachUserId, businessSlug }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not modify the cardio assignment.', 'Kunde inte anpassa konditionstilldelningen.'),
          }
        }
      },
    }),
  }
}
