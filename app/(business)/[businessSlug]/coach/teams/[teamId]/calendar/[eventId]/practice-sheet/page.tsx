import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin } from 'lucide-react'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { getLocale, getTranslations } from '@/i18n/server'
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

const BLOCK_TYPE_LABEL_KEYS = {
  warmup: 'labels.blockType.warmup',
  technical: 'labels.blockType.technical',
  tactical: 'labels.blockType.tactical',
  small_game: 'labels.blockType.smallGame',
  special_teams: 'labels.blockType.specialTeams',
  goalie: 'labels.blockType.goalie',
  cooldown: 'labels.blockType.cooldown',
} as const

const RINK_ZONE_LABEL_KEYS = {
  full_ice: 'labels.rinkZone.fullIce',
  offensive_zone: 'labels.rinkZone.offensive',
  defensive_zone: 'labels.rinkZone.defensive',
  neutral_zone: 'labels.rinkZone.neutral',
  half_ice: 'labels.rinkZone.halfIce',
  stations: 'labels.rinkZone.stations',
} as const

const INTENSITY_LABEL_KEYS = {
  low: 'labels.intensity.low',
  medium: 'labels.intensity.medium',
  high: 'labels.intensity.high',
  game: 'labels.intensity.game',
} as const

const TACTICAL_CATEGORY_LABEL_KEYS = {
  skills: 'labels.tacticalCategory.skills',
  breakout: 'labels.tacticalCategory.breakout',
  forecheck: 'labels.tacticalCategory.forecheck',
  transition: 'labels.tacticalCategory.transition',
  special_teams: 'labels.tacticalCategory.specialTeams',
  small_area: 'labels.tacticalCategory.smallArea',
  finishing: 'labels.tacticalCategory.finishing',
  goalie: 'labels.tacticalCategory.goalie',
} as const

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

function dateLocale(locale: string) {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function formatDate(date: Date, locale: string) {
  return date.toLocaleDateString(dateLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: Date | null, locale: string) {
  if (!date) return null
  return date.toLocaleTimeString(dateLocale(locale), { hour: '2-digit', minute: '2-digit' })
}

function normalizeAudience(value: string | string[] | undefined): PracticeSheetAudience {
  const audience = Array.isArray(value) ? value[0] : value
  return audience === 'players' ? 'players' : 'staff'
}

function uniqueTextValues(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
}

function getMappedLabel<T extends Record<string, string>>(
  value: string | null | undefined,
  map: T,
  fallback: string
): string {
  if (!value) return fallback
  return map[value] ?? fallback
}

function summarizeList(values: string[], emptyValueLabel: string) {
  if (values.length === 0) return emptyValueLabel
  if (values.length <= 3) return values.join(', ')
  return `${values.slice(0, 3).join(', ')} +${values.length - 3}`
}

export default async function PracticeSheetPage({ params, searchParams }: PageProps) {
  const { businessSlug, teamId, eventId } = await params
  const audience = normalizeAudience((await searchParams)?.audience)
  const isPlayerVersion = audience === 'players'
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.practiceSheet')
  const locale = await getLocale()

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
  const fallbackPracticeBlock: PracticeBlock | null = event.description
    ? {
      id: 'fallback-plan',
      type: 'tactical',
      title: t('fallback.title'),
      duration: 0,
      focus: '',
      description: event.description,
      coachingPoints: '',
    }
    : null
  const practiceBlocks: PracticeBlock[] = blocks.length
    ? blocks
    : fallbackPracticeBlock
      ? [fallbackPracticeBlock]
      : []
  const totalMinutes = practiceBlocks.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)
  const startTime = event.allDay ? null : formatTime(event.startDate, locale)
  const endTime = event.allDay ? null : formatTime(event.endDate, locale)
  const staffHref = `/${businessSlug}/coach/teams/${teamId}/calendar/${eventId}/practice-sheet`
  const playerHref = `${staffHref}?audience=players`
  const focusAreas = uniqueTextValues(practiceBlocks.map((block) => block.focus))
  const rinkZones = uniqueTextValues(
    practiceBlocks.map((block) => {
      const zoneLabelKey = getMappedLabel(block.rinkZone, RINK_ZONE_LABEL_KEYS, 'labels.notSet')
      return zoneLabelKey ? t(zoneLabelKey) : null
    })
  )
  const highIntensityBlocks = practiceBlocks.filter((block) => block.intensity === 'high' || block.intensity === 'game').length

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-col gap-3 border-b pb-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${businessSlug}/coach/teams/${teamId}/calendar`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t('actions.backToCalendar')}
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={!isPlayerVersion ? 'default' : 'outline'} size="sm">
              <Link href={staffHref}>{t('audience.staff')}</Link>
            </Button>
            <Button asChild variant={isPlayerVersion ? 'default' : 'outline'} size="sm">
              <Link href={playerHref}>{t('audience.player')}</Link>
            </Button>
            <PracticeSheetActions />
          </div>
        </div>

        <header className="border-b pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                {isPlayerVersion ? t('audience.player') : t('audience.staff')} · {t('labels.iceSession')}
              </p>
              <h1 className="font-display mt-1 text-3xl font-bold">{event.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{team.name} · {formatDate(event.startDate, locale)}</p>
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
              {totalMinutes > 0 && <Badge variant="outline">{totalMinutes} {t('labels.min')}</Badge>}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 text-sm sm:grid-cols-3 print:grid-cols-3">
          <div className="rounded-md border bg-slate-50 p-3 print:bg-white">
            <p className="text-xs font-semibold uppercase text-slate-500">{t('labels.block')}</p>
            <p className="mt-1 font-semibold">{t('summary.blockCount', { count: practiceBlocks.length })}</p>
          </div>
          <div className="rounded-md border bg-slate-50 p-3 print:bg-white">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {isPlayerVersion ? t('summary.focus') : t('summary.zones')}
            </p>
            <p className="mt-1 font-semibold">
              {isPlayerVersion
                ? summarizeList(focusAreas, t('summary.notSet'))
                : summarizeList(rinkZones, t('summary.notSet'))}
            </p>
          </div>
          <div className="rounded-md border bg-slate-50 p-3 print:bg-white">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {isPlayerVersion ? t('summary.version') : t('summary.intensity')}
            </p>
            <p className="mt-1 font-semibold">
              {isPlayerVersion
                ? t('summary.sharedPlayerView')
                : t('summary.highIntensityBlocks', { count: highIntensityBlocks })}
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          {practiceBlocks.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
              {t('states.empty')}
            </div>
          ) : (
            practiceBlocks.map((block, index) => (
              <article key={block.id ?? index} className="break-inside-avoid rounded-md border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        {t('labels.blockNumber', { number: index + 1 })}
                      </span>
                      <Badge variant="secondary">{t(getMappedLabel(block.type, BLOCK_TYPE_LABEL_KEYS, 'labels.block'))}</Badge>
                      {block.rinkZone && (
                        <Badge variant="outline">{t(getMappedLabel(block.rinkZone, RINK_ZONE_LABEL_KEYS, 'labels.notSet'))}</Badge>
                      )}
                      {block.intensity && (
                        <Badge variant="outline">{t(getMappedLabel(block.intensity, INTENSITY_LABEL_KEYS, 'labels.notSet'))}</Badge>
                      )}
                      {block.tacticalCategory && (
                        <Badge variant="outline">
                          {t(getMappedLabel(block.tacticalCategory, TACTICAL_CATEGORY_LABEL_KEYS, 'labels.notSet'))}
                        </Badge>
                      )}
                      {block.drillId && <Badge variant="outline">{t('labels.savedDrill')}</Badge>}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{block.title || t('labels.untitledBlock')}</h2>
                  </div>
                  {Boolean(block.duration) && (
                    <div className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold print:border print:bg-white">
                      {block.duration} {t('labels.min')}
                    </div>
                  )}
                </div>

                {block.focus && (
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {t('labels.focus')}: {block.focus}
                  </p>
                )}
                {!isPlayerVersion && (block.groups || block.equipment) && (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {block.groups && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">{t('labels.group')}: </span>
                        {block.groups}
                      </div>
                    )}
                    {block.equipment && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">{t('labels.equipment')}: </span>
                        {block.equipment}
                      </div>
                    )}
                  </div>
                )}
                {!isPlayerVersion && (block.lineGroups || block.goalieNotes) && (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {block.lineGroups && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">{t('labels.lineGroups')}: </span>
                        {block.lineGroups}
                      </div>
                    )}
                    {block.goalieNotes && (
                      <div className="rounded-md bg-slate-50 p-2 print:border print:bg-white">
                        <span className="font-semibold">{t('labels.goalie')}: </span>
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
                    <span className="font-semibold">{t('labels.coachingPoints')}: </span>
                    {block.coachingPoints}
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        <footer className="mt-8 border-t pt-4 text-xs text-slate-500">
          {t('footer.createdBy', {
            creator: event.createdBy.name,
            audience: isPlayerVersion ? t('audience.player') : t('audience.staff'),
            teamCalendar: t('footer.teamCalendar'),
          })}
        </footer>
      </div>
    </main>
  )
}
