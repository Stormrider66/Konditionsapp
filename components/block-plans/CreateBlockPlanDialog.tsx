'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, addWeeks, format } from 'date-fns'
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
import {
  blockPlanBlockWeeks,
  blockPlanDescriptionWithActualWeeks,
  blockPlanNameWithActualWeeks,
  blockPlanTotalWeeks,
  displayBlockPlanBlocks,
  hasAutoBlockPlanDescription,
} from '@/lib/block-plans/duration'
import { useLocale } from '@/i18n/client'

interface BlockDraft {
  draftId: string
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
  onSaved?: (plan: AthletePlanSummary) => void
  trigger?: ReactNode
  defaultTemplateKey?: string
  initialPlan?: AthletePlanSummary
  /** Show a plan-type selector (special program / injury recovery / …). Used for athlete plans, not team plans. */
  includePlanType?: boolean
  /** Pre-select the plan type for a NEW plan (e.g. open straight into an injury-recovery plan). */
  defaultPlanType?: 'SPECIAL_PROGRAM' | 'INJURY_RECOVERY' | 'RETURN_TO_PLAY' | 'PERFORMANCE'
}

type AppLocale = 'en' | 'sv'

type AthletePlanTypeValue = 'SPECIAL_PROGRAM' | 'INJURY_RECOVERY' | 'RETURN_TO_PLAY' | 'PERFORMANCE'

const PLAN_TYPE_OPTIONS: { value: AthletePlanTypeValue; en: string; sv: string }[] = [
  { value: 'SPECIAL_PROGRAM', en: 'Special program', sv: 'Specialprogram' },
  { value: 'INJURY_RECOVERY', en: 'Injury recovery', sv: 'Skadeåterhämtning' },
  { value: 'RETURN_TO_PLAY', en: 'Return to play', sv: 'Återgång (return to play)' },
  { value: 'PERFORMANCE', en: 'Performance', sv: 'Prestation' },
]

const COPY = {
  en: {
    defaultSubjectLabel: 'athlete',
    createPlan: 'Create block plan',
    editPlan: 'Edit block plan',
    createPlanFor: (subjectName: string) => `Create block plan for ${subjectName}`,
    editDescription: 'Adjust name, dates, and blocks without recreating workouts.',
    createDescription: 'Build the plan first. Workouts can be filled into the calendar later.',
    template: 'Template',
    planType: 'Plan type',
    existingPlan: 'Existing plan',
    chooseTemplate: 'Choose template',
    startDate: 'Start date',
    length: 'Length',
    weeks: 'weeks',
    description: 'Description',
    blocks: 'Blocks',
    blocksHelp: (subjectLabel: string) =>
      `Adjust phases for ${subjectLabel}, season, calendar, and goals.`,
    addBlock: 'Add block',
    block: 'Block',
    easyWeek: 'Easy week',
    easyWeekFocus: 'Reduce volume, keep quality, and recover',
    easyWeekDescription: 'Planned deload week without disrupting the main phases.',
    remove: 'Remove',
    title: 'Title',
    focus: 'Focus',
    start: 'Start',
    end: 'End',
    comment: 'Comment',
    commentPlaceholder: 'What should the coach and athlete keep in mind during this block?',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    created: 'Block plan created',
    teamWorkoutsSkipped: (count: number) =>
      `${count} team ${count === 1 ? 'session' : 'sessions'} marked as skipped for the injury plan`,
    updated: 'Block plan updated',
    createError: 'Could not create block plan',
    updateError: 'Could not update block plan',
  },
  sv: {
    defaultSubjectLabel: 'atlet',
    createPlan: 'Skapa blockplan',
    editPlan: 'Redigera blockplan',
    createPlanFor: (subjectName: string) => `Skapa blockplan för ${subjectName}`,
    editDescription: 'Justera namn, datum och block utan att skapa om passen.',
    createDescription: 'Lägg planen först. Workouts kan fyllas på i kalendern senare.',
    template: 'Mall',
    planType: 'Plantyp',
    existingPlan: 'Befintlig plan',
    chooseTemplate: 'Välj mall',
    startDate: 'Startdatum',
    length: 'Längd',
    weeks: 'veckor',
    description: 'Beskrivning',
    blocks: 'Block',
    blocksHelp: (subjectLabel: string) =>
      `Anpassa faserna efter ${subjectLabel}, säsong, kalender och mål.`,
    addBlock: 'Lägg till block',
    block: 'Block',
    easyWeek: 'Easy week',
    easyWeekFocus: 'Sänk volym, håll kvalitet och återhämtning',
    easyWeekDescription: 'Planerad avlastningsvecka utan att störa huvudfaserna.',
    remove: 'Ta bort',
    title: 'Titel',
    focus: 'Fokus',
    start: 'Start',
    end: 'Slut',
    comment: 'Kommentar',
    commentPlaceholder: 'Vad ska coachen och atleten tänka på i detta block?',
    cancel: 'Avbryt',
    saveChanges: 'Spara ändringar',
    created: 'Blockplan skapad',
    teamWorkoutsSkipped: (count: number) =>
      `${count} lagpass markerade som överhoppade för skadeplanen`,
    updated: 'Blockplan uppdaterad',
    createError: 'Kunde inte skapa blockplan',
    updateError: 'Kunde inte uppdatera blockplan',
  },
} as const

const PLAN_TEMPLATES_BY_LOCALE: Record<AppLocale, PlanTemplate[]> = {
  en: [
    {
      key: 'hockey-9',
      label: '9 weeks: Base, max, power',
      planName: '9-week strength block',
      description: '3 weeks base, 3 weeks max strength, 3 weeks power.',
      blocks: [
        { title: 'Base', focus: 'Build tolerance, technique, and work capacity', weeks: 3 },
        { title: 'Max strength', focus: 'Heavy strength and clear progression', weeks: 3 },
        { title: 'Power', focus: 'Explosiveness, speed, and transfer to sport', weeks: 3 },
      ],
    },
    {
      key: 'preseason-12',
      label: '12 weeks: Preseason',
      planName: '12-week preseason',
      description: 'Build a base, raise max strength, and shift toward power before the season.',
      blocks: [
        { title: 'Base', focus: 'Volume, technique, and robustness', weeks: 4 },
        { title: 'Max strength', focus: 'Higher intensity and progressive loading', weeks: 4 },
        { title: 'Power', focus: 'Explosiveness, speed, and sport transfer', weeks: 4 },
      ],
    },
    {
      key: 'return-6',
      label: '6 weeks: Return',
      planName: '6-week return plan',
      description: 'Controlled return with two weeks per step.',
      blocks: [
        { title: 'Rebuild', focus: 'Tolerance, movement quality, and low risk', weeks: 2 },
        { title: 'Capacity', focus: 'Progress load and training volume', weeks: 2 },
        { title: 'Match demands', focus: 'Power, tempo, and sport-specific demands', weeks: 2 },
      ],
    },
    {
      key: 'competition-4',
      label: '4 weeks: Taper',
      planName: '4-week competition block',
      description: 'Maintain capacity, reduce fatigue, and peak toward a test or match.',
      blocks: [
        { title: 'Maintenance', focus: 'Maintain strength and capacity with controlled volume', weeks: 2 },
        { title: 'Taper', focus: 'Reduce volume while keeping quality and freshness', weeks: 2 },
      ],
    },
    {
      key: 'custom-3',
      label: '3 blocks: Custom plan',
      planName: 'New block plan',
      description: '',
      blocks: [
        { title: 'Block 1', focus: '', weeks: 2 },
        { title: 'Block 2', focus: '', weeks: 2 },
        { title: 'Block 3', focus: '', weeks: 2 },
      ],
    },
  ],
  sv: [
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
  ],
}

function dateInput(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function draftId(prefix: string, index: number, startDate: string) {
  return `${prefix}-${index}-${startDate}`
}

function buildBlocksFromTemplate(template: PlanTemplate, startDate: Date): BlockDraft[] {
  let cursor = new Date(startDate)
  return template.blocks.map((block, index) => {
    const blockStart = new Date(cursor)
    const blockEnd = addDays(addWeeks(blockStart, block.weeks), -1)
    cursor = addDays(blockEnd, 1)

    return {
      draftId: draftId(template.key, index, dateInput(blockStart)),
      title: block.title,
      focus: block.focus,
      description: '',
      startDate: dateInput(blockStart),
      endDate: dateInput(blockEnd),
    }
  })
}

function buildBlocksFromPlan(plan: AthletePlanSummary): BlockDraft[] {
  return displayBlockPlanBlocks(plan.blocks).map((block, index) => ({
    draftId: block.id || draftId(plan.id, index, dateInput(toDate(block.startDate))),
    title: block.title,
    focus: block.focus ?? '',
    description: block.description ?? '',
    startDate: dateInput(toDate(block.startDate)),
    endDate: dateInput(toDate(block.endDate)),
  }))
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function blockWeeks(block: BlockDraft) {
  return blockPlanBlockWeeks(block)
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
  subjectLabel,
  onCreated,
  onSaved,
  trigger,
  defaultTemplateKey = 'hockey-9',
  initialPlan,
  includePlanType = false,
  defaultPlanType,
}: CreateBlockPlanDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const planTemplates = PLAN_TEMPLATES_BY_LOCALE[locale]
  const resolvedSubjectLabel = subjectLabel ?? copy.defaultSubjectLabel
  const today = useMemo(() => new Date(), [])
  const initialTemplate = planTemplates.find((template) => template.key === defaultTemplateKey) ?? planTemplates[0]
  const isEditing = Boolean(initialPlan)
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [templateKey, setTemplateKey] = useState(isEditing ? 'custom-edit' : initialTemplate.key)
  const [planType, setPlanType] = useState<AthletePlanTypeValue>(
    (initialPlan?.planType as AthletePlanTypeValue) ?? defaultPlanType ?? 'SPECIAL_PROGRAM'
  )
  const [name, setName] = useState(initialPlan?.name ?? initialTemplate.planName)
  const [description, setDescription] = useState(initialPlan?.description ?? initialTemplate.description)
  const [descriptionTracksBlocks, setDescriptionTracksBlocks] = useState(() =>
    hasAutoBlockPlanDescription(initialPlan?.description ?? initialTemplate.description)
  )
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => initialPlan ? buildBlocksFromPlan(initialPlan) : buildBlocksFromTemplate(initialTemplate, today))
  const totalWeeks = blockPlanTotalWeeks(blocks)

  function resetForm() {
    setPlanType((initialPlan?.planType as AthletePlanTypeValue) ?? defaultPlanType ?? 'SPECIAL_PROGRAM')
    if (initialPlan) {
      const nextBlocks = buildBlocksFromPlan(initialPlan)
      const nextDescriptionTracksBlocks = hasAutoBlockPlanDescription(initialPlan.description ?? '')
      setTemplateKey('custom-edit')
      setName(blockPlanNameWithActualWeeks(initialPlan.name, blockPlanTotalWeeks(nextBlocks)))
      setDescription(nextDescriptionTracksBlocks
        ? blockPlanDescriptionWithActualWeeks(initialPlan.description, nextBlocks, locale)
        : initialPlan.description ?? '')
      setDescriptionTracksBlocks(nextDescriptionTracksBlocks)
      setBlocks(nextBlocks)
      return
    }

    const nextBlocks = buildBlocksFromTemplate(initialTemplate, today)
    const nextDescriptionTracksBlocks = hasAutoBlockPlanDescription(initialTemplate.description)
    setTemplateKey(initialTemplate.key)
    setName(blockPlanNameWithActualWeeks(initialTemplate.planName, blockPlanTotalWeeks(nextBlocks)))
    setDescription(nextDescriptionTracksBlocks
      ? blockPlanDescriptionWithActualWeeks(initialTemplate.description, nextBlocks, locale)
      : initialTemplate.description)
    setDescriptionTracksBlocks(nextDescriptionTracksBlocks)
    setBlocks(nextBlocks)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) resetForm()
    setOpen(nextOpen)
  }

  const planStartDate = blocks[0]?.startDate ?? dateInput(today)
  const planEndDate = blocks[blocks.length - 1]?.endDate ?? dateInput(addDays(addWeeks(today, 6), -1))

  function commitBlocks(nextBlocks: BlockDraft[]) {
    setBlocks(nextBlocks)
    setName((current) => blockPlanNameWithActualWeeks(current, blockPlanTotalWeeks(nextBlocks)))
    if (descriptionTracksBlocks) {
      setDescription((current) => blockPlanDescriptionWithActualWeeks(current, nextBlocks, locale))
    }
  }

  function applyTemplate(nextTemplateKey: string, startDate = new Date(planStartDate)) {
    const template = planTemplates.find((candidate) => candidate.key === nextTemplateKey)
    if (!template) return
    const nextBlocks = buildBlocksFromTemplate(template, startDate)
    const nextDescriptionTracksBlocks = hasAutoBlockPlanDescription(template.description)
    setTemplateKey(nextTemplateKey)
    setName(blockPlanNameWithActualWeeks(template.planName, blockPlanTotalWeeks(nextBlocks)))
    setDescription(nextDescriptionTracksBlocks
      ? blockPlanDescriptionWithActualWeeks(template.description, nextBlocks, locale)
      : template.description)
    setDescriptionTracksBlocks(nextDescriptionTracksBlocks)
    setBlocks(nextBlocks)
  }

  function updatePlanStartDate(value: string) {
    commitBlocks(recalculateFromBlock(blocks, 0, dateFromInput(value, today)))
  }

  function updateBlock(index: number, patch: Partial<BlockDraft>) {
    commitBlocks(blocks.map((block, i) => i === index ? { ...block, ...patch } : block))
  }

  function updateBlockStartDate(index: number, value: string) {
    commitBlocks(recalculateFromBlock(blocks, index, dateFromInput(value, today)))
  }

  function updateBlockEndDate(index: number, value: string) {
    const updated = blocks.map((block, i) => i === index ? { ...block, endDate: value } : block)
    commitBlocks(recalculateFromBlock(updated, index + 1))
  }

  function updateBlockWeeks(index: number, value: string) {
    const weeks = normalizedWeeks(Number(value) || 1)
    const updated = blocks.map((block, i) => {
      if (i !== index) return block
      const startDate = dateFromInput(block.startDate, today)
      return {
        ...block,
        endDate: dateInput(blockEndFromWeeks(startDate, weeks)),
      }
    })
    commitBlocks(recalculateFromBlock(updated, index + 1))
  }

  function addBlock() {
    const last = blocks[blocks.length - 1]
    const start = last ? addDays(new Date(last.endDate), 1) : new Date()
    const end = addDays(addWeeks(start, 2), -1)
    commitBlocks([
      ...blocks,
      {
        draftId: draftId('manual', blocks.length, dateInput(start)),
        title: `Block ${blocks.length + 1}`,
        focus: '',
        description: '',
        startDate: dateInput(start),
        endDate: dateInput(end),
      },
    ])
  }

  function addEasyWeek(afterIndex: number) {
    const boundedIndex = Math.max(0, Math.min(afterIndex, blocks.length - 1))
    const reference = blocks[boundedIndex]
    const start = reference ? addDays(dateFromInput(reference.endDate, today), 1) : today
    const easyWeek: BlockDraft = {
      draftId: draftId('easy', blocks.length, dateInput(start)),
      title: copy.easyWeek,
      focus: copy.easyWeekFocus,
      description: copy.easyWeekDescription,
      startDate: dateInput(start),
      endDate: dateInput(blockEndFromWeeks(start, 1)),
    }
    const next = [
      ...blocks.slice(0, boundedIndex + 1),
      easyWeek,
      ...blocks.slice(boundedIndex + 1),
    ]
    commitBlocks(recalculateFromBlock(next, boundedIndex + 1))
  }

  function removeBlock(index: number) {
    const next = blocks.filter((_, i) => i !== index)
    commitBlocks(next.length > 0 ? recalculateFromBlock(next, Math.max(0, index - 1)) : next)
  }

  async function handleSubmit() {
    setIsSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: blockPlanNameWithActualWeeks(name, totalWeeks),
          description: descriptionTracksBlocks
            ? blockPlanDescriptionWithActualWeeks(description, blocks, locale)
            : description,
          startDate: planStartDate,
          endDate: planEndDate,
          status: 'ACTIVE',
          ...(includePlanType ? { planType } : {}),
          blocks: blocks.map((block, index) => ({
            title: block.title,
            focus: block.focus,
            description: block.description,
            startDate: block.startDate,
            endDate: block.endDate,
            order: index + 1,
          })),
        }),
      })

      const body = await response.json()
      if (!response.ok || !body.success) {
        throw new Error(body.error || (isEditing ? copy.updateError : copy.createError))
      }

      if (isEditing) {
        onSaved?.(body.data)
      } else {
        onCreated?.(body.data)
      }
      toast.success(isEditing ? copy.updated : copy.created)
      if (!isEditing && typeof body.teamWorkoutsSkipped === 'number' && body.teamWorkoutsSkipped > 0) {
        toast.success(copy.teamWorkoutsSkipped(body.teamWorkoutsSkipped))
      }
      setOpen(false)
      if ((isEditing && !onSaved) || (!isEditing && !onCreated)) window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isEditing ? copy.updateError : copy.createError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {isEditing ? copy.editPlan : copy.createPlan}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? copy.editPlan : copy.createPlanFor(subjectName)}</DialogTitle>
          <DialogDescription>
            {isEditing ? copy.editDescription : copy.createDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="grid gap-2">
              <Label htmlFor="block-plan-template">{copy.template}</Label>
              <Select value={templateKey} onValueChange={applyTemplate} disabled={isEditing}>
                <SelectTrigger id="block-plan-template">
                  <SelectValue placeholder={isEditing ? copy.existingPlan : copy.chooseTemplate} />
                </SelectTrigger>
                <SelectContent>
                  {isEditing && (
                    <SelectItem value="custom-edit">{copy.existingPlan}</SelectItem>
                  )}
                  {planTemplates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="block-plan-start">{copy.startDate}</Label>
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
                {copy.length}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {blocks.length} {copy.block.toLowerCase()} · {totalWeeks} {copy.weeks}
              </div>
            </div>
          </div>

          {includePlanType && (
            <div className="grid gap-2 md:max-w-[260px]">
              <Label htmlFor="block-plan-type">{copy.planType}</Label>
              <Select value={planType} onValueChange={(value) => setPlanType(value as AthletePlanTypeValue)}>
                <SelectTrigger id="block-plan-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {locale === 'sv' ? option.sv : option.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="block-plan-description">{copy.description}</Label>
            <Textarea
              id="block-plan-description"
              value={description}
              onChange={(event) => {
                setDescriptionTracksBlocks(false)
                setDescription(event.target.value)
              }}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{copy.blocks}</p>
                <p className="text-xs text-muted-foreground">
                  {copy.blocksHelp(resolvedSubjectLabel)}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addBlock} disabled={blocks.length >= 24}>
                <Plus className="mr-2 h-4 w-4" />
                {copy.addBlock}
              </Button>
            </div>

            {blocks.map((block, index) => (
              <div key={block.draftId} className="rounded-lg border p-3">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{copy.block} {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {block.startDate} - {block.endDate}
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="grid w-28 gap-1">
                      <Label className="text-xs">{copy.weeks}</Label>
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
                      className="h-11 px-3"
                      onClick={() => addEasyWeek(index)}
                      disabled={blocks.length >= 24}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.easyWeek}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 px-3 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBlock(index)}
                      disabled={blocks.length <= 1}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {copy.remove}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>{copy.title}</Label>
                    <Input value={block.title} onChange={(event) => updateBlock(index, { title: event.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{copy.focus}</Label>
                    <Input value={block.focus} onChange={(event) => updateBlock(index, { focus: event.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{copy.start}</Label>
                    <Input type="date" value={block.startDate} onChange={(event) => updateBlockStartDate(index, event.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{copy.end}</Label>
                    <Input type="date" value={block.endDate} onChange={(event) => updateBlockEndDate(index, event.target.value)} />
                  </div>
                  <div className="grid gap-1.5 md:col-span-2">
                    <Label>{copy.comment}</Label>
                    <Textarea
                      value={block.description}
                      onChange={(event) => updateBlock(index, { description: event.target.value })}
                      rows={2}
                      placeholder={copy.commentPlaceholder}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            {copy.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim() || blocks.length === 0}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEditing ? copy.saveChanges : copy.createPlan}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
