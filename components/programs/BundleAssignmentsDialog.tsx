'use client'

// Coach entry point for Option A program bundling: pick an athlete + date
// range, preview the loose studio assignments in that range, and create a
// TrainingProgram that links them (no copies — see
// app/api/programs/from-assignments).
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/i18n/client'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, PackagePlus } from 'lucide-react'

interface BundleClient {
  id: string
  name: string
}

interface PreviewAssignment {
  id: string
  kind: 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'
  name: string
  date: string
  status: string
}

interface BundleAssignmentsDialogProps {
  clients: BundleClient[]
  basePath: string
  disabled?: boolean
}

const KIND_BADGE_CLASSES: Record<PreviewAssignment['kind'], string> = {
  STRENGTH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  CARDIO: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  HYBRID: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  AGILITY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
}

export function BundleAssignmentsDialog({ clients, basePath, disabled }: BundleAssignmentsDialogProps) {
  const t = useTranslations('coach.pages.programs.bundle')
  const router = useRouter()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<PreviewAssignment[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const previewRequestId = useRef(0)

  const rangeValid = Boolean(clientId && startDate && endDate && startDate <= endDate)

  // Called from the field handlers with the just-updated values (state updates
  // are async, so we can't read them back immediately).
  const loadPreview = async (cid: string, start: string, end: string) => {
    const requestId = ++previewRequestId.current
    if (!cid || !start || !end || start > end) {
      setPreview(null)
      return
    }
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams({ clientId: cid, startDate: start, endDate: end })
      const res = await fetch(`/api/programs/from-assignments?${params}`)
      const json = await res.json()
      if (requestId !== previewRequestId.current) return
      setPreview(res.ok && json.success ? json.data.assignments : null)
    } catch {
      if (requestId === previewRequestId.current) setPreview(null)
    } finally {
      if (requestId === previewRequestId.current) setPreviewLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!rangeValid || !name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/programs/from-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, name: name.trim(), startDate, endDate }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Request failed')
      }
      toast({
        title: t('created'),
        description: t('createdDescription', {
          count: json.data.linked.total,
          name: json.data.program.name,
        }),
      })
      setOpen(false)
      router.push(`${basePath}/coach/programs/${json.data.program.id}`)
      router.refresh()
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" disabled={disabled} className="w-full sm:w-auto">
          <PackagePlus className="mr-2 h-5 w-5" />
          {t('button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bundle-athlete">{t('athlete')}</Label>
            <Select
              value={clientId}
              onValueChange={(value) => {
                setClientId(value)
                void loadPreview(value, startDate, endDate)
              }}
            >
              <SelectTrigger id="bundle-athlete">
                <SelectValue placeholder={t('selectAthlete')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bundle-start">{t('startDate')}</Label>
              <Input
                id="bundle-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  void loadPreview(clientId, e.target.value, endDate)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bundle-end">{t('endDate')}</Label>
              <Input
                id="bundle-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  void loadPreview(clientId, startDate, e.target.value)
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bundle-name">{t('name')}</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={200}
            />
          </div>

          {rangeValid && (
            <div className="rounded-lg border bg-slate-50 dark:bg-slate-900/40 p-3">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('previewLoading')}
                </div>
              ) : !preview || preview.length === 0 ? (
                <p className="text-sm text-slate-500">{t('previewEmpty')}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('previewCount', { count: preview.length })}</p>
                  <ul className="max-h-40 overflow-y-auto space-y-1">
                    {preview.map((a) => (
                      <li key={`${a.kind}-${a.id}`} className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary" className={KIND_BADGE_CLASSES[a.kind]}>
                          {t(`kind.${a.kind}`)}
                        </Badge>
                        <span className="truncate">{a.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-slate-500">
                          {new Date(a.date).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!rangeValid || !name.trim() || submitting || (preview?.length ?? 0) === 0}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? t('creating') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
