import { tool } from 'ai'
import { logger } from '@/lib/logger'
import {
  buildCoachDailyBriefingPreview,
  executeCoachDailyBriefingReview,
  prepareCoachDailyBriefingInputSchema,
} from '@/lib/ai/coach-briefing-actions'
import { createAiActionDraftForTool } from '@/lib/ai/capabilities/action-drafts'
import { type CoachToolContext, toolText } from './shared'

export function createBriefingActionTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    prepareCoachDailyBriefing: tool({
      description: toolText(
        locale,
        'Prepare a coach review card for athletes needing attention today: readiness, injuries, ACWR/load, missed workouts, and planned sessions. Confirmation only marks the briefing reviewed; it does not send messages or change sessions.',
        'Förbered ett granskningskort för atleter som behöver uppmärksamhet idag: readiness, skador, ACWR/belastning, missade pass och planerade pass. Bekräftelse markerar bara briefingen som granskad; den skickar inga meddelanden och ändrar inga pass.'
      ),
      inputSchema: prepareCoachDailyBriefingInputSchema,
      execute: async (input) => {
        try {
          if (ctx.aiOperations?.enabled) {
            const preview = await buildCoachDailyBriefingPreview(coachUserId, input, businessSlug, locale)
            if (!preview.success) return preview
            return createAiActionDraftForTool(
              'prepareCoachDailyBriefing',
              input,
              ctx.aiOperations,
              preview.preview
            )
          }
          return executeCoachDailyBriefingReview(coachUserId, input, businessSlug, locale)
        } catch (error) {
          logger.error('prepareCoachDailyBriefing tool failed', { coachUserId, businessSlug }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not review the coach briefing.', 'Kunde inte granska coachbriefingen.'),
          }
        }
      },
    }),
  }
}
