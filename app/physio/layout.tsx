import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PhysioGlassHeader } from '@/components/physio/PhysioGlassHeader'
import { canAccessPhysioPlatform } from '@/lib/user-capabilities'

export default async function PhysioLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const hasPhysioAccess = await canAccessPhysioPlatform(user.id)
    if (!hasPhysioAccess) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <PhysioGlassHeader user={user} />
            <main className="pt-16">
                {children}
            </main>
        </div>
    )
}
