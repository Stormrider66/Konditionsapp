/**
 * Trial Trigger System
 *
 * Automatically starts a 3-week STANDARD trial for FREE athletes
 * after their first completed lactate/VO2max test.
 */

import { prisma } from '@/lib/prisma'
import { ATHLETE_TIER_FEATURES } from '@/lib/subscription/feature-access'
import { logger } from '@/lib/logger'

const TRIAL_DAYS = 21 // 3-week trial

/**
 * Trigger a trial subscription after a test is completed.
 * Only activates if the athlete is on FREE tier with no existing trial.
 */
export async function triggerTrialAfterTest(clientId: string): Promise<boolean> {
  try {
    const subscription = await prisma.athleteSubscription.findUnique({
      where: { clientId },
    })

    // Only trigger for FREE tier with no existing/previous trial
    if (!subscription) return false
    if (subscription.tier !== 'FREE') return false
    if (subscription.trialEndsAt !== null) return false // Already had a trial

    const features = ATHLETE_TIER_FEATURES.STANDARD

    await prisma.athleteSubscription.update({
      where: { clientId },
      data: {
        status: 'TRIAL',
        tier: 'STANDARD',
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        aiChatEnabled: features.ai_chat.enabled,
        aiChatMessagesLimit: features.ai_chat.limit,
        videoAnalysisEnabled: features.video_analysis.enabled,
        stravaEnabled: features.strava.enabled,
        garminEnabled: features.garmin.enabled,
        workoutLoggingEnabled: true,
        dailyCheckInEnabled: true,
      },
    })

    logger.info('Trial activated after test completion', { clientId, trialDays: TRIAL_DAYS })
    return true
  } catch (error) {
    logger.error('Failed to trigger trial after test', { clientId }, error)
    return false
  }
}
