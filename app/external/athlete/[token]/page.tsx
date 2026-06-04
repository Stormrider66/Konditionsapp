import { headers } from 'next/headers'
import Image from 'next/image'
import {
  Activity,
  Building2,
  CalendarDays,
  Clock,
  Dumbbell,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Timer,
  UserRound,
} from 'lucide-react'

import {
  addUtcDays,
  clampExternalPortalRange,
  formatExternalPortalDateLabel,
  formatExternalPortalDateValue,
  getExternalAthleteCalendarItems,
  parseExternalPortalDate,
  type ExternalAthleteCalendarItem,
  type ExternalPortalLocale,
} from '@/lib/external-athlete-calendar'
import {
  getExternalAthleteAccessStatus,
  resolveExternalAthleteAccess,
} from '@/lib/external-athlete-access'
import { prisma } from '@/lib/prisma'
import type {
  PrintableWorkout,
  PrintableWorkoutItem,
  PrintableWorkoutKind,
} from '@/lib/workout-print/normalize'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function portalText(locale: ExternalPortalLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function safeHexColor(value?: string | null) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#2563eb'
}

function statusLabel(status: string, locale: ExternalPortalLocale) {
  const normalized = status.toUpperCase()
  if (normalized === 'COMPLETED') return portalText(locale, 'Completed', 'Utfört')
  if (normalized === 'ACTIVE') return portalText(locale, 'Active', 'Aktivt')
  if (normalized === 'CANCELLED') return portalText(locale, 'Cancelled', 'Inställt')
  return portalText(locale, 'Planned', 'Planerat')
}

function kindLabel(kind: PrintableWorkoutKind | undefined, locale: ExternalPortalLocale) {
  if (kind === 'strength') return portalText(locale, 'Strength', 'Styrka')
  if (kind === 'cardio') return portalText(locale, 'Cardio', 'Kondition')
  if (kind === 'hybrid') return 'Hybrid'
  if (kind === 'agility') return portalText(locale, 'Agility', 'Agility')
  return portalText(locale, 'Event', 'Händelse')
}

function kindIcon(kind: PrintableWorkoutKind | undefined) {
  if (kind === 'strength' || kind === 'hybrid') return <Dumbbell className="h-4 w-4" aria-hidden="true" />
  if (kind === 'cardio') return <Activity className="h-4 w-4" aria-hidden="true" />
  return <CalendarDays className="h-4 w-4" aria-hidden="true" />
}

function kindClasses(kind: PrintableWorkoutKind | undefined) {
  if (kind === 'strength') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (kind === 'cardio') return 'border-red-200 bg-red-50 text-red-800'
  if (kind === 'hybrid') return 'border-orange-200 bg-orange-50 text-orange-800'
  if (kind === 'agility') return 'border-sky-200 bg-sky-50 text-sky-800'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function formatRange(item: ExternalAthleteCalendarItem, locale: ExternalPortalLocale) {
  const start = formatExternalPortalDateLabel(item.date, locale)
  const end = formatExternalPortalDateValue(item.endDate)
  const startValue = formatExternalPortalDateValue(item.date)
  return startValue === end ? start : `${start} - ${formatExternalPortalDateLabel(item.endDate, locale)}`
}

function itemKey(date: Date) {
  return formatExternalPortalDateValue(date)
}

function groupByDate(items: ExternalAthleteCalendarItem[]) {
  return items.reduce<Map<string, ExternalAthleteCalendarItem[]>>((acc, item) => {
    const key = itemKey(item.date)
    const group = acc.get(key) ?? []
    group.push(item)
    acc.set(key, group)
    return acc
  }, new Map())
}

function DetailLine({ item }: { item: PrintableWorkoutItem }) {
  return (
    <li className="grid gap-2 border-t border-slate-100 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)]">
      <div>
        <p className="font-medium text-slate-950">{item.title}</p>
        {item.notes ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.notes}</p> : null}
      </div>
      {item.details.length ? (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {item.details.map((detail) => (
            <span
              key={detail}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700"
            >
              {detail}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  )
}

function WorkoutDetails({ workout }: { workout: PrintableWorkout }) {
  return (
    <div className="mt-5 space-y-5">
      {workout.description ? <p className="text-sm leading-6 text-slate-600">{workout.description}</p> : null}
      {workout.sections.map((section) => (
        <section key={section.title} className="border-t border-slate-200 pt-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h4 className="text-sm font-semibold uppercase text-slate-950">{section.title}</h4>
            {section.subtitle ? <p className="text-sm text-slate-500">{section.subtitle}</p> : null}
          </div>
          {section.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{section.notes}</p> : null}
          {section.items.length ? (
            <ul className="mt-2">
              {section.items.map((item, index) => (
                <DetailLine key={`${item.title}-${index}`} item={item} />
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  )
}

function CalendarItemCard({
  item,
  locale,
}: {
  item: ExternalAthleteCalendarItem
  locale: ExternalPortalLocale
}) {
  const chipClass = kindClasses(item.workoutKind)

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-medium ${chipClass}`}>
              {kindIcon(item.workoutKind)}
              {kindLabel(item.workoutKind, locale)}
            </span>
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700">
              {statusLabel(item.status, locale)}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatRange(item, locale)}
            </span>
            {item.scheduleLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {item.scheduleLabel}
              </span>
            ) : null}
            {item.locationName ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {item.locationName}
              </span>
            ) : null}
            {item.workout?.durationLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-4 w-4" aria-hidden="true" />
                {item.workout.durationLabel}
              </span>
            ) : null}
          </div>
          {item.description && !item.workout ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
          ) : null}
        </div>
      </div>
      {item.workout ? <WorkoutDetails workout={item.workout} /> : null}
    </article>
  )
}

function AccessUnavailable({
  status,
  locale,
}: {
  status: 'expired' | 'revoked' | 'missing'
  locale: ExternalPortalLocale
}) {
  const title = status === 'expired'
    ? portalText(locale, 'Access expired', 'Åtkomsten har gått ut')
    : status === 'revoked'
      ? portalText(locale, 'Access revoked', 'Åtkomsten har återkallats')
      : portalText(locale, 'Access not found', 'Åtkomsten hittades inte')

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-950 text-white">
          <LockKeyhole className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-slate-600">
          {portalText(
            locale,
            'Contact the athlete’s coach for a new player access link.',
            'Kontakta atletens coach för en ny spelarlänk.'
          )}
        </p>
      </section>
    </main>
  )
}

async function trackView(accessId: string) {
  const headerList = await headers()
  const forwardedFor = headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwardedFor || headerList.get('x-real-ip') || null

  await prisma.athleteExternalAccess.update({
    where: { id: accessId },
    data: {
      lastViewedAt: new Date(),
      lastViewedIp: ip?.slice(0, 120) ?? null,
      viewCount: { increment: 1 },
    },
  }).catch(() => undefined)
}

export default async function ExternalAthletePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams?: Promise<SearchParams>
}) {
  const { token } = await params
  const rawSearchParams = (await searchParams) ?? {}
  const locale: ExternalPortalLocale = firstParam(rawSearchParams.lang) === 'sv' ? 'sv' : 'en'
  const access = await resolveExternalAthleteAccess(token)

  if (!access) return <AccessUnavailable status="missing" locale={locale} />

  const accessStatus = getExternalAthleteAccessStatus(access)
  if (accessStatus !== 'active') {
    return <AccessUnavailable status={accessStatus} locale={locale} />
  }

  await trackView(access.id)

  const today = new Date()
  const requestedStart = parseExternalPortalDate(firstParam(rawSearchParams.from), addUtcDays(today, -7))
  const requestedEnd = parseExternalPortalDate(firstParam(rawSearchParams.to), addUtcDays(today, 42))
  const { startDate, endDate } = clampExternalPortalRange(requestedStart, requestedEnd)
  const items = await getExternalAthleteCalendarItems({
    athleteClientId: access.athleteClientId,
    athleteName: access.athlete.name,
    startDate,
    endDate,
    locale,
  })
  const groupedItems = groupByDate(items)
  const business = access.business ?? access.athlete.business
  const primaryColor = safeHexColor(business?.primaryColor)
  const secondaryColor = safeHexColor(business?.secondaryColor) || primaryColor
  const athleteMeta = [
    access.athlete.team?.name,
    access.athlete.position,
    access.athlete.jerseyNumber ? `#${access.athlete.jerseyNumber}` : null,
    access.athlete.sportProfile?.primarySport || access.athlete.team?.sportType,
  ].filter(Boolean)
  const prevStart = addUtcDays(startDate, -28)
  const prevEnd = addUtcDays(endDate, -28)
  const nextStart = addUtcDays(startDate, 28)
  const nextEnd = addUtcDays(endDate, 28)
  const langParam = `&lang=${locale}`
  const workoutCount = items.filter((item) => item.kind === 'workout').length
  const eventCount = items.length - workoutCount

  return (
    <main
      className="min-h-screen bg-slate-50 text-slate-950"
      style={{
        '--portal-primary': primaryColor,
        '--portal-secondary': secondaryColor,
      } as React.CSSProperties}
    >
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {business?.logoUrl ? (
                <Image
                  src={business.logoUrl}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 rounded-lg border border-slate-200 object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                  <ShieldCheck className="h-7 w-7" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase text-slate-500">
                  {portalText(locale, 'External performance access', 'Extern performanceåtkomst')}
                </p>
                <h1 className="mt-1 text-3xl font-semibold text-slate-950">{access.athlete.name}</h1>
                <p className="mt-1 truncate text-sm text-slate-600">{athleteMeta.join(' · ') || business?.name || 'Trainomics'}</p>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 font-medium text-slate-950">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  {access.organizationName || business?.name || portalText(locale, 'External staff', 'Extern personal')}
                </span>
                <span className="mt-1 block">{access.roleLabel || portalText(locale, 'Performance staff', 'Performancepersonal')}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 font-medium text-slate-950">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  {access.viewerName || portalText(locale, 'Viewer', 'Mottagare')}
                </span>
                <span className="mt-1 block truncate">{access.viewerEmail || portalText(locale, 'No email stored', 'Ingen e-post sparad')}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 font-medium text-slate-950">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  {portalText(locale, 'Calendar + workouts', 'Kalender + pass')}
                </span>
                <span className="mt-1 block">
                  {access.expiresAt
                    ? `${portalText(locale, 'Expires', 'Går ut')} ${formatExternalPortalDateValue(access.expiresAt)}`
                    : portalText(locale, 'No expiry date', 'Inget slutdatum')}
                </span>
              </div>
            </div>
          </div>
          {!business?.hidePlatformBranding ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500">
              <span>{business?.name ? `${business.name} · Trainomics` : 'Trainomics'}</span>
              <span>{portalText(locale, 'Read-only player calendar', 'Läsbar spelarkalender')}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {formatExternalPortalDateLabel(startDate, locale)} - {formatExternalPortalDateLabel(endDate, locale)}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {workoutCount} {portalText(locale, 'workouts', 'pass')} · {eventCount} {portalText(locale, 'calendar events', 'kalenderhändelser')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`?from=${formatExternalPortalDateValue(prevStart)}&to=${formatExternalPortalDateValue(prevEnd)}${langParam}`}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {portalText(locale, 'Previous', 'Föregående')}
            </a>
            <a
              href={`?from=${formatExternalPortalDateValue(nextStart)}&to=${formatExternalPortalDateValue(nextEnd)}${langParam}`}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {portalText(locale, 'Next', 'Nästa')}
            </a>
          </div>
        </div>

        {items.length ? (
          <div className="space-y-8">
            {Array.from(groupedItems.entries()).map(([dateKey, dayItems]) => (
              <section key={dateKey} className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="pt-1">
                  <p className="text-sm font-medium uppercase text-slate-500">{formatExternalPortalDateValue(dayItems[0].date)}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{formatExternalPortalDateLabel(dayItems[0].date, locale)}</h2>
                </div>
                <div className="space-y-4">
                  {dayItems.map((item) => (
                    <CalendarItemCard key={item.id} item={item} locale={locale} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">
              {portalText(locale, 'No planned items in this range', 'Inga planerade poster i detta intervall')}
            </h2>
          </section>
        )}
      </div>
    </main>
  )
}
