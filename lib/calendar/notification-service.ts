/**
 * Calendar Notification Service
 *
 * Handles sending email notifications for calendar changes
 */

import 'server-only'

import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { logger } from '@/lib/logger'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type NotificationType =
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_DELETED'
  | 'WORKOUT_RESCHEDULED'
  | 'CONFLICT_DETECTED'

export interface CalendarNotificationData {
  type: NotificationType
  clientId: string
  changedById: string
  eventTitle?: string
  eventType?: string
  description: string
  previousDate?: Date
  newDate?: Date
  trainingImpact?: string
  conflictSeverity?: string
}

interface NotificationRecipient {
  email: string
  name: string
  role: 'COACH' | 'ATHLETE'
}

// Notification types that should trigger email
const EMAIL_WORTHY_TYPES: NotificationType[] = [
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'EVENT_DELETED',
  'WORKOUT_RESCHEDULED',
  'CONFLICT_DETECTED',
]

// Only send email for high-impact events
const HIGH_IMPACT_TRAINING_IMPACTS = ['NO_TRAINING', 'REDUCED']

/**
 * Send calendar change notification to relevant parties
 */
export async function sendCalendarNotification(data: CalendarNotificationData): Promise<void> {
  if (!resend) {
    logger.debug('Resend not configured, skipping email notification')
    return
  }

  try {
    // Get client and associated users
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        athleteAccount: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    })

    if (!client) {
      console.error('Client not found for notification:', data.clientId)
      return
    }

    // Build recipient list (exclude the person who made the change)
    const recipients: NotificationRecipient[] = []

    // Add coach if not the one who made the change
    if (client.user.id !== data.changedById && client.user.email) {
      recipients.push({
        email: client.user.email,
        name: client.user.name || 'Coach',
        role: 'COACH',
      })
    }

    // Add athlete if not the one who made the change
    if (
      client.athleteAccount?.user &&
      client.athleteAccount.user.id !== data.changedById &&
      client.athleteAccount.user.email
    ) {
      recipients.push({
        email: client.athleteAccount.user.email,
        name: client.athleteAccount.user.name || 'Athlete',
        role: 'ATHLETE',
      })
    }

    if (recipients.length === 0) {
      return // No one to notify
    }

    // Check if this is worth sending an email for
    if (!shouldSendEmail(data)) {
      return
    }

    // Send emails
    for (const recipient of recipients) {
      await sendNotificationEmail(recipient, client.name, data)
    }
  } catch (error) {
    console.error('Error sending calendar notification:', error)
  }
}

/**
 * Determine if this notification should trigger an email
 */
function shouldSendEmail(data: CalendarNotificationData): boolean {
  // Always email for conflicts
  if (data.type === 'CONFLICT_DETECTED') {
    return true
  }

  // Email for workout rescheduling
  if (data.type === 'WORKOUT_RESCHEDULED') {
    return true
  }

  // Email for high-impact events
  if (
    data.trainingImpact &&
    HIGH_IMPACT_TRAINING_IMPACTS.includes(data.trainingImpact)
  ) {
    return true
  }

  // Email for deleted events
  if (data.type === 'EVENT_DELETED') {
    return true
  }

  // For created/updated events, only email if they have significant training impact
  return false
}

/**
 * Send the actual email
 */
async function sendNotificationEmail(
  recipient: NotificationRecipient,
  clientName: string,
  data: CalendarNotificationData
): Promise<void> {
  if (!resend) return

  const subject = getEmailSubject(data, clientName)
  const html = getEmailHtml(data, clientName, recipient)

  try {
    await resend.emails.send({
      from: 'Star by Thomson <notifications@starcoaching.se>',
      to: recipient.email,
      subject,
      html,
    })
    logger.info('Notification email sent', { recipientEmail: recipient.email })
  } catch (error) {
    console.error('Failed to send notification email:', error)
  }
}

/**
 * Generate email subject
 */
function getEmailSubject(data: CalendarNotificationData, clientName: string): string {
  switch (data.type) {
    case 'EVENT_CREATED':
      return `Ny händelse i ${clientName}s kalender`
    case 'EVENT_UPDATED':
      return `Uppdaterad händelse i ${clientName}s kalender`
    case 'EVENT_DELETED':
      return `Borttagen händelse i ${clientName}s kalender`
    case 'WORKOUT_RESCHEDULED':
      return `Träningspass flyttat för ${clientName}`
    case 'CONFLICT_DETECTED':
      return `Konflikt upptäckt i ${clientName}s schema`
    default:
      return `Kalenderändring för ${clientName}`
  }
}

/**
 * Generate email HTML
 */
function getEmailHtml(
  data: CalendarNotificationData,
  clientName: string,
  recipient: NotificationRecipient
): string {
  const typeLabel = getTypeLabel(data.type)
  const dateInfo = getDateInfo(data)
  const impactBadge = getImpactBadge(data.trainingImpact)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kalendernotifikation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Star by Thomson</h1>
    <p style="margin: 5px 0 0; opacity: 0.9;">Kalendernotifikation</p>
  </div>

  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0 0 15px;">Hej ${recipient.name},</p>

    <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
        <span style="background: ${getTypeColor(data.type)}; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500;">
          ${typeLabel}
        </span>
        ${impactBadge}
      </div>

      <h2 style="margin: 0 0 10px; font-size: 18px; color: #111827;">
        ${data.eventTitle || 'Kalenderändring'}
      </h2>

      <p style="margin: 0 0 15px; color: #6b7280;">
        ${data.description}
      </p>

      ${dateInfo}

      <p style="margin: 15px 0 0; font-size: 14px; color: #6b7280;">
        Atlet: <strong>${clientName}</strong>
      </p>
    </div>

    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.starcoaching.se'}/${recipient.role === 'COACH' ? 'coach/clients' : 'athlete/calendar'}"
         style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        Visa i Kalendern
      </a>
    </div>
  </div>

  <div style="padding: 15px 20px; text-align: center; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">
      Detta är ett automatiskt meddelande från Star by Thomson.
      <br>
      Du får detta mail för att det finns ändringar i en kalender du har tillgång till.
    </p>
  </div>
</body>
</html>
  `
}

function getTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'EVENT_CREATED':
      return 'Ny händelse'
    case 'EVENT_UPDATED':
      return 'Uppdaterad'
    case 'EVENT_DELETED':
      return 'Borttagen'
    case 'WORKOUT_RESCHEDULED':
      return 'Pass flyttat'
    case 'CONFLICT_DETECTED':
      return 'Konflikt'
    default:
      return 'Ändring'
  }
}

function getTypeColor(type: NotificationType): string {
  switch (type) {
    case 'EVENT_CREATED':
      return '#10b981' // green
    case 'EVENT_UPDATED':
      return '#3b82f6' // blue
    case 'EVENT_DELETED':
      return '#ef4444' // red
    case 'WORKOUT_RESCHEDULED':
      return '#8b5cf6' // purple
    case 'CONFLICT_DETECTED':
      return '#f59e0b' // amber
    default:
      return '#6b7280' // gray
  }
}

function getImpactBadge(trainingImpact?: string): string {
  if (!trainingImpact) return ''

  const colors: Record<string, { bg: string; text: string }> = {
    NO_TRAINING: { bg: '#fef2f2', text: '#dc2626' },
    REDUCED: { bg: '#fffbeb', text: '#d97706' },
    MODIFIED: { bg: '#fefce8', text: '#ca8a04' },
    NORMAL: { bg: '#f0fdf4', text: '#16a34a' },
  }

  const labels: Record<string, string> = {
    NO_TRAINING: 'Ingen träning',
    REDUCED: 'Reducerad',
    MODIFIED: 'Modifierad',
    NORMAL: 'Normal',
  }

  const color = colors[trainingImpact] || colors.NORMAL
  const label = labels[trainingImpact] || trainingImpact

  return `<span style="background: ${color.bg}; color: ${color.text}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; margin-left: 8px;">${label}</span>`
}

function getDateInfo(data: CalendarNotificationData): string {
  if (!data.previousDate && !data.newDate) return ''

  const formatDate = (date: Date) =>
    format(date, 'EEEE d MMMM yyyy', { locale: sv })

  if (data.previousDate && data.newDate) {
    return `
      <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 15px 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div>
            <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Från</span>
            <p style="margin: 2px 0 0; font-weight: 500;">${formatDate(data.previousDate)}</p>
          </div>
          <span style="color: #9ca3af;">→</span>
          <div>
            <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Till</span>
            <p style="margin: 2px 0 0; font-weight: 500; color: #667eea;">${formatDate(data.newDate)}</p>
          </div>
        </div>
      </div>
    `
  }

  if (data.newDate) {
    return `
      <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 15px 0;">
        <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Datum</span>
        <p style="margin: 2px 0 0; font-weight: 500;">${formatDate(data.newDate)}</p>
      </div>
    `
  }

  return ''
}

/**
 * Helper to send notifications from API routes
 * Runs async without blocking the response
 */
export function sendNotificationAsync(data: CalendarNotificationData): void {
  // Fire and forget - don't await
  sendCalendarNotification(data).catch((err) => {
    console.error('Background notification failed:', err)
  })
}
