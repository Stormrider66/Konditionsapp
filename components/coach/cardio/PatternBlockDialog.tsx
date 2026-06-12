'use client'

import React, { useMemo, useState } from 'react'
import { useLocale } from '@/i18n/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'

export type PatternBlockEquipmentOption = { value: string; label: string }

export type PatternUnit = 'cal' | 'm' | 'min'

export type GeneratedPatternStep = {
  type: 'INTERVAL'
  equipment: string
  zone: string
  notes: string
  distanceUnit: 'km' | 'm'
  calories?: number
  distance?: number // stored in km internally
  duration?: number // stored in minutes
  restAfter?: number // minutes
}

interface PatternBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentOptions: PatternBlockEquipmentOption[]
  equipmentLabelByValue: Record<string, string>
  onAdd: (steps: GeneratedPatternStep[]) => void
}

type PatternMode = 'ladder' | 'single' | 'custom' | 'combined'
type AppLocale = 'en' | 'sv'

type CombinedSlot = {
  id: string
  equipment: string
  value: number
  unit: PatternUnit
}

const DEFAULT_SELECTED = ['ASSAULT_BIKE', 'ROW', 'SKI_ERG']
const DEFAULT_COMBINED_SLOTS: CombinedSlot[] = [
  { id: 'slot-1', equipment: 'RUN', value: 200, unit: 'm' },
  { id: 'slot-2', equipment: 'ROW', value: 20, unit: 'cal' },
  { id: 'slot-3', equipment: 'ASSAULT_BIKE', value: 500, unit: 'm' },
]

const slotId = () => `slot-${Math.random().toString(36).slice(2, 9)}`

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function parseCustomCsv(input: string): number[] {
  return input
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => Number(s))
    .filter(n => Number.isFinite(n) && n > 0)
}

function buildLadder(from: number, to: number, step: number): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(step) || step === 0) {
    return []
  }
  const out: number[] = []
  const ascending = step > 0
  let v = from
  while (out.length < 50) {
    out.push(Number(v.toFixed(3)))
    v = v + step
    if (ascending && v > to + 1e-9) break
    if (!ascending && v < to - 1e-9) break
  }
  return out
}

function unitLabel(unit: PatternUnit): string {
  if (unit === 'cal') return 'cal'
  if (unit === 'm') return 'm'
  return 'min'
}

function buildStepFromUnit(
  equipment: string,
  zone: string,
  value: number,
  unit: PatternUnit,
  label: string,
  restAfter?: number
): GeneratedPatternStep {
  const base: GeneratedPatternStep = {
    type: 'INTERVAL',
    equipment,
    zone,
    notes: `${value} ${unitLabel(unit)} ${label}`,
    distanceUnit: 'm',
    restAfter,
  }
  if (unit === 'cal') base.calories = value
  if (unit === 'm') base.distance = value / 1000
  if (unit === 'min') base.duration = value
  return base
}

export function PatternBlockDialog({
  open,
  onOpenChange,
  equipmentOptions,
  equipmentLabelByValue,
  onAdd,
}: PatternBlockDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED)
  const [mode, setMode] = useState<PatternMode>('ladder')

  // Ladder
  const [from, setFrom] = useState<number>(50)
  const [to, setTo] = useState<number>(10)
  const [step, setStep] = useState<number>(-10)

  // Single value
  const [singleValue, setSingleValue] = useState<number>(30)
  const [singleRounds, setSingleRounds] = useState<number>(3)

  // Custom CSV
  const [customInput, setCustomInput] = useState<string>('60, 50, 40, 30, 20')

  // Combined (per-equipment slots)
  const [combinedSlots, setCombinedSlots] = useState<CombinedSlot[]>(DEFAULT_COMBINED_SLOTS)
  const [combinedRounds, setCombinedRounds] = useState<number>(3)

  // Shared
  const [unit, setUnit] = useState<PatternUnit>('cal')
  const [zone, setZone] = useState<string>('4')
  const [restBetween, setRestBetween] = useState<number>(1)
  // Station pacing for cal/m stations: 'target' = advance when the goal is
  // reached; 'window' = each station runs a fixed clock window (EMOM-style)
  // with the value as the goal within it.
  const [pacing, setPacing] = useState<'target' | 'window'>('target')
  const [windowSeconds, setWindowSeconds] = useState<number>(60)

  const values = useMemo<number[]>(() => {
    if (mode === 'ladder') return buildLadder(from, to, step)
    if (mode === 'single') {
      if (!Number.isFinite(singleValue) || singleValue <= 0) return []
      const rounds = Math.max(1, Math.floor(singleRounds || 0))
      return Array<number>(rounds).fill(singleValue)
    }
    if (mode === 'custom') return parseCustomCsv(customInput)
    return []
  }, [mode, from, to, step, singleValue, singleRounds, customInput])

  const totalSteps =
    mode === 'combined'
      ? combinedSlots.length * Math.max(1, Math.floor(combinedRounds || 0))
      : values.length * selected.length

  const toggleEquipment = (val: string) => {
    setSelected(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
  }

  const updateSlot = (id: string, patch: Partial<CombinedSlot>) => {
    setCombinedSlots(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  }
  const removeSlot = (id: string) => {
    setCombinedSlots(prev => (prev.length > 1 ? prev.filter(s => s.id !== id) : prev))
  }
  const addSlot = () => {
    const first = equipmentOptions[0]?.value || 'OTHER'
    setCombinedSlots(prev => [...prev, { id: slotId(), equipment: first, value: 100, unit: 'm' }])
  }

  const handleAdd = () => {
    if (totalSteps === 0) return
    const steps: GeneratedPatternStep[] = []

    if (mode === 'combined') {
      const rounds = Math.max(1, Math.floor(combinedRounds || 0))
      for (let r = 0; r < rounds; r++) {
        combinedSlots.forEach((slot, idx) => {
          const label = equipmentLabelByValue[slot.equipment] || slot.equipment
          const isLastInRound = idx === combinedSlots.length - 1
          const isLastRound = r === rounds - 1
          const restAfter = isLastInRound && !isLastRound && restBetween > 0 ? restBetween : undefined
          steps.push(buildStepFromUnit(slot.equipment, zone, slot.value, slot.unit, label, restAfter))
        })
      }
    } else {
      values.forEach((v, roundIdx) => {
        selected.forEach((eq, eqIdx) => {
          const label = equipmentLabelByValue[eq] || eq
          const isLastInRound = eqIdx === selected.length - 1
          const isLastRound = roundIdx === values.length - 1
          const restAfter = isLastInRound && !isLastRound && restBetween > 0 ? restBetween : undefined
          steps.push(buildStepFromUnit(eq, zone, v, unit, label, restAfter))
        })
      })
    }

    // EMOM-style pacing: give every goal-based station (cal/m) the fixed
    // window so focus mode runs it on the clock; 'min' stations already have
    // their own duration.
    if (pacing === 'window' && windowSeconds >= 10) {
      for (const generated of steps) {
        if (generated.duration == null) generated.duration = windowSeconds / 60
      }
    }

    onAdd(steps)
    onOpenChange(false)
  }

  const previewLine = (() => {
    if (totalSteps === 0) {
      return copy(locale, 'Nothing to preview - check pattern and equipment.', 'Inget att förhandsgranska - kontrollera mönster och utrustning.')
    }
    if (mode === 'combined') {
      const rounds = Math.max(1, Math.floor(combinedRounds || 0))
      const slotSummary = combinedSlots
        .map(s => `${s.value}${unitLabel(s.unit)} ${equipmentLabelByValue[s.equipment] || s.equipment}`)
        .join(' + ')
      const pacingNote = pacing === 'window'
        ? copy(locale, `, ${windowSeconds}s window per station`, `, ${windowSeconds}s fönster per station`)
        : ''
      return copy(
        locale,
        `${rounds} round${rounds === 1 ? '' : 's'} x ${combinedSlots.length} steps = ${totalSteps} intervals (${slotSummary}${pacingNote})`,
        `${rounds} runda${rounds === 1 ? '' : 'r'} x ${combinedSlots.length} steg = ${totalSteps} intervall (${slotSummary}${pacingNote})`
      )
    }
    const valuesPreview =
      values.length <= 8
        ? values.join(', ')
        : `${values.slice(0, 6).join(', ')}, ... (${values.length} ${copy(locale, 'pcs', 'st')})`
    return copy(
      locale,
      `${values.length} round${values.length === 1 ? '' : 's'} x ${selected.length} equipment = ${totalSteps} intervals (${valuesPreview} ${unit})`,
      `${values.length} runda${values.length === 1 ? '' : 'r'} x ${selected.length} utrustning = ${totalSteps} intervall (${valuesPreview} ${unit})`
    )
  })()

  const showSharedEquipment = mode !== 'combined'
  const showSharedUnit = mode !== 'combined'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy(locale, 'Build pattern block', 'Bygg mönsterblock')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm">{copy(locale, 'Pattern', 'Mönster')}</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as PatternMode)}
              className="flex flex-row flex-wrap gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="ladder" /> {copy(locale, 'Ladder', 'Stege')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="single" /> {copy(locale, 'Single value', 'Ett värde')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="custom" /> {copy(locale, 'Custom', 'Anpassad')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="combined" /> {copy(locale, 'Combined', 'Kombinerat')}
              </label>
            </RadioGroup>
          </div>

          {showSharedEquipment && (
            <div className="space-y-2">
              <Label className="text-sm">{copy(locale, 'Equipment (in order per round)', 'Utrustning (i ordning per runda)')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {equipmentOptions.map(opt => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded border px-2 py-1.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.includes(opt.value)}
                      onCheckedChange={() => toggleEquipment(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              {selected.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {copy(locale, 'Order:', 'Ordning:')} {selected.map(v => equipmentLabelByValue[v] || v).join(' -> ')}
                </p>
              )}
            </div>
          )}

          {mode === 'ladder' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{copy(locale, 'From', 'Från')}</Label>
                <Input
                  type="number"
                  value={Number.isFinite(from) ? from : ''}
                  onChange={(e) => setFrom(parseFloat(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{copy(locale, 'To', 'Till')}</Label>
                <Input
                  type="number"
                  value={Number.isFinite(to) ? to : ''}
                  onChange={(e) => setTo(parseFloat(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{copy(locale, 'Step', 'Steg')}</Label>
                <Input
                  type="number"
                  value={Number.isFinite(step) ? step : ''}
                  onChange={(e) => setStep(parseFloat(e.target.value))}
                  className="h-8"
                />
              </div>
            </div>
          )}

          {mode === 'single' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{copy(locale, 'Value', 'Värde')}</Label>
                <Input
                  type="number"
                  value={Number.isFinite(singleValue) ? singleValue : ''}
                  onChange={(e) => setSingleValue(parseFloat(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{copy(locale, 'Number of rounds', 'Antal rundor')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={Number.isFinite(singleRounds) ? singleRounds : ''}
                  onChange={(e) => setSingleRounds(parseInt(e.target.value, 10) || 1)}
                  className="h-8"
                />
              </div>
            </div>
          )}

          {mode === 'custom' && (
            <div>
              <Label className="text-xs text-muted-foreground">{copy(locale, 'Values (comma-separated)', 'Värden (kommaseparerade)')}</Label>
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="h-8"
                placeholder="60, 50, 40, 30, 20"
              />
            </div>
          )}

          {mode === 'combined' && (
            <div className="space-y-2">
              <Label className="text-sm">{copy(locale, 'Steps in each round', 'Steg i varje runda')}</Label>
              <div className="space-y-2">
                {combinedSlots.map((slot, idx) => (
                  <div key={slot.id} className="grid grid-cols-[1fr_80px_90px_28px] gap-2 items-end">
                    <div>
                      {idx === 0 && <Label className="text-xs text-muted-foreground">{copy(locale, 'Equipment', 'Utrustning')}</Label>}
                      <Select value={slot.equipment} onValueChange={(v) => updateSlot(slot.id, { equipment: v })}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      {idx === 0 && <Label className="text-xs text-muted-foreground">{copy(locale, 'Value', 'Värde')}</Label>}
                      <Input
                        type="number"
                        value={Number.isFinite(slot.value) ? slot.value : ''}
                        onChange={(e) => updateSlot(slot.id, { value: parseFloat(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      {idx === 0 && <Label className="text-xs text-muted-foreground">{copy(locale, 'Unit', 'Enhet')}</Label>}
                      <Select value={slot.unit} onValueChange={(v) => updateSlot(slot.id, { unit: v as PatternUnit })}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cal">cal</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="min">min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={combinedSlots.length === 1}
                      onClick={() => removeSlot(slot.id)}
                      title={copy(locale, 'Remove', 'Ta bort')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addSlot}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {copy(locale, 'Add step', 'Lägg till steg')}
              </Button>
              <div className="pt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">{copy(locale, 'Number of rounds', 'Antal rundor')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={Number.isFinite(combinedRounds) ? combinedRounds : ''}
                    onChange={(e) => setCombinedRounds(parseInt(e.target.value, 10) || 1)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {showSharedUnit && (
              <div>
                <Label className="text-xs text-muted-foreground">{copy(locale, 'Unit', 'Enhet')}</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as PatternUnit)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cal">{copy(locale, 'Calories', 'Kalorier')}</SelectItem>
                    <SelectItem value="m">{copy(locale, 'Meters', 'Meter')}</SelectItem>
                    <SelectItem value="min">{copy(locale, 'Minutes', 'Minuter')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">{copy(locale, 'Zone', 'Zon')}</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(z => (
                    <SelectItem key={z} value={String(z)}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{copy(locale, 'Rest between rounds (min)', 'Vila mellan rundor (min)')}</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={Number.isFinite(restBetween) ? restBetween : ''}
                onChange={(e) => setRestBetween(parseFloat(e.target.value) || 0)}
                className="h-8"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{copy(locale, 'Station pacing', 'Stationstempo')}</Label>
              <Select value={pacing} onValueChange={(v) => setPacing(v as 'target' | 'window')}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="target">
                    {copy(locale, 'Switch at goal (e.g. at 16 cal)', 'Byt vid mål (t.ex. vid 16 cal)')}
                  </SelectItem>
                  <SelectItem value="window">
                    {copy(locale, 'On the minute (fixed window)', 'På minuten (fast fönster)')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pacing === 'window' && (
              <div>
                <Label className="text-xs text-muted-foreground">{copy(locale, 'Window (seconds)', 'Fönster (sekunder)')}</Label>
                <Input
                  type="number"
                  min={10}
                  max={600}
                  step={5}
                  value={Number.isFinite(windowSeconds) ? windowSeconds : ''}
                  onChange={(e) => setWindowSeconds(parseInt(e.target.value, 10) || 60)}
                  className="h-8"
                  placeholder="60"
                />
              </div>
            )}
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <div className="font-medium text-xs text-muted-foreground mb-1">{copy(locale, 'Preview', 'Förhandsgranskning')}</div>
            <div>{previewLine}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{copy(locale, 'Cancel', 'Avbryt')}</Button>
          <Button
            onClick={handleAdd}
            disabled={
              totalSteps === 0 ||
              (mode === 'combined' ? combinedSlots.length === 0 : selected.length === 0)
            }
          >
            {copy(locale, 'Add block', 'Lägg till block')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
