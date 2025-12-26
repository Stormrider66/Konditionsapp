// app/athlete/calendar/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { UnifiedCalendar } from '@/components/calendar'
import { Button } from '@/components/ui/button'

export default async function AthleteCalendarPage() {
  const user = await requireAthlete()

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Min kalender</h1>
          <p className="text-muted-foreground">
            Se alla dina träningspass, tävlingar och händelser på ett ställe
          </p>
        </div>
        <Link href="/athlete/settings/calendars">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Anslut kalendrar
          </Button>
        </Link>
      </div>

      <UnifiedCalendar
        clientId={athleteAccount.clientId}
        clientName={athleteAccount.client.name}
        isCoachView={false}
      />
    </div>
  )
}
