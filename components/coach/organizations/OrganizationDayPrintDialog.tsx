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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'
import type { DayPrintWorkoutItem } from '@/lib/workout-print/day-pack'
import { useLocale } from 'next-intl'

type Locale = 'en' | 'sv'

const copy = (locale: Locale, en: string, sv: string) => locale === 'sv' ? sv : en

interface Organization {
  id: string
  name: string
}

interface OrganizationDayPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: Organization[]
  basePath: string
  selectedOrganizationId?: string | null
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

export function OrganizationDayPrintDialog({
  open,
  onOpenChange,
  organizations,
  basePath,
  selectedOrganizationId,
}: OrganizationDayPrintDialogProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [date, setDate] = useState(getTodayDateValue)
  const [organizationId, setOrganizationId] = useState('all')
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
    queueMicrotask(() => {
      setOrganizationId(selectedOrganizationId || 'all')
    })
  }, [open, selectedOrganizationId])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const params = new URLSearchParams({ date })
    if (organizationId !== 'all') params.set('organizationId', organizationId)

    const loadItems = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/coach/organizations/day-print?${params.toString()}`, {
          headers: getBusinessScopeHeaders(basePath) || undefined,
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.success) {
          throw new Error(body.error || copy(locale, 'Could not fetch today\'s workouts.', 'Kunde inte hämta dagens pass.'))
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
        toast.error(error instanceof Error ? error.message : copy(locale, 'Could not fetch today\'s workouts.', 'Kunde inte hämta dagens pass.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadItems()

    return () => {
      cancelled = true
    }
  }, [basePath, date, locale, open, organizationId])

  const handleCopiesChange = (id: string, value: string) => {
    const nextValue = Number.parseInt(value, 10)
    const copies = Number.isFinite(nextValue) ? Math.max(0, Math.min(nextValue, 200)) : 0
    setCopiesById((current) => ({ ...current, [id]: copies }))
  }

  const handleOpenPrint = () => {
    const itemsParam = buildItemsParam(copiesById)
    if (!itemsParam) {
      toast.error(copy(locale, 'Select at least one workout to print', 'Välj minst ett pass att skriva ut'))
      return
    }

    const params = new URLSearchParams({ date, items: itemsParam })
    if (organizationId !== 'all') params.set('organizationId', organizationId)
    window.open(`${basePath}/organizations/day-print?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy(locale, 'Today\'s print package', 'Dagens utskriftspaket')}</DialogTitle>
          <DialogDescription>
            {copy(locale, 'Choose a date, filter by organization, and set how many copies to print for each team workout.', 'Välj datum, filtrera på organisation och ange hur många exemplar som ska skrivas ut av varje lagpass.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="space-y-2">
            <Label htmlFor="day-print-date">{copy(locale, 'Date', 'Datum')}</Label>
            <Input
              id="day-print-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{copy(locale, 'Organization', 'Organisation')}</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger>
                <SelectValue placeholder={copy(locale, 'Choose organization', 'Välj organisation')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy(locale, 'All organizations', 'Alla organisationer')}</SelectItem>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {copy(locale, 'Workouts this day', 'Pass denna dag')}
            </div>
            <Badge variant="outline">{totalCopies} {copy(locale, 'prints', 'utskrifter')}</Badge>
          </div>

          <ScrollArea className="h-[360px]">
            {loading ? (
              <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy(locale, 'Fetching today\'s workouts...', 'Hämtar dagens pass...')}
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-48 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {copy(locale, 'No team workouts are scheduled for the selected date.', 'Inga lagpass är schemalagda för valt datum.')}
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
                        {[item.organization?.name, item.team.name, item.scheduleLabel]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.totalAssigned || item.team.memberCount} {copy(locale, 'linked players', 'spelare kopplade')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`copies-${item.id}`} className="text-xs text-muted-foreground">
                        {copy(locale, 'Copies', 'Antal')}
                      </Label>
                      <Input
                        id={`copies-${item.id}`}
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {copy(locale, 'Close', 'Stäng')}
          </Button>
          <Button type="button" onClick={handleOpenPrint} disabled={loading || totalCopies === 0}>
            <Printer className="mr-2 h-4 w-4" />
            {copy(locale, 'Open print view', 'Öppna utskrift')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
