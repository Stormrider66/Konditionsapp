/**
 * Cross-Organization Unified Calendar
 *
 * Shows events from all organizations the coach belongs to.
 * Three modes: Personal schedule, All Teams, and Planning.
 */

import { requireCoach } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { UnifiedCalendarClient } from './UnifiedCalendarClient'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.my.calendar')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function UnifiedCalendarPage() {
  const user = await requireCoach().catch(() => null)
  if (!user) {
    redirect('/login')
  }

  return <UnifiedCalendarClient userEmail={user.email || ''} />
}
