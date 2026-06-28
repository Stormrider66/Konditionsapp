'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/i18n/client'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  RolePageFrame,
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'

interface AcuteReportDetail {
  id: string
  clientId: string
  bodyPart: string
  side: string | null
  mechanism: string
  urgency: string
  status: string
  initialSeverity: number
  incidentDate: string
  incidentTime: string | null
  reportDate: string
  description: string | null
  immediateCareGiven: string | null
  iceApplied: boolean
  removedFromPlay: boolean
  ambulanceCalled: boolean
  referralNeeded: boolean
  referralType: string | null
  referralUrgency: string | null
  notes: string | null
  client: {
    id: string
    name: string
    email: string | null
    birthDate: string | null
    gender: string | null
  }
  reporter: {
    id: string
    name: string | null
    role: string
  }
  injury: {
    id: string
    injuryType: string | null
    bodyPart: string | null
    phase: string | null
    painLevel: number
  } | null
}

interface AcuteReportDetailClientProps {
  basePath: string
  reportId: string
}

type SideValue = 'LEFT' | 'RIGHT' | 'BILATERAL' | 'CENTRAL'
type PhaseValue = 'ACUTE' | 'SUBACUTE' | 'CHRONIC'
type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

const urgencyStyles: Record<string, string> = {
  EMERGENCY: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/25 dark:text-red-300',
  URGENT: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/25 dark:text-orange-300',
  MODERATE: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/25 dark:text-amber-300',
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/25 dark:text-emerald-300',
}

const statusStyles: Record<string, string> = {
  PENDING_REVIEW: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/25 dark:text-red-300',
  REVIEWED: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/25 dark:text-blue-300',
  IN_TREATMENT: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/25 dark:text-violet-300',
  RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/25 dark:text-emerald-300',
  REFERRED: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/25 dark:text-orange-300',
  ASSESSED: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/25 dark:text-blue-300',
  CLOSED: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
}

const titleClass = 'flex items-center gap-2 text-zinc-950 dark:text-zinc-50'
const inputClass = 'border-zinc-200 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100'
const quietBlockClass = 'rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 text-sm leading-6 text-zinc-700 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-200'
const outlineButtonClass = 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50'
const capsLabelClass = 'text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500'

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

const restrictionLabels: Record<string, Record<AppLocale, string>> = {
  NO_RUNNING: { en: 'No running', sv: 'Ingen löpning' },
  NO_JUMPING: { en: 'No jumping', sv: 'Inga hopp' },
  NO_IMPACT: { en: 'No impact', sv: 'Ingen impact' },
  NO_UPPER_BODY: { en: 'No upper body', sv: 'Ingen överkropp' },
  NO_LOWER_BODY: { en: 'No lower body', sv: 'Ingen underkropp' },
  REDUCED_VOLUME: { en: 'Reduced volume', sv: 'Minskad volym' },
  REDUCED_INTENSITY: { en: 'Reduced intensity', sv: 'Minskad intensitet' },
  MODIFIED_ONLY: { en: 'Modified only', sv: 'Endast modifierat' },
  SPECIFIC_EXERCISES: { en: 'Specific exercises', sv: 'Specifika övningar' },
  CUSTOM: { en: 'Custom', sv: 'Anpassad' },
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

function normalizeSide(value: string | null): SideValue | 'none' {
  if (value === 'LEFT' || value === 'RIGHT' || value === 'BILATERAL' || value === 'CENTRAL') {
    return value
  }
  if (value === 'BOTH') return 'BILATERAL'
  return 'none'
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

export function AcuteReportDetailClient({ basePath, reportId }: AcuteReportDetailClientProps) {
  const router = useRouter()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const { toast } = useToast()
  const [report, setReport] = useState<AcuteReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)

  const [injuryType, setInjuryType] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [side, setSide] = useState<SideValue | 'none'>('none')
  const [painLevel, setPainLevel] = useState(5)
  const [phase, setPhase] = useState<PhaseValue>('ACUTE')
  const [notes, setNotes] = useState('')
  const [createRestriction, setCreateRestriction] = useState(true)
  const [restrictionType, setRestrictionType] = useState('MODIFIED_ONLY')
  const [restrictionSeverity, setRestrictionSeverity] = useState('MODERATE')
  const [restrictionEndDate, setRestrictionEndDate] = useState('')

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/injury/acute-report/${reportId}`)
      if (!response.ok) {
        router.push(`${basePath}/acute-reports`)
        return
      }

      const data: AcuteReportDetail = await response.json()
      setReport(data)
      setInjuryType(data.injury?.injuryType || data.bodyPart || '')
      setBodyPart(data.injury?.bodyPart || data.bodyPart || '')
      setSide(normalizeSide(data.side))
      setPainLevel(data.injury?.painLevel || data.initialSeverity || 5)
      setNotes(data.notes || data.description || '')
    } catch (error) {
      console.error('Failed to fetch acute report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(fetchReport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  const saveStatus = async (nextStatus: string) => {
    if (!report) return
    setStatusSaving(true)
    try {
      const response = await fetch(`/api/injury/acute-report/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) throw new Error(copy(locale, 'Failed to update report status', 'Misslyckades med att uppdatera status'))
      const updated = await response.json()
      setReport(updated)
      toast({ title: copy(locale, 'Status updated', 'Status uppdaterad') })
    } catch (error) {
      toast({
        title: copy(locale, 'Could not update status', 'Kunde inte uppdatera status'),
        description: error instanceof Error ? error.message : copy(locale, 'Try again.', 'Försök igen.'),
        variant: 'destructive',
      })
    } finally {
      setStatusSaving(false)
    }
  }

  const assessReport = async () => {
    if (!report) return
    setSubmitting(true)
    try {
      const payload = {
        injuryType,
        bodyPart,
        side: side === 'none' ? undefined : side,
        painLevel,
        mechanism: report.mechanism,
        phase,
        description: report.description || undefined,
        notes: notes || undefined,
        createRestriction,
        restrictionType: createRestriction ? restrictionType : undefined,
        restrictionSeverity: createRestriction ? restrictionSeverity : undefined,
        restrictionEndDate: createRestriction && restrictionEndDate
          ? new Date(`${restrictionEndDate}T23:59:00`).toISOString()
          : undefined,
      }

      const response = await fetch(`/api/injury/acute-report/${report.id}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || copy(locale, 'Failed to assess report', 'Misslyckades med att bedöma rapporten'))

      toast({
        title: copy(locale, 'Injury assessed', 'Skadan är bedömd'),
        description: createRestriction
          ? copy(locale, 'An active restriction was created at the same time.', 'En aktiv restriktion skapades samtidigt.')
          : undefined,
      })
      await fetchReport()
    } catch (error) {
      toast({
        title: copy(locale, 'Could not create assessment', 'Kunde inte skapa bedömning'),
        description: error instanceof Error ? error.message : copy(locale, 'Check the fields and try again.', 'Kontrollera fälten och försök igen.'),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <RolePageFrame maxWidth="wide">
        <Skeleton className="mb-6 h-10 w-40 bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Skeleton className="h-96 bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-96 bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </RolePageFrame>
    )
  }

  if (!report) return null

  return (
    <RolePageFrame maxWidth="wide">
      <Button
        variant="ghost"
        className="mb-6 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        onClick={() => router.push(`${basePath}/acute-reports`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {copy(locale, 'Back to reports', 'Tillbaka till rapporter')}
      </Button>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline" className={urgencyStyles[report.urgency] || urgencyStyles.MODERATE}>
              {labelFor(urgencyLabels, report.urgency, locale)}
            </Badge>
            <Badge variant="outline" className={statusStyles[report.status] || statusStyles.PENDING_REVIEW}>
              {labelFor(statusLabels, report.status, locale)}
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{report.client.name}</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {formatEnum(report.bodyPart, locale)}
            {report.side ? ` · ${labelFor(sideLabels, report.side, locale)}` : ''} · {copy(locale, 'pain', 'smärta')} {report.initialSeverity}/10
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className={outlineButtonClass}>
            <Link href={`${basePath}/athletes/${report.client.id}`}>
              <Stethoscope className="mr-2 h-4 w-4" />
              {copy(locale, 'Open player', 'Öppna spelare')}
            </Link>
          </Button>
          <Button
            disabled={statusSaving}
            onClick={() => saveStatus(report.status === 'RESOLVED' ? 'PENDING_REVIEW' : 'RESOLVED')}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {statusSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {report.status === 'RESOLVED'
              ? copy(locale, 'Reopen', 'Återöppna')
              : copy(locale, 'Mark resolved', 'Markera löst')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={titleClass}>
                <ShieldAlert className="h-5 w-5 text-red-400" />
                {copy(locale, 'Report details', 'Rapportdetaljer')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Incident" value={formatDate(report.incidentDate, locale)} icon={<CalendarDays className="h-4 w-4" />} />
                <Info label={copy(locale, 'Time', 'Tid')} value={report.incidentTime || copy(locale, 'Not specified', 'Ej angivet')} />
                <Info label={copy(locale, 'Mechanism', 'Mekanism')} value={labelFor(mechanismLabels, report.mechanism, locale)} />
                <Info label={copy(locale, 'Reported by', 'Rapporterad av')} value={report.reporter.name || report.reporter.role} />
              </div>

              {report.description && (
                <section>
                  <p className={`mb-2 ${capsLabelClass}`}>
                    {copy(locale, 'Description', 'Beskrivning')}
                  </p>
                  <p className={quietBlockClass}>
                    {report.description}
                  </p>
                </section>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <CareBadge active={report.iceApplied} label={copy(locale, 'Ice applied', 'Is applicerad')} locale={locale} />
                <CareBadge active={report.removedFromPlay} label={copy(locale, 'Removed from play', 'Tagen ur spel')} locale={locale} />
                <CareBadge active={report.ambulanceCalled} label={copy(locale, 'Ambulance', 'Ambulans')} tone="red" locale={locale} />
              </div>

              {report.immediateCareGiven && (
                <section>
                  <p className={`mb-2 ${capsLabelClass}`}>
                    {copy(locale, 'Immediate care', 'Akut åtgärd')}
                  </p>
                  <p className={quietBlockClass}>
                    {report.immediateCareGiven}
                  </p>
                </section>
              )}
            </CardContent>
          </Card>

          {report.injury && (
            <Card className="border-blue-200 bg-blue-50/70 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-950 dark:text-blue-100">
                  <ClipboardCheck className="h-5 w-5 text-blue-300" />
                  {copy(locale, 'Linked injury', 'Kopplad skada')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-blue-900 dark:text-blue-100">
                <p>
                  {report.injury.injuryType || copy(locale, 'Injury assessment', 'Skadebedömning')} · {report.injury.bodyPart || report.bodyPart} · {copy(locale, 'pain', 'smärta')}{' '}
                  {report.injury.painLevel}/10
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className={outlineButtonClass}>
                    <Link href={`${basePath}/restrictions/new?clientId=${report.client.id}&injuryId=${report.injury.id}`}>
                      <Ban className="mr-2 h-4 w-4" />
                      {copy(locale, 'Add restriction', 'Lägg restriktion')}
                    </Link>
                  </Button>
                  <Button asChild className="bg-blue-500 hover:bg-blue-600">
                    <Link href={`${basePath}/rehab-programs/new?clientId=${report.client.id}&injuryId=${report.injury.id}`}>
                      <Stethoscope className="mr-2 h-4 w-4" />
                      {copy(locale, 'Create rehab program', 'Skapa rehabprogram')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className={titleClass}>
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              {copy(locale, 'Assess and flag', 'Bedöm och flagga')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {report.injury ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                {copy(
                  locale,
                  'This report has already been assessed. Create or update a restriction and rehab program from the buttons above.',
                  'Den här rapporten är redan bedömd. Skapa eller uppdatera restriktion och rehabprogram från knapparna ovan.'
                )}
              </div>
            ) : (
              <>
                <Field label={copy(locale, 'Injury type', 'Skadetyp')}>
                  <Input
                    value={injuryType}
                    onChange={(event) => setInjuryType(event.target.value)}
                    placeholder={copy(locale, 'e.g. knee pain, sprain, overload', 't.ex. knäsmärta, stukning, överbelastning')}
                    className={inputClass}
                  />
                </Field>

                <Field label={copy(locale, 'Body part', 'Kroppsdel')}>
                  <Input
                    value={bodyPart}
                    onChange={(event) => setBodyPart(event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={copy(locale, 'Side', 'Sida')}>
                    <Select value={side} onValueChange={(value) => setSide(value as SideValue | 'none')}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{copy(locale, 'Not specified', 'Ej angivet')}</SelectItem>
                        <SelectItem value="LEFT">{copy(locale, 'Left', 'Vänster')}</SelectItem>
                        <SelectItem value="RIGHT">{copy(locale, 'Right', 'Höger')}</SelectItem>
                        <SelectItem value="BILATERAL">{copy(locale, 'Both', 'Båda')}</SelectItem>
                        <SelectItem value="CENTRAL">{copy(locale, 'Center', 'Centralt')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={copy(locale, 'Phase', 'Fas')}>
                    <Select value={phase} onValueChange={(value) => setPhase(value as PhaseValue)}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACUTE">{copy(locale, 'Acute', 'Akut')}</SelectItem>
                        <SelectItem value="SUBACUTE">{copy(locale, 'Subacute', 'Subakut')}</SelectItem>
                        <SelectItem value="CHRONIC">{copy(locale, 'Chronic', 'Kronisk')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label={copy(locale, `Pain ${painLevel}/10`, `Smärta ${painLevel}/10`)}>
                  <Input
                    type="range"
                    min={0}
                    max={10}
                    value={painLevel}
                    onChange={(event) => setPainLevel(Number(event.target.value))}
                    className="accent-emerald-600"
                  />
                </Field>

                <Field label={copy(locale, 'Physio note', 'Fysioanteckning')}>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={copy(locale, 'Assessment, plan, follow-up...', 'Bedömning, plan, återbesök...')}
                    className={`min-h-28 ${inputClass}`}
                  />
                </Field>

                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/20">
                  <div className="mb-4 flex items-start gap-3">
                    <Checkbox
                      checked={createRestriction}
                      onCheckedChange={(checked) => setCreateRestriction(Boolean(checked))}
                      className="mt-1 border-orange-400 data-[state=checked]:bg-orange-500"
                    />
                    <div>
                      <Label className="font-semibold text-orange-950 dark:text-orange-100">{copy(locale, 'Create training restriction', 'Skapa träningsrestriktion')}</Label>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        {copy(
                          locale,
                          'Good default when the player needs a clear limitation in planning and calendar.',
                          'Bra standardläge när spelaren behöver tydlig begränsning i planering och kalender.'
                        )}
                      </p>
                    </div>
                  </div>

                  {createRestriction && (
                    <div className="space-y-4">
                      <Field label={copy(locale, 'Type', 'Typ')}>
                        <Select value={restrictionType} onValueChange={setRestrictionType}>
                          <SelectTrigger className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(restrictionLabels).map(([value, labels]) => (
                              <SelectItem key={value} value={value}>
                                {labels[locale]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={copy(locale, 'Severity', 'Allvarlighet')}>
                          <Select value={restrictionSeverity} onValueChange={setRestrictionSeverity}>
                            <SelectTrigger className={inputClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MILD">Mild</SelectItem>
                              <SelectItem value="MODERATE">{copy(locale, 'Moderate', 'Måttlig')}</SelectItem>
                              <SelectItem value="SEVERE">{copy(locale, 'Severe', 'Stor')}</SelectItem>
                              <SelectItem value="COMPLETE">{copy(locale, 'Complete rest', 'Total vila')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label={copy(locale, 'Valid until', 'Gäller till')}>
                          <Input
                            type="date"
                            value={restrictionEndDate}
                            onChange={(event) => setRestrictionEndDate(event.target.value)}
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  disabled={submitting || !injuryType.trim() || !bodyPart.trim()}
                  onClick={assessReport}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                  {copy(locale, 'Create assessment', 'Skapa bedömning')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RolePageFrame>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className={capsLabelClass}>{label}</Label>
      {children}
    </div>
  )
}

function Info({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
      <p className={`mb-2 flex items-center gap-2 ${capsLabelClass}`}>
        {icon}
        {label}
      </p>
      <p className="font-medium text-zinc-950 dark:text-zinc-100">{value}</p>
    </div>
  )
}

function CareBadge({
  active,
  label,
  locale,
  tone = 'emerald',
}: {
  active: boolean
  label: string
  locale: AppLocale
  tone?: 'emerald' | 'red'
}) {
  const activeClass = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300'

  return (
    <div className={`rounded-lg border p-3 text-sm ${active ? activeClass : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-400'}`}>
      {active ? copy(locale, 'Yes', 'Ja') : copy(locale, 'No', 'Nej')} · {label}
    </div>
  )
}
