import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { PhysioGlassHeader } from '@/components/physio/PhysioGlassHeader'

interface PhysioLayoutProps {
    children: React.ReactNode
    params: Promise<{ businessSlug: string }>
}

export default async function BusinessPhysioLayout({
    children,
    params,
}: PhysioLayoutProps) {
    const { businessSlug } = await params
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

    // Verify business exists and user has access
    const business = await prisma.business.findUnique({
        where: { slug: businessSlug },
        select: { id: true, name: true },
    })

    if (!business) {
        redirect('/physio/dashboard')
    }

    // Check if user is a member of this business
    const membership = await prisma.businessMember.findFirst({
        where: {
            businessId: business.id,
            userId: user.id,
            isActive: true,
        },
    })

    if (!membership && dbUser?.role !== 'ADMIN') {
        redirect('/physio/dashboard')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <PhysioGlassHeader user={user} businessSlug={businessSlug} />
            <main className="pt-16">
                {children}
            </main>
        </div>
    )
}
