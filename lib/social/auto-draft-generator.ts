/**
 * Auto-generate social media post drafts from platform events.
 *
 * Called by milestone-detector cron job when PRs, streaks, or
 * other noteworthy events are detected. Creates DRAFT posts
 * that coaches can review and approve before publishing.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface SocialTriggerData {
  type: 'PR_ACHIEVED' | 'MILESTONE' | 'CHALLENGE_COMPLETE' | 'WEEKLY_SUMMARY'
  clientId: string
  clientName: string
  businessId: string
  coachUserId: string
  // PR-specific
  exerciseName?: string
  value?: number
  unit?: string
  previousValue?: number
  improvement?: number
  // Milestone-specific
  milestoneType?: string
  milestoneTitle?: string
  milestoneDescription?: string
  celebrationLevel?: string
  // Challenge-specific
  challengeName?: string
  winnerName?: string
  participantCount?: number
}

/**
 * Generate a caption for a social post without calling the AI API.
 * Uses templates for fast, reliable caption generation.
 * Coaches can edit before publishing.
 */
function generateTemplateCaption(data: SocialTriggerData): string {
  const name = data.clientName.split(' ')[0]

  switch (data.type) {
    case 'PR_ACHIEVED':
      return [
        `Nytt personligt rekord! ${name} slog sitt PR i ${data.exerciseName || 'styrkeövning'}`,
        data.value ? `med ${data.value} ${data.unit || 'kg'}` : '',
        data.improvement ? `(+${data.improvement}% förbättring)` : '',
        '',
        'Fantastiskt jobbat! Hård träning ger resultat.',
        '',
        '#PR #PersonligtRekord #Styrketräning #GymLife #Träning',
      ].filter(Boolean).join(' ').trim()

    case 'MILESTONE':
      if (data.milestoneType === 'WORKOUT_COUNT') {
        return [
          `${name} har genomfört ${data.value} träningspass!`,
          '',
          `Det är konsekvens och dedikation som ger resultat.`,
          `Grattis till denna milstolpe!`,
          '',
          '#Milstolpe #Träning #Konsekvens #GymLife',
        ].join('\n').trim()
      }
      if (data.milestoneType === 'CONSISTENCY_STREAK') {
        return [
          `${data.value} dagar i rad! ${name} visar vad disciplin handlar om.`,
          '',
          'Konsekvens slår allt.',
          '',
          '#Streak #Konsekvens #Träning #Discipline',
        ].join('\n').trim()
      }
      if (data.milestoneType === 'TRAINING_ANNIVERSARY') {
        return [
          `${name} firar ${data.value === 1 ? 'ett år' : `${data.value} år`} av träning med oss!`,
          '',
          'Tack för ditt engagemang och din dedikation.',
          '',
          '#Jubileum #Träning #GymFamily',
        ].join('\n').trim()
      }
      return data.milestoneTitle || `${name} har nått en ny milstolpe!`

    case 'CHALLENGE_COMPLETE':
      return [
        `Utmaningen "${data.challengeName}" är avslutad!`,
        data.winnerName ? `Grattis till ${data.winnerName} som tog hem segern!` : '',
        data.participantCount ? `${data.participantCount} deltagare kämpade hårt.` : '',
        '',
        '#Utmaning #Challenge #GymCommunity',
      ].filter(Boolean).join('\n').trim()

    case 'WEEKLY_SUMMARY':
      return [
        'Veckans sammanfattning!',
        data.value ? `${data.value} pass genomförda denna vecka.` : '',
        'Bra jobbat alla!',
        '',
        '#VeckansSammanfattning #Träning #GymLife',
      ].filter(Boolean).join('\n').trim()

    default:
      return `${name} — ${data.milestoneTitle || 'Ny prestation!'}`
  }
}

/**
 * Create a social media draft post from a trigger event.
 * Returns the post ID if created, null if skipped.
 */
export async function createAutoSocialDraft(data: SocialTriggerData): Promise<string | null> {
  try {
    // Skip if business doesn't exist or isn't active
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true, isActive: true, type: true },
    })

    if (!business?.isActive) return null

    // Check for recent duplicate (same trigger type + client in last 24h)
    const recentDuplicate = await prisma.socialPost.findFirst({
      where: {
        businessId: data.businessId,
        triggerType: data.type,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        triggerData: {
          path: ['clientId'],
          equals: data.clientId,
        },
      },
    })

    if (recentDuplicate) {
      logger.info('Skipping duplicate social draft', { type: data.type, clientId: data.clientId })
      return null
    }

    const caption = generateTemplateCaption(data)

    const post = await prisma.socialPost.create({
      data: {
        businessId: data.businessId,
        createdById: data.coachUserId,
        caption,
        isAiGenerated: false, // template-generated, not AI
        triggerType: data.type,
        triggerData: {
          clientId: data.clientId,
          clientName: data.clientName,
          exerciseName: data.exerciseName,
          value: data.value,
          unit: data.unit,
          previousValue: data.previousValue,
          improvement: data.improvement,
          milestoneType: data.milestoneType,
        },
        status: 'DRAFT',
        athleteConsentIds: [], // Coach must verify consent before publishing
      },
    })

    logger.info('Auto-generated social draft', {
      postId: post.id,
      triggerType: data.type,
      clientId: data.clientId,
    })

    return post.id
  } catch (error) {
    logger.error('Failed to create auto social draft', {
      type: data.type,
      clientId: data.clientId,
    }, error as Error)
    return null
  }
}
