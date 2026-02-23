import { CoachSettingsClient } from './CoachSettingsClient'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function CoachSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
    })

    return <CoachSettingsClient user={user} userName={dbUser?.name || ''} />
}
