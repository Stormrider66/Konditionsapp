import { CoachSettingsClient } from './CoachSettingsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CoachSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return <CoachSettingsClient user={user} />
}
