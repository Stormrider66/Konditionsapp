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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Timer, Zap, Dumbbell, ArrowUpDown, Save } from 'lucide-react'
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

export function HockeyTestForm({ clients, teams, onSaved }: HockeyTestFormProps) {
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
