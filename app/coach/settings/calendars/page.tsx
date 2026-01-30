import { requireCoach } from '@/lib/auth-utils'
import { CoachCalendarSettingsClient } from './CoachCalendarSettingsClient'

export default async function CoachCalendarSettingsPage() {
  await requireCoach()
  return <CoachCalendarSettingsClient />
}
