'use client'

import { useState } from 'react'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Save, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'

interface Metric {
  id: string
  name: string
  unit: string
  type: 'number' | 'time' | 'array' | 'ladder'
  category: 'ice' | 'power' | 'jump' | 'endurance' | 'flexibility' | 'other'
  required: boolean
  arraySize?: number
  ladderLoads?: number[]
}

type Locale = 'en' | 'sv'

const copy = (locale: Locale, en: string, sv: string) => locale === 'sv' ? sv : en

const getCategories = (locale: Locale) => [
  { value: 'ice', label: copy(locale, 'Ice', 'Is') },
  { value: 'power', label: copy(locale, 'Power', 'Kraft') },
  { value: 'jump', label: copy(locale, 'Jump', 'Hopp') },
  { value: 'endurance', label: copy(locale, 'Endurance', 'Uthållighet') },
  { value: 'flexibility', label: copy(locale, 'Flexibility', 'Rörlighet') },
  { value: 'other', label: copy(locale, 'Other', 'Övrigt') },
]

const getMetricTypes = (locale: Locale) => [
  { value: 'number', label: copy(locale, 'Number (e.g. 6.50)', 'Tal (t.ex. 6.50)') },
  { value: 'time', label: copy(locale, 'Time (seconds)', 'Tid (sekunder)') },
  { value: 'array', label: copy(locale, 'Series (e.g. 7x40m)', 'Serie (t.ex. 7x40m)') },
  { value: 'ladder', label: copy(locale, 'Ladder (kg to watts)', 'Stege (kg till watt)') },
]

const UNITS = ['s', 'kg', 'cm', 'W', 'bpm', 'ml/kg/min', 'reps', 'm', '%', '']

const labelClassName = 'text-sm font-medium text-zinc-700 dark:text-zinc-200'
const fieldClassName =
  'border-zinc-200 bg-white text-zinc-950 shadow-sm placeholder:text-zinc-400 focus-visible:ring-blue-500/30 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50 dark:placeholder:text-zinc-600'

interface ProtocolBuilderProps {
  onSaved?: () => void
}

export function ProtocolBuilder({ onSaved }: ProtocolBuilderProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const categories = getCategories(locale)
  const metricTypes = getMetricTypes(locale)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sportType, setSportType] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [metrics, setMetrics] = useState<Metric[]>([])

  // New metric form
  const [mName, setMName] = useState('')
  const [mUnit, setMUnit] = useState('s')
  const [mType, setMType] = useState<Metric['type']>('number')
  const [mCategory, setMCategory] = useState<Metric['category']>('other')
  const [mArraySize, setMArraySize] = useState('7')
  const [mLadderLoads, setMLadderLoads] = useState('20,40,60,80,100')

  const addMetric = () => {
    if (!mName.trim()) return
    const metric: Metric = {
      id: crypto.randomUUID(),
      name: mName.trim(),
      unit: mUnit,
      type: mType,
      category: mCategory,
      required: false,
      ...(mType === 'array' ? { arraySize: parseInt(mArraySize) || 7 } : {}),
      ...(mType === 'ladder' ? { ladderLoads: mLadderLoads.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) } : {}),
    }
    setMetrics([...metrics, metric])
    setMName('')
  }

  const removeMetric = (id: string) => {
    setMetrics(metrics.filter((m) => m.id !== id))
  }

  const handleSave = async () => {
    if (!name.trim() || metrics.length === 0) {
      toast.error(copy(locale, 'Enter a name and at least one measurement', 'Ange namn och minst en mätning'))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/coach/test-protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          sportType: sportType || undefined,
          metrics,
          isPublished,
        }),
      })
      if (res.ok) {
        toast.success(copy(locale, 'Test protocol saved', 'Testprotokoll sparat'))
        setName('')
        setDescription('')
        setMetrics([])
        onSaved?.()
      } else {
        const err = await res.json()
        toast.error(err.error || copy(locale, 'Could not save', 'Kunde inte spara'))
      }
    } catch {
      toast.error(copy(locale, 'Network error', 'Nätverksfel'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Protocol info */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-5 border-b border-zinc-200 pb-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'New test protocol', 'Nytt testprotokoll')}</h2>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className={labelClassName}>{copy(locale, 'Name', 'Namn')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={copy(locale, 'e.g. Preseason test 2026', 't.ex. Försäsongstest 2026')} className={fieldClassName} />
          </div>
          <div className="space-y-1">
            <Label className={labelClassName}>{copy(locale, 'Description (optional)', 'Beskrivning (valfritt)')}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={copy(locale, 'Describe the test battery...', 'Beskriv testbatteriet...')} className={fieldClassName} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className={labelClassName}>{copy(locale, 'Sport (optional)', 'Sport (valfritt)')}</Label>
              <Input value={sportType} onChange={(e) => setSportType(e.target.value)} placeholder={copy(locale, 'e.g. Ice hockey', 't.ex. Ishockey')} className={fieldClassName} />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="published" className="text-xs text-zinc-600 dark:text-zinc-300">{copy(locale, 'Share with colleagues', 'Dela med kollegor')}</Label>
            </div>
          </div>
        </div>
      </RolePanel>

      {/* Add metrics */}
      <RolePanel className="p-5 sm:p-6">
        <div className="mb-5 border-b border-zinc-200 pb-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Measurements', 'Mätningar')} ({metrics.length})</h2>
        </div>
        <div className="space-y-3">
          {/* Existing metrics */}
          {metrics.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/80 p-2 dark:border-white/10 dark:bg-white/[0.03]">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{m.name}</span>
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {m.unit} · {metricTypes.find((t) => t.value === m.type)?.label}
                  {m.type === 'array' && ` (${m.arraySize} ${copy(locale, 'items', 'st')})`}
                  {m.type === 'ladder' && ` (${m.ladderLoads?.join(', ')} kg)`}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeMetric(m.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add new metric form */}
          <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-white/10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder={copy(locale, 'Name, e.g. 40m sprint', 'Namn, t.ex. Sprint 40m')}
                onKeyDown={(e) => e.key === 'Enter' && addMetric()} className={`col-span-2 ${fieldClassName}`} />
              <Select value={mUnit} onValueChange={setMUnit}>
                <SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u || 'none'} value={u || 'none'}>{u || copy(locale, '(none)', '(ingen)')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={mCategory} onValueChange={(v) => setMCategory(v as Metric['category'])}>
                <SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={mType} onValueChange={(v) => setMType(v as Metric['type'])}>
                <SelectTrigger className={`flex-1 ${fieldClassName}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metricTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {mType === 'array' && (
                <Input value={mArraySize} onChange={(e) => setMArraySize(e.target.value)} placeholder={copy(locale, 'Count', 'Antal')} className={`w-20 ${fieldClassName}`} type="number" />
              )}
              {mType === 'ladder' && (
                <Input value={mLadderLoads} onChange={(e) => setMLadderLoads(e.target.value)} placeholder="20,40,60,80" className={`flex-1 ${fieldClassName}`} />
              )}
              <Button onClick={addMetric} disabled={!mName.trim()} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </RolePanel>

      <Button onClick={handleSave} disabled={saving || !name.trim() || metrics.length === 0} className="w-full bg-blue-600 text-white hover:bg-blue-700" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {saving ? copy(locale, 'Saving...', 'Sparar...') : copy(locale, 'Save protocol', 'Spara protokoll')}
      </Button>
    </div>
  )
}
