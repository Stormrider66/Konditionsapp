'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IceHockeyRink, type DrillStructure } from './IceHockeyRink'
import { DrillTemplateLibrary } from './DrillTemplateLibrary'
import type { DrillTemplate } from '@/lib/drills/templates'
import {
  Plus,
  Trash2,
  Clock,
  Save,
  ChevronDown,
  ChevronUp,
  Calendar,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────

interface PracticeBlock {
  id: string
  type: 'drill' | 'custom'
  focus: PracticeBlockFocus
  title: string
  description?: string
  durationMinutes: number
  workRest?: string
  coachingNotes?: string
  structure?: DrillStructure
  templateId?: string
}

interface Team {
  id: string
  name: string
}

interface SavedDrill {
  id: string
  title: string
  description: string | null
  structure: DrillStructure
}

interface PracticePlannerProps {
  teams: Team[]
}

let _blockId = 0
function nextBlockId() {
  _blockId++
  return `block-${Date.now()}-${_blockId}`
}

const DEFAULT_BLOCKS: PracticeBlock[] = [
  { id: 'default-warmup', type: 'custom', focus: 'warmup', title: 'Uppvärmning', durationMinutes: 10 },
]

type PracticeBlockFocus =
  | 'warmup'
  | 'skill'
  | 'skating'
  | 'tactical'
  | 'specialTeams'
  | 'smallArea'
  | 'conditioning'
  | 'game'
  | 'cooldown'

const BLOCK_FOCUS_OPTIONS: { value: PracticeBlockFocus; label: string }[] = [
  { value: 'warmup', label: 'Uppvärmning' },
  { value: 'skill', label: 'Teknik' },
  { value: 'skating', label: 'Skridsko' },
  { value: 'tactical', label: 'Taktik' },
  { value: 'specialTeams', label: 'Special teams' },
  { value: 'smallArea', label: 'Smålagsspel' },
  { value: 'conditioning', label: 'Fys på is' },
  { value: 'game', label: 'Spel' },
  { value: 'cooldown', label: 'Nedvarvning' },
]

const PRACTICE_PHASE_OPTIONS = [
  'Försäsong',
  'Säsong',
  'Matchförberedande',
  'Återhämtning',
  'Camp',
]

const INTENSITY_OPTIONS = [
  'Låg',
  'Måttlig',
  'Hög',
  'Matchlik',
]

function getTemplateFocus(category: DrillTemplate['category']): PracticeBlockFocus {
  if (category === 'warmup') return 'warmup'
  if (category === 'shooting' || category === 'passing' || category === 'rush') return 'skill'
  if (category === 'powerplay' || category === 'penaltykill') return 'specialTeams'
  return 'tactical'
}

function focusLabel(focus: PracticeBlockFocus) {
  return BLOCK_FOCUS_OPTIONS.find((option) => option.value === focus)?.label ?? focus
}

// ─── Component ──────────────────────────────────────────────────────────

export function PracticePlanner({ teams }: PracticePlannerProps) {
  const [blocks, setBlocks] = useState<PracticeBlock[]>(DEFAULT_BLOCKS)
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('17:00')
  const [practicePhase, setPracticePhase] = useState('Säsong')
  const [practiceIntensity, setPracticeIntensity] = useState('Måttlig')
  const [lineGroups, setLineGroups] = useState('')
  const [goalieNotes, setGoalieNotes] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showTemplatePickerFor, setShowTemplatePickerFor] = useState<number | null>(null)
  const [savedDrills, setSavedDrills] = useState<SavedDrill[]>([])
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)

  // Fetch saved drills
  useEffect(() => {
    const fetchDrills = async () => {
      try {
        const res = await fetch('/api/coach/drills?shared=true')
        if (res.ok) {
          const data = await res.json()
          setSavedDrills(data.drills || [])
        }
      } catch {
        // silently fail
      }
    }
    void fetchDrills()
  }, [])

  const totalMinutes = useMemo(
    () => blocks.reduce((sum, b) => sum + b.durationMinutes, 0),
    [blocks]
  )

  const addCustomBlock = useCallback(() => {
    setBlocks((prev) => [
      ...prev,
      {
        id: nextBlockId(),
        type: 'custom',
        focus: 'skill',
        title: 'Ny aktivitet',
        durationMinutes: 10,
      },
    ])
  }, [])

  const addDrillBlock = useCallback(
    (template: DrillTemplate, insertAt?: number) => {
      const newBlock: PracticeBlock = {
        id: nextBlockId(),
        type: 'drill',
        focus: getTemplateFocus(template.category),
        title: template.name,
        description: template.description,
        durationMinutes: 15,
        structure: JSON.parse(JSON.stringify(template.structure)),
        templateId: template.id,
      }
      setBlocks((prev) => {
        if (insertAt !== undefined && insertAt >= 0) {
          const copy = [...prev]
          copy.splice(insertAt + 1, 0, newBlock)
          return copy
        }
        return [...prev, newBlock]
      })
      setShowTemplatePickerFor(null)
    },
    []
  )

  const addSavedDrillBlock = useCallback(
    (drill: SavedDrill) => {
      const newBlock: PracticeBlock = {
        id: nextBlockId(),
        type: 'drill',
        focus: 'skill',
        title: drill.title,
        description: drill.description || undefined,
        durationMinutes: 15,
        structure: JSON.parse(JSON.stringify(drill.structure)),
      }
      setBlocks((prev) => [...prev, newBlock])
    },
    []
  )

  const updateBlock = useCallback(
    (id: string, updates: Partial<PracticeBlock>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      )
    },
    []
  )

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
      return copy
    })
  }, [])

  // Build timeline with start times
  const timeline = useMemo(() => {
    return blocks.reduce<Array<PracticeBlock & { startMin: number; endMin: number }>>((items, block) => {
      const startMin = items.at(-1)?.endMin ?? 0
      const endMin = startMin + block.durationMinutes
      items.push({ ...block, startMin, endMin })
      return items
    }, [])
  }, [blocks])

  const formatTime = useCallback(
    (minutesOffset: number) => {
      if (!startTime) return ''
      const [h, m] = startTime.split(':').map(Number)
      const totalMin = h * 60 + m + minutesOffset
      const hh = Math.floor(totalMin / 60) % 24
      const mm = totalMin % 60
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    },
    [startTime]
  )

  // Save as TeamEvent with practice plan in description
  const handleSave = async () => {
    if (!teamId || teamId === 'none') {
      toast.error('Välj ett lag')
      return
    }
    if (!date) {
      toast.error('Välj ett datum')
      return
    }
    if (blocks.length === 0) {
      toast.error('Lägg till minst en aktivitet')
      return
    }

    // Build description with the practice plan
    const planText = timeline
      .map(
        (b) =>
          [
            `${formatTime(b.startMin)}-${formatTime(b.endMin)} ${b.title} (${b.durationMinutes} min)`,
            `  Fokus: ${focusLabel(b.focus)}${b.workRest ? ` | Arbete/vila: ${b.workRest}` : ''}`,
            b.description ? `  ${b.description}` : null,
            b.coachingNotes ? `  Coachning: ${b.coachingNotes}` : null,
          ].filter(Boolean).join('\n')
      )
      .join('\n')

    const meta = [
      `Fas: ${practicePhase}`,
      `Intensitet: ${practiceIntensity}`,
      lineGroups ? `Kedjor/grupper: ${lineGroups}` : null,
      goalieNotes ? `Målvakter: ${goalieNotes}` : null,
      coachNotes ? `Coachnoteringar: ${coachNotes}` : null,
    ].filter(Boolean).join('\n')

    const fullDescription = `Träningsplan — ${totalMinutes} min\n${meta ? `\n${meta}` : ''}\n\n${planText}`

    setSaving(true)
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `Träning ${date}`,
          description: fullDescription,
          type: 'PRACTICE',
          startDate: `${date}T${startTime || '17:00'}:00`,
          endDate: `${date}T${formatTime(totalMinutes)}:00`,
          allDay: false,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success('Träningsplan sparad i kalendern!')
      // Reset
      setBlocks(DEFAULT_BLOCKS)
      setTitle('')
      setDate('')
      setLineGroups('')
      setGoalieNotes('')
      setCoachNotes('')
    } catch {
      toast.error('Kunde inte spara träningsplanen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Träningsplanering
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Bygg en komplett isträning med teknik, taktik, special teams, kedjor och tidsblock.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Titel</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="T.ex. Teknikträning"
                className="h-8 text-sm"
              />
            </div>
            {teams.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Lag</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Välj lag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Starttid</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fas</Label>
              <Select value={practicePhase} onValueChange={setPracticePhase}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_PHASE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Intensitet</Label>
              <Select value={practiceIntensity} onValueChange={setPracticeIntensity}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTENSITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Kedjor / grupper</Label>
              <Textarea
                value={lineGroups}
                onChange={(e) => setLineGroups(e.target.value)}
                placeholder="T.ex. backpar, femmor, färggrupper..."
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Målvakter</Label>
              <Textarea
                value={goalieNotes}
                onChange={(e) => setGoalieNotes(e.target.value)}
                placeholder="T.ex. separat uppvärmning, skottvolym, teknikfokus..."
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Coachnoteringar</Label>
              <Textarea
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Nyckelbudskap, påminnelser, belastningsstyrning..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline blocks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Program
            </CardTitle>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {totalMinutes} min
              {startTime && (
                <span className="ml-1">
                  ({formatTime(0)}–{formatTime(totalMinutes)})
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeline.map((block, i) => (
            <div key={block.id} className="border rounded-lg p-3 space-y-2">
              {/* Block header */}
              <div className="flex items-center gap-2">
                {/* Time badge */}
                <div className="text-[10px] text-muted-foreground font-mono w-14 flex-shrink-0">
                  {startTime ? formatTime(block.startMin) : `+${block.startMin}min`}
                </div>

                {/* Move buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={i === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={i === timeline.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Title */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={block.title}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      className="h-7 text-sm font-medium flex-1"
                    />
                    <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
                      {focusLabel(block.focus)}
                    </Badge>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={block.durationMinutes}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        durationMinutes: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="h-7 w-14 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeBlock(block.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_160px_1fr]">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Fokus</Label>
                  <Select
                    value={block.focus}
                    onValueChange={(value) => updateBlock(block.id, { focus: value as PracticeBlockFocus })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_FOCUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Arbete/vila</Label>
                  <Input
                    value={block.workRest || ''}
                    onChange={(e) => updateBlock(block.id, { workRest: e.target.value || undefined })}
                    placeholder="T.ex. 40/20"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Coachning</Label>
                  <Input
                    value={block.coachingNotes || ''}
                    onChange={(e) => updateBlock(block.id, { coachingNotes: e.target.value || undefined })}
                    placeholder="Nyckelpunkt för blocket..."
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* Drill preview (expandable) */}
              {block.structure && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground px-1"
                    onClick={() =>
                      setExpandedBlockId(expandedBlockId === block.id ? null : block.id)
                    }
                  >
                    {expandedBlockId === block.id ? 'Dölj diagram' : 'Visa diagram'}
                  </Button>
                  {expandedBlockId === block.id && (
                    <div className="mt-2">
                      <IceHockeyRink structure={block.structure} width={400} className="mx-auto" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add block buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addCustomBlock}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Aktivitet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplatePickerFor(blocks.length - 1)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Mall
            </Button>
            {savedDrills.length > 0 && (
              <Select
                onValueChange={(id) => {
                  const drill = savedDrills.find((d) => d.id === id)
                  if (drill) addSavedDrillBlock(drill)
                }}
              >
                <SelectTrigger className="h-8 w-auto text-xs">
                  <SelectValue placeholder="+ Sparad övning" />
                </SelectTrigger>
                <SelectContent>
                  {savedDrills.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template picker (modal-like inline) */}
          {showTemplatePickerFor !== null && (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Välj övningsmall</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplatePickerFor(null)}
                >
                  Avbryt
                </Button>
              </div>
              <DrillTemplateLibrary
                onSelect={(t) => addDrillBlock(t, showTemplatePickerFor)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving || blocks.length === 0}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-1.5" />
        {saving ? 'Sparar...' : 'Spara till kalender'}
      </Button>
    </div>
  )
}
