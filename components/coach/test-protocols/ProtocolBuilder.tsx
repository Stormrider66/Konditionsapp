'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const CATEGORIES = [
  { value: 'ice', label: 'Is' },
  { value: 'power', label: 'Kraft' },
  { value: 'jump', label: 'Hopp' },
  { value: 'endurance', label: 'Uthållighet' },
  { value: 'flexibility', label: 'Rörlighet' },
  { value: 'other', label: 'Övrigt' },
]

const METRIC_TYPES = [
  { value: 'number', label: 'Tal (t.ex. 6.50)' },
  { value: 'time', label: 'Tid (sekunder)' },
  { value: 'array', label: 'Serie (t.ex. 7x40m)' },
  { value: 'ladder', label: 'Stege (kg → watt)' },
]

const UNITS = ['s', 'kg', 'cm', 'W', 'bpm', 'ml/kg/min', 'reps', 'm', '%', '']

interface ProtocolBuilderProps {
  onSaved?: () => void
}

export function ProtocolBuilder({ onSaved }: ProtocolBuilderProps) {
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
      toast.error('Ange namn och minst en mätning')
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
        toast.success('Testprotokoll sparat')
        setName('')
        setDescription('')
        setMetrics([])
        onSaved?.()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Kunde inte spara')
      }
    } catch {
      toast.error('Nätverksfel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Protocol info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nytt testprotokoll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Namn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Försäsongstest 2026" />
          </div>
          <div className="space-y-1">
            <Label>Beskrivning (valfritt)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Beskriv testbatteriet..." />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label>Sport (valfritt)</Label>
              <Input value={sportType} onChange={(e) => setSportType(e.target.value)} placeholder="t.ex. Ishockey" />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="published" className="text-xs">Dela med kollegor</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mätningar ({metrics.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Existing metrics */}
          {metrics.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{m.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {m.unit} · {METRIC_TYPES.find((t) => t.value === m.type)?.label}
                  {m.type === 'array' && ` (${m.arraySize}st)`}
                  {m.type === 'ladder' && ` (${m.ladderLoads?.join(', ')} kg)`}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeMetric(m.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add new metric form */}
          <div className="border-t pt-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Namn, t.ex. Sprint 40m"
                onKeyDown={(e) => e.key === 'Enter' && addMetric()} className="col-span-2" />
              <Select value={mUnit} onValueChange={setMUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u || 'none'} value={u || 'none'}>{u || '(ingen)'}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={mCategory} onValueChange={(v) => setMCategory(v as Metric['category'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={mType} onValueChange={(v) => setMType(v as Metric['type'])}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {mType === 'array' && (
                <Input value={mArraySize} onChange={(e) => setMArraySize(e.target.value)} placeholder="Antal" className="w-20" type="number" />
              )}
              {mType === 'ladder' && (
                <Input value={mLadderLoads} onChange={(e) => setMLadderLoads(e.target.value)} placeholder="20,40,60,80" className="flex-1" />
              )}
              <Button onClick={addMetric} disabled={!mName.trim()} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || !name.trim() || metrics.length === 0} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Sparar...' : 'Spara protokoll'}
      </Button>
    </div>
  )
}
