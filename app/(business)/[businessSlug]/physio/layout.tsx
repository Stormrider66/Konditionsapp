import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { PhysioAppShell } from '@/components/layouts/PhysioAppShell'
import { canAccessPhysioPlatform } from '@/lib/user-capabilities'
import { BetaFeedbackWidget } from '@/components/feedback/BetaFeedbackWidget'

interface PhysioLayoutProps {
    children: React.ReactNode
    params: Promise<{ businessSlug: string }>
}

export default async function BusinessPhysioLayout({
    children,
    params,
}: PhysioLayoutProps) {
    const { businessSlug } = await params
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const hasPhysioAccess = await canAccessPhysioPlatform(user.id)
    if (!hasPhysioAccess) {
        redirect('/login')
    }

    // Verify business exists and user has access
    const business = await prisma.business.findUnique({
        where: { slug: businessSlug },
        select: { id: true, name: true, logoUrl: true, primaryColor: true },
    })

    if (!business) {
        redirect(`/${businessSlug}/physio/dashboard`)
    }

    // Check if user is a member of this business
    const membership = await prisma.businessMember.findFirst({
        where: {
            businessId: business.id,
            userId: user.id,
            isActive: true,
        },
    })

    if (!membership && user.role !== 'ADMIN') {
        redirect(`/${businessSlug}/physio/dashboard`)
    }

    return (
        <PhysioAppShell
            user={user}
            businessSlug={businessSlug}
            businessName={business.name}
            businessLogo={business.logoUrl}
            businessColor={business.primaryColor}
        >
            {children}
            <BetaFeedbackWidget userRole="PHYSIO" businessSlug={businessSlug} />
        </PhysioAppShell>
    )
}
