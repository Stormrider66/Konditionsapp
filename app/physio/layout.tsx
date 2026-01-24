import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { PhysioGlassHeader } from '@/components/physio/PhysioGlassHeader'

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

    // Verify user is a physio
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
    })

    if (dbUser?.role !== 'PHYSIO' && dbUser?.role !== 'ADMIN') {
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
