'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Clipboard, Loader2, RotateCcw, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Member {
  id: string
  name: string
}

interface TeamHockeyBulkEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  onSaved?: () => void
}

type MetricGroup = 'ice' | 'repeat' | 'jump' | 'power' | 'strength' | 'endurance'

interface MetricColumn {
  key: string
  label: string
  unit: string
  group: MetricGroup
  aliases: string[]
  step?: string
}

const METRIC_GROUP_LABELS: Record<MetricGroup, string> = {
  ice: 'Istester',
  repeat: '7x40',
  jump: 'Hopp',
  power: 'Power',
  strength: 'Styrka',
  endurance: 'Uthållighet',
}

const METRICS: MetricColumn[] = [
  { key: 'agility505Left', label: '505 L', unit: 's', group: 'ice', step: '0.01', aliases: ['505 l', '505 left', '5-10-5 l', 'agility left'] },
  { key: 'agility505Right', label: '505 R', unit: 's', group: 'ice', step: '0.01', aliases: ['505 r', '505 right', '5-10-5 r', 'agility right'] },
  { key: 'sprint5m', label: '5 m', unit: 's', group: 'ice', step: '0.01', aliases: ['5m', 'sprint 5', 'sprint5'] },
  { key: 'sprint10m', label: '10 m', unit: 's', group: 'ice', step: '0.01', aliases: ['10m', 'sprint 10', 'sprint10'] },
  { key: 'sprint20m', label: '20 m', unit: 's', group: 'ice', step: '0.01', aliases: ['20m', 'sprint 20', 'sprint20'] },
  { key: 'sprint30m', label: '30 m', unit: 's', group: 'ice', step: '0.01', aliases: ['30m', 'sprint 30', 'sprint30'] },
  { key: 'sprint20mFly', label: 'Fly 20', unit: 's', group: 'ice', step: '0.01', aliases: ['fly 20', '20 fly', '20m fly', 'sprint20mfly'] },
  { key: 'sprint30mFly', label: 'Fly 30', unit: 's', group: 'ice', step: '0.01', aliases: ['fly 30', '30 fly', '30m fly', 'sprint30mfly'] },
  ...Array.from({ length: 7 }, (_, index) => ({
    key: `endurance7x40_${index + 1}`,
    label: `40 m ${index + 1}`,
    unit: 's',
    group: 'repeat' as const,
    step: '0.01',
    aliases: [`7x40 ${index + 1}`, `40 ${index + 1}`, `rep ${index + 1}`, `sprint ${index + 1}`],
  })),
  { key: 'standingLongJump', label: 'SLJ', unit: 'cm', group: 'jump', aliases: ['standing long jump', 'broad jump', 'längdhopp', 'stående längd'] },
  { key: 'threeJumpLeft', label: '3-steg L', unit: 'cm', group: 'jump', aliases: ['3 steg l', '3 jump left', 'three jump left', 'tresteg l'] },
  { key: 'threeJumpRight', label: '3-steg R', unit: 'cm', group: 'jump', aliases: ['3 steg r', '3 jump right', 'three jump right', 'tresteg r'] },
  { key: 'gripStrengthLeft', label: 'Grip L', unit: 'kg', group: 'jump', step: '0.1', aliases: ['grip l', 'grip left', 'grepp l', 'grepp vänster'] },
  { key: 'gripStrengthRight', label: 'Grip R', unit: 'kg', group: 'jump', step: '0.1', aliases: ['grip r', 'grip right', 'grepp r', 'grepp höger'] },
  ...[20, 40, 60, 80, 100].map((load) => ({
    key: `jumpSquat_${load}`,
    label: `JS ${load}`,
    unit: 'W',
    group: 'power' as const,
    aliases: [`jump squat ${load}`, `js ${load}`, `musclelab ${load}`, `${load} kg power`],
  })),
  ...[30, 35, 40, 45, 50, 55].flatMap((load) => [
    {
      key: `singleLegJumpLeft_${load}`,
      label: `SL L ${load}`,
      unit: 'W',
      group: 'power' as const,
      aliases: [`single leg left ${load}`, `sl l ${load}`, `enben l ${load}`],
    },
    {
      key: `singleLegJumpRight_${load}`,
      label: `SL R ${load}`,
      unit: 'W',
      group: 'power' as const,
      aliases: [`single leg right ${load}`, `sl r ${load}`, `enben r ${load}`],
    },
  ]),
  { key: 'backSquat1RM', label: 'BS 1RM', unit: 'kg', group: 'strength', step: '0.5', aliases: ['back squat', 'squat', 'bs', 'knäböj', 'benböj'] },
  { key: 'powerClean1RM', label: 'PC 1RM', unit: 'kg', group: 'strength', step: '0.5', aliases: ['power clean', 'pc', 'frivändning'] },
  { key: 'benchPress1RM', label: 'BP 1RM', unit: 'kg', group: 'strength', step: '0.5', aliases: ['bench press', 'bench', 'bp', 'bänkpress'] },
  { key: 'pullUp1RM', label: 'Pull-up 1RM', unit: 'kg', group: 'strength', step: '0.5', aliases: ['pullup', 'pull-up', 'chins', 'weighted chins'] },
  { key: 'beepTestLevel', label: 'Beep nivå', unit: '', group: 'endurance', step: '0.1', aliases: ['beep level', 'beep nivå', 'beep'] },
  { key: 'beepTestShuttle', label: 'Beep shuttle', unit: '', group: 'endurance', aliases: ['beep shuttle', 'shuttle'] },
  { key: 'vo2max', label: 'VO2max', unit: 'ml/kg/min', group: 'endurance', step: '0.1', aliases: ['vo2', 'vo2max', 'vo2 max', 'syreupptag'] },
  { key: 'lt1HeartRate', label: 'LT1 HR', unit: 'bpm', group: 'endurance', aliases: ['lt1 hr', 'lt1 puls', 'lt1 heart rate'] },
  { key: 'lt1SpeedKmh', label: 'LT1 fart', unit: 'km/h', group: 'endurance', step: '0.1', aliases: ['lt1 speed', 'lt1 fart', 'lt1 kmh'] },
  { key: 'lt1Lactate', label: 'LT1 laktat', unit: 'mmol/L', group: 'endurance', step: '0.1', aliases: ['lt1 lactate', 'lt1 laktat'] },
  { key: 'lt2HeartRate', label: 'LT2 HR', unit: 'bpm', group: 'endurance', aliases: ['lt2 hr', 'lt2 puls', 'lt2 heart rate'] },
  { key: 'lt2SpeedKmh', label: 'LT2 fart', unit: 'km/h', group: 'endurance', step: '0.1', aliases: ['lt2 speed', 'lt2 fart', 'lt2 kmh'] },
  { key: 'lt2Lactate', label: 'LT2 laktat', unit: 'mmol/L', group: 'endurance', step: '0.1', aliases: ['lt2 lactate', 'lt2 laktat'] },
  { key: 'maxHeartRate', label: 'Max HR', unit: 'bpm', group: 'endurance', aliases: ['max hr', 'max puls', 'hr max'] },
  { key: 'maxLactate', label: 'Max laktat', unit: 'mmol/L', group: 'endurance', step: '0.1', aliases: ['max lactate', 'max laktat'] },
  { key: 'rampDurationSec', label: 'Ramp tid', unit: 's', group: 'endurance', aliases: ['ramp time', 'ramp duration', 'running time'] },
  { key: 'peakSpeedKmh', label: 'Peak fart', unit: 'km/h', group: 'endurance', step: '0.1', aliases: ['peak speed', 'peak fart', 'vmax'] },
  { key: 'rerMax', label: 'RER max', unit: '', group: 'endurance', step: '0.01', aliases: ['rer', 'rer max'] },
  { key: 'veMax', label: 'VE max', unit: 'L/min', group: 'endurance', step: '0.1', aliases: ['ve', 've max', 'ventilation'] },
  { key: 'breathingFrequencyMax', label: 'BF max', unit: '/min', group: 'endurance', step: '0.1', aliases: ['breathing frequency', 'bf max', 'andningsfrekvens'] },
  { key: 'economyMlKgKm', label: 'Ekonomi', unit: 'ml/kg/km', group: 'endurance', step: '0.1', aliases: ['economy', 'running economy', 'löpekonomi'] },
  { key: 'hrRecovery1Min', label: 'HRR 1m', unit: 'bpm', group: 'endurance', aliases: ['hr recovery 1', 'hrr1', 'pulsfall 1'] },
  { key: 'hrRecovery2Min', label: 'HRR 2m', unit: 'bpm', group: 'endurance', aliases: ['hr recovery 2', 'hrr2', 'pulsfall 2'] },
  { key: 'lactateClearance3Min', label: 'Lac clr 3m', unit: 'mmol/L', group: 'endurance', step: '0.1', aliases: ['lactate clearance 3', 'laktat clearance 3'] },
  { key: 'lactateClearance5Min', label: 'Lac clr 5m', unit: 'mmol/L', group: 'endurance', step: '0.1', aliases: ['lactate clearance 5', 'laktat clearance 5'] },
  { key: 'lactateClearance10Min', label: 'Lac clr 10m', unit: 'mmol/L', group: 'endurance', step: '0.1', aliases: ['lactate clearance 10', 'laktat clearance 10'] },
]

const GROUPS: MetricGroup[] = ['ice', 'repeat', 'jump', 'power', 'strength', 'endurance']

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function parseNumber(raw: string | undefined) {
  if (!raw) return null
  const value = Number(raw.trim().replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

function splitLine(line: string) {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  return line.split(',')
}

function pickMember(input: string, members: Member[]) {
  const target = normalize(input)
  if (!target) return null
  return (
    members.find((member) => normalize(member.name) === target)
    ?? members.find((member) => normalize(member.name).startsWith(target))
    ?? members.find((member) => normalize(member.name).includes(target))
    ?? null
  )
}

const HEADER_BY_NORMALIZED = new Map<string, string>([
  ['spelare', 'athlete'],
  ['player', 'athlete'],
  ['athlete', 'athlete'],
  ['namn', 'athlete'],
  ['name', 'athlete'],
])

for (const metric of METRICS) {
  HEADER_BY_NORMALIZED.set(normalize(metric.key), metric.key)
  HEADER_BY_NORMALIZED.set(normalize(metric.label), metric.key)
  for (const alias of metric.aliases) {
    HEADER_BY_NORMALIZED.set(normalize(alias), metric.key)
  }
}

function buildTemplateHeader() {
  return ['Spelare', ...METRICS.map((metric) => metric.label)].join('\t')
}

export function TeamHockeyBulkEntryDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  onSaved,
}: TeamHockeyBulkEntryDialogProps) {
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [pasteText, setPasteText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/teams/${teamId}/analysis-summary`)
        const body = await res.json().catch(() => null)
        if (!res.ok || body?.success === false) {
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        if (!cancelled) {
          setMembers(
            (body.data.members as Array<{ clientId: string; name: string }>).map((member) => ({
              id: member.clientId,
              name: member.name,
            })),
          )
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Kunde inte hämta lagets spelare')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, teamId])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues({})
      setPasteText('')
      setNotes('')
      setError(null)
      setResult(null)
    }
    onOpenChange(nextOpen)
  }

  const filledRows = useMemo(() => {
    return members.filter((member) => METRICS.some((metric) => parseNumber(values[`${member.id}:${metric.key}`]) != null))
  }, [members, values])

  const setCell = (clientId: string, metricKey: string, raw: string) => {
    setValues((prev) => {
      const key = `${clientId}:${metricKey}`
      const next = { ...prev }
      if (raw.trim() === '') delete next[key]
      else next[key] = raw
      return next
    })
  }

  const applyPaste = () => {
    const lines = pasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      setError('Klistra in minst en rubrikrad och en spelarrad.')
      return
    }

    const headers = splitLine(lines[0]).map((header) => HEADER_BY_NORMALIZED.get(normalize(header)) ?? null)
    const athleteIndex = headers.findIndex((header) => header === 'athlete')
    if (athleteIndex < 0) {
      setError('Kunde inte hitta spelarkolumn. Använd rubrik Spelare eller Namn.')
      return
    }

    let matchedRows = 0
    let filledCells = 0
    const next = { ...values }

    for (const line of lines.slice(1)) {
      const cells = splitLine(line)
      const member = pickMember(cells[athleteIndex] ?? '', members)
      if (!member) continue

      let rowHasValue = false
      headers.forEach((header, index) => {
        if (!header || header === 'athlete') return
        const value = parseNumber(cells[index])
        if (value == null) return
        next[`${member.id}:${header}`] = String(value)
        filledCells++
        rowHasValue = true
      })

      if (rowHasValue) matchedRows++
    }

    setValues(next)
    setError(null)
    setResult(`Läste in ${filledCells} värden för ${matchedRows} spelare.`)
  }

  const copyTemplate = async () => {
    const rows = [buildTemplateHeader(), ...members.map((member) => member.name)].join('\n')
    try {
      await navigator.clipboard.writeText(rows)
      toast.success('Mall kopierad')
    } catch {
      setPasteText(rows)
      toast.info('Mallen lades i klistrafältet')
    }
  }

  const resetGrid = () => {
    setValues({})
    setResult(null)
    setError(null)
  }

  const entries = useMemo(() => {
    return filledRows.map((member) => {
      const valueFor = (key: string) => parseNumber(values[`${member.id}:${key}`])
      const entry: Record<string, unknown> = { clientId: member.id }

      for (const metric of METRICS) {
        if (
          metric.key.startsWith('endurance7x40_')
          || metric.key.startsWith('jumpSquat_')
          || metric.key.startsWith('singleLegJumpLeft_')
          || metric.key.startsWith('singleLegJumpRight_')
        ) {
          continue
        }
        const value = valueFor(metric.key)
        if (value != null) entry[metric.key] = metric.key === 'beepTestShuttle' ? Math.round(value) : value
      }

      const endurance = Array.from({ length: 7 }, (_, index) => valueFor(`endurance7x40_${index + 1}`))
        .filter((value): value is number => value != null)
      if (endurance.length > 0) entry.endurance7x40 = endurance

      const jumpSquat = Object.fromEntries(
        [20, 40, 60, 80, 100]
          .map((load) => [String(load), valueFor(`jumpSquat_${load}`)] as const)
          .filter((pair): pair is [string, number] => pair[1] != null),
      )
      if (Object.keys(jumpSquat).length > 0) entry.jumpSquatLadder = jumpSquat

      const singleLegLeft = Object.fromEntries(
        [30, 35, 40, 45, 50, 55]
          .map((load) => [String(load), valueFor(`singleLegJumpLeft_${load}`)] as const)
          .filter((pair): pair is [string, number] => pair[1] != null),
      )
      if (Object.keys(singleLegLeft).length > 0) entry.singleLegJumpLeft = singleLegLeft

      const singleLegRight = Object.fromEntries(
        [30, 35, 40, 45, 50, 55]
          .map((load) => [String(load), valueFor(`singleLegJumpRight_${load}`)] as const)
          .filter((pair): pair is [string, number] => pair[1] != null),
      )
      if (Object.keys(singleLegRight).length > 0) entry.singleLegJumpRight = singleLegRight

      return entry
    })
  }, [filledRows, values])

  const handleSave = async () => {
    if (entries.length === 0) return
    setIsSaving(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/hockey-tests/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testDate,
          notes: notes.trim() || undefined,
          entries,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || body?.success === false) {
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      setResult(`Sparade ${body.total} hockeytester (${body.created} nya, ${body.updated} uppdaterade).`)
      setValues({})
      setPasteText('')
      setNotes('')
      onSaved?.()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Kunde inte spara hockeytester')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[96vw] max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-500" />
            Hockey bulk battery
          </DialogTitle>
          <DialogDescription>
            Fyll i eller klistra in Skellefteå-test för hela {teamName}. Tomma celler ignoreras.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 pb-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-3">
            <div>
              <Label htmlFor="hockey-bulk-date">Testdatum</Label>
              <Input
                id="hockey-bulk-date"
                type="date"
                value={testDate}
                onChange={(event) => setTestDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="hockey-bulk-notes">Anteckningar</Label>
              <Input
                id="hockey-bulk-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex. ispass för J20, 10 s vila på 7x40, tidtagning med fotocell"
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/10 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium">Excel-paste</p>
                <p className="text-xs text-muted-foreground">
                  Kopiera mallen, fyll den i Excel och klistra tillbaka med rubrikraden kvar.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyTemplate} disabled={members.length === 0}>
                  <Clipboard className="mr-1.5 h-4 w-4" />
                  Kopiera mall
                </Button>
                <Button type="button" size="sm" onClick={applyPaste} disabled={members.length === 0 || pasteText.trim() === ''}>
                  Läs in paste
                </Button>
              </div>
            </div>
            <Textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder="Spelare	505 L	505 R	5 m	10 m	20 m	30 m	40 m 1	40 m 2	SLJ	BS 1RM..."
              className="min-h-24 font-mono text-xs"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {result && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              {result}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {GROUPS.map((group) => (
                <Badge key={group} variant="outline" className="text-[10px]">
                  {METRIC_GROUP_LABELS[group]} {METRICS.filter((metric) => metric.group === group).length}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {filledRows.length} av {members.length} spelare har minst ett värde.
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="max-h-[48vh] overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="sticky left-0 top-0 z-20 min-w-44 bg-muted px-3 py-2 text-left font-medium">
                        Spelare
                      </th>
                      {METRICS.map((metric) => (
                        <th key={metric.key} className="sticky top-0 z-10 min-w-[86px] bg-muted px-2 py-2 text-right font-medium">
                          <span>{metric.label}</span>
                          {metric.unit && <span className="ml-1 text-[10px] text-muted-foreground">{metric.unit}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b last:border-0">
                        <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium">
                          {member.name}
                        </td>
                        {METRICS.map((metric) => {
                          const key = `${member.id}:${metric.key}`
                          return (
                            <td key={metric.key} className="px-1 py-1">
                              <Input
                                value={values[key] ?? ''}
                                onChange={(event) => setCell(member.id, metric.key, event.target.value)}
                                type="number"
                                min={0}
                                step={metric.step ?? '1'}
                                inputMode="decimal"
                                className="h-8 w-[82px] px-2 text-right font-mono text-xs"
                                aria-label={`${member.name} ${metric.label}`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-5 py-4">
          <Button type="button" variant="outline" onClick={resetGrid} disabled={isSaving || Object.keys(values).length === 0}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Rensa
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || entries.length === 0}>
            {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Spara {entries.length > 0 ? `${entries.length} spelare` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
