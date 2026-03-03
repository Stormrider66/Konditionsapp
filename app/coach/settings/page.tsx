import { CoachSettingsClient } from './CoachSettingsClient'
import { requireCoach } from '@/lib/auth-utils'

export default async function CoachSettingsPage() {
    const user = await requireCoach()

    return <CoachSettingsClient userEmail={user.email || ''} userName={user.name || ''} />
}
