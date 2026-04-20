import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ImportRosterClient } from '@/components/coach/teams/ImportRosterClient'

interface PageProps {
  params: Promise<{ businessSlug: string; teamId: string }>
}

export default async function ImportRosterPage({ params }: PageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const team = await prisma.team.findFirst({
    where: { id: teamId, userId: user.id },
    select: { id: true, name: true, sportType: true },
  })
  if (!team) notFound()

  const teamPath = `/${businessSlug}/coach/teams/${teamId}`

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Link href={teamPath}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till {team.name}
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2 dark:text-white">Importera spelare</h1>
      <p className="text-muted-foreground mb-8">
        Klistra in ett roster, ladda upp en Excel/CSV/PDF/text-fil, eller fota av en
        utskriven laguppställning eller whiteboard. AI tolkar innehållet och låter dig
        granska innan spelarna läggs till i {team.name}.
      </p>

      <ImportRosterClient
        teamId={team.id}
        teamName={team.name}
        teamPath={teamPath}
      />
    </div>
  )
}
