/**
 * Coach chat tools for confirmable cardio assignment actions.
 */

import { tool } from 'ai'
import { logger } from '@/lib/logger'
import {
  createAndAssignCardioWorkoutInputSchema,
  executeCreateAndAssignCardioWorkout,
  executeModifyCardioAssignment,
  executeModifyTeamCardioAssignments,
  executeRepeatPreviousCardioWorkout,
  modifyCardioAssignmentInputSchema,
  modifyTeamCardioAssignmentsInputSchema,
  repeatPreviousCardioWorkoutInputSchema,
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

    repeatPreviousCardioWorkout: tool({
      description: toolText(
        locale,
        'Repeat a previous cardio workout structure for one athlete, a team, a filtered team group, or selected athletes. Can make it easier, harder, shorter, or longer. Requires confirmation when AI operations are enabled.',
        'Upprepa ett tidigare konditionsupplägg för en atlet, ett lag, en filtrerad laggrupp eller valda atleter. Kan göra passet lättare, hårdare, kortare eller längre. Kräver bekräftelse när AI-åtgärder är aktiverade.'
      ),
      inputSchema: repeatPreviousCardioWorkoutInputSchema,
      execute: async (input) => {
        try {
          return executeRepeatPreviousCardioWorkout(coachUserId, input, businessSlug, locale)
        } catch (error) {
          logger.error('repeatPreviousCardioWorkout tool failed', { coachUserId, businessSlug }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not repeat the previous cardio workout.', 'Kunde inte upprepa det tidigare konditionspasset.'),
          }
        }
      },
    }),

    modifyTeamCardioAssignments: tool({
      description: toolText(
        locale,
        'Modify multiple planned cardio assignments for a team, filtered team group, or selected athletes on one calendar date. Useful for low-readiness or injured groups. Requires confirmation when AI operations are enabled.',
        'Anpassa flera planerade konditionstilldelningar för ett lag, en filtrerad laggrupp eller valda atleter på ett kalenderdatum. Användbart för låg readiness eller skadade grupper. Kräver bekräftelse när AI-åtgärder är aktiverade.'
      ),
      inputSchema: modifyTeamCardioAssignmentsInputSchema,
      execute: async (input) => {
        try {
          return executeModifyTeamCardioAssignments(coachUserId, input, businessSlug, locale)
        } catch (error) {
          logger.error('modifyTeamCardioAssignments tool failed', { coachUserId, businessSlug }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not modify the team cardio assignments.', 'Kunde inte anpassa lagets konditionstilldelningar.'),
          }
        }
      },
    }),
  }
}
