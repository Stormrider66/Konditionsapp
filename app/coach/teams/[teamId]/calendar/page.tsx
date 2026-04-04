import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { TeamCalendarView } from '@/components/coach/team-calendar/TeamCalendarView'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ teamId: string }>
}

export default async function TeamCalendarPage({ params }: PageProps) {
  const { teamId } = await params
  const user = await requireCoach()

  const team = await prisma.team.findFirst({
    where: { id: teamId, userId: user.id },
    select: { id: true, name: true },
  })

  if (!team) notFound()

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/coach/teams">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
            {team.name} - Kalender
          </h1>
          <p className="text-sm text-muted-foreground">
            Träningar, matcher och händelser
          </p>
        </div>
      </div>

      <TeamCalendarView teamId={team.id} teamName={team.name} />
    </div>
  )
}
