'use client'

import { useState, useRef } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Timer, Zap, Dumbbell, ArrowUpDown, Save, Camera, Upload, Loader2, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildRepeatedSprintProfile } from '@/lib/hockey/ice-speed'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Client {
  id: string
  name: string
  teamId: string | null
}

interface Team {
  id: string
  name: string
}

interface HockeyTestFormProps {
  clients: Client[]
  teams: Team[]
  businessSlug?: string
  initialClientId?: string
  onSaved?: () => void
}

interface MuscleLabRow {
  externalLoadKg: number | null
  bodyWeightKg: number | null
  averagePowerW: number | null
  averageForceN: number | null
  displacementCm: number | null
  averageVelocityMs: number | null
  peakVelocityMs: number | null
}

interface MuscleLabMaxima {
  protocolLabel?: string
  maxAveragePowerW?: number | null
  maxAveragePowerPerBodyMass?: number | null
  bestPowerLoadKg?: number | null
  maxAverageForceN?: number | null
  maxAverageVelocityMs?: number | null
  powerPlateauLoadsKg?: number[]
  displacementDropPercent?: number | null
  loadVelocitySlope?: number | null
  loadVelocityIntercept?: number | null
  loadVelocityR2?: number | null
  rawDiagnostics?: MuscleLabRawDiagnostics | null
  flags?: string[]
}

interface MuscleLabRawSample {
  t: number
  positionCm?: number | null
  velocityMs?: number | null
  forceN?: number | null
  powerW?: number | null
}

interface MuscleLabRawTrace {
  traceId: string
  label: string
  sampleCount: number
  durationS: number | null
  peakVelocityMs: number | null
  peakForceN: number | null
  peakPowerW: number | null
  timeToPeakVelocityS: number | null
  samples: MuscleLabRawSample[]
}

interface MuscleLabRawDiagnostics {
  traceCount: number
  totalSamples: number
  maxPeakVelocityMs: number | null
  maxPeakForceN: number | null
  maxPeakPowerW: number | null
  flags: string[]
}

interface MuscleLabRawImport {
  traces: MuscleLabRawTrace[]
  diagnostics: MuscleLabRawDiagnostics | null
}

interface MuscleLabImport {
  athleteName?: string | null
  testDate?: string | null
  rows?: MuscleLabRow[]
  maxima?: MuscleLabMaxima
  jumpSquatLadder?: Record<string, number>
  rawTraces?: MuscleLabRawTrace[]
  rawDiagnostics?: MuscleLabRawDiagnostics | null
}

function NumberInput({ label, value, onChange, unit, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9"
        />
        {unit && <span className="min-w-6 shrink-0 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

function MetricChip({ label, value, unit }: { label: string; value: string | number | null | undefined; unit?: string }) {
  if (value == null || value === '') return null
  return (
    <div className="rounded-md border bg-background px-2.5 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold">
        {value}
        {unit ? <span className="ml-1 text-[10px] font-normal text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  )
}

function parseNumber(value: string): number | null {
  if (!value) return null
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function bestOf(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  return valid.length > 0 ? Math.max(...valid) : null
}

function lowestOf(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  return valid.length > 0 ? Math.min(...valid) : null
}

function percentDifference(left: number | null, right: number | null): number | null {
  if (left == null || right == null) return null
  const best = Math.max(left, right)
  if (best <= 0) return null
  return Math.abs(left - right) / best * 100
}

function enduranceSummary(values: string[]) {
  const parsed = values.map(parseNumber).filter((value): value is number => value != null)
  return buildRepeatedSprintProfile(parsed)
}

function DiagnosticChip({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'watch' | 'info' }) {
  return (
    <div className={cn(
      'rounded-md border px-2.5 py-2',
      tone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
      tone === 'watch' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
      (!tone || tone === 'info') && 'bg-muted/30',
    )}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function MuscleLabPreview({ rows, maxima, raw, locale }: { rows: MuscleLabRow[]; maxima: MuscleLabMaxima | null; raw: MuscleLabRawImport | null; locale: string }) {
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en
  if (rows.length === 0 && !raw?.traces.length) return null

  const chartData = rows
    .filter((row) => row.externalLoadKg != null)
    .map((row) => ({
      load: row.externalLoadKg,
      AP: row.averagePowerW,
      AV: row.averageVelocityMs,
      AF: row.averageForceN,
      D: row.displacementCm,
    }))
  const rawTrace = raw?.traces[0]
  const rawChartData = rawTrace?.samples.map((sample) => ({
    t: sample.t,
    velocity: sample.velocityMs,
    force: sample.forceN,
    power: sample.powerW,
  })) ?? []

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        <MetricChip label="Max AP" value={maxima?.maxAveragePowerW} unit="W" />
        <MetricChip label={t('AP / kroppsvikt', 'AP / body weight')} value={maxima?.maxAveragePowerPerBodyMass} unit="W/kg" />
        <MetricChip
          label={t('Power-platå', 'Power plateau')}
          value={maxima?.powerPlateauLoadsKg?.length ? maxima.powerPlateauLoadsKg.map((load) => `+${load}`).join(', ') : null}
          unit="kg"
        />
        <MetricChip label="Max AF" value={maxima?.maxAverageForceN} unit="N" />
        <MetricChip label="ROM drop" value={maxima?.displacementDropPercent} unit="%" />
        <MetricChip label="Raw traces" value={raw?.diagnostics?.traceCount} />
        <MetricChip label="Raw peak P" value={raw?.diagnostics?.maxPeakPowerW} unit="W" />
        <MetricChip label="Raw peak V" value={raw?.diagnostics?.maxPeakVelocityMs} unit="m/s" />
      </div>

      {chartData.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="load" tick={{ fontSize: 11 }} unit="kg" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={42} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="AP" name="AP W" stroke="#2563eb" strokeWidth={2} dot />
              <Line yAxisId="right" type="monotone" dataKey="AV" name="AV m/s" stroke="#16a34a" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {rawTrace && rawChartData.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">{rawTrace.label} {t('råkurva', 'raw curve')}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rawChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} unit="s" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={42} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="power" name="Power W" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="velocity" name="Velocity m/s" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {[...(maxima?.flags ?? []), ...(raw?.diagnostics?.flags ?? [])].length ? (
        <div className="space-y-1">
          {[...(maxima?.flags ?? []), ...(raw?.diagnostics?.flags ?? [])].map((flag) => (
            <p key={flag} className="text-xs text-amber-700 dark:text-amber-300">{flag}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, open }: { icon: typeof Timer; title: string; open: boolean }) {
  return (
    <div className="flex items-center justify-between w-full py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
    </div>
  )
}

/**
 * Parse Muscle Lab CSV export for power test data.
 * Supports common formats: load-power tables, jump test results.
 */
function parseMusclLabCSV(text: string): Record<string, unknown> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const data: Record<string, unknown> = {}

  // Try to extract jump squat ladder and single leg data
  const jumpSquatLadder: Record<string, number> = {}
  const singleLegLeft: Record<string, number> = {}
  const singleLegRight: Record<string, number> = {}

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim())
    if (parts.length < 2) continue

    const label = parts[0].toLowerCase()
    const values = parts.slice(1).map((v) => parseFloat(v)).filter((v) => !isNaN(v))

    // Detect jump squat rows (e.g., "Squat Jump, 20, 1200" or "SJ 20kg, 1200")
    if ((label.includes('squat') || label.includes('sj')) && !label.includes('single') && !label.includes('one')) {
      const kgMatch = label.match(/(\d+)\s*kg/i)
      if (kgMatch && values.length > 0) {
        jumpSquatLadder[kgMatch[1]] = Math.round(values[0])
      } else if (values.length >= 2) {
        // Format: label, kg, watts
        jumpSquatLadder[String(Math.round(values[0]))] = Math.round(values[1])
      }
    }

    // Detect single leg rows
    if (label.includes('single') || label.includes('one leg') || label.includes('enbens')) {
      const isLeft = label.includes('left') || label.includes('vänster') || label.includes('v.')
      const isRight = label.includes('right') || label.includes('höger') || label.includes('h.')
      const kgMatch = label.match(/(\d+)\s*kg/i)
      const target = isLeft ? singleLegLeft : isRight ? singleLegRight : singleLegLeft
      if (kgMatch && values.length > 0) {
        target[kgMatch[1]] = Math.round(values[0])
      } else if (values.length >= 2) {
        target[String(Math.round(values[0]))] = Math.round(values[1])
      }
    }

    // Detect grip strength
    if (label.includes('grip') || label.includes('grepp')) {
      if (label.includes('left') || label.includes('vänster') || label.includes('v.')) {
        data.gripStrengthLeft = values[0]
      } else if (label.includes('right') || label.includes('höger') || label.includes('h.')) {
        data.gripStrengthRight = values[0]
      } else if (values.length >= 2) {
        data.gripStrengthLeft = values[0]
        data.gripStrengthRight = values[1]
      }
    }

    // Detect standing long jump
    if ((label.includes('standing') || label.includes('stående')) && (label.includes('jump') || label.includes('hopp')) && !label.includes('3')) {
      data.standingLongJump = values[0]
    }

    // Detect 3-jump
    if (label.includes('3-') || label.includes('triple') || label.includes('trehopp')) {
      if (label.includes('left') || label.includes('vänster')) {
        data.threeJumpLeft = values[0]
      } else if (label.includes('right') || label.includes('höger')) {
        data.threeJumpRight = values[0]
      }
    }
  }

  if (Object.keys(jumpSquatLadder).length > 0) data.jumpSquatLadder = jumpSquatLadder
  if (Object.keys(singleLegLeft).length > 0) data.singleLegJumpLeft = singleLegLeft
  if (Object.keys(singleLegRight).length > 0) data.singleLegJumpRight = singleLegRight

  return data
}

export function HockeyTestForm({ clients, teams, businessSlug, initialClientId = '', onSaved }: HockeyTestFormProps) {
  const locale = useLocale()
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en
  const scanInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || '')
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Section open states
  const [iceOpen, setIceOpen] = useState(true)
  const [powerOpen, setPowerOpen] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [strengthOpen, setStrengthOpen] = useState(false)
  const [enduranceOpen, setEnduranceOpen] = useState(false)

  // On-ice values
  const [agility505Left, setAgility505Left] = useState('')
  const [agility505Right, setAgility505Right] = useState('')
  const [sprint5m, setSprint5m] = useState('')
  const [sprint10m, setSprint10m] = useState('')
  const [sprint20m, setSprint20m] = useState('')
  const [sprint30m, setSprint30m] = useState('')
  const [sprint20mFly, setSprint20mFly] = useState('')
  const [sprint30mFly, setSprint30mFly] = useState('')
  const [endurance7x40, setEndurance7x40] = useState(['', '', '', '', '', '', ''])

  // Power values
  const [jumpSquat, setJumpSquat] = useState<Record<string, string>>({ '20': '', '40': '', '60': '', '80': '', '100': '' })
  const [singleLegLeft, setSingleLegLeft] = useState<Record<string, string>>({ '30': '', '35': '', '40': '', '45': '', '50': '', '55': '' })
  const [singleLegRight, setSingleLegRight] = useState<Record<string, string>>({ '30': '', '35': '', '40': '', '45': '', '50': '', '55': '' })
  const [gripLeft, setGripLeft] = useState('')
  const [gripRight, setGripRight] = useState('')
  const [muscleLabRows, setMuscleLabRows] = useState<MuscleLabRow[]>([])
  const [muscleLabMaxima, setMuscleLabMaxima] = useState<MuscleLabMaxima | null>(null)
  const [muscleLabRaw, setMuscleLabRaw] = useState<MuscleLabRawImport | null>(null)

  // Jump values
  const [standingLong, setStandingLong] = useState('')
  const [threeJumpLeft, setThreeJumpLeft] = useState('')
  const [threeJumpRight, setThreeJumpRight] = useState('')

  // Strength / endurance values
  const [backSquat1RM, setBackSquat1RM] = useState('')
  const [powerClean1RM, setPowerClean1RM] = useState('')
  const [benchPress1RM, setBenchPress1RM] = useState('')
  const [pullUp1RM, setPullUp1RM] = useState('')
  const [beepLevel, setBeepLevel] = useState('')
  const [beepShuttle, setBeepShuttle] = useState('')
  const [vo2Max, setVo2Max] = useState('')
  const [lt1SpeedKmh, setLt1SpeedKmh] = useState('')
  const [lt1HeartRate, setLt1HeartRate] = useState('')
  const [lt1Lactate, setLt1Lactate] = useState('')
  const [lt2SpeedKmh, setLt2SpeedKmh] = useState('')
  const [lt2HeartRate, setLt2HeartRate] = useState('')
  const [lt2Lactate, setLt2Lactate] = useState('')
  const [maxLactate, setMaxLactate] = useState('')
  const [maxHeartRate, setMaxHeartRate] = useState('')
  const [rampTimeMinutes, setRampTimeMinutes] = useState('')

  const selectedClient = clients.find((c) => c.id === clientId)
  const endurance = enduranceSummary(endurance7x40)
  const gripAsymmetry = percentDifference(parseNumber(gripLeft), parseNumber(gripRight))
  const threeJumpAsymmetry = percentDifference(parseNumber(threeJumpLeft), parseNumber(threeJumpRight))
  const agilityBest = lowestOf([parseNumber(agility505Left), parseNumber(agility505Right)])
  const sprintBest = lowestOf([parseNumber(sprint5m), parseNumber(sprint10m), parseNumber(sprint20m), parseNumber(sprint30m)])
  const powerBest = bestOf([
    muscleLabMaxima?.maxAveragePowerPerBodyMass ?? null,
    ...Object.values(jumpSquat).map(parseNumber),
  ])
  const strengthCount = [backSquat1RM, powerClean1RM, benchPress1RM, pullUp1RM].filter(Boolean).length
  const completedGroups = [
    agilityBest != null || sprintBest != null,
    muscleLabRows.length > 0 || muscleLabRaw != null || powerBest != null || gripAsymmetry != null,
    parseNumber(standingLong) != null || parseNumber(threeJumpLeft) != null || parseNumber(threeJumpRight) != null,
    strengthCount > 0,
    parseNumber(beepLevel) != null || parseNumber(vo2Max) != null || endurance.count > 0,
  ].filter(Boolean).length

  // Apply scanned/imported data to form
  const applyData = (data: Record<string, unknown>) => {
    if (data.agility505Left) setAgility505Left(String(data.agility505Left))
    if (data.agility505Right) setAgility505Right(String(data.agility505Right))
    if (data.sprint5m) setSprint5m(String(data.sprint5m))
    if (data.sprint10m) setSprint10m(String(data.sprint10m))
    if (data.sprint20m) setSprint20m(String(data.sprint20m))
    if (data.sprint30m) setSprint30m(String(data.sprint30m))
    if (data.sprint20mFly) setSprint20mFly(String(data.sprint20mFly))
    if (data.sprint30mFly) setSprint30mFly(String(data.sprint30mFly))
    if (Array.isArray(data.endurance7x40)) {
      setEndurance7x40(data.endurance7x40.map(String).concat(Array(7).fill('')).slice(0, 7))
    }
    if (data.jumpSquatLadder && typeof data.jumpSquatLadder === 'object') {
      const jsl = data.jumpSquatLadder as Record<string, number>
      setJumpSquat((prev) => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(jsl)) next[k] = String(v)
        return next
      })
      setPowerOpen(true)
    }
    if (data.singleLegJumpLeft && typeof data.singleLegJumpLeft === 'object') {
      const sl = data.singleLegJumpLeft as Record<string, number>
      setSingleLegLeft((prev) => { const n = { ...prev }; for (const [k, v] of Object.entries(sl)) n[k] = String(v); return n })
      setPowerOpen(true)
    }
    if (data.singleLegJumpRight && typeof data.singleLegJumpRight === 'object') {
      const sr = data.singleLegJumpRight as Record<string, number>
      setSingleLegRight((prev) => { const n = { ...prev }; for (const [k, v] of Object.entries(sr)) n[k] = String(v); return n })
      setPowerOpen(true)
    }
    if (data.gripStrengthLeft) { setGripLeft(String(data.gripStrengthLeft)); setPowerOpen(true) }
    if (data.gripStrengthRight) { setGripRight(String(data.gripStrengthRight)); setPowerOpen(true) }
    if (data.standingLongJump) { setStandingLong(String(data.standingLongJump)); setJumpOpen(true) }
    if (data.threeJumpLeft) { setThreeJumpLeft(String(data.threeJumpLeft)); setJumpOpen(true) }
    if (data.threeJumpRight) { setThreeJumpRight(String(data.threeJumpRight)); setJumpOpen(true) }
    if (data.backSquat1RM) { setBackSquat1RM(String(data.backSquat1RM)); setStrengthOpen(true) }
    if (data.powerClean1RM) { setPowerClean1RM(String(data.powerClean1RM)); setStrengthOpen(true) }
    if (data.benchPress1RM) { setBenchPress1RM(String(data.benchPress1RM)); setStrengthOpen(true) }
    if (data.pullUp1RM) { setPullUp1RM(String(data.pullUp1RM)); setStrengthOpen(true) }
    if (data.beepTestLevel) { setBeepLevel(String(data.beepTestLevel)); setEnduranceOpen(true) }
    if (data.beepTestShuttle) { setBeepShuttle(String(data.beepTestShuttle)); setEnduranceOpen(true) }
    if (data.vo2Max) { setVo2Max(String(data.vo2Max)); setEnduranceOpen(true) }
    if (data.lt1SpeedKmh) { setLt1SpeedKmh(String(data.lt1SpeedKmh)); setEnduranceOpen(true) }
    if (data.lt1HeartRate) { setLt1HeartRate(String(data.lt1HeartRate)); setEnduranceOpen(true) }
    if (data.lt1Lactate) { setLt1Lactate(String(data.lt1Lactate)); setEnduranceOpen(true) }
    if (data.lt2SpeedKmh) { setLt2SpeedKmh(String(data.lt2SpeedKmh)); setEnduranceOpen(true) }
    if (data.lt2HeartRate) { setLt2HeartRate(String(data.lt2HeartRate)); setEnduranceOpen(true) }
    if (data.lt2Lactate) { setLt2Lactate(String(data.lt2Lactate)); setEnduranceOpen(true) }
    if (data.maxLactate) { setMaxLactate(String(data.maxLactate)); setEnduranceOpen(true) }
    if (data.maxHeartRate) { setMaxHeartRate(String(data.maxHeartRate)); setEnduranceOpen(true) }
    if (data.rampTimeMinutes) { setRampTimeMinutes(String(data.rampTimeMinutes)); setEnduranceOpen(true) }
    if (Array.isArray(data.muscleLabJumps)) {
      setMuscleLabRows(data.muscleLabJumps as MuscleLabRow[])
      setPowerOpen(true)
    }
    if (data.muscleLabMaxima && typeof data.muscleLabMaxima === 'object') {
      setMuscleLabMaxima(data.muscleLabMaxima as MuscleLabMaxima)
      setPowerOpen(true)
    }
    if (data.muscleLabRaw && typeof data.muscleLabRaw === 'object') {
      setMuscleLabRaw(data.muscleLabRaw as MuscleLabRawImport)
      setPowerOpen(true)
    }
    if (data.testDate) setTestDate(String(data.testDate))
    // Auto-select athlete by name if found
    if (data.athleteName) {
      const match = clients.find((c) => c.name.toLowerCase().includes(String(data.athleteName).toLowerCase()))
      if (match) setClientId(match.id)
    }
    setIceOpen(true)
  }

  // Photo scan handler
  const handleScan = async (file: File) => {
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/coach/hockey-tests/scan', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || t('Scan misslyckades', 'Scan failed'))
      }
      const data = await res.json()
      applyData(data)
      const confidence = data.confidence ? `${Math.round(data.confidence * 100)}%` : ''
      toast.success(locale === 'sv'
        ? `Testdata extraherad ${confidence ? `(${confidence} säkerhet)` : ''}`
        : `Test data extracted ${confidence ? `(${confidence} confidence)` : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Kunde inte läsa bilden', 'Could not read the image'))
    } finally {
      setScanning(false)
    }
  }

  // File import handler (Muscle Lab)
  const handleMuscleLabImport = async (file: File) => {
    setScanning(true)
    try {
      let data: Record<string, unknown>
      if (/\.(xlsx|csv|txt|tsv)$/i.test(file.name)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/coach/hockey-tests/musclelab', { method: 'POST', body: formData })
        if (!res.ok) {
          if (!file.name.toLowerCase().endsWith('.xlsx')) {
            data = parseMusclLabCSV(await file.text())
            applyData(data)
            toast.success(t('Muscle Lab-data importerad', 'Muscle Lab data imported'))
            return
          }
          const err = await res.json()
          throw new Error(err.error || t('MuscleLab-import misslyckades', 'MuscleLab import failed'))
        }
        const parsed = await res.json() as MuscleLabImport
        data = {
          athleteName: parsed.athleteName,
          testDate: parsed.testDate,
          jumpSquatLadder: parsed.jumpSquatLadder,
          muscleLabJumps: parsed.rows,
          muscleLabMaxima: parsed.maxima,
          muscleLabRaw: parsed.rawTraces?.length
            ? { traces: parsed.rawTraces, diagnostics: parsed.rawDiagnostics ?? parsed.maxima?.rawDiagnostics ?? null }
            : undefined,
        }
      } else {
        const text = await file.text()
        data = parseMusclLabCSV(text)
      }
      applyData(data)
      toast.success(t('Muscle Lab-data importerad', 'Muscle Lab data imported'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Kunde inte läsa MuscleLab-filen', 'Could not read the MuscleLab file'))
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    if (!clientId || !testDate) {
      toast.error(t('Välj atlet och datum', 'Select athlete and date'))
      return
    }

    setSaving(true)
    try {
      const toNum = (v: string) => v ? parseFloat(v) : undefined
      const toJson = (obj: Record<string, string>) => {
        const result: Record<string, number> = {}
        for (const [k, v] of Object.entries(obj)) {
          if (v) result[k] = parseFloat(v)
        }
        return Object.keys(result).length > 0 ? result : undefined
      }

      const enduranceArr = endurance7x40.map((v) => parseFloat(v)).filter((v) => !isNaN(v))
      const rampSeconds = rampTimeMinutes ? Math.round(parseFloat(rampTimeMinutes) * 60) : undefined

      const res = await fetch('/api/coach/hockey-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          clientId,
          teamId: selectedClient?.teamId || undefined,
          testDate,
          notes: notes || undefined,
          agility505Left: toNum(agility505Left),
          agility505Right: toNum(agility505Right),
          sprint5m: toNum(sprint5m),
          sprint10m: toNum(sprint10m),
          sprint20m: toNum(sprint20m),
          sprint30m: toNum(sprint30m),
          sprint20mFly: toNum(sprint20mFly),
          sprint30mFly: toNum(sprint30mFly),
          endurance7x40: enduranceArr.length > 0 ? enduranceArr : undefined,
          jumpSquatLadder: toJson(jumpSquat),
          singleLegJumpLeft: toJson(singleLegLeft),
          singleLegJumpRight: toJson(singleLegRight),
          gripStrengthLeft: toNum(gripLeft),
          gripStrengthRight: toNum(gripRight),
          standingLongJump: toNum(standingLong),
          threeJumpLeft: toNum(threeJumpLeft),
          threeJumpRight: toNum(threeJumpRight),
          beepTestLevel: toNum(beepLevel),
          beepTestShuttle: beepShuttle ? parseInt(beepShuttle, 10) : undefined,
          vo2Max: toNum(vo2Max),
          lt1SpeedKmh: toNum(lt1SpeedKmh),
          lt1HeartRate: lt1HeartRate ? parseInt(lt1HeartRate, 10) : undefined,
          lt1Lactate: toNum(lt1Lactate),
          lt2SpeedKmh: toNum(lt2SpeedKmh),
          lt2HeartRate: lt2HeartRate ? parseInt(lt2HeartRate, 10) : undefined,
          lt2Lactate: toNum(lt2Lactate),
          maxLactate: toNum(maxLactate),
          maxHeartRate: maxHeartRate ? parseInt(maxHeartRate, 10) : undefined,
          rampTimeSeconds: rampSeconds && Number.isFinite(rampSeconds) ? rampSeconds : undefined,
          backSquat1RM: toNum(backSquat1RM),
          powerClean1RM: toNum(powerClean1RM),
          benchPress1RM: toNum(benchPress1RM),
          pullUp1RM: toNum(pullUp1RM),
          muscleLabJumps: muscleLabRows.length > 0 ? muscleLabRows : undefined,
          muscleLabMaxima: muscleLabMaxima || undefined,
          muscleLabRaw: muscleLabRaw || undefined,
          sourceType: muscleLabRows.length > 0 || muscleLabMaxima || muscleLabRaw
            ? 'MUSCLE_LAB_IMPORT'
            : 'MANUAL',
        }),
      })

      if (res.ok) {
        toast.success(t('Testresultat sparat', 'Test result saved'))
        onSaved?.()
      } else {
        const err = await res.json()
        toast.error(err.error || t('Kunde inte spara', 'Could not save'))
      }
    } catch {
      toast.error(t('Nätverksfel', 'Network error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Scan / Import */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleScan(f); e.target.value = '' }} />
            <input ref={csvInputRef} type="file" accept=".xlsx,.csv,.txt,.tsv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleMuscleLabImport(f); e.target.value = '' }} />
            <Button variant="outline" className="flex-1" onClick={() => scanInputRef.current?.click()} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
              {t('Skanna testprotokoll', 'Scan test protocol')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => csvInputRef.current?.click()} disabled={scanning}>
              <Upload className="h-4 w-4 mr-2" />
              {t('Importera Muscle Lab', 'Import Muscle Lab')}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {t('Fotografera ett testprotokoll eller importera .xlsx/CSV-export från Muscle Lab', 'Photograph a test protocol or import a .xlsx/CSV export from Muscle Lab')}
          </p>
        </CardContent>
      </Card>

      {/* Athlete & date */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('Atlet', 'Athlete')}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Välj spelare...', 'Select player...')} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => {
                    const teamClients = clients.filter((c) => c.teamId === team.id)
                    if (teamClients.length === 0) return null
                    return (
                      <div key={team.id}>
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{team.name}</div>
                        {teamClients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </div>
                    )
                  })}
                  {clients.filter((c) => !c.teamId).length > 0 && (
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{t('Individuella spelare', 'Individual players')}</div>
                  )}
                  {clients.filter((c) => !c.teamId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.filter((c) => !c.teamId).length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {t('Spelare utan lag kan testas här och kopplas till lag senare.', 'Players without a team can be tested here and assigned to a team later.')}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t('Testdatum', 'Test date')}</Label>
              <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t('Batteristatus', 'Battery status')}</p>
              <p className="text-xs text-muted-foreground">
                {t('Direkt feedback på nyckelvärden innan testet sparas.', 'Instant feedback on key values before the test is saved.')}
              </p>
            </div>
            <Badge variant={completedGroups >= 4 ? 'default' : 'secondary'}>
              {completedGroups}/5 {t('delar ifyllda', 'sections completed')}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {agilityBest != null && (
              <DiagnosticChip label={t('Bästa 5-10-5', 'Best 5-10-5')} value={`${agilityBest.toFixed(2)} s`} tone="info" />
            )}
            {sprintBest != null && (
              <DiagnosticChip label={t('Bästa sprintsplit', 'Best sprint split')} value={`${sprintBest.toFixed(2)} s`} tone="info" />
            )}
            {powerBest != null && (
              <DiagnosticChip
                label={muscleLabMaxima?.maxAveragePowerPerBodyMass ? 'MuscleLab AP/BW' : t('Bästa power', 'Best power')}
                value={muscleLabMaxima?.maxAveragePowerPerBodyMass ? `${powerBest.toFixed(1)} W/kg` : `${powerBest.toFixed(0)} W`}
                tone="good"
              />
            )}
            {strengthCount > 0 && (
              <DiagnosticChip label={t('Maxstyrketester', 'Max strength tests')} value={`${strengthCount}/4`} tone={strengthCount >= 3 ? 'good' : 'info'} />
            )}
            {parseNumber(standingLong) != null && (
              <DiagnosticChip label={t('Stående längdhopp', 'Standing long jump')} value={`${parseNumber(standingLong)?.toFixed(0)} cm`} tone="info" />
            )}
            {threeJumpAsymmetry != null && (
              <DiagnosticChip
                label={t('3-steg asymmetri', '3-step asymmetry')}
                value={`${threeJumpAsymmetry.toFixed(1)}%`}
                tone={threeJumpAsymmetry >= 8 ? 'watch' : 'good'}
              />
            )}
            {gripAsymmetry != null && (
              <DiagnosticChip
                label={t('Grepp asymmetri', 'Grip asymmetry')}
                value={`${gripAsymmetry.toFixed(1)}%`}
                tone={gripAsymmetry >= 10 ? 'watch' : 'good'}
              />
            )}
            {endurance.count > 0 && (
              <DiagnosticChip
                label={`7x40 drop (${endurance.count}/7)`}
                value={endurance.fatigueDropPct == null ? '-' : `${endurance.fatigueDropPct.toFixed(1)}%`}
                tone={endurance.fatigueDropPct != null && endurance.fatigueDropPct >= 6 ? 'watch' : 'good'}
              />
            )}
            {endurance.averageSpeedKmh != null && (
              <DiagnosticChip
                label={t('7x40 RSA profil', '7x40 RSA profile')}
                value={`${endurance.averageSpeedKmh.toFixed(1)} km/h · ${endurance.fatigueResistancePct?.toFixed(0) ?? '-'}% resist`}
                tone={endurance.fatigueDropPct != null && endurance.fatigueDropPct >= 10 ? 'watch' : 'info'}
              />
            )}
            {parseNumber(vo2Max) != null && (
              <DiagnosticChip label="VO2max" value={`${parseNumber(vo2Max)?.toFixed(1)} ml/kg/min`} tone="good" />
            )}
            {parseNumber(lt2SpeedKmh) != null && (
              <DiagnosticChip label={t('LT2 löpfart', 'LT2 running speed')} value={`${parseNumber(lt2SpeedKmh)?.toFixed(1)} km/h`} tone="info" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* On-Ice Tests */}
      <Card>
        <Collapsible open={iceOpen} onOpenChange={setIceOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={Timer} title={t('Istester', 'On-ice tests')} open={iceOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label={t('Agility 5-10-5 Vänster', 'Agility 5-10-5 left')} value={agility505Left} onChange={setAgility505Left} unit="s" placeholder="6.50" />
                <NumberInput label={t('Agility 5-10-5 Höger', 'Agility 5-10-5 right')} value={agility505Right} onChange={setAgility505Right} unit="s" placeholder="6.40" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <NumberInput label="Sprint 5m" value={sprint5m} onChange={setSprint5m} unit="s" placeholder="1.10" />
                <NumberInput label="Sprint 10m" value={sprint10m} onChange={setSprint10m} unit="s" placeholder="1.80" />
                <NumberInput label="Sprint 20m" value={sprint20m} onChange={setSprint20m} unit="s" placeholder="3.10" />
                <NumberInput label="Sprint 30m" value={sprint30m} onChange={setSprint30m} unit="s" placeholder="4.25" />
                <NumberInput label="Sprint 20m (fly)" value={sprint20mFly} onChange={setSprint20mFly} unit="s" placeholder="2.50" />
                <NumberInput label="Sprint 30m (fly)" value={sprint30mFly} onChange={setSprint30mFly} unit="s" placeholder="3.60" />
              </div>
              <div>
                <Label className="text-xs mb-2 block">{t('7x40m Uthållighet (10s vila)', '7x40 m endurance (10 s recovery)')}</Label>
                <div className="grid grid-cols-7 gap-1">
                  {endurance7x40.map((v, i) => (
                    <div key={i} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">#{i + 1}</span>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={v}
                        onChange={(e) => {
                          const arr = [...endurance7x40]
                          arr[i] = e.target.value
                          setEndurance7x40(arr)
                        }}
                        placeholder="5.5"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
                {endurance.count > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <MetricChip label={t('Snabbaste rep', 'Fastest rep')} value={endurance.bestTimeS?.toFixed(2)} unit="s" />
                    <MetricChip label={t('Snittfart', 'Average speed')} value={endurance.averageSpeedKmh?.toFixed(1)} unit="km/h" />
                    <MetricChip label="Drop" value={endurance.fatigueDropPct?.toFixed(1)} unit="%" />
                    <MetricChip label="Resistance" value={endurance.fatigueResistancePct?.toFixed(0)} unit="%" />
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Power Tests */}
      <Card>
        <Collapsible open={powerOpen} onOpenChange={setPowerOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={Zap} title={t('Krafttester', 'Power tests')} open={powerOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <MuscleLabPreview rows={muscleLabRows} maxima={muscleLabMaxima} raw={muscleLabRaw} locale={locale} />
              <div>
                <Label className="text-xs mb-2 block">{t('Loaded squat jump / power squat profil (AP Watt)', 'Loaded squat jump / power squat profile (AP watts)')}</Label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.keys(jumpSquat).map((load) => (
                    <div key={load} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">+{load} kg</span>
                      <Input
                        type="number"
                        value={jumpSquat[load]}
                        onChange={(e) => setJumpSquat({ ...jumpSquat, [load]: e.target.value })}
                        placeholder="W"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-2 block">{t('Enbenshopp Smith Vänster (Watt)', 'Single-leg Smith jump left (watts)')}</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Object.keys(singleLegLeft).map((load) => (
                    <div key={load} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">{load} kg</span>
                      <Input
                        type="number"
                        value={singleLegLeft[load]}
                        onChange={(e) => setSingleLegLeft({ ...singleLegLeft, [load]: e.target.value })}
                        placeholder="W"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-2 block">{t('Enbenshopp Smith Höger (Watt)', 'Single-leg Smith jump right (watts)')}</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Object.keys(singleLegRight).map((load) => (
                    <div key={load} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">{load} kg</span>
                      <Input
                        type="number"
                        value={singleLegRight[load]}
                        onChange={(e) => setSingleLegRight({ ...singleLegRight, [load]: e.target.value })}
                        placeholder="W"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label={t('Max greppstyrka Vänster', 'Max grip strength left')} value={gripLeft} onChange={setGripLeft} unit="kg" placeholder="55" />
                <NumberInput label={t('Max greppstyrka Höger', 'Max grip strength right')} value={gripRight} onChange={setGripRight} unit="kg" placeholder="58" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Strength Tests */}
      <Card>
        <Collapsible open={strengthOpen} onOpenChange={setStrengthOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={Dumbbell} title={t('Maxstyrka', 'Max strength')} open={strengthOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label={t('1RM knäböj full depth', '1RM squat full depth')} value={backSquat1RM} onChange={setBackSquat1RM} unit="kg" placeholder="140" />
                <NumberInput label="1RM power clean" value={powerClean1RM} onChange={setPowerClean1RM} unit="kg" placeholder="80" />
                <NumberInput label={t('1RM bänkpress', '1RM bench press')} value={benchPress1RM} onChange={setBenchPress1RM} unit="kg" placeholder="110" />
                <NumberInput label={t('1RM pull-up extra vikt', '1RM pull-up extra weight')} value={pullUp1RM} onChange={setPullUp1RM} unit="kg" placeholder="40" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t('Knäböj 1RM sparas separat från MuscleLab power squat eftersom djup och mål skiljer sig.', 'Squat 1RM is saved separately from MuscleLab power squat because depth and purpose differ.')}
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Jump Tests */}
      <Card>
        <Collapsible open={jumpOpen} onOpenChange={setJumpOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={ArrowUpDown} title={t('Hopptester', 'Jump tests')} open={jumpOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <NumberInput label={t('Stående längdhopp', 'Standing long jump')} value={standingLong} onChange={setStandingLong} unit="cm" placeholder="240" />
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label={t('3-steg längdhopp Vänster ben', '3-step long jump left leg')} value={threeJumpLeft} onChange={setThreeJumpLeft} unit="cm" placeholder="680" />
                <NumberInput label={t('3-steg längdhopp Höger ben', '3-step long jump right leg')} value={threeJumpRight} onChange={setThreeJumpRight} unit="cm" placeholder="700" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Endurance Tests */}
      <Card>
        <Collapsible open={enduranceOpen} onOpenChange={setEnduranceOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={Activity} title={t('Uthållighet', 'Endurance')} open={enduranceOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label={t('Beep test nivå', 'Beep test level')} value={beepLevel} onChange={setBeepLevel} placeholder="13" />
                <NumberInput label="Beep test shuttle" value={beepShuttle} onChange={setBeepShuttle} placeholder="6" />
              </div>
              <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                <div>
                  <p className="text-xs font-medium">VO2max / ramp</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('Spara labbvärden från spelarens VO2max-test direkt i hockeybatteriet.', "Save lab values from the player's VO2max test directly in the hockey battery.")}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumberInput label="VO2max" value={vo2Max} onChange={setVo2Max} unit="ml/kg/min" placeholder="58.5" />
                  <NumberInput label={t('Maxpuls', 'Max heart rate')} value={maxHeartRate} onChange={setMaxHeartRate} unit="bpm" placeholder="198" />
                  <NumberInput label={t('Max laktat', 'Max lactate')} value={maxLactate} onChange={setMaxLactate} unit="mmol/L" placeholder="12.4" />
                  <NumberInput label={t('Ramptid', 'Ramp time')} value={rampTimeMinutes} onChange={setRampTimeMinutes} unit="min" placeholder="13.5" />
                  <NumberInput label={t('LT1 fart', 'LT1 speed')} value={lt1SpeedKmh} onChange={setLt1SpeedKmh} unit="km/h" placeholder="11.5" />
                  <NumberInput label={t('LT1 puls', 'LT1 heart rate')} value={lt1HeartRate} onChange={setLt1HeartRate} unit="bpm" placeholder="154" />
                  <NumberInput label={t('LT1 laktat', 'LT1 lactate')} value={lt1Lactate} onChange={setLt1Lactate} unit="mmol/L" placeholder="1.8" />
                  <NumberInput label={t('LT2 fart', 'LT2 speed')} value={lt2SpeedKmh} onChange={setLt2SpeedKmh} unit="km/h" placeholder="15.0" />
                  <NumberInput label={t('LT2 puls', 'LT2 heart rate')} value={lt2HeartRate} onChange={setLt2HeartRate} unit="bpm" placeholder="178" />
                  <NumberInput label={t('LT2 laktat', 'LT2 lactate')} value={lt2Lactate} onChange={setLt2Lactate} unit="mmol/L" placeholder="3.8" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t('LT1/LT2 kan anges som löpfart, puls och laktat så att coachen ser både aerob bas och tröskelkapacitet.', 'LT1/LT2 can be entered as running speed, heart rate, and lactate so the coach can see both aerobic base and threshold capacity.')}
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-xs">{t('Anteckningar (valfritt)', 'Notes (optional)')}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" placeholder={t('Kommentarer om testet...', 'Comments about the test...')} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || !clientId} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {saving ? t('Sparar...', 'Saving...') : t('Spara testresultat', 'Save test result')}
      </Button>
    </div>
  )
}
