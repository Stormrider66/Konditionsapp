'use client'

import React, { useMemo, useState } from 'react'
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

export type PatternBlockEquipmentOption = { value: string; label: string }

export type PatternUnit = 'cal' | 'm' | 'min'

export type GeneratedPatternStep = {
  type: 'INTERVAL'
  equipment: string
  zone: string
  notes: string
  distanceUnit: 'km' | 'm'
  // Exactly one of these is set:
  calories?: number
  distance?: number // stored in km internally
  duration?: number // stored in minutes
  // Optional rest after this step:
  restAfter?: number // minutes
}

interface PatternBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentOptions: PatternBlockEquipmentOption[]
  equipmentLabelByValue: Record<string, string>
  onAdd: (steps: GeneratedPatternStep[]) => void
}

type PatternMode = 'ladder' | 'single' | 'custom'

const DEFAULT_SELECTED = ['ASSAULT_BIKE', 'ROW', 'SKI_ERG']

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
  // Detect direction by sign of step
  const ascending = step > 0
  let v = from
  // Cap at 50 rounds to prevent runaway loops
  while (out.length < 50) {
    out.push(Number(v.toFixed(3)))
    v = v + step
    if (ascending && v > to + 1e-9) break
    if (!ascending && v < to - 1e-9) break
  }
  return out
}

export function PatternBlockDialog({
  open,
  onOpenChange,
  equipmentOptions,
  equipmentLabelByValue,
  onAdd,
}: PatternBlockDialogProps) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED)
  const [mode, setMode] = useState<PatternMode>('ladder')
  const [from, setFrom] = useState<number>(60)
  const [to, setTo] = useState<number>(20)
  const [step, setStep] = useState<number>(-10)
  const [singleValue, setSingleValue] = useState<number>(30)
  const [customInput, setCustomInput] = useState<string>('60, 50, 40, 30, 20')
  const [unit, setUnit] = useState<PatternUnit>('cal')
  const [zone, setZone] = useState<string>('4')
  const [restBetween, setRestBetween] = useState<number>(0)

  const values = useMemo<number[]>(() => {
    if (mode === 'ladder') return buildLadder(from, to, step)
    if (mode === 'single') return Number.isFinite(singleValue) && singleValue > 0 ? [singleValue] : []
    return parseCustomCsv(customInput)
  }, [mode, from, to, step, singleValue, customInput])

  const totalSteps = values.length * selected.length

  const toggleEquipment = (val: string) => {
    setSelected(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
  }

  const handleAdd = () => {
    if (totalSteps === 0) return
    const steps: GeneratedPatternStep[] = []
    values.forEach((v, roundIdx) => {
      selected.forEach((eq, eqIdx) => {
        const label = equipmentLabelByValue[eq] || eq
        const noteValue = unit === 'cal'
          ? `${v} cal`
          : unit === 'm'
            ? `${v} m`
            : `${v} min`
        const isLastInRound = eqIdx === selected.length - 1
        const isLastRound = roundIdx === values.length - 1
        const restAfter = isLastInRound && !isLastRound && restBetween > 0
          ? restBetween
          : undefined
        const base: GeneratedPatternStep = {
          type: 'INTERVAL',
          equipment: eq,
          zone,
          notes: `${noteValue} ${label}`,
          distanceUnit: 'm',
          restAfter,
        }
        if (unit === 'cal') base.calories = v
        if (unit === 'm') base.distance = v / 1000
        if (unit === 'min') base.duration = v
        steps.push(base)
      })
    })
    onAdd(steps)
    onOpenChange(false)
  }

  const previewLine = (() => {
    if (totalSteps === 0) return 'Inget att förhandsgranska — kontrollera mönster och utrustning.'
    const valuesPreview = values.length <= 8
      ? values.join(', ')
      : `${values.slice(0, 6).join(', ')}, … (${values.length} st)`
    return `${values.length} runda${values.length === 1 ? '' : 'r'} × ${selected.length} utrustning = ${totalSteps} intervall (${valuesPreview} ${unit})`
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Bygg mönsterblock</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm">Utrustning (i ordning per runda)</Label>
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
                Ordning: {selected.map(v => equipmentLabelByValue[v] || v).join(' → ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Mönster</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as PatternMode)}
              className="flex flex-row gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="ladder" /> Stege
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="single" /> Ett värde
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="custom" /> Anpassad
              </label>
            </RadioGroup>

            {mode === 'ladder' && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Från</Label>
                  <Input
                    type="number"
                    value={Number.isFinite(from) ? from : ''}
                    onChange={(e) => setFrom(parseFloat(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Till</Label>
                  <Input
                    type="number"
                    value={Number.isFinite(to) ? to : ''}
                    onChange={(e) => setTo(parseFloat(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Steg</Label>
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
              <div className="pt-1">
                <Label className="text-xs text-muted-foreground">Värde</Label>
                <Input
                  type="number"
                  value={Number.isFinite(singleValue) ? singleValue : ''}
                  onChange={(e) => setSingleValue(parseFloat(e.target.value))}
                  className="h-8 w-32"
                />
              </div>
            )}

            {mode === 'custom' && (
              <div className="pt-1">
                <Label className="text-xs text-muted-foreground">Värden (kommaseparerade)</Label>
                <Input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="h-8"
                  placeholder="60, 50, 40, 30, 20"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Enhet</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as PatternUnit)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cal">Kalorier</SelectItem>
                  <SelectItem value="m">Meter</SelectItem>
                  <SelectItem value="min">Minuter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Zon</Label>
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
              <Label className="text-xs text-muted-foreground">Vila mellan rundor (min)</Label>
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

          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <div className="font-medium text-xs text-muted-foreground mb-1">Förhandsgranskning</div>
            <div>{previewLine}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button
            onClick={handleAdd}
            disabled={totalSteps === 0 || selected.length === 0}
          >
            Lägg till block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
