/**
 * Auto-generate social media post drafts from platform events.
 *
 * Called by milestone-detector cron job when PRs, streaks, or
 * other noteworthy events are detected. Creates DRAFT posts
 * that coaches can review and approve before publishing.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

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
  locale?: AppLocale
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Generate a caption for a social post without calling the AI API.
 * Uses templates for fast, reliable caption generation.
 * Coaches can edit before publishing.
 */
function generateTemplateCaption(data: SocialTriggerData, locale: AppLocale): string {
  const name = data.clientName.split(' ')[0]

  switch (data.type) {
    case 'PR_ACHIEVED':
      return [
        t(locale, `New personal record! ${name} beat their PR in ${data.exerciseName || 'strength exercise'}`, `Nytt personligt rekord! ${name} slog sitt PR i ${data.exerciseName || 'styrkeövning'}`),
        data.value ? t(locale, `with ${data.value} ${data.unit || 'kg'}`, `med ${data.value} ${data.unit || 'kg'}`) : '',
        data.improvement ? t(locale, `(+${data.improvement}% improvement)`, `(+${data.improvement}% förbättring)`) : '',
        '',
        t(locale, 'Fantastic work! Hard training pays off.', 'Fantastiskt jobbat! Hård träning ger resultat.'),
        '',
        t(locale, '#PR #PersonalRecord #StrengthTraining #GymLife #Training', '#PR #PersonligtRekord #Styrketräning #GymLife #Träning'),
      ].filter(Boolean).join(' ').trim()

    case 'MILESTONE':
      if (data.milestoneType === 'WORKOUT_COUNT') {
        return [
          t(locale, `${name} has completed ${data.value} training sessions!`, `${name} har genomfört ${data.value} träningspass!`),
          '',
          t(locale, 'Consistency and dedication create results.', 'Det är konsekvens och dedikation som ger resultat.'),
          t(locale, 'Congratulations on this milestone!', 'Grattis till denna milstolpe!'),
          '',
          t(locale, '#Milestone #Training #Consistency #GymLife', '#Milstolpe #Träning #Konsekvens #GymLife'),
        ].join('\n').trim()
      }
      if (data.milestoneType === 'CONSISTENCY_STREAK') {
        return [
          t(locale, `${data.value} days in a row! ${name} shows what discipline is all about.`, `${data.value} dagar i rad! ${name} visar vad disciplin handlar om.`),
          '',
          t(locale, 'Consistency beats everything.', 'Konsekvens slår allt.'),
          '',
          t(locale, '#Streak #Consistency #Training #Discipline', '#Streak #Konsekvens #Träning #Discipline'),
        ].join('\n').trim()
      }
      if (data.milestoneType === 'TRAINING_ANNIVERSARY') {
        return [
          t(
            locale,
            `${name} is celebrating ${data.value === 1 ? 'one year' : `${data.value} years`} of training with us!`,
            `${name} firar ${data.value === 1 ? 'ett år' : `${data.value} år`} av träning med oss!`
          ),
          '',
          t(locale, 'Thank you for your commitment and dedication.', 'Tack för ditt engagemang och din dedikation.'),
          '',
          t(locale, '#Anniversary #Training #GymFamily', '#Jubileum #Träning #GymFamily'),
        ].join('\n').trim()
      }
      return data.milestoneTitle || t(locale, `${name} has reached a new milestone!`, `${name} har nått en ny milstolpe!`)

    case 'CHALLENGE_COMPLETE':
      return [
        t(locale, `The challenge "${data.challengeName}" is complete!`, `Utmaningen "${data.challengeName}" är avslutad!`),
        data.winnerName ? t(locale, `Congratulations to ${data.winnerName} for taking the win!`, `Grattis till ${data.winnerName} som tog hem segern!`) : '',
        data.participantCount ? t(locale, `${data.participantCount} participants gave it their all.`, `${data.participantCount} deltagare kämpade hårt.`) : '',
        '',
        t(locale, '#Challenge #GymCommunity #Training', '#Utmaning #Challenge #GymCommunity'),
      ].filter(Boolean).join('\n').trim()

    case 'WEEKLY_SUMMARY':
      return [
        t(locale, 'Weekly summary!', 'Veckans sammanfattning!'),
        data.value ? t(locale, `${data.value} sessions completed this week.`, `${data.value} pass genomförda denna vecka.`) : '',
        t(locale, 'Great work, everyone!', 'Bra jobbat alla!'),
        '',
        t(locale, '#WeeklySummary #Training #GymLife', '#VeckansSammanfattning #Träning #GymLife'),
      ].filter(Boolean).join('\n').trim()

    default:
      return `${name} — ${data.milestoneTitle || t(locale, 'New achievement!', 'Ny prestation!')}`
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

    const coachLocale: AppLocale = await prisma.user.findUnique({
      where: { id: data.coachUserId },
      select: { language: true },
    }).then((user) => user?.language === 'sv' ? 'sv' : 'en')
    const locale = data.locale ?? coachLocale

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

    const caption = generateTemplateCaption(data, locale)

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
