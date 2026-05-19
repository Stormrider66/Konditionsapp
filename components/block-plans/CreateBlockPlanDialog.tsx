'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, addWeeks, differenceInCalendarDays, format } from 'date-fns'
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import type { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'

interface BlockDraft {
  title: string
  focus: string
  description: string
  startDate: string
  endDate: string
}

interface BlockTemplate {
  title: string
  focus: string
  weeks: number
}

interface PlanTemplate {
  key: string
  label: string
  planName: string
  description: string
  blocks: BlockTemplate[]
}

interface CreateBlockPlanDialogProps {
  endpoint: string
  subjectName: string
  subjectLabel?: string
  onCreated?: (plan: AthletePlanSummary) => void
  trigger?: ReactNode
  defaultTemplateKey?: string
}

const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    key: 'hockey-9',
    label: '9 veckor: Base, max, power',
    planName: '9 veckor styrkeblock',
    description: '3 veckor base, 3 veckor maxstyrka, 3 veckor power.',
    blocks: [
      { title: 'Base', focus: 'Bygg tolerans, teknik och arbetskapacitet', weeks: 3 },
      { title: 'Maxstyrka', focus: 'Tung styrka och tydlig progression', weeks: 3 },
      { title: 'Power', focus: 'Explosivitet, hastighet och överföring till idrotten', weeks: 3 },
    ],
  },
  {
    key: 'preseason-12',
    label: '12 veckor: Preseason',
    planName: '12 veckor preseason',
    description: 'Bygg bas, höj maxstyrka och växla över till power inför säsong.',
    blocks: [
      { title: 'Base', focus: 'Volym, teknik och robusthet', weeks: 4 },
      { title: 'Maxstyrka', focus: 'Högre intensitet och progressiv belastning', weeks: 4 },
      { title: 'Power', focus: 'Explosivitet, snabbhet och idrottsöverföring', weeks: 4 },
    ],
  },
  {
    key: 'return-6',
    label: '6 veckor: Återgång',
    planName: '6 veckor återgång',
    description: 'Kontrollerad återgång med två veckor per steg.',
    blocks: [
      { title: 'Återbyggnad', focus: 'Tolerans, rörelsekvalitet och låg risk', weeks: 2 },
      { title: 'Kapacitet', focus: 'Stegra belastning och träningsvolym', weeks: 2 },
      { title: 'Matchning', focus: 'Power, tempo och idrottsnära krav', weeks: 2 },
    ],
  },
  {
    key: 'competition-4',
    label: '4 veckor: Toppning',
    planName: '4 veckor tävlingsblock',
    description: 'Behåll kapacitet, minska trötthet och toppa mot test eller match.',
    blocks: [
      { title: 'Underhåll', focus: 'Behåll styrka och kapacitet med kontrollerad volym', weeks: 2 },
      { title: 'Toppning', focus: 'Sänk volym, håll kvalitet och fräschhet', weeks: 2 },
    ],
  },
  {
    key: 'custom-3',
    label: '3 block: Egen plan',
    planName: 'Ny blockplan',
    description: '',
    blocks: [
      { title: 'Block 1', focus: '', weeks: 2 },
      { title: 'Block 2', focus: '', weeks: 2 },
      { title: 'Block 3', focus: '', weeks: 2 },
    ],
  },
]

function dateInput(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function buildBlocksFromTemplate(template: PlanTemplate, startDate: Date): BlockDraft[] {
  let cursor = new Date(startDate)
  return template.blocks.map((block) => {
    const blockStart = new Date(cursor)
    const blockEnd = addDays(addWeeks(blockStart, block.weeks), -1)
    cursor = addDays(blockEnd, 1)

    return {
      title: block.title,
      focus: block.focus,
      description: '',
      startDate: dateInput(blockStart),
      endDate: dateInput(blockEnd),
    }
  })
}

function blockWeeks(block: BlockDraft) {
  const start = new Date(block.startDate)
  const end = new Date(block.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1
  return Math.max(1, Math.ceil((differenceInCalendarDays(end, start) + 1) / 7))
}

function dateFromInput(value: string | undefined, fallback = new Date()) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date
}

function blockEndFromWeeks(startDate: Date, weeks: number) {
  return addDays(addWeeks(startDate, weeks), -1)
}

function normalizedWeeks(value: number) {
  return Math.max(1, Math.min(52, Math.round(value)))
}

function recalculateFromBlock(blocks: BlockDraft[], startIndex: number, startDate?: Date) {
  if (startIndex >= blocks.length) return blocks
  let cursor = startDate ?? dateFromInput(blocks[startIndex]?.startDate)

  return blocks.map((block, index) => {
    if (index < startIndex) return block

    const weeks = normalizedWeeks(Number(blockWeeks(block)) || 1)
    const nextBlock = {
      ...block,
      startDate: dateInput(cursor),
      endDate: dateInput(blockEndFromWeeks(cursor, weeks)),
    }
    cursor = addDays(dateFromInput(nextBlock.endDate, cursor), 1)
    return nextBlock
  })
}

export function CreateBlockPlanDialog({
  endpoint,
  subjectName,
  subjectLabel = 'atlet',
  onCreated,
  trigger,
  defaultTemplateKey = 'hockey-9',
}: CreateBlockPlanDialogProps) {
  const today = useMemo(() => new Date(), [])
  const initialTemplate = PLAN_TEMPLATES.find((template) => template.key === defaultTemplateKey) ?? PLAN_TEMPLATES[0]
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [templateKey, setTemplateKey] = useState(initialTemplate.key)
  const [name, setName] = useState(initialTemplate.planName)
  const [description, setDescription] = useState(initialTemplate.description)
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => buildBlocksFromTemplate(initialTemplate, today))

  const planStartDate = blocks[0]?.startDate ?? dateInput(today)
  const planEndDate = blocks[blocks.length - 1]?.endDate ?? dateInput(addDays(addWeeks(today, 6), -1))
  const totalWeeks = blocks.reduce((sum, block) => {
    const weeks = blockWeeks(block)
    return typeof weeks === 'number' ? sum + weeks : sum
  }, 0)

  function applyTemplate(nextTemplateKey: string, startDate = new Date(planStartDate)) {
    const template = PLAN_TEMPLATES.find((candidate) => candidate.key === nextTemplateKey)
    if (!template) return
    setTemplateKey(nextTemplateKey)
    setName(template.planName)
    setDescription(template.description)
    setBlocks(buildBlocksFromTemplate(template, startDate))
  }

  function updatePlanStartDate(value: string) {
    setBlocks((current) => recalculateFromBlock(current, 0, dateFromInput(value, today)))
  }

  function updateBlock(index: number, patch: Partial<BlockDraft>) {
    setBlocks((current) => current.map((block, i) => i === index ? { ...block, ...patch } : block))
  }

  function updateBlockStartDate(index: number, value: string) {
    setBlocks((current) => recalculateFromBlock(current, index, dateFromInput(value, today)))
  }

  function updateBlockEndDate(index: number, value: string) {
    setBlocks((current) => {
      const updated = current.map((block, i) => i === index ? { ...block, endDate: value } : block)
      return recalculateFromBlock(updated, index + 1)
    })
  }

  function updateBlockWeeks(index: number, value: string) {
    const weeks = normalizedWeeks(Number(value) || 1)
    setBlocks((current) => {
      const updated = current.map((block, i) => {
        if (i !== index) return block
        const startDate = dateFromInput(block.startDate, today)
        return {
          ...block,
          endDate: dateInput(blockEndFromWeeks(startDate, weeks)),
        }
      })
      return recalculateFromBlock(updated, index + 1)
    })
  }

  function addBlock() {
    setBlocks((current) => {
      const last = current[current.length - 1]
      const start = last ? addDays(new Date(last.endDate), 1) : new Date()
      const end = addDays(addWeeks(start, 2), -1)
      return [
        ...current,
        {
          title: `Block ${current.length + 1}`,
          focus: '',
          description: '',
          startDate: dateInput(start),
          endDate: dateInput(end),
        },
      ]
    })
  }

  function removeBlock(index: number) {
    setBlocks((current) => {
      const next = current.filter((_, i) => i !== index)
      return next.length > 0 ? recalculateFromBlock(next, Math.max(0, index - 1)) : next
    })
  }

  async function handleSubmit() {
    setIsSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          startDate: planStartDate,
          endDate: planEndDate,
          status: 'ACTIVE',
          blocks: blocks.map((block, index) => ({
            ...block,
            order: index + 1,
          })),
        }),
      })

      const body = await response.json()
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Kunde inte skapa blockplan')
      }

      onCreated?.(body.data)
      toast.success('Blockplan skapad')
      setOpen(false)
      if (!onCreated) window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte skapa blockplan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Skapa blockplan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skapa blockplan för {subjectName}</DialogTitle>
          <DialogDescription>
            Lägg planen först. Workouts kan fyllas på i kalendern senare.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="grid gap-2">
              <Label htmlFor="block-plan-template">Mall</Label>
              <Select value={templateKey} onValueChange={applyTemplate}>
                <SelectTrigger id="block-plan-template">
                  <SelectValue placeholder="Välj mall" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TEMPLATES.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="block-plan-start">Startdatum</Label>
              <Input
                id="block-plan-start"
                type="date"
                value={planStartDate}
                onChange={(event) => updatePlanStartDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="grid gap-2">
              <Label htmlFor="block-plan-name">Plan</Label>
              <Input id="block-plan-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Längd
              </div>
              <div className="mt-1 text-sm font-semibold">
                {blocks.length} block · {totalWeeks} veckor
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="block-plan-description">Beskrivning</Label>
            <Textarea
              id="block-plan-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Block</p>
                <p className="text-xs text-muted-foreground">
                  Anpassa faserna efter {subjectLabel}, säsong, kalender och mål.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addBlock} disabled={blocks.length >= 24}>
                <Plus className="mr-2 h-4 w-4" />
                Lägg till block
              </Button>
            </div>

            {blocks.map((block, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Block {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {block.startDate} - {block.endDate}
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="grid w-28 gap-1">
                      <Label className="text-xs">Veckor</Label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={blockWeeks(block)}
                        onChange={(event) => updateBlockWeeks(index, event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 px-3 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBlock(index)}
                      disabled={blocks.length <= 1}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Ta bort
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Titel</Label>
                    <Input value={block.title} onChange={(event) => updateBlock(index, { title: event.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Fokus</Label>
                    <Input value={block.focus} onChange={(event) => updateBlock(index, { focus: event.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Start</Label>
                    <Input type="date" value={block.startDate} onChange={(event) => updateBlockStartDate(index, event.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Slut</Label>
                    <Input type="date" value={block.endDate} onChange={(event) => updateBlockEndDate(index, event.target.value)} />
                  </div>
                  <div className="grid gap-1.5 md:col-span-2">
                    <Label>Kommentar</Label>
                    <Textarea
                      value={block.description}
                      onChange={(event) => updateBlock(index, { description: event.target.value })}
                      rows={2}
                      placeholder="Vad ska coachen och atleten tänka på i detta block?"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim() || blocks.length === 0}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Skapa blockplan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
