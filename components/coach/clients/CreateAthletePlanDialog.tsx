'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, addWeeks, format } from 'date-fns'
import { Loader2, Plus } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import type { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'

interface CreateAthletePlanDialogProps {
  clientId: string
  clientName: string
  onCreated: (plan: AthletePlanSummary) => void
  trigger?: ReactNode
}

interface BlockDraft {
  title: string
  focus: string
  description: string
  startDate: string
  endDate: string
}

function dateInput(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function defaultBlocks(startDate: Date): BlockDraft[] {
  return [
    {
      title: 'Base',
      focus: 'Bygg tolerans, teknik och arbetskapacitet',
      description: '',
      startDate: dateInput(startDate),
      endDate: dateInput(addDays(addWeeks(startDate, 3), -1)),
    },
    {
      title: 'Maxstyrka',
      focus: 'Tung styrka och tydlig progression',
      description: '',
      startDate: dateInput(addWeeks(startDate, 3)),
      endDate: dateInput(addDays(addWeeks(startDate, 6), -1)),
    },
    {
      title: 'Power',
      focus: 'Explosivitet, hastighet och överföring till isen',
      description: '',
      startDate: dateInput(addWeeks(startDate, 6)),
      endDate: dateInput(addDays(addWeeks(startDate, 9), -1)),
    },
  ]
}

export function CreateAthletePlanDialog({
  clientId,
  clientName,
  onCreated,
  trigger,
}: CreateAthletePlanDialogProps) {
  const today = useMemo(() => new Date(), [])
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('9 veckor styrkeblock')
  const [description, setDescription] = useState('3 veckor base, 3 veckor maxstyrka, 3 veckor power.')
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => defaultBlocks(today))

  const planStartDate = blocks[0]?.startDate ?? dateInput(today)
  const planEndDate = blocks[blocks.length - 1]?.endDate ?? dateInput(addDays(addWeeks(today, 9), -1))

  function updateBlock(index: number, patch: Partial<BlockDraft>) {
    setBlocks((current) => current.map((block, i) => i === index ? { ...block, ...patch } : block))
  }

  async function handleSubmit() {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/athlete-plans`, {
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

      onCreated(body.data)
      toast.success('Blockplan skapad')
      setOpen(false)
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skapa blockplan för {clientName}</DialogTitle>
          <DialogDescription>
            Lägg planen först. Workouts kan fyllas på i kalendern senare.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="athlete-plan-name">Plan</Label>
            <Input id="athlete-plan-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="athlete-plan-description">Beskrivning</Label>
            <Textarea
              id="athlete-plan-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            {blocks.map((block, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Block {index + 1}</p>
                  <span className="text-xs text-muted-foreground">{block.startDate} - {block.endDate}</span>
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
                    <Input type="date" value={block.startDate} onChange={(event) => updateBlock(index, { startDate: event.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Slut</Label>
                    <Input type="date" value={block.endDate} onChange={(event) => updateBlock(index, { endDate: event.target.value })} />
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
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Skapa blockplan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
