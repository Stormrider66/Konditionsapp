// app/coach/athletes/[id]/calendar/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { UnifiedCalendar } from '@/components/calendar'

interface CoachAthleteCalendarPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CoachAthleteCalendarPage({
  params,
}: CoachAthleteCalendarPageProps) {
  const user = await requireCoach()
  const { id } = await params

  // Check if coach can access this client
  const hasAccess = await canAccessClient(user.id, id)
  if (!hasAccess) {
    notFound()
  }

  // Fetch client
  const client = await prisma.client.findUnique({
    where: { id },
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
        <Link href={`/clients/${client.id}`}>
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
