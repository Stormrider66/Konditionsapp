import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin } from 'lucide-react'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PracticeSheetActions } from '@/components/coach/team-calendar/PracticeSheetPrintButton'
import { IceHockeyRink, type DrillStructure } from '@/components/coach/drills/IceHockeyRink'
import type { PracticeBlock } from '@/lib/team-calendar/practice-plan'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
    eventId: string
  }>
  searchParams?: Promise<{
    audience?: string | string[]
  }>
}

type PracticeSheetAudience = 'staff' | 'players'

const BLOCK_TYPE_LABELS: Record<string, string> = {
  warmup: 'Uppvärmning',
  technical: 'Teknik',
  tactical: 'Taktik',
  small_game: 'Smålagsspel',
  special_teams: 'Special teams',
  goalie: 'Målvakt',
  cooldown: 'Nedvarvning',
}

const RINK_ZONE_LABELS: Record<string, string> = {
  full_ice: 'Helplan',
  offensive_zone: 'Anfallszon',
  defensive_zone: 'Försvarszon',
  neutral_zone: 'Mittzon',
  half_ice: 'Halvplan',
  stations: 'Stationer',
}

const INTENSITY_LABELS: Record<string, string> = {
  low: 'Låg',
  medium: 'Medel',
  high: 'Hög',
  game: 'Matchlik',
}

const TACTICAL_CATEGORY_LABELS: Record<string, string> = {
  skills: 'Teknik',
  breakout: 'Uppspel',
  forecheck: 'Forecheck',
  transition: 'Omställning',
  special_teams: 'Special teams',
  small_area: 'Smålagsspel',
  finishing: 'Avslut',
  goalie: 'Målvakt',
}

function isPracticeBlock(value: unknown): value is PracticeBlock {
  return Boolean(value && typeof value === 'object' && 'title' in value)
}

function parsePracticePlan(value: unknown): PracticeBlock[] {
  if (!Array.isArray(value)) return []
  return value.filter(isPracticeBlock)
}

function isDrillStructure(value: unknown): value is DrillStructure {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'players' in value &&
    'movements' in value &&
    Array.isArray((value as { players?: unknown }).players) &&
    Array.isArray((value as { movements?: unknown }).movements)
  )
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
    id: 'fallback-plan',
    type: 'tactical',
    title: 'Plan och innehåll',
    duration: 0,
    focus: '',
    description,
    coachingPoints: '',
  }]
}

function normalizeAudience(value: string | string[] | undefined): PracticeSheetAudience {
  const audience = Array.isArray(value) ? value[0] : value
  return audience === 'players' ? 'players' : 'staff'
}

function uniqueTextValues(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
}

function summarizeList(values: string[]) {
  if (values.length === 0) return 'Ej angivet'
  if (values.length <= 3) return values.join(', ')
  return `${values.slice(0, 3).join(', ')} +${values.length - 3}`
}

export default async function PracticeSheetPage({ params, searchParams }: PageProps) {
  const { businessSlug, teamId, eventId } = await params
  const audience = normalizeAudience((await searchParams)?.audience)
  const isPlayerVersion = audience === 'players'
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
  const staffHref = `/${businessSlug}/coach/teams/${teamId}/calendar/${eventId}/practice-sheet`
  const playerHref = `${staffHref}?audience=players`
  const focusAreas = uniqueTextValues(practiceBlocks.map((block) => block.focus))
  const rinkZones = uniqueTextValues(practiceBlocks.map((block) => block.rinkZone ? RINK_ZONE_LABELS[block.rinkZone] : null))
  const highIntensityBlocks = practiceBlocks.filter((block) => block.intensity === 'high' || block.intensity === 'game').length

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
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={!isPlayerVersion ? 'default' : 'outline'} size="sm">
              <Link href={staffHref}>Tränarversion</Link>
            </Button>
            <Button asChild variant={isPlayerVersion ? 'default' : 'outline'} size="sm">
              <Link href={playerHref}>Spelarversion</Link>
            </Button>
            <PracticeSheetActions />
          </div>
        </div>

        <header className="border-b pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                {isPlayerVersion ? 'Spelarversion' : 'Tränarversion'} · Ispass
              </p>
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

        <section className="mt-5 grid gap-3 text-sm sm:grid-cols-3 print:grid-cols-3">
          <div className="rounded-md border bg-slate-50 p-3 print:bg-white">
            <p className="text-xs font-semibold uppercase text-slate-500">Block</p>
            <p className="mt-1 font-semibold">{practiceBlocks.length} st</p>
          </div>
          <div className="rounded-md border bg-slate-50 p-3 print:bg-white">
            <p className="text-xs font-semibold uppercase text-slate-500">{isPlayerVersion ? 'Fokus' : 'Zoner'}</p>
            <p className="mt-1 font-semibold">{isPlayerVersion ? summarizeList(focusAreas) : summarizeList(rinkZones)}</p>
          </div>
          <div className="rounded-md border bg-slate-50 p-3 print:bg-white">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {isPlayerVersion ? 'Version' : 'Belastning'}
            </p>
            <p className="mt-1 font-semibold">
              {isPlayerVersion ? 'Delningsbar spelarvy' : `${highIntensityBlocks} högintensiva block`}
            </p>
          </div>
        </section>

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
                      {block.rinkZone && <Badge variant="outline">{RINK_ZONE_LABELS[block.rinkZone] ?? block.rinkZone}</Badge>}
                      {block.intensity && <Badge variant="outline">{INTENSITY_LABELS[block.intensity] ?? block.intensity}</Badge>}
                      {block.tacticalCategory && (
                        <Badge variant="outline">{TACTICAL_CATEGORY_LABELS[block.tacticalCategory] ?? block.tacticalCategory}</Badge>
                      )}
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
                {!isPlayerVersion && (block.groups || block.equipment) && (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {block.groups && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">Grupp: </span>
                        {block.groups}
                      </div>
                    )}
                    {block.equipment && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">Material: </span>
                        {block.equipment}
                      </div>
                    )}
                  </div>
                )}
                {!isPlayerVersion && (block.lineGroups || block.goalieNotes) && (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {block.lineGroups && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">Kedjor/roller: </span>
                        {block.lineGroups}
                      </div>
                    )}
                    {block.goalieNotes && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">Målvakt: </span>
                        {block.goalieNotes}
                      </div>
                    )}
                  </div>
                )}
                {block.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{block.description}</p>
                )}
                {isDrillStructure(block.drillStructure) && (
                  <div className="mt-4 rounded-md border bg-slate-50 p-3 print:bg-white">
                    <IceHockeyRink structure={block.drillStructure} width={520} className="mx-auto" />
                  </div>
                )}
                {!isPlayerVersion && block.coachingPoints && (
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
          Skapad av {event.createdBy.name} · {isPlayerVersion ? 'Spelarversion' : 'Tränarversion'} · Trainomics teamkalender
        </footer>
      </div>
    </main>
  )
}
