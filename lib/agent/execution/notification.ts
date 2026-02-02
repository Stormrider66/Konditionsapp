/**
 * Agent Notification Service
 *
 * Handles notifications for agent actions:
 * - In-app notifications via AINotification model
 * - Email notifications via Resend
 * - Coach notifications for supervised actions
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendGenericEmail } from '@/lib/email'
import type { AgentAction, AgentActionType, AgentActionStatus } from '@prisma/client'

export interface NotificationResult {
  success: boolean
  inAppSent: boolean
  emailSent: boolean
  error?: string
}

interface NotificationContent {
  title: string
  message: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  emoji: string
}

/**
 * Get notification content based on action type and status
 */
function getNotificationContent(
  actionType: AgentActionType,
  status: AgentActionStatus,
  actionData: Record<string, unknown>
): NotificationContent {
  const contents: Record<AgentActionType, NotificationContent> = {
    WORKOUT_INTENSITY_REDUCTION: {
      title: 'Workout Intensity Adjusted',
      message: `Your workout intensity has been reduced by ${actionData.reductionPercent || 20}% based on your current readiness.`,
      priority: 'MEDIUM',
      emoji: '📉',
    },
    WORKOUT_DURATION_REDUCTION: {
      title: 'Workout Duration Adjusted',
      message: `Your workout has been shortened to ${actionData.newDuration || 'a shorter duration'} to support recovery.`,
      priority: 'MEDIUM',
      emoji: '⏱️',
    },
    WORKOUT_SUBSTITUTION: {
      title: 'Workout Substituted',
      message: `Your workout has been changed to ${actionData.newType || 'an alternative activity'} based on your current state.`,
      priority: 'MEDIUM',
      emoji: '🔄',
    },
    WORKOUT_SKIP_RECOMMENDATION: {
      title: 'Rest Day Recommended',
      message: 'The AI coach recommends skipping today\'s workout to support recovery.',
      priority: 'HIGH',
      emoji: '😴',
    },
    REST_DAY_INJECTION: {
      title: 'Rest Day Added',
      message: 'A rest day has been added to your schedule based on fatigue indicators.',
      priority: 'HIGH',
      emoji: '🛌',
    },
    RECOVERY_ACTIVITY_SUGGESTION: {
      title: 'Recovery Activity Suggested',
      message: `Light ${actionData.activityType || 'recovery activity'} is recommended instead of intense training.`,
      priority: 'LOW',
      emoji: '🧘',
    },
    PROGRAM_ADJUSTMENT: {
      title: 'Training Program Adjusted',
      message: 'Your training program has been adjusted based on your progress and recovery.',
      priority: 'MEDIUM',
      emoji: '📊',
    },
    ESCALATE_TO_COACH: {
      title: 'Coach Notification Sent',
      message: 'Your coach has been notified about your current training status.',
      priority: 'HIGH',
      emoji: '👨‍🏫',
    },
    ESCALATE_TO_SUPPORT: {
      title: 'Support Team Notified',
      message: 'Our support team has been notified to assist you.',
      priority: 'HIGH',
      emoji: '🆘',
    },
    MOTIVATIONAL_NUDGE: {
      title: 'Keep Going!',
      message: actionData.message as string || 'You\'re making great progress. Stay consistent!',
      priority: 'LOW',
      emoji: '💪',
    },
    CHECK_IN_REQUEST: {
      title: 'Check-in Reminder',
      message: 'Please complete your daily check-in to help optimize your training.',
      priority: 'MEDIUM',
      emoji: '📝',
    },
  }

  const content = contents[actionType] || {
    title: 'Training Update',
    message: 'Your training has been updated by the AI coach.',
    priority: 'MEDIUM' as const,
    emoji: '🤖',
  }

  // Adjust priority if action was auto-applied
  if (status === 'AUTO_APPLIED') {
    content.title = `[Auto] ${content.title}`
  }

  return content
}

/**
 * Send in-app notification for an agent action
 */
export async function sendAgentInAppNotification(
  action: AgentAction,
  additionalContext?: Record<string, unknown>
): Promise<boolean> {
  try {
    const content = getNotificationContent(
      action.actionType,
      action.status,
      action.actionData as Record<string, unknown>
    )

    await prisma.aINotification.create({
      data: {
        clientId: action.clientId,
        notificationType: 'AGENT_ACTION',
        title: `${content.emoji} ${content.title}`,
        message: content.message,
        priority: content.priority,
        contextData: {
          actionId: action.id,
          actionType: action.actionType,
          status: action.status,
          reasoning: action.reasoning,
          ...additionalContext,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    logger.info('Agent in-app notification sent', {
      clientId: action.clientId,
      actionId: action.id,
      actionType: action.actionType,
    })

    return true
  } catch (error) {
    logger.error('Failed to send agent in-app notification', { actionId: action.id }, error)
    return false
  }
}

/**
 * Send email notification for significant agent actions
 */
export async function sendAgentEmailNotification(
  action: AgentAction,
  recipientEmail: string,
  recipientName: string
): Promise<boolean> {
  try {
    const content = getNotificationContent(
      action.actionType,
      action.status,
      action.actionData as Record<string, unknown>
    )

    // Only send emails for high priority actions
    if (content.priority !== 'HIGH' && content.priority !== 'CRITICAL') {
      return false
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
    .action-box { background: white; border-left: 4px solid #6366f1; padding: 15px; margin: 15px 0; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${content.emoji} AI Training Agent</h1>
    </div>
    <div class="content">
      <p>Hi ${recipientName},</p>

      <h2>${content.title}</h2>

      <div class="action-box">
        <p><strong>What happened:</strong></p>
        <p>${content.message}</p>

        <p><strong>Why:</strong></p>
        <p>${action.reasoning}</p>
      </div>

      <a href="${baseUrl}/athlete/dashboard" class="button">View in Dashboard</a>

      <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
        You can manage your AI agent preferences in your <a href="${baseUrl}/athlete/settings/agent">settings</a>.
      </p>
    </div>
    <div class="footer">
      <p>Star by Thomson - Elite Training Platform</p>
      <p>This notification was sent by your AI training agent.</p>
    </div>
  </div>
</body>
</html>
`

    const result = await sendGenericEmail({
      to: recipientEmail,
      subject: `${content.emoji} ${content.title} - AI Training Agent`,
      html,
    })

    if (result.success) {
      logger.info('Agent email notification sent', {
        clientId: action.clientId,
        actionId: action.id,
        email: recipientEmail,
      })
    }

    return result.success
  } catch (error) {
    logger.error('Failed to send agent email notification', { actionId: action.id }, error)
    return false
  }
}

/**
 * Notify coach about a supervised action that needs review
 */
export async function notifyCoachOfAction(
  action: AgentAction,
  coachEmail: string,
  coachName: string,
  athleteName: string
): Promise<boolean> {
  try {
    const content = getNotificationContent(
      action.actionType,
      action.status,
      action.actionData as Record<string, unknown>
    )

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thomsons.se'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
    .action-box { background: white; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .confidence { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 500; }
    .confidence-high { background: #dcfce7; color: #166534; }
    .confidence-medium { background: #fef3c7; color: #92400e; }
    .confidence-low { background: #fee2e2; color: #991b1b; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; margin-right: 10px; }
    .button-secondary { background: #64748b; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔔 Agent Action Requires Review</h1>
    </div>
    <div class="content">
      <p>Hi ${coachName},</p>

      <p>The AI training agent has proposed an action for <strong>${athleteName}</strong> that requires your review.</p>

      <div class="action-box">
        <p><strong>Action:</strong> ${content.title}</p>
        <p><strong>Details:</strong> ${content.message}</p>
        <p><strong>Reasoning:</strong> ${action.reasoning}</p>
        <p>
          <strong>Confidence:</strong>
          <span class="confidence ${action.confidence === 'HIGH' || action.confidence === 'VERY_HIGH' ? 'confidence-high' : action.confidence === 'MEDIUM' ? 'confidence-medium' : 'confidence-low'}">
            ${action.confidence} (${Math.round(action.confidenceScore * 100)}%)
          </span>
        </p>
      </div>

      <a href="${baseUrl}/coach/agent-oversight" class="button">Review Actions</a>
      <a href="${baseUrl}/coach/clients/${action.clientId}" class="button button-secondary">View Athlete</a>

    </div>
    <div class="footer">
      <p>Star by Thomson - Elite Training Platform</p>
      <p>AI Agent Oversight Notification</p>
    </div>
  </div>
</body>
</html>
`

    const result = await sendGenericEmail({
      to: coachEmail,
      subject: `🔔 AI Agent Action for ${athleteName} - Review Required`,
      html,
    })

    if (result.success) {
      logger.info('Coach notification sent for agent action', {
        actionId: action.id,
        coachEmail,
        athleteName,
      })
    }

    return result.success
  } catch (error) {
    logger.error('Failed to notify coach of agent action', { actionId: action.id }, error)
    return false
  }
}

/**
 * Send notification for an agent action based on preferences
 */
export async function notifyOfAgentAction(action: AgentAction): Promise<NotificationResult> {
  try {
    // Get client and preferences
    const client = await prisma.client.findUnique({
      where: { id: action.clientId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        agentPreferences: true,
        athleteAccount: {
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    })

    if (!client) {
      return {
        success: false,
        inAppSent: false,
        emailSent: false,
        error: 'Client not found',
      }
    }

    const preferences = client.agentPreferences

    // Always send in-app notification
    const inAppSent = await sendAgentInAppNotification(action)

    // Send email if enabled and action is significant
    let emailSent = false
    const athleteEmail = client.athleteAccount?.user?.email
    const athleteName = client.athleteAccount?.user?.name || client.name

    if (athleteEmail && preferences?.preferredContactMethod !== 'IN_APP') {
      emailSent = await sendAgentEmailNotification(action, athleteEmail, athleteName)
    }

    // If supervised action, also notify coach
    if (action.status === 'PROPOSED' && client.user) {
      await notifyCoachOfAction(action, client.user.email!, client.user.name || 'Coach', athleteName)
    }

    return {
      success: true,
      inAppSent,
      emailSent,
    }
  } catch (error) {
    logger.error('Failed to send agent notifications', { actionId: action.id }, error)
    return {
      success: false,
      inAppSent: false,
      emailSent: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send daily briefing notification
 */
export async function sendDailyBriefing(
  clientId: string,
  briefingContent: {
    todaysWorkout?: string
    readinessStatus: string
    recommendations: string[]
    motivationalMessage?: string
  }
): Promise<boolean> {
  try {
    const recommendations = briefingContent.recommendations
      .map((r) => `• ${r}`)
      .join('\n')

    const message = [
      briefingContent.todaysWorkout
        ? `Today's workout: ${briefingContent.todaysWorkout}`
        : 'Rest day today',
      `\nReadiness: ${briefingContent.readinessStatus}`,
      recommendations ? `\nRecommendations:\n${recommendations}` : '',
      briefingContent.motivationalMessage ? `\n${briefingContent.motivationalMessage}` : '',
    ]
      .filter(Boolean)
      .join('')

    await prisma.aINotification.create({
      data: {
        clientId,
        notificationType: 'DAILY_BRIEFING',
        title: '☀️ Your Daily Training Briefing',
        message,
        priority: 'LOW',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    logger.info('Daily briefing sent', { clientId })
    return true
  } catch (error) {
    logger.error('Failed to send daily briefing', { clientId }, error)
    return false
  }
}
