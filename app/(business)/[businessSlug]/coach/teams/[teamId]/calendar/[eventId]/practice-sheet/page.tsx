import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin } from 'lucide-react'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PracticeSheetPrintButton } from '@/components/coach/team-calendar/PracticeSheetPrintButton'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
    eventId: string
  }>
}

interface PracticeBlock {
  id?: string
  type?: string
  title?: string
  duration?: number
  focus?: string
  description?: string
  coachingPoints?: string
  drillId?: string | null
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  warmup: 'Uppvärmning',
  technical: 'Teknik',
  tactical: 'Taktik',
  small_game: 'Smålagsspel',
  special_teams: 'Special teams',
  goalie: 'Målvakt',
  cooldown: 'Nedvarvning',
}

function isPracticeBlock(value: unknown): value is PracticeBlock {
  return Boolean(value && typeof value === 'object' && 'title' in value)
}

function parsePracticePlan(value: unknown): PracticeBlock[] {
  if (!Array.isArray(value)) return []
  return value.filter(isPracticeBlock)
}

function formatDate(date: Date) {
  return date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: Date | null) {
  if (!date) return null
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

function fallbackBlocks(description: string | null): PracticeBlock[] {
  if (!description?.trim()) return []
  return [{
    type: 'tactical',
    title: 'Plan och innehåll',
    duration: 0,
    focus: '',
    description,
    coachingPoints: '',
  }]
}

export default async function PracticeSheetPage({ params }: PageProps) {
  const { businessSlug, teamId, eventId } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!team) notFound()

  const event = await prisma.teamEvent.findFirst({
    where: { id: eventId, teamId },
    select: {
      title: true,
      description: true,
      type: true,
      location: true,
      startDate: true,
      endDate: true,
      allDay: true,
      practicePlan: true,
      createdBy: { select: { name: true } },
    },
  })

  if (!event || (event.type !== 'PRACTICE' && event.type !== 'ICE_PRACTICE')) {
    notFound()
  }

  const blocks = parsePracticePlan(event.practicePlan)
  const practiceBlocks = blocks.length ? blocks : fallbackBlocks(event.description)
  const totalMinutes = practiceBlocks.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)
  const startTime = event.allDay ? null : formatTime(event.startDate)
  const endTime = event.allDay ? null : formatTime(event.endDate)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-col gap-3 border-b pb-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${businessSlug}/coach/teams/${teamId}/calendar`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Till kalendern
            </Link>
          </Button>
          <PracticeSheetPrintButton />
        </div>

        <header className="border-b pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Ispass</p>
              <h1 className="mt-1 text-3xl font-bold">{event.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{team.name} · {formatDate(event.startDate)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {startTime && (
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {startTime}{endTime ? ` - ${endTime}` : ''}
                </Badge>
              )}
              {event.location && (
                <Badge variant="outline" className="gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </Badge>
              )}
              {totalMinutes > 0 && <Badge variant="outline">{totalMinutes} min</Badge>}
            </div>
          </div>
        </header>

        <section className="mt-6 space-y-3">
          {practiceBlocks.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
              Ingen strukturerad passplan är sparad ännu.
            </div>
          ) : (
            practiceBlocks.map((block, index) => (
              <article key={block.id ?? index} className="break-inside-avoid rounded-md border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-slate-500">Block {index + 1}</span>
                      <Badge variant="secondary">{BLOCK_TYPE_LABELS[block.type ?? ''] ?? 'Block'}</Badge>
                      {block.drillId && <Badge variant="outline">Sparad övning</Badge>}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{block.title || 'Namnlöst block'}</h2>
                  </div>
                  {Boolean(block.duration) && (
                    <div className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold print:border print:bg-white">
                      {block.duration} min
                    </div>
                  )}
                </div>

                {block.focus && (
                  <p className="mt-3 text-sm font-medium text-slate-700">Fokus: {block.focus}</p>
                )}
                {block.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{block.description}</p>
                )}
                {block.coachingPoints && (
                  <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-950 print:border print:bg-white">
                    <span className="font-semibold">Coachingpunkter: </span>
                    {block.coachingPoints}
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        <footer className="mt-8 border-t pt-4 text-xs text-slate-500">
          Skapad av {event.createdBy.name} · Trainomics teamkalender
        </footer>
      </div>
    </main>
  )
}
