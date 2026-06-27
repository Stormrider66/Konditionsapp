'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/i18n/client'
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Filter,
  Search,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'

interface AcuteReport {
  id: string
  bodyPart: string
  side: string | null
  mechanism: string
  urgency: string
  status: string
  initialSeverity: number
  incidentDate: string
  reportDate: string
  description: string | null
  client: {
    id: string
    name: string
    email: string | null
  }
  reporter: {
    id: string
    name: string | null
    role: string
  }
  injury: {
    id: string
    injuryType: string | null
    phase: string | null
  } | null
}

interface AcuteReportsResponse {
  reports?: AcuteReport[]
  total?: number
}

interface AcuteReportsClientProps {
  basePath: string
}

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

const urgencyStyles: Record<string, string> = {
  EMERGENCY: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  URGENT: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  MODERATE: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-300',
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
}

const statusStyles: Record<string, string> = {
  PENDING_REVIEW: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  REVIEWED: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  IN_TREATMENT: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
  RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  REFERRED: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  ASSESSED: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  CLOSED: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300',
}

const urgencyLabels: Record<string, Record<AppLocale, string>> = {
  EMERGENCY: { en: 'Emergency', sv: 'Akut' },
  URGENT: { en: 'Urgent', sv: 'Brådskande' },
  MODERATE: { en: 'Moderate', sv: 'Måttlig' },
  LOW: { en: 'Low', sv: 'Låg' },
}

const statusLabels: Record<string, Record<AppLocale, string>> = {
  PENDING_REVIEW: { en: 'New report', sv: 'Ny rapport' },
  REVIEWED: { en: 'Reviewed', sv: 'Bedömd' },
  IN_TREATMENT: { en: 'In treatment', sv: 'I behandling' },
  RESOLVED: { en: 'Resolved', sv: 'Löst' },
  REFERRED: { en: 'Referred', sv: 'Remiss' },
  ASSESSED: { en: 'Assessed', sv: 'Bedömd' },
  CLOSED: { en: 'Closed', sv: 'Stängd' },
}

const mechanismLabels: Record<string, Record<AppLocale, string>> = {
  CONTACT: { en: 'Contact', sv: 'Kontakt' },
  NON_CONTACT: { en: 'Non-contact', sv: 'Icke-kontakt' },
  OVERUSE: { en: 'Overload', sv: 'Överbelastning' },
  UNKNOWN: { en: 'Unknown', sv: 'Okänt' },
}

const sideLabels: Record<string, Record<AppLocale, string>> = {
  LEFT: { en: 'Left', sv: 'Vänster' },
  RIGHT: { en: 'Right', sv: 'Höger' },
  BILATERAL: { en: 'Both', sv: 'Båda' },
  BOTH: { en: 'Both', sv: 'Båda' },
  CENTRAL: { en: 'Center', sv: 'Centralt' },
}

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatEnum(value: string | null | undefined, locale: AppLocale) {
  if (!value) return copy(locale, 'Not specified', 'Ej angivet')
  return value.replace(/_/g, ' ').toLowerCase()
}

function labelFor(labels: Record<string, Record<AppLocale, string>>, value: string, locale: AppLocale) {
  return labels[value]?.[locale] || value
}

export function AcuteReportsClient({ basePath }: AcuteReportsClientProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [reports, setReports] = useState<AcuteReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('PENDING_REVIEW')
  const [urgency, setUrgency] = useState('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function fetchReports() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '100' })
        if (status !== 'all') params.set('status', status)
        if (urgency !== 'all') params.set('urgency', urgency)

        const response = await fetch(`/api/injury/acute-report?${params.toString()}`)
        if (!response.ok) return

        const data = (await response.json()) as AcuteReportsResponse
        if (isMounted) {
          setReports(data.reports ?? [])
          setTotal(data.total ?? 0)
        }
      } catch (error) {
        console.error('Failed to fetch acute reports:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchReports()
    return () => {
      isMounted = false
    }
  }, [status, urgency])

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reports

    return reports.filter((report) =>
      [
        report.client.name,
        report.client.email,
        report.bodyPart,
        report.description,
        report.reporter.name,
      ]
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [reports, search])

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow={copy(locale, 'Acute queue', 'Akut kö')}
        title={copy(locale, 'Injury reports', 'Skaderapporter')}
        description={copy(
          locale,
          'New reports from players and staff that need medical follow-up.',
          'Nya rapporter från spelare och ledare som behöver medicinsk uppföljning.'
        )}
        actions={
          <Button asChild variant="outline">
            <Link href={`${basePath}/athletes`}>
              <User className="mr-2 h-4 w-4" />
              {copy(locale, 'Open athletes', 'Öppna spelare')}
            </Link>
          </Button>
        }
      />

      <RolePanel className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy(locale, 'Search player, body part, or description...', 'Sök spelare, kroppsdel eller beskrivning...')}
              className="pl-10"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full lg:w-[190px]">
              <Filter className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING_REVIEW">{copy(locale, 'New reports', 'Nya rapporter')}</SelectItem>
              <SelectItem value="REVIEWED">{copy(locale, 'Reviewed', 'Bedömda')}</SelectItem>
              <SelectItem value="IN_TREATMENT">{copy(locale, 'In treatment', 'I behandling')}</SelectItem>
              <SelectItem value="RESOLVED">{copy(locale, 'Resolved', 'Lösta')}</SelectItem>
              <SelectItem value="all">{copy(locale, 'All statuses', 'Alla statusar')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger className="w-full lg:w-[170px]">
              <AlertTriangle className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy(locale, 'All levels', 'Alla nivåer')}</SelectItem>
              <SelectItem value="EMERGENCY">{copy(locale, 'Emergency', 'Akut')}</SelectItem>
              <SelectItem value="URGENT">{copy(locale, 'Urgent', 'Brådskande')}</SelectItem>
              <SelectItem value="MODERATE">{copy(locale, 'Moderate', 'Måttlig')}</SelectItem>
              <SelectItem value="LOW">{copy(locale, 'Low', 'Låg')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </RolePanel>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        {copy(locale, 'Showing', 'Visar')} {filteredReports.length} {copy(locale, 'of', 'av')} {total}{' '}
        {copy(locale, 'reports', 'rapporter')}
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 bg-zinc-200/80 dark:bg-white/10" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <RolePanel className="p-12 text-center">
          <ClipboardCheck className="mx-auto mb-4 h-14 w-14 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {copy(locale, 'No reports found', 'Inga rapporter hittades')}
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {copy(
              locale,
              'When a player reports an injury, it will appear here for assessment.',
              'När en spelare rapporterar en skada hamnar den här för bedömning.'
            )}
          </p>
        </RolePanel>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Link key={report.id} href={`${basePath}/acute-reports/${report.id}`} className="block">
              <RolePanel className="p-5 transition-colors hover:border-red-200 dark:hover:border-red-900/60">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                      <span className="truncate">{report.client.name}</span>
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatEnum(report.bodyPart, locale)}
                      {report.side ? ` / ${labelFor(sideLabels, report.side, locale)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={urgencyStyles[report.urgency] || urgencyStyles.MODERATE}>
                      {labelFor(urgencyLabels, report.urgency, locale)}
                    </Badge>
                    <Badge variant="outline" className={statusStyles[report.status] || statusStyles.PENDING_REVIEW}>
                      {labelFor(statusLabels, report.status, locale)}
                    </Badge>
                    <ChevronRight className="hidden h-4 w-4 text-zinc-400 md:block" />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(report.incidentDate, locale)}
                    </span>
                    <span>{labelFor(mechanismLabels, report.mechanism, locale)}</span>
                    <span>{copy(locale, 'Pain', 'Smärta')} {report.initialSeverity}/10</span>
                    <span>{copy(locale, 'Reported by', 'Rapporterad av')} {report.reporter.name || report.reporter.role}</span>
                  </div>
                  {report.description && (
                    <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">{report.description}</p>
                  )}
                  {report.injury && (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                      {copy(locale, 'Linked to injury:', 'Kopplad till skada:')} {report.injury.injuryType || copy(locale, 'assessment', 'bedömning')}
                    </Badge>
                  )}
                </div>
              </RolePanel>
            </Link>
          ))}
        </div>
      )}
    </RolePageFrame>
  )
}
