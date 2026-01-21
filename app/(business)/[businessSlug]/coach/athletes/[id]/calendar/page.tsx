// app/(business)/[businessSlug]/coach/athletes/[id]/calendar/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { UnifiedCalendar } from '@/components/calendar'

interface BusinessAthleteCalendarPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessAthleteCalendarPage({
  params,
}: BusinessAthleteCalendarPageProps) {
  const { businessSlug, id } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get all members in the business (to find all clients)
  const members = await prisma.businessMember.findMany({
    where: {
      businessId: membership.businessId,
      isActive: true,
    },
    select: { userId: true },
  })
  const memberIds = members.map(m => m.userId)

  // Fetch client and verify it belongs to a business member
  const client = await prisma.client.findFirst({
    where: {
      id,
      userId: { in: memberIds },
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!client) {
    notFound()
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href={`${basePath}/coach/clients/${client.id}`}>
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till {client.name}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{client.name}s kalender</h1>
        <p className="text-muted-foreground">
          Hantera atletens träningspass, tävlingar och händelser
        </p>
      </div>

      <UnifiedCalendar
        clientId={client.id}
        clientName={client.name}
        isCoachView={true}
      />
    </div>
  )
}
