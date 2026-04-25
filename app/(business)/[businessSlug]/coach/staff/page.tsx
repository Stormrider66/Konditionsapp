import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { StaffManagement } from '@/components/coach/staff/StaffManagement'
import { Users } from 'lucide-react'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function StaffPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const teams = await prisma.team.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          Personalhantering
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bjud in och hantera tränare, fystränare och fysioterapeuter
        </p>
      </div>

      <StaffManagement teams={teams} businessType={membership.business.type} />
    </div>
  )
}
