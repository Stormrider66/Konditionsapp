'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/i18n/client'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface InjuryReportFormProps {
  clientId: string
  athleteName: string
  basePath: string
}

type Mechanism = 'CONTACT' | 'NON_CONTACT' | 'OVERUSE' | 'UNKNOWN'
type Urgency = 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'LOW'
type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function severityToUrgency(severity: number): Urgency {
  if (severity >= 9) return 'EMERGENCY'
  if (severity >= 7) return 'URGENT'
  if (severity >= 4) return 'MODERATE'
  return 'LOW'
}

export function InjuryReportForm({ clientId, athleteName, basePath }: InjuryReportFormProps) {
  const router = useRouter()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [incidentDate, setIncidentDate] = useState(todayDate())
  const [incidentTime, setIncidentTime] = useState(currentTime())
  const [bodyPart, setBodyPart] = useState('')
  const [side, setSide] = useState('none')
  const [mechanism, setMechanism] = useState<Mechanism>('UNKNOWN')
  const [activityType, setActivityType] = useState('TRAINING')
  const [initialSeverity, setInitialSeverity] = useState(5)
  const [urgency, setUrgency] = useState<Urgency>('MODERATE')
  const [description, setDescription] = useState('')
  const [immediateCareGiven, setImmediateCareGiven] = useState('')
  const [iceApplied, setIceApplied] = useState(false)
  const [removedFromPlay, setRemovedFromPlay] = useState(false)
  const [ambulanceCalled, setAmbulanceCalled] = useState(false)

  const setSeverity = (value: number) => {
    setInitialSeverity(value)
    setUrgency(severityToUrgency(value))
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const incidentDateTime = new Date(`${incidentDate}T${incidentTime || '12:00'}:00`)
      const response = await fetch('/api/injury/acute-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          incidentDate: incidentDateTime.toISOString(),
          incidentTime: incidentTime || undefined,
          mechanism,
          bodyPart,
          side: side === 'none' ? undefined : side,
          description,
          urgency,
          initialSeverity,
          activityType,
          immediateCareGiven: immediateCareGiven || undefined,
          iceApplied,
          removedFromPlay,
          ambulanceCalled,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || copy(locale, 'Failed to send injury report', 'Misslyckades med att skicka skaderapport'))
      }

      setSubmitted(true)
      toast({
        title: copy(locale, 'Injury report sent', 'Skaderapport skickad'),
        description: copy(locale, 'The physio and staff will receive it for follow-up.', 'Fysio och ledarstab får den för uppföljning.'),
      })
    } catch (error) {
      toast({
        title: copy(locale, 'Could not send the report', 'Kunde inte skicka rapporten'),
        description: error instanceof Error ? error.message : copy(locale, 'Try again.', 'Försök igen.'),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border-emerald-500/20 bg-white shadow-sm dark:bg-slate-900/70">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {copy(locale, 'The report has been sent', 'Rapporten är skickad')}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
              {copy(
                locale,
                'Your report is now with the physio and relevant staff. If it is urgent or gets worse quickly, contact medical care directly.',
                'Din rapport ligger nu hos fysio och berörd ledarstab. Om det är akut eller snabbt blir värre ska du kontakta vård direkt.'
              )}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => router.push(`${basePath}/athlete/dashboard`)}>
                {copy(locale, 'To dashboard', 'Till dashboard')}
              </Button>
              <Button variant="outline" onClick={() => router.push(`${basePath}/athlete/check-in`)}>
                {copy(locale, 'Do daily check-in', 'Gör daglig check-in')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {copy(locale, 'Back', 'Tillbaka')}
      </Button>

      <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300">
              <ShieldAlert className="mr-1 h-3 w-3" />
              {copy(locale, 'Injury / pain', 'Skada / smärta')}
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400">
              {athleteName}
            </Badge>
          </div>
          <CardTitle className="text-3xl text-slate-900 dark:text-white">
            {copy(locale, 'Report injury', 'Rapportera skada')}
          </CardTitle>
          <CardDescription className="text-base">
            {copy(
              locale,
              'Use this when you need a physio, physical trainer, or staff member to follow up on an injury concern.',
              'Använd den här när du behöver att fysio, fystränare eller ledare följer upp en skadekänning.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>
                {copy(
                  locale,
                  'If you have severe pain, numbness, trouble bearing weight, a suspected fracture, or a head injury, seek medical care directly. This report does not replace emergency care.',
                  'Om du har kraftig smärta, domningar, svårt att belasta, misstänkt fraktur eller huvudskada ska du söka vård direkt. Rapporten här ersätter inte akut vård.'
                )}
              </p>
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label={copy(locale, 'Date', 'Datum')}>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={incidentDate}
                  onChange={(event) => setIncidentDate(event.target.value)}
                  className="pl-10"
                />
              </div>
            </Field>
            <Field label={copy(locale, 'Time', 'Tid')}>
              <Input
                type="time"
                value={incidentTime}
                onChange={(event) => setIncidentTime(event.target.value)}
              />
            </Field>
            <Field label={copy(locale, 'Body part', 'Kroppsdel')}>
              <Input
                value={bodyPart}
                onChange={(event) => setBodyPart(event.target.value)}
                placeholder={copy(locale, 'e.g. knee, groin, shoulder, back', 't.ex. knä, ljumske, axel, rygg')}
              />
            </Field>
            <Field label={copy(locale, 'Side', 'Sida')}>
              <Select value={side} onValueChange={setSide}>
                <SelectTrigger>
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
            <Field label={copy(locale, 'How did it happen?', 'Hur uppstod det?')}>
              <Select value={mechanism} onValueChange={(value) => setMechanism(value as Mechanism)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNKNOWN">{copy(locale, 'Not sure', 'Vet inte')}</SelectItem>
                  <SelectItem value="CONTACT">{copy(locale, 'Contact / impact', 'Kontakt / smäll')}</SelectItem>
                  <SelectItem value="NON_CONTACT">{copy(locale, 'Non-contact / twist', 'Icke-kontakt / vridning')}</SelectItem>
                  <SelectItem value="OVERUSE">{copy(locale, 'Gradual / overload', 'Smygande / överbelastning')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={copy(locale, 'Activity', 'Aktivitet')}>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRAINING">{copy(locale, 'Training', 'Träning')}</SelectItem>
                  <SelectItem value="MATCH">Match</SelectItem>
                  <SelectItem value="GYM">Gym</SelectItem>
                  <SelectItem value="OFF_ICE">Off-ice</SelectItem>
                  <SelectItem value="OTHER">{copy(locale, 'Other', 'Annat')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={copy(locale, `Pain / issue ${initialSeverity}/10`, `Smärta / problem ${initialSeverity}/10`)}>
            <Input
              type="range"
              min={1}
              max={10}
              value={initialSeverity}
              onChange={(event) => setSeverity(Number(event.target.value))}
            />
          </Field>

          <Field label={copy(locale, 'Priority', 'Prioritet')}>
            <Select value={urgency} onValueChange={(value) => setUrgency(value as Urgency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">{copy(locale, 'Low - can wait', 'Låg - kan vänta')}</SelectItem>
                <SelectItem value="MODERATE">{copy(locale, 'Moderate - follow up within 1-2 days', 'Måttlig - följ upp inom 1-2 dagar')}</SelectItem>
                <SelectItem value="URGENT">{copy(locale, 'Urgent - follow up today', 'Brådskande - följ upp idag')}</SelectItem>
                <SelectItem value="EMERGENCY">{copy(locale, 'Emergency - needs immediate help', 'Akut - behöver direkt hjälp')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={copy(locale, 'Describe what happened', 'Beskriv vad som hänt')}>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy(
                locale,
                'What were you doing, when did you feel it, what hurts, what makes it worse/better?',
                'Vad gjorde du, när kände du det, vad gör ont, vad blir värre/bättre?'
              )}
              className="min-h-32"
            />
          </Field>

          <Field label={copy(locale, 'Immediate care', 'Akut åtgärd')}>
            <Textarea
              value={immediateCareGiven}
              onChange={(event) => setImmediateCareGiven(event.target.value)}
              placeholder={copy(locale, 'e.g. ice, rest, taping, stopped the session...', 't.ex. is, vila, tejpning, avbröt passet...')}
              className="min-h-24"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-3">
            <CheckRow checked={iceApplied} onChange={setIceApplied} label={copy(locale, 'I applied ice', 'Jag har lagt is')} />
            <CheckRow checked={removedFromPlay} onChange={setRemovedFromPlay} label={copy(locale, 'I stopped activity', 'Jag avbröt aktivitet')} />
            <CheckRow checked={ambulanceCalled} onChange={setAmbulanceCalled} label={copy(locale, 'Emergency help contacted', 'Akut hjälp kontaktad')} warning />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-white/10 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${basePath}/athlete/dashboard`)}
            >
              {copy(locale, 'Cancel', 'Avbryt')}
            </Button>
            <Button
              type="button"
              disabled={submitting || !bodyPart.trim() || !description.trim()}
              onClick={submit}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
              {copy(locale, 'Send report', 'Skicka rapport')}
            </Button>
          </div>
        </CardContent>
      </Card>
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

function CheckRow({
  checked,
  onChange,
  label,
  warning = false,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  warning?: boolean
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-medium ${
      warning
        ? 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-200'
        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
    }`}>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      {label}
    </label>
  )
}
