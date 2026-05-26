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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

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

interface AcuteReportsClientProps {
  basePath: string
}

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

const urgencyStyles: Record<string, string> = {
  EMERGENCY: 'bg-red-500/20 text-red-300 border-red-500/40',
  URGENT: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  MODERATE: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  LOW: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
}

const statusStyles: Record<string, string> = {
  PENDING_REVIEW: 'bg-red-500/20 text-red-300 border-red-500/30',
  REVIEWED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  IN_TREATMENT: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  RESOLVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  REFERRED: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ASSESSED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  CLOSED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
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

        const data = await response.json()
        if (isMounted) {
          setReports(data.reports || [])
          setTotal(data.total || 0)
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
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    )
  }, [reports, search])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{copy(locale, 'Injury reports', 'Skaderapporter')}</h1>
          <p className="mt-2 text-slate-400">
            {copy(
              locale,
              'New reports from players and staff that need medical follow-up.',
              'Nya rapporter från spelare och ledare som behöver medicinsk uppföljning.'
            )}
          </p>
        </div>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
          <Link href={`${basePath}/athletes`}>
            <User className="mr-2 h-4 w-4" />
            {copy(locale, 'Open athletes', 'Öppna spelare')}
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy(locale, 'Search player, body part, or description...', 'Sök spelare, kroppsdel eller beskrivning...')}
            className="border-white/10 bg-slate-950/70 pl-10 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full border-white/10 bg-slate-950/70 text-white md:w-[190px]">
            <Filter className="mr-2 h-4 w-4 text-slate-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-900">
            <SelectItem value="PENDING_REVIEW" className="text-slate-200">{copy(locale, 'New reports', 'Nya rapporter')}</SelectItem>
            <SelectItem value="REVIEWED" className="text-slate-200">{copy(locale, 'Reviewed', 'Bedömda')}</SelectItem>
            <SelectItem value="IN_TREATMENT" className="text-slate-200">{copy(locale, 'In treatment', 'I behandling')}</SelectItem>
            <SelectItem value="RESOLVED" className="text-slate-200">{copy(locale, 'Resolved', 'Lösta')}</SelectItem>
            <SelectItem value="all" className="text-slate-200">{copy(locale, 'All statuses', 'Alla statusar')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={urgency} onValueChange={setUrgency}>
          <SelectTrigger className="w-full border-white/10 bg-slate-950/70 text-white md:w-[170px]">
            <AlertTriangle className="mr-2 h-4 w-4 text-slate-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-900">
            <SelectItem value="all" className="text-slate-200">{copy(locale, 'All levels', 'Alla nivåer')}</SelectItem>
            <SelectItem value="EMERGENCY" className="text-slate-200">{copy(locale, 'Emergency', 'Akut')}</SelectItem>
            <SelectItem value="URGENT" className="text-slate-200">{copy(locale, 'Urgent', 'Brådskande')}</SelectItem>
            <SelectItem value="MODERATE" className="text-slate-200">{copy(locale, 'Moderate', 'Måttlig')}</SelectItem>
            <SelectItem value="LOW" className="text-slate-200">{copy(locale, 'Low', 'Låg')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        {copy(locale, 'Showing', 'Visar')} {filteredReports.length} {copy(locale, 'of', 'av')} {total} {copy(locale, 'reports', 'rapporter')}
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="h-32 bg-slate-800/50" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-white/10 bg-slate-900/50">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="mx-auto mb-4 h-14 w-14 text-slate-600" />
            <p className="text-lg font-semibold text-white">{copy(locale, 'No reports found', 'Inga rapporter hittades')}</p>
            <p className="mt-2 text-sm text-slate-400">
              {copy(
                locale,
                'When a player reports an injury, it will appear here for assessment.',
                'När en spelare rapporterar en skada hamnar den här för bedömning.'
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Link key={report.id} href={`${basePath}/acute-reports/${report.id}`} className="block">
              <Card className="border-white/10 bg-slate-900/50 transition-colors hover:border-red-500/30">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        {report.client.name}
                      </CardTitle>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatEnum(report.bodyPart, locale)}
                        {report.side ? ` · ${labelFor(sideLabels, report.side, locale)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={urgencyStyles[report.urgency] || urgencyStyles.MODERATE}>
                        {labelFor(urgencyLabels, report.urgency, locale)}
                      </Badge>
                      <Badge className={statusStyles[report.status] || statusStyles.PENDING_REVIEW}>
                        {labelFor(statusLabels, report.status, locale)}
                      </Badge>
                      <ChevronRight className="hidden h-4 w-4 text-slate-600 md:block" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(report.incidentDate, locale)}
                    </span>
                    <span>{labelFor(mechanismLabels, report.mechanism, locale)}</span>
                    <span>{copy(locale, 'Pain', 'Smärta')} {report.initialSeverity}/10</span>
                    <span>{copy(locale, 'Reported by', 'Rapporterad av')} {report.reporter.name || report.reporter.role}</span>
                  </div>
                  {report.description && (
                    <p className="line-clamp-2 text-sm text-slate-300">{report.description}</p>
                  )}
                  {report.injury && (
                    <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                      {copy(locale, 'Linked to injury:', 'Kopplad till skada:')} {report.injury.injuryType || copy(locale, 'assessment', 'bedömning')}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
