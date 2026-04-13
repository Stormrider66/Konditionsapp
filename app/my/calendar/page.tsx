/**
 * Cross-Organization Unified Calendar
 *
 * Shows events from all organizations the coach belongs to.
 * Three modes: Personal schedule, All Teams, and Planning.
 */

import { requireCoach } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { UnifiedCalendarClient } from './UnifiedCalendarClient'

export const metadata = {
  title: 'Samlad Kalender — Trainomics',
  description: 'Se ditt schema från alla organisationer på ett ställe.',
}

export default async function UnifiedCalendarPage() {
  const user = await requireCoach().catch(() => null)
  if (!user) {
    redirect('/login')
  }

  return <UnifiedCalendarClient userEmail={user.email || ''} />
}
