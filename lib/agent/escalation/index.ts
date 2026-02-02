/**
 * Coachless Escalation System
 *
 * Handles critical situations for AI-coached athletes who don't have
 * a human coach to escalate to. Provides self-help resources and
 * support contact options.
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { logAgentAudit } from '../gdpr/audit-logger'
import { sendGenericEmail } from '@/lib/email'
import { SAFETY_BOUNDS } from '../guardrails/safety-bounds'

export interface EscalationTrigger {
  type: 'PAIN' | 'ACWR' | 'FATIGUE' | 'MISSED_CHECKINS' | 'INJURY' | 'WELLNESS'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  value?: number
  details?: string
}

export interface EscalationAction {
  type: 'NOTIFICATION' | 'EMAIL' | 'TRAINING_PAUSE' | 'SUPPORT_CONTACT' | 'RESOURCE_LINK'
  message: string
  resourceUrl?: string
  actionTaken: boolean
}

export interface EscalationResult {
  triggered: boolean
  trigger?: EscalationTrigger
  actions: EscalationAction[]
  autoAdjustments?: {
    type: string
    description: string
  }[]
}

/**
 * Check if escalation is needed based on athlete data
 */
export async function checkEscalationNeeded(
  clientId: string,
  data: {
    painLevel?: number
    acwr?: number
    fatigueScore?: number
    consecutiveMissedCheckIns?: number
    hasActiveInjury?: boolean
    wellnessScore?: number
  }
): Promise<EscalationResult> {
  const actions: EscalationAction[] = []
  let trigger: EscalationTrigger | undefined
  const autoAdjustments: { type: string; description: string }[] = []

  // Check pain level (threshold: 7+)
  if (data.painLevel !== undefined && data.painLevel >= SAFETY_BOUNDS.PAIN_ESCALATION_THRESHOLD) {
    trigger = {
      type: 'PAIN',
      severity: data.painLevel >= 9 ? 'CRITICAL' : 'HIGH',
      value: data.painLevel,
      details: `Pain level reported: ${data.painLevel}/10`,
    }

    actions.push({
      type: 'NOTIFICATION',
      message:
        'Your reported pain level is high. We recommend consulting a healthcare professional before continuing intense training.',
      actionTaken: true,
    })

    actions.push({
      type: 'RESOURCE_LINK',
      message: 'When to See a Doctor About Exercise Pain',
      resourceUrl: '/resources/pain-guidance',
      actionTaken: true,
    })

    // Auto-adjust training
    autoAdjustments.push({
      type: 'INTENSITY_REDUCTION',
      description: 'Training intensity reduced to recovery level until pain decreases',
    })
  }

  // Check ACWR (threshold: 2.0 critical, 1.5 danger)
  if (data.acwr !== undefined && data.acwr >= SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD) {
    trigger = trigger || {
      type: 'ACWR',
      severity: 'CRITICAL',
      value: data.acwr,
      details: `ACWR at ${data.acwr.toFixed(2)} - critical injury risk zone`,
    }

    actions.push({
      type: 'NOTIFICATION',
      message:
        'Your training load is in a critical zone. Training intensity and volume have been automatically reduced to protect you from injury.',
      actionTaken: true,
    })

    actions.push({
      type: 'TRAINING_PAUSE',
      message: 'High-intensity sessions paused for 48-72 hours',
      actionTaken: true,
    })

    autoAdjustments.push({
      type: 'LOAD_REDUCTION',
      description: 'Training load reduced by 40% for the next week',
    })
  } else if (data.acwr !== undefined && data.acwr >= SAFETY_BOUNDS.ACWR_DANGER_THRESHOLD) {
    if (!trigger) {
      trigger = {
        type: 'ACWR',
        severity: 'HIGH',
        value: data.acwr,
        details: `ACWR at ${data.acwr.toFixed(2)} - elevated injury risk`,
      }
    }

    actions.push({
      type: 'NOTIFICATION',
      message:
        'Your training load is elevated. Consider adding an extra rest day this week.',
      actionTaken: true,
    })

    autoAdjustments.push({
      type: 'REST_DAY_RECOMMENDATION',
      description: 'Additional rest day recommended',
    })
  }

  // Check missed check-ins (threshold: 5+ consecutive)
  if (data.consecutiveMissedCheckIns !== undefined && data.consecutiveMissedCheckIns >= 5) {
    if (!trigger || trigger.severity !== 'CRITICAL') {
      trigger = {
        type: 'MISSED_CHECKINS',
        severity: data.consecutiveMissedCheckIns >= 7 ? 'HIGH' : 'MEDIUM',
        value: data.consecutiveMissedCheckIns,
        details: `${data.consecutiveMissedCheckIns} consecutive missed check-ins`,
      }
    }

    actions.push({
      type: 'NOTIFICATION',
      message:
        "We haven't heard from you in a while. Is everything okay? Check-ins help us keep your training on track.",
      actionTaken: true,
    })

    if (data.consecutiveMissedCheckIns >= 7) {
      actions.push({
        type: 'EMAIL',
        message: 'Wellness check email sent',
        actionTaken: true,
      })
    }
  }

  // Check severe fatigue
  if (data.fatigueScore !== undefined && data.fatigueScore >= 9) {
    if (!trigger) {
      trigger = {
        type: 'FATIGUE',
        severity: 'HIGH',
        value: data.fatigueScore,
        details: `Extreme fatigue reported: ${data.fatigueScore}/10`,
      }
    }

    actions.push({
      type: 'NOTIFICATION',
      message:
        'You reported extreme fatigue. Consider taking a rest day and ensuring adequate sleep and nutrition.',
      actionTaken: true,
    })

    actions.push({
      type: 'RESOURCE_LINK',
      message: 'Recovery Tips for Athletes',
      resourceUrl: '/resources/recovery-guide',
      actionTaken: true,
    })

    autoAdjustments.push({
      type: 'REST_DAY_INJECTION',
      description: 'Rest day added to your schedule',
    })
  }

  // Check active injury flag
  if (data.hasActiveInjury) {
    if (!trigger) {
      trigger = {
        type: 'INJURY',
        severity: 'HIGH',
        details: 'Active injury reported',
      }
    }

    actions.push({
      type: 'NOTIFICATION',
      message:
        'Your training is being modified due to your reported injury. Consider consulting a physiotherapist for a recovery plan.',
      actionTaken: true,
    })

    actions.push({
      type: 'SUPPORT_CONTACT',
      message: 'Would you like to connect with a professional coach or physiotherapist?',
      resourceUrl: '/athlete/request-coach',
      actionTaken: false, // User needs to take action
    })
  }

  // Log escalation
  if (trigger) {
    logger.warn('Escalation triggered for coachless athlete', {
      clientId,
      trigger,
      actionsCount: actions.length,
    })

    await logAgentAudit({
      clientId,
      action: 'DECISION_MADE',
      resource: 'Agent',
      details: {
        type: 'ESCALATION_TRIGGERED',
        trigger,
        actions: actions.map((a) => ({ type: a.type, message: a.message })),
        autoAdjustments,
      },
      actorType: 'AGENT',
    })
  }

  return {
    triggered: !!trigger,
    trigger,
    actions,
    autoAdjustments: autoAdjustments.length > 0 ? autoAdjustments : undefined,
  }
}

/**
 * Execute escalation actions
 */
export async function executeEscalation(
  clientId: string,
  result: EscalationResult
): Promise<void> {
  if (!result.triggered || !result.trigger) return

  // Get client for email
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      athleteAccount: {
        include: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  })

  if (!client) return

  const athleteEmail = client.athleteAccount?.user?.email
  const athleteName = client.athleteAccount?.user?.name || client.name

  // Create notifications
  for (const action of result.actions) {
    if (action.type === 'NOTIFICATION') {
      await prisma.aINotification.create({
        data: {
          clientId,
          notificationType: 'ESCALATION',
          title: `Important: ${result.trigger.type.toLowerCase().replace('_', ' ')} alert`,
          message: action.message,
          priority: result.trigger.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          contextData: {
            trigger: result.trigger as unknown as Prisma.InputJsonValue,
            resourceUrl: action.resourceUrl,
          } as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    }

    if (action.type === 'EMAIL' && athleteEmail) {
      await sendWellnessCheckEmail(athleteEmail, athleteName, result.trigger)
    }
  }

  // Apply auto-adjustments if needed
  if (result.autoAdjustments) {
    for (const adjustment of result.autoAdjustments) {
      if (adjustment.type === 'LOAD_REDUCTION') {
        // Create an agent action for load reduction
        await prisma.agentAction.create({
          data: {
            clientId,
            actionType: 'PROGRAM_ADJUSTMENT',
            actionData: {
              adjustmentType: 'LOAD_REDUCTION',
              reductionPercent: 40,
              reason: result.trigger.details,
            },
            reasoning: `Automatic load reduction due to ${result.trigger.type}: ${result.trigger.details}`,
            confidence: 'HIGH',
            confidenceScore: 0.95,
            priority: 'HIGH',
            status: 'AUTO_APPLIED',
            decidedAt: new Date(),
            decidedBy: 'AGENT',
          },
        })
      }

      if (adjustment.type === 'REST_DAY_INJECTION') {
        await prisma.agentAction.create({
          data: {
            clientId,
            actionType: 'REST_DAY_INJECTION',
            actionData: {
              targetDate: new Date().toISOString(),
              reason: result.trigger.details,
            },
            reasoning: `Rest day injected due to ${result.trigger.type}: ${result.trigger.details}`,
            confidence: 'HIGH',
            confidenceScore: 0.9,
            priority: 'HIGH',
            status: 'AUTO_APPLIED',
            decidedAt: new Date(),
            decidedBy: 'AGENT',
          },
        })
      }
    }
  }

  logger.info('Escalation executed', {
    clientId,
    trigger: result.trigger.type,
    actionsExecuted: result.actions.length,
  })
}

/**
 * Send wellness check email
 */
async function sendWellnessCheckEmail(
  email: string,
  name: string,
  trigger: EscalationTrigger
): Promise<void> {
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
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Checking In On You</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>

      <p>We noticed some concerning patterns in your training data and wanted to check in with you.</p>

      <p>Your wellbeing is our priority. If you're feeling unwell, dealing with an injury, or just need a break - that's completely okay.</p>

      <p>When you're ready, please log in and complete a quick check-in so we can adjust your training accordingly.</p>

      <a href="${baseUrl}/athlete/check-in" class="button">Complete Check-In</a>

      <p style="margin-top: 20px;">Need more support? Consider connecting with a professional coach or physiotherapist:</p>

      <a href="${baseUrl}/athlete/request-coach" class="button" style="background: #64748b;">Find a Coach</a>

      <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
        If you're experiencing any medical concerns, please consult a healthcare professional.
      </p>
    </div>
    <div class="footer">
      <p>Star by Thomson - Your AI Training Partner</p>
    </div>
  </div>
</body>
</html>
`

  await sendGenericEmail({
    to: email,
    subject: 'Checking in - How are you doing?',
    html,
  })
}

/**
 * Get help resources for self-coached athletes
 */
export function getHelpResources(trigger?: EscalationTrigger): {
  title: string
  url: string
  description: string
}[] {
  const resources = [
    {
      title: 'Training Recovery Guide',
      url: '/resources/recovery-guide',
      description: 'Tips for optimal recovery between sessions',
    },
    {
      title: 'Managing Training Load',
      url: '/resources/training-load',
      description: 'Understanding and managing your training stress',
    },
    {
      title: 'Connect with a Coach',
      url: '/athlete/request-coach',
      description: 'Get personalized guidance from a human coach',
    },
    {
      title: 'Support & FAQ',
      url: '/support',
      description: 'Common questions and how to get help',
    },
  ]

  if (trigger?.type === 'PAIN' || trigger?.type === 'INJURY') {
    resources.unshift({
      title: 'When to See a Doctor',
      url: '/resources/pain-guidance',
      description: 'Guidance on seeking medical attention for training-related pain',
    })
  }

  return resources
}
