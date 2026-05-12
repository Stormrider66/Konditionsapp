'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Loader2, Printer } from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'
import type { DayPrintWorkoutItem } from '@/lib/workout-print/day-pack'

interface TeamDayPrintButtonProps {
  teamId: string
  teamName: string
  coachBasePath: string
}

function getTodayDateValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function buildItemsParam(copiesById: Record<string, number>) {
  return Object.entries(copiesById)
    .filter(([, copies]) => copies > 0)
    .map(([id, copies]) => `${id}:${copies}`)
    .join(',')
}

export function TeamDayPrintButton({ teamId, teamName, coachBasePath }: TeamDayPrintButtonProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(getTodayDateValue)
  const [items, setItems] = useState<DayPrintWorkoutItem[]>([])
  const [copiesById, setCopiesById] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  const selectedItems = useMemo(
    () => items.filter((item) => (copiesById[item.id] || 0) > 0),
    [items, copiesById]
  )
  const totalCopies = selectedItems.reduce((sum, item) => sum + (copiesById[item.id] || 0), 0)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const params = new URLSearchParams({ date, teamId })

    const loadItems = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/coach/organizations/day-print?${params.toString()}`, {
          headers: getBusinessScopeHeaders(coachBasePath) || undefined,
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.success) {
          throw new Error(body.error || 'Kunde inte hämta lagets pass.')
        }

        const data = body.data as DayPrintWorkoutItem[]
        if (cancelled) return
        setItems(data)
        setCopiesById(
          data.reduce<Record<string, number>>((acc, item) => {
            acc[item.id] = item.defaultCopies
            return acc
          }, {})
        )
      } catch (error) {
        if (cancelled) return
        setItems([])
        setCopiesById({})
        toast.error(error instanceof Error ? error.message : 'Kunde inte hämta lagets pass.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadItems()

    return () => {
      cancelled = true
    }
  }, [coachBasePath, date, open, teamId])

  const handleCopiesChange = (id: string, value: string) => {
    const nextValue = Number.parseInt(value, 10)
    const copies = Number.isFinite(nextValue) ? Math.max(0, Math.min(nextValue, 200)) : 0
    setCopiesById((current) => ({ ...current, [id]: copies }))
  }

  const handleOpenPrint = () => {
    const itemsParam = buildItemsParam(copiesById)
    if (!itemsParam) {
      toast.error('Välj minst ett pass att skriva ut')
      return
    }

    const params = new URLSearchParams({ date, teamId, items: itemsParam })
    window.open(`${coachBasePath}/organizations/day-print?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Printer className="mr-2 h-4 w-4" />
        Skriv ut lagpass
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Skriv ut lagpass</DialogTitle>
            <DialogDescription>
              Välj datum och antal exemplar för {teamName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="team-day-print-date">Datum</Label>
            <Input
              id="team-day-print-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="max-w-[220px]"
            />
          </div>

          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {teamName}
              </div>
              <Badge variant="outline">{totalCopies} utskrifter</Badge>
            </div>

            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Hämtar lagets pass...
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Inga lagpass är schemalagda för valt datum.
                </div>
              ) : (
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_112px] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.workoutTitle}</p>
                          <Badge variant="secondary">{item.workout.kindLabel}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {[item.organization?.name, item.scheduleLabel].filter(Boolean).join(' · ')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.totalAssigned || item.team.memberCount} spelare kopplade
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`team-copies-${item.id}`} className="text-xs text-muted-foreground">
                          Antal
                        </Label>
                        <Input
                          id={`team-copies-${item.id}`}
                          type="number"
                          min={0}
                          max={200}
                          value={copiesById[item.id] ?? 0}
                          onChange={(event) => handleCopiesChange(item.id, event.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Stäng
            </Button>
            <Button type="button" onClick={handleOpenPrint} disabled={loading || totalCopies === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Öppna utskrift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
