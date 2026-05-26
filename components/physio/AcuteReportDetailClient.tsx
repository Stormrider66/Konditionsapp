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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-10 w-40 bg-slate-800/60" />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Skeleton className="h-96 bg-slate-800/60" />
          <Skeleton className="h-96 bg-slate-800/60" />
        </div>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 text-slate-400 hover:text-white"
        onClick={() => router.push(`${basePath}/acute-reports`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {copy(locale, 'Back to reports', 'Tillbaka till rapporter')}
      </Button>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className={urgencyStyles[report.urgency] || urgencyStyles.MODERATE}>
              {labelFor(urgencyLabels, report.urgency, locale)}
            </Badge>
            <Badge className={statusStyles[report.status] || statusStyles.PENDING_REVIEW}>
              {labelFor(statusLabels, report.status, locale)}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-white">{report.client.name}</h1>
          <p className="mt-2 text-slate-400">
            {formatEnum(report.bodyPart, locale)}
            {report.side ? ` · ${labelFor(sideLabels, report.side, locale)}` : ''} · {copy(locale, 'pain', 'smärta')} {report.initialSeverity}/10
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-white/10 text-slate-200 hover:text-white">
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
          <Card className="border-white/10 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
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
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    {copy(locale, 'Description', 'Beskrivning')}
                  </p>
                  <p className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-200">
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
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    {copy(locale, 'Immediate care', 'Akut åtgärd')}
                  </p>
                  <p className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-200">
                    {report.immediateCareGiven}
                  </p>
                </section>
              )}
            </CardContent>
          </Card>

          {report.injury && (
            <Card className="border-blue-500/20 bg-blue-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ClipboardCheck className="h-5 w-5 text-blue-300" />
                  {copy(locale, 'Linked injury', 'Kopplad skada')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-200">
                <p>
                  {report.injury.injuryType || copy(locale, 'Injury assessment', 'Skadebedömning')} · {report.injury.bodyPart || report.bodyPart} · {copy(locale, 'pain', 'smärta')}{' '}
                  {report.injury.painLevel}/10
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="border-white/10 text-slate-200 hover:text-white">
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

        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              {copy(locale, 'Assess and flag', 'Bedöm och flagga')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {report.injury ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
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
                    className="border-white/10 bg-slate-950/70 text-white placeholder:text-slate-500"
                  />
                </Field>

                <Field label={copy(locale, 'Body part', 'Kroppsdel')}>
                  <Input
                    value={bodyPart}
                    onChange={(event) => setBodyPart(event.target.value)}
                    className="border-white/10 bg-slate-950/70 text-white"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={copy(locale, 'Side', 'Sida')}>
                    <Select value={side} onValueChange={(value) => setSide(value as SideValue | 'none')}>
                      <SelectTrigger className="border-white/10 bg-slate-950/70 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-slate-900">
                        <SelectItem value="none" className="text-slate-200">{copy(locale, 'Not specified', 'Ej angivet')}</SelectItem>
                        <SelectItem value="LEFT" className="text-slate-200">{copy(locale, 'Left', 'Vänster')}</SelectItem>
                        <SelectItem value="RIGHT" className="text-slate-200">{copy(locale, 'Right', 'Höger')}</SelectItem>
                        <SelectItem value="BILATERAL" className="text-slate-200">{copy(locale, 'Both', 'Båda')}</SelectItem>
                        <SelectItem value="CENTRAL" className="text-slate-200">{copy(locale, 'Center', 'Centralt')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={copy(locale, 'Phase', 'Fas')}>
                    <Select value={phase} onValueChange={(value) => setPhase(value as PhaseValue)}>
                      <SelectTrigger className="border-white/10 bg-slate-950/70 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-slate-900">
                        <SelectItem value="ACUTE" className="text-slate-200">{copy(locale, 'Acute', 'Akut')}</SelectItem>
                        <SelectItem value="SUBACUTE" className="text-slate-200">{copy(locale, 'Subacute', 'Subakut')}</SelectItem>
                        <SelectItem value="CHRONIC" className="text-slate-200">{copy(locale, 'Chronic', 'Kronisk')}</SelectItem>
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
                    className="border-white/10 bg-slate-950/70"
                  />
                </Field>

                <Field label={copy(locale, 'Physio note', 'Fysioanteckning')}>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={copy(locale, 'Assessment, plan, follow-up...', 'Bedömning, plan, återbesök...')}
                    className="min-h-28 border-white/10 bg-slate-950/70 text-white placeholder:text-slate-500"
                  />
                </Field>

                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <Checkbox
                      checked={createRestriction}
                      onCheckedChange={(checked) => setCreateRestriction(Boolean(checked))}
                      className="mt-1 border-orange-400 data-[state=checked]:bg-orange-500"
                    />
                    <div>
                      <Label className="font-semibold text-white">{copy(locale, 'Create training restriction', 'Skapa träningsrestriktion')}</Label>
                      <p className="text-sm text-orange-100/80">
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
                          <SelectTrigger className="border-white/10 bg-slate-950/70 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-slate-900">
                            {Object.entries(restrictionLabels).map(([value, labels]) => (
                              <SelectItem key={value} value={value} className="text-slate-200">
                                {labels[locale]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={copy(locale, 'Severity', 'Allvarlighet')}>
                          <Select value={restrictionSeverity} onValueChange={setRestrictionSeverity}>
                            <SelectTrigger className="border-white/10 bg-slate-950/70 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-slate-900">
                              <SelectItem value="MILD" className="text-slate-200">Mild</SelectItem>
                              <SelectItem value="MODERATE" className="text-slate-200">{copy(locale, 'Moderate', 'Måttlig')}</SelectItem>
                              <SelectItem value="SEVERE" className="text-slate-200">{copy(locale, 'Severe', 'Stor')}</SelectItem>
                              <SelectItem value="COMPLETE" className="text-slate-200">{copy(locale, 'Complete rest', 'Total vila')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label={copy(locale, 'Valid until', 'Gäller till')}>
                          <Input
                            type="date"
                            value={restrictionEndDate}
                            onChange={(event) => setRestrictionEndDate(event.target.value)}
                            className="border-white/10 bg-slate-950/70 text-white"
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
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Label>
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
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        {icon}
        {label}
      </p>
      <p className="font-medium text-white">{value}</p>
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
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'

  return (
    <div className={`rounded-xl border p-3 text-sm ${active ? activeClass : 'border-white/10 bg-slate-950/60 text-slate-500'}`}>
      {active ? copy(locale, 'Yes', 'Ja') : copy(locale, 'No', 'Nej')} · {label}
    </div>
  )
}
