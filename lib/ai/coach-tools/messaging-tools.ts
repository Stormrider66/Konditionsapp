/**
 * Coach chat tool for preparing athlete/team message drafts.
 */

import { tool } from 'ai'
import { logger } from '@/lib/logger'
import { buildCoachMessageAction, prepareCoachMessageDraftInputSchema } from '@/lib/ai/coach-message-actions'
import { type CoachToolContext } from './shared'
import { createAiActionDraftForTool } from '@/lib/ai/capabilities/action-drafts'

export function createMessagingTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    prepareCoachMessageDraft: tool({
      description: locale === 'sv'
        ? 'Förbered ett meddelande till en atlet, ett helt lag eller en filtrerad laggrupp. Verktyget skickar aldrig direkt utan returnerar ett bekräftelsekort som coachen måste klicka på.'
        : 'Prepare a message to one athlete, a whole team, or a filtered team group. The tool never sends directly; it returns a confirmation card the coach must click.',
      inputSchema: prepareCoachMessageDraftInputSchema,
      execute: async (params) => {
        try {
          const result = await buildCoachMessageAction(coachUserId, params, businessSlug, locale)
          if (!result.success || !ctx.aiOperations?.enabled) return result

          return createAiActionDraftForTool(
            'prepareCoachMessageDraft',
            params,
            ctx.aiOperations,
            {
              title: result.action.title,
              description: result.action.description,
              targetLabel: result.action.targetLabel,
              subject: result.action.subject,
              body: result.action.content,
              recipients: result.action.recipients,
              recipientCount: result.action.recipientCount,
              confirmLabel: result.action.confirmLabel,
              reviewHref: result.action.reviewHref,
            }
          )
        } catch (error) {
          logger.error('Error in prepareCoachMessageDraft tool', { coachUserId, businessSlug }, error)
          return {
            success: false,
            error: locale === 'sv' ? 'Kunde inte förbereda meddelandet.' : 'Could not prepare the message.',
          }
        }
      },
    }),
  }
}
