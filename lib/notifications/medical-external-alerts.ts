import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizePhoneNumber, sendSMS } from '@/lib/sms'
import { getTeamPhysioUserIdsForClient } from '@/lib/medical/care-team-recipients'

type ExternalAlertChannel = 'SMS' | 'WHATSAPP'

interface SendAcuteInjuryExternalAlertOptions {
  reportId: string
  clientId: string
  reporterId: string
  urgency: string
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
}

function getAlertChannel(): ExternalAlertChannel {
  return process.env.MEDICAL_ALERT_CHANNEL === 'WHATSAPP' ? 'WHATSAPP' : 'SMS'
}

function buildReportUrl(businessSlug: string | null | undefined, reportId: string) {
  const path = businessSlug
    ? `/${businessSlug}/physio/acute-reports/${reportId}`
    : '/login'
  return new URL(path, getAppBaseUrl()).toString()
}

function buildAcuteInjuryMessage(athleteName: string, urgency: string, reportUrl: string) {
  const priority = urgency === 'EMERGENCY' || urgency === 'URGENT'
    ? 'Akut'
    : urgency === 'MODERATE'
      ? 'Mellan'
      : 'Låg'

  return [
    `Ny skaderapport i Trainomics: ${athleteName}.`,
    `Prioritet: ${priority}.`,
    `Öppna rapporten: ${reportUrl}`,
  ].join(' ')
}

async function getStaffPhoneByUserId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      tester: { select: { phone: true } },
      selfAthleteClient: { select: { phone: true } },
    },
  })

  if (!user) return null
  if (user.tester?.phone) return user.tester.phone
  if (user.selfAthleteClient?.phone) return user.selfAthleteClient.phone

  const profileClient = await prisma.client.findFirst({
    where: {
      email: user.email,
      phone: { not: null },
    },
    select: { phone: true },
  })

  return profileClient?.phone || null
}

async function sendExternalAlert(channel: ExternalAlertChannel, to: string, body: string) {
  if (channel === 'WHATSAPP') {
    logger.info('WhatsApp medical alerts are not configured yet, falling back to SMS')
  }

  return sendSMS({ to, body })
}

export async function sendAcuteInjuryExternalAlerts(
  options: SendAcuteInjuryExternalAlertOptions
): Promise<{ sent: number; skipped: number; failed: number }> {
  const [client, physioUserIds] = await Promise.all([
    prisma.client.findUnique({
      where: { id: options.clientId },
      select: {
        name: true,
        business: { select: { slug: true } },
      },
    }),
    getTeamPhysioUserIdsForClient(options.clientId),
  ])

  if (!client || physioUserIds.length === 0) {
    return { sent: 0, skipped: 0, failed: 0 }
  }

  const channel = getAlertChannel()
  const reportUrl = buildReportUrl(client.business?.slug, options.reportId)
  const body = buildAcuteInjuryMessage(client.name, options.urgency, reportUrl)
  const recipients = physioUserIds.filter((userId) => userId !== options.reporterId)
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const userId of recipients) {
    const rawPhone = await getStaffPhoneByUserId(userId)
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) : null

    if (!phone) {
      skipped++
      logger.info('Skipping medical external alert without staff phone', { userId })
      continue
    }

    const result = await sendExternalAlert(channel, phone, body)
    if (result.success) {
      sent++
    } else {
      failed++
      logger.warn('Medical external alert failed', {
        userId,
        reportId: options.reportId,
        error: result.error,
      })
    }
  }

  logger.info('Medical external alerts processed', {
    reportId: options.reportId,
    channel,
    sent,
    skipped,
    failed,
  })

  return { sent, skipped, failed }
}
