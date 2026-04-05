'use client'

import { useState, useRef } from 'react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Timer, Zap, Dumbbell, ArrowUpDown, Save, Camera, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  teamId: string | null
}

interface Team {
  id: string
  name: string
}

interface HockeyTestFormProps {
  clients: Client[]
  teams: Team[]
  onSaved?: () => void
}

function NumberInput({ label, value, onChange, unit, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9"
        />
        {unit && <span className="text-xs text-muted-foreground shrink-0 w-6">{unit}</span>}
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, open }: { icon: typeof Timer; title: string; open: boolean }) {
  return (
    <div className="flex items-center justify-between w-full py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
    </div>
  )
}

/**
 * Parse Muscle Lab CSV export for power test data.
 * Supports common formats: load-power tables, jump test results.
 */
function parseMusclLabCSV(text: string): Record<string, unknown> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const data: Record<string, unknown> = {}

  // Try to extract jump squat ladder and single leg data
  const jumpSquatLadder: Record<string, number> = {}
  const singleLegLeft: Record<string, number> = {}
  const singleLegRight: Record<string, number> = {}

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim())
    if (parts.length < 2) continue

    const label = parts[0].toLowerCase()
    const values = parts.slice(1).map((v) => parseFloat(v)).filter((v) => !isNaN(v))

    // Detect jump squat rows (e.g., "Squat Jump, 20, 1200" or "SJ 20kg, 1200")
    if ((label.includes('squat') || label.includes('sj')) && !label.includes('single') && !label.includes('one')) {
      const kgMatch = label.match(/(\d+)\s*kg/i)
      if (kgMatch && values.length > 0) {
        jumpSquatLadder[kgMatch[1]] = Math.round(values[0])
      } else if (values.length >= 2) {
        // Format: label, kg, watts
        jumpSquatLadder[String(Math.round(values[0]))] = Math.round(values[1])
      }
    }

    // Detect single leg rows
    if (label.includes('single') || label.includes('one leg') || label.includes('enbens')) {
      const isLeft = label.includes('left') || label.includes('vänster') || label.includes('v.')
      const isRight = label.includes('right') || label.includes('höger') || label.includes('h.')
      const kgMatch = label.match(/(\d+)\s*kg/i)
      const target = isLeft ? singleLegLeft : isRight ? singleLegRight : singleLegLeft
      if (kgMatch && values.length > 0) {
        target[kgMatch[1]] = Math.round(values[0])
      } else if (values.length >= 2) {
        target[String(Math.round(values[0]))] = Math.round(values[1])
      }
    }

    // Detect grip strength
    if (label.includes('grip') || label.includes('grepp')) {
      if (label.includes('left') || label.includes('vänster') || label.includes('v.')) {
        data.gripStrengthLeft = values[0]
      } else if (label.includes('right') || label.includes('höger') || label.includes('h.')) {
        data.gripStrengthRight = values[0]
      } else if (values.length >= 2) {
        data.gripStrengthLeft = values[0]
        data.gripStrengthRight = values[1]
      }
    }

    // Detect standing long jump
    if ((label.includes('standing') || label.includes('stående')) && (label.includes('jump') || label.includes('hopp')) && !label.includes('3')) {
      data.standingLongJump = values[0]
    }

    // Detect 3-jump
    if (label.includes('3-') || label.includes('triple') || label.includes('trehopp')) {
      if (label.includes('left') || label.includes('vänster')) {
        data.threeJumpLeft = values[0]
      } else if (label.includes('right') || label.includes('höger')) {
        data.threeJumpRight = values[0]
      }
    }
  }

  if (Object.keys(jumpSquatLadder).length > 0) data.jumpSquatLadder = jumpSquatLadder
  if (Object.keys(singleLegLeft).length > 0) data.singleLegJumpLeft = singleLegLeft
  if (Object.keys(singleLegRight).length > 0) data.singleLegJumpRight = singleLegRight

  return data
}

export function HockeyTestForm({ clients, teams, onSaved }: HockeyTestFormProps) {
  const scanInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState('')
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Section open states
  const [iceOpen, setIceOpen] = useState(true)
  const [powerOpen, setPowerOpen] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)

  // On-ice values
  const [agility505Left, setAgility505Left] = useState('')
  const [agility505Right, setAgility505Right] = useState('')
  const [sprint10m, setSprint10m] = useState('')
  const [sprint20mFly, setSprint20mFly] = useState('')
  const [sprint30mFly, setSprint30mFly] = useState('')
  const [endurance7x40, setEndurance7x40] = useState(['', '', '', '', '', '', ''])

  // Power values
  const [jumpSquat, setJumpSquat] = useState<Record<string, string>>({ '20': '', '40': '', '60': '', '80': '', '100': '' })
  const [singleLegLeft, setSingleLegLeft] = useState<Record<string, string>>({ '30': '', '35': '', '40': '', '45': '', '50': '', '55': '' })
  const [singleLegRight, setSingleLegRight] = useState<Record<string, string>>({ '30': '', '35': '', '40': '', '45': '', '50': '', '55': '' })
  const [gripLeft, setGripLeft] = useState('')
  const [gripRight, setGripRight] = useState('')

  // Jump values
  const [standingLong, setStandingLong] = useState('')
  const [threeJumpLeft, setThreeJumpLeft] = useState('')
  const [threeJumpRight, setThreeJumpRight] = useState('')

  const selectedClient = clients.find((c) => c.id === clientId)

  // Apply scanned/imported data to form
  const applyData = (data: Record<string, unknown>) => {
    if (data.agility505Left) setAgility505Left(String(data.agility505Left))
    if (data.agility505Right) setAgility505Right(String(data.agility505Right))
    if (data.sprint10m) setSprint10m(String(data.sprint10m))
    if (data.sprint20mFly) setSprint20mFly(String(data.sprint20mFly))
    if (data.sprint30mFly) setSprint30mFly(String(data.sprint30mFly))
    if (Array.isArray(data.endurance7x40)) {
      setEndurance7x40(data.endurance7x40.map(String).concat(Array(7).fill('')).slice(0, 7))
    }
    if (data.jumpSquatLadder && typeof data.jumpSquatLadder === 'object') {
      const jsl = data.jumpSquatLadder as Record<string, number>
      setJumpSquat((prev) => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(jsl)) next[k] = String(v)
        return next
      })
      setPowerOpen(true)
    }
    if (data.singleLegJumpLeft && typeof data.singleLegJumpLeft === 'object') {
      const sl = data.singleLegJumpLeft as Record<string, number>
      setSingleLegLeft((prev) => { const n = { ...prev }; for (const [k, v] of Object.entries(sl)) n[k] = String(v); return n })
      setPowerOpen(true)
    }
    if (data.singleLegJumpRight && typeof data.singleLegJumpRight === 'object') {
      const sr = data.singleLegJumpRight as Record<string, number>
      setSingleLegRight((prev) => { const n = { ...prev }; for (const [k, v] of Object.entries(sr)) n[k] = String(v); return n })
      setPowerOpen(true)
    }
    if (data.gripStrengthLeft) { setGripLeft(String(data.gripStrengthLeft)); setPowerOpen(true) }
    if (data.gripStrengthRight) { setGripRight(String(data.gripStrengthRight)); setPowerOpen(true) }
    if (data.standingLongJump) { setStandingLong(String(data.standingLongJump)); setJumpOpen(true) }
    if (data.threeJumpLeft) { setThreeJumpLeft(String(data.threeJumpLeft)); setJumpOpen(true) }
    if (data.threeJumpRight) { setThreeJumpRight(String(data.threeJumpRight)); setJumpOpen(true) }
    if (data.testDate) setTestDate(String(data.testDate))
    // Auto-select athlete by name if found
    if (data.athleteName) {
      const match = clients.find((c) => c.name.toLowerCase().includes(String(data.athleteName).toLowerCase()))
      if (match) setClientId(match.id)
    }
    setIceOpen(true)
  }

  // Photo scan handler
  const handleScan = async (file: File) => {
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/coach/hockey-tests/scan', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Scan misslyckades')
      }
      const data = await res.json()
      applyData(data)
      const confidence = data.confidence ? `${Math.round(data.confidence * 100)}%` : ''
      toast.success(`Testdata extraherad ${confidence ? `(${confidence} säkerhet)` : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte läsa bilden')
    } finally {
      setScanning(false)
    }
  }

  // CSV import handler (Muscle Lab)
  const handleCSVImport = async (file: File) => {
    setScanning(true)
    try {
      const text = await file.text()
      const data = parseMusclLabCSV(text)
      applyData(data)
      toast.success('Muscle Lab-data importerad')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte läsa CSV-filen')
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    if (!clientId || !testDate) {
      toast.error('Välj atlet och datum')
      return
    }

    setSaving(true)
    try {
      const toNum = (v: string) => v ? parseFloat(v) : undefined
      const toJson = (obj: Record<string, string>) => {
        const result: Record<string, number> = {}
        for (const [k, v] of Object.entries(obj)) {
          if (v) result[k] = parseFloat(v)
        }
        return Object.keys(result).length > 0 ? result : undefined
      }

      const enduranceArr = endurance7x40.map((v) => parseFloat(v)).filter((v) => !isNaN(v))

      const res = await fetch('/api/coach/hockey-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          teamId: selectedClient?.teamId || undefined,
          testDate,
          notes: notes || undefined,
          agility505Left: toNum(agility505Left),
          agility505Right: toNum(agility505Right),
          sprint10m: toNum(sprint10m),
          sprint20mFly: toNum(sprint20mFly),
          sprint30mFly: toNum(sprint30mFly),
          endurance7x40: enduranceArr.length > 0 ? enduranceArr : undefined,
          jumpSquatLadder: toJson(jumpSquat),
          singleLegJumpLeft: toJson(singleLegLeft),
          singleLegJumpRight: toJson(singleLegRight),
          gripStrengthLeft: toNum(gripLeft),
          gripStrengthRight: toNum(gripRight),
          standingLongJump: toNum(standingLong),
          threeJumpLeft: toNum(threeJumpLeft),
          threeJumpRight: toNum(threeJumpRight),
        }),
      })

      if (res.ok) {
        toast.success('Testresultat sparat')
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
      {/* Scan / Import */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = '' }} />
            <input ref={csvInputRef} type="file" accept=".csv,.txt,.tsv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCSVImport(f); e.target.value = '' }} />
            <Button variant="outline" className="flex-1" onClick={() => scanInputRef.current?.click()} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
              Skanna testprotokoll
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => csvInputRef.current?.click()} disabled={scanning}>
              <Upload className="h-4 w-4 mr-2" />
              Importera Muscle Lab
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Fotografera ett testprotokoll eller importera CSV-export från Muscle Lab
          </p>
        </CardContent>
      </Card>

      {/* Athlete & date */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Atlet</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj spelare..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => {
                    const teamClients = clients.filter((c) => c.teamId === team.id)
                    if (teamClients.length === 0) return null
                    return (
                      <div key={team.id}>
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{team.name}</div>
                        {teamClients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </div>
                    )
                  })}
                  {clients.filter((c) => !c.teamId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Testdatum</Label>
              <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* On-Ice Tests */}
      <Card>
        <Collapsible open={iceOpen} onOpenChange={setIceOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={Timer} title="Istester" open={iceOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label="Agility 5-10-5 Vänster" value={agility505Left} onChange={setAgility505Left} unit="s" placeholder="6.50" />
                <NumberInput label="Agility 5-10-5 Höger" value={agility505Right} onChange={setAgility505Right} unit="s" placeholder="6.40" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <NumberInput label="Sprint 10m" value={sprint10m} onChange={setSprint10m} unit="s" placeholder="1.80" />
                <NumberInput label="Sprint 20m (fly)" value={sprint20mFly} onChange={setSprint20mFly} unit="s" placeholder="2.50" />
                <NumberInput label="Sprint 30m (fly)" value={sprint30mFly} onChange={setSprint30mFly} unit="s" placeholder="3.60" />
              </div>
              <div>
                <Label className="text-xs mb-2 block">7x40m Uthållighet (10s vila)</Label>
                <div className="grid grid-cols-7 gap-1">
                  {endurance7x40.map((v, i) => (
                    <div key={i} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">#{i + 1}</span>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={v}
                        onChange={(e) => {
                          const arr = [...endurance7x40]
                          arr[i] = e.target.value
                          setEndurance7x40(arr)
                        }}
                        placeholder="5.5"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Power Tests */}
      <Card>
        <Collapsible open={powerOpen} onOpenChange={setPowerOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={Zap} title="Krafttester" open={powerOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div>
                <Label className="text-xs mb-2 block">Knäböjshopp stege (Watt)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.keys(jumpSquat).map((load) => (
                    <div key={load} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">{load} kg</span>
                      <Input
                        type="number"
                        value={jumpSquat[load]}
                        onChange={(e) => setJumpSquat({ ...jumpSquat, [load]: e.target.value })}
                        placeholder="W"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Enbenshopp Smith Vänster (Watt)</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Object.keys(singleLegLeft).map((load) => (
                    <div key={load} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">{load} kg</span>
                      <Input
                        type="number"
                        value={singleLegLeft[load]}
                        onChange={(e) => setSingleLegLeft({ ...singleLegLeft, [load]: e.target.value })}
                        placeholder="W"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Enbenshopp Smith Höger (Watt)</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Object.keys(singleLegRight).map((load) => (
                    <div key={load} className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground text-center block">{load} kg</span>
                      <Input
                        type="number"
                        value={singleLegRight[load]}
                        onChange={(e) => setSingleLegRight({ ...singleLegRight, [load]: e.target.value })}
                        placeholder="W"
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label="Greppstyrka Vänster" value={gripLeft} onChange={setGripLeft} unit="kg" placeholder="55" />
                <NumberInput label="Greppstyrka Höger" value={gripRight} onChange={setGripRight} unit="kg" placeholder="58" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Jump Tests */}
      <Card>
        <Collapsible open={jumpOpen} onOpenChange={setJumpOpen}>
          <CollapsibleTrigger className="w-full px-4">
            <SectionHeader icon={ArrowUpDown} title="Hopptester" open={jumpOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <NumberInput label="Stående längdhopp" value={standingLong} onChange={setStandingLong} unit="cm" placeholder="240" />
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label="3-hopp Vänster ben" value={threeJumpLeft} onChange={setThreeJumpLeft} unit="cm" placeholder="680" />
                <NumberInput label="3-hopp Höger ben" value={threeJumpRight} onChange={setThreeJumpRight} unit="cm" placeholder="700" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-xs">Anteckningar (valfritt)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" placeholder="Kommentarer om testet..." />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || !clientId} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Sparar...' : 'Spara testresultat'}
      </Button>
    </div>
  )
}
