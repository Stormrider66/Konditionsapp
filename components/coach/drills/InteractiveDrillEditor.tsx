'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MousePointer2,
  UserPlus,
  MoveRight,
  Square,
  Type,
  Trash2,
  Undo2,
  RotateCcw,
  ShieldPlus,
  UsersRound,
  Copy,
  Layers3,
} from 'lucide-react'
import type { DrillStructure } from './IceHockeyRink'
import {
  getSportConfig,
  type DrillSportType,
} from '@/remotion/drills/surfaces'
import { useTranslations } from '@/i18n/client'

// ─── Types ──────────────────────────────────────────────────────────────

type Tool = 'select' | 'player' | 'movement' | 'zone' | 'annotation'
type MovementType = 'skate' | 'pass' | 'shot' | 'puck'
type PlayerTeam = 'home' | 'away'

interface Player {
  id: string
  x: number
  y: number
  label: string
  team: PlayerTeam
  color?: string
}

interface Movement {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  type: MovementType
  playerId?: string | null
  phase?: number
  color?: string
  dashed?: boolean
}

interface Zone {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  label?: string
}

interface Annotation {
  id: string
  x: number
  y: number
  text: string
}

interface InteractiveDrillEditorProps {
  initialStructure?: DrillStructure
  onChange: (structure: DrillStructure) => void
  sportType?: DrillSportType
}

// ─── Helpers ────────────────────────────────────────────────────────────

let _idCounter = 0
function nextId(prefix: string) {
  _idCounter++
  return `${prefix}-${Date.now()}-${_idCounter}`
}

const VIEWBOX_PADDING = 2

function getMovementStyles(sportType?: DrillSportType): Record<MovementType, { label: string; color: string; icon: string }> {
  const config = getSportConfig(sportType)
  return {
    skate: { label: config.movementLabels.skate, color: '#1a1a1a', icon: '→' },
    pass: { label: config.movementLabels.pass, color: '#2563eb', icon: '⇢' },
    shot: { label: config.movementLabels.shot, color: '#dc2626', icon: '⚡' },
    puck: { label: config.movementLabels.puck, color: '#1a1a1a', icon: '●' },
  }
}

const ZONE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const HOCKEY_ATTACK_UNIT: Player[] = [
  { id: 'preset-home-lw', x: 58, y: 22, label: 'LW', team: 'home' },
  { id: 'preset-home-c', x: 50, y: 42.5, label: 'C', team: 'home' },
  { id: 'preset-home-rw', x: 58, y: 63, label: 'RW', team: 'home' },
  { id: 'preset-home-ld', x: 35, y: 29, label: 'LD', team: 'home' },
  { id: 'preset-home-rd', x: 35, y: 56, label: 'RD', team: 'home' },
]

const HOCKEY_DEFENSE_UNIT: Player[] = [
  { id: 'preset-away-lw', x: 126, y: 23, label: 'LW', team: 'away' },
  { id: 'preset-away-c', x: 136, y: 42.5, label: 'C', team: 'away' },
  { id: 'preset-away-rw', x: 126, y: 62, label: 'RW', team: 'away' },
  { id: 'preset-away-ld', x: 154, y: 30, label: 'D1', team: 'away' },
  { id: 'preset-away-rd', x: 154, y: 55, label: 'D2', team: 'away' },
  { id: 'preset-away-g', x: 189, y: 42.5, label: 'G', team: 'away' },
]

function clonePresetPlayer(player: Player): Player {
  return { ...player, id: nextId(player.id) }
}

function movementPhaseValue(movement: Movement) {
  return movement.phase && movement.phase > 0 ? movement.phase : 1
}

// ─── Component ──────────────────────────────────────────────────────────

export function InteractiveDrillEditor({
  initialStructure,
  onChange,
  sportType = 'ICE_HOCKEY',
}: InteractiveDrillEditorProps) {
  const t = useTranslations('components.drills')
  const sportConfig = useMemo(() => getSportConfig(sportType), [sportType])
  const SURFACE_W = sportConfig.width
  const SURFACE_H = sportConfig.height
  const PLAYER_LABELS = sportConfig.positionLabels
  const MOVEMENT_STYLES = useMemo(() => getMovementStyles(sportType), [sportType])
  const SurfaceComponent = sportConfig.Surface

  // State
  const [players, setPlayers] = useState<Player[]>(initialStructure?.players || [])
  const [movements, setMovements] = useState<Movement[]>(initialStructure?.movements || [])
  const [zones, setZones] = useState<Zone[]>(initialStructure?.zones || [])
  const [annotations, setAnnotations] = useState<Annotation[]>(initialStructure?.annotations || [])

  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [movementType, setMovementType] = useState<MovementType>('skate')
  const [playerLabel, setPlayerLabel] = useState(PLAYER_LABELS[0])
  const [playerTeam, setPlayerTeam] = useState<PlayerTeam>('home')
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0])
  const [annotationText, setAnnotationText] = useState('')
  const [movementPhase, setMovementPhase] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [movementStart, setMovementStart] = useState<{ x: number; y: number; playerId?: string | null } | null>(null)
  const [zoneStart, setZoneStart] = useState<{ x: number; y: number } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const [history, setHistory] = useState<DrillStructure[]>([])

  const svgRef = useRef<SVGSVGElement>(null)

  // ─── Emit changes ──────────────────────────────────────────────────

  const emitChange = useCallback(
    (p: Player[], m: Movement[], z: Zone[], a: Annotation[]) => {
      onChange({ players: p, movements: m, zones: z, annotations: a })
    },
    [onChange]
  )

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-20), { players, movements, zones, annotations }])
  }, [players, movements, zones, annotations])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setPlayers(prev.players)
    setMovements(prev.movements)
    setZones(prev.zones || [])
    setAnnotations(prev.annotations || [])
    emitChange(prev.players, prev.movements, prev.zones || [], prev.annotations || [])
  }, [history, emitChange])

  const clearAll = useCallback(() => {
    pushHistory()
    setPlayers([])
    setMovements([])
    setZones([])
    setAnnotations([])
    setSelectedId(null)
    emitChange([], [], [], [])
  }, [pushHistory, emitChange])

  const addHockeyPreset = useCallback(
    (kind: 'attack' | 'defense' | 'fiveOnFive') => {
      pushHistory()
      const presetPlayers = kind === 'attack'
        ? HOCKEY_ATTACK_UNIT
        : kind === 'defense'
          ? HOCKEY_DEFENSE_UNIT
          : [...HOCKEY_ATTACK_UNIT, ...HOCKEY_DEFENSE_UNIT]
      const updated = [...players, ...presetPlayers.map(clonePresetPlayer)]
      setPlayers(updated)
      emitChange(updated, movements, zones, annotations)
    },
    [pushHistory, players, movements, zones, annotations, emitChange]
  )

  // ─── SVG coordinate conversion ────────────────────────────────────

  const svgPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return { x: 0, y: 0 }
      const svgPt = pt.matrixTransform(ctm.inverse())
      return {
        x: Math.max(0, Math.min(SURFACE_W, Math.round(svgPt.x * 2) / 2)),
        y: Math.max(0, Math.min(SURFACE_H, Math.round(svgPt.y * 2) / 2)),
      }
    },
    [SURFACE_W, SURFACE_H]
  )

  // ─── Find element at position ─────────────────────────────────────

  const findPlayerAt = useCallback(
    (x: number, y: number, radius = 5): Player | null => {
      for (const p of [...players].reverse()) {
        const dx = p.x - x
        const dy = p.y - y
        if (dx * dx + dy * dy < radius * radius) return p
      }
      return null
    },
    [players]
  )

  // ─── Mouse handlers ───────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return
      const pos = svgPoint(e.clientX, e.clientY)

      if (activeTool === 'select') {
        const player = findPlayerAt(pos.x, pos.y)
        if (player) {
          setSelectedId(player.id)
          setDraggingId(player.id)
          pushHistory()
        } else {
          setSelectedId(null)
        }
        return
      }

      if (activeTool === 'player') {
        pushHistory()
        const newPlayer: Player = {
          id: nextId('p'),
          x: pos.x,
          y: pos.y,
          label: playerLabel,
          team: playerTeam,
        }
        const updated = [...players, newPlayer]
        setPlayers(updated)
        setSelectedId(newPlayer.id)
        emitChange(updated, movements, zones, annotations)
        return
      }

      if (activeTool === 'movement') {
        if (!movementStart) {
          const startPlayer = movementType === 'skate' ? findPlayerAt(pos.x, pos.y, 5) : null
          setMovementStart({
            x: startPlayer?.x ?? pos.x,
            y: startPlayer?.y ?? pos.y,
            playerId: startPlayer?.id ?? null,
          })
        } else {
          pushHistory()
          const newMovement: Movement = {
            id: nextId('m'),
            fromX: movementStart.x,
            fromY: movementStart.y,
            toX: pos.x,
            toY: pos.y,
            type: movementType,
            playerId: movementType === 'skate' ? movementStart.playerId ?? null : null,
            phase: movementPhase,
            dashed: movementType === 'pass',
          }
          const updated = [...movements, newMovement]
          setMovements(updated)
          setMovementStart(null)
          setMousePos(null)
          emitChange(players, updated, zones, annotations)
        }
        return
      }

      if (activeTool === 'zone') {
        if (!zoneStart) {
          setZoneStart(pos)
        } else {
          pushHistory()
          const x = Math.min(zoneStart.x, pos.x)
          const y = Math.min(zoneStart.y, pos.y)
          const w = Math.abs(pos.x - zoneStart.x)
          const h = Math.abs(pos.y - zoneStart.y)
          if (w > 2 && h > 2) {
            const newZone: Zone = {
              id: nextId('z'),
              x,
              y,
              width: w,
              height: h,
              color: zoneColor,
            }
            const updated = [...zones, newZone]
            setZones(updated)
            emitChange(players, movements, updated, annotations)
          }
          setZoneStart(null)
          setMousePos(null)
        }
        return
      }

      if (activeTool === 'annotation') {
        if (!annotationText.trim()) return
        pushHistory()
        const newAnnotation: Annotation = {
          id: nextId('a'),
          x: pos.x,
          y: pos.y,
          text: annotationText.trim(),
        }
        const updated = [...annotations, newAnnotation]
        setAnnotations(updated)
        emitChange(players, movements, zones, updated)
        return
      }
    },
    [
      activeTool, svgPoint, findPlayerAt, pushHistory, emitChange,
      players, movements, zones, annotations,
      playerLabel, playerTeam, movementType, movementStart,
      zoneStart, zoneColor, annotationText, movementPhase,
    ]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const pos = svgPoint(e.clientX, e.clientY)

      if (draggingId) {
        setPlayers((prev) =>
          prev.map((p) => (p.id === draggingId ? { ...p, x: pos.x, y: pos.y } : p))
        )
        return
      }

      if (activeTool === 'movement' && movementStart) {
        setMousePos(pos)
      }
      if (activeTool === 'zone' && zoneStart) {
        setMousePos(pos)
      }
    },
    [svgPoint, draggingId, activeTool, movementStart, zoneStart]
  )

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      setDraggingId(null)
      emitChange(players, movements, zones, annotations)
    }
  }, [draggingId, players, movements, zones, annotations, emitChange])

  // ─── Touch handlers (map to mouse events) ─────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      const syntheticEvent = {
        button: 0,
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as React.MouseEvent<SVGSVGElement>
      handleMouseDown(syntheticEvent)
    },
    [handleMouseDown]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      const syntheticEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as React.MouseEvent<SVGSVGElement>
      handleMouseMove(syntheticEvent)
    },
    [handleMouseMove]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      e.preventDefault()
      handleMouseUp()
    },
    [handleMouseUp]
  )

  // ─── Delete selected ──────────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    pushHistory()

    const updatedPlayers = players.filter((p) => p.id !== selectedId)
    const updatedMovements = movements.filter((m) => m.id !== selectedId)
    const updatedZones = zones.filter((z) => z.id !== selectedId)
    const updatedAnnotations = annotations.filter((a) => a.id !== selectedId)

    setPlayers(updatedPlayers)
    setMovements(updatedMovements)
    setZones(updatedZones)
    setAnnotations(updatedAnnotations)
    setSelectedId(null)
    emitChange(updatedPlayers, updatedMovements, updatedZones, updatedAnnotations)
  }, [selectedId, pushHistory, players, movements, zones, annotations, emitChange])

  // ─── Keyboard ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected()
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setMovementStart(null)
        setZoneStart(null)
        setMousePos(null)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    },
    [deleteSelected, undo]
  )

  // ─── Selected element info ────────────────────────────────────────

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedId) || null,
    [players, selectedId]
  )

  const selectedMovement = useMemo(
    () => movements.find((m) => m.id === selectedId) || null,
    [movements, selectedId]
  )

  const updateSelectedPlayer = useCallback(
    (updates: Partial<Player>) => {
      pushHistory()
      const updated = players.map((p) =>
        p.id === selectedId ? { ...p, ...updates } : p
      )
      setPlayers(updated)
      emitChange(updated, movements, zones, annotations)
    },
    [selectedId, pushHistory, players, movements, zones, annotations, emitChange]
  )

  const updateSelectedMovement = useCallback(
    (updates: Partial<Movement>) => {
      pushHistory()
      const updated = movements.map((m) =>
        m.id === selectedId ? { ...m, ...updates } : m
      )
      setMovements(updated)
      emitChange(players, updated, zones, annotations)
    },
    [selectedId, pushHistory, players, movements, zones, annotations, emitChange]
  )

  const phaseGroups = useMemo(() => {
    const grouped = new Map<number, Movement[]>()
    movements.forEach((movement) => {
      const phase = movementPhaseValue(movement)
      grouped.set(phase, [...(grouped.get(phase) || []), movement])
    })

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([phase, phaseMovements]) => {
        const movingPlayerLabels = phaseMovements
          .map((movement) => movement.playerId ? players.find((player) => player.id === movement.playerId)?.label : null)
          .filter(Boolean)

        return {
          phase,
          movements: phaseMovements,
          label: movingPlayerLabels.length > 0
            ? movingPlayerLabels.join(', ')
            : phaseMovements.map((movement) => MOVEMENT_STYLES[movement.type]?.label || movement.type).join(', '),
        }
      })
  }, [movements, players, MOVEMENT_STYLES])

  const activePhase = selectedMovement ? movementPhaseValue(selectedMovement) : movementPhase
  const maxPhase = phaseGroups.at(-1)?.phase ?? 0

  const selectPhase = useCallback((phase: number) => {
    const firstMovement = movements.find((movement) => movementPhaseValue(movement) === phase)
    setMovementPhase(phase)
    setMovementStart(null)
    setZoneStart(null)
    setMousePos(null)
    if (firstMovement) {
      setActiveTool('select')
      setSelectedId(firstMovement.id)
    }
  }, [movements])

  const createNextPhase = useCallback(() => {
    setMovementPhase(maxPhase + 1 || 1)
    setActiveTool('movement')
    setSelectedId(null)
    setMovementStart(null)
    setZoneStart(null)
    setMousePos(null)
  }, [maxPhase])

  const duplicatePhase = useCallback((phase: number) => {
    const phaseMovements = movements.filter((movement) => movementPhaseValue(movement) === phase)
    if (phaseMovements.length === 0) return
    const newPhase = maxPhase + 1
    pushHistory()
    const duplicated = phaseMovements.map((movement) => ({
      ...movement,
      id: nextId('m'),
      phase: newPhase,
    }))
    const updated = [...movements, ...duplicated]
    setMovements(updated)
    setMovementPhase(newPhase)
    setSelectedId(duplicated[0]?.id ?? null)
    setActiveTool('select')
    emitChange(players, updated, zones, annotations)
  }, [maxPhase, pushHistory, movements, players, zones, annotations, emitChange])

  const deletePhase = useCallback((phase: number) => {
    const hasMovements = movements.some((movement) => movementPhaseValue(movement) === phase)
    if (!hasMovements) return
    pushHistory()
    const updated = movements
      .filter((movement) => movementPhaseValue(movement) !== phase)
      .map((movement) => {
        const currentPhase = movementPhaseValue(movement)
        return currentPhase > phase ? { ...movement, phase: currentPhase - 1 } : movement
      })
    setMovements(updated)
    setSelectedId(null)
    setMovementPhase(Math.max(1, Math.min(phase, maxPhase - 1)))
    emitChange(players, updated, zones, annotations)
  }, [maxPhase, pushHistory, movements, players, zones, annotations, emitChange])

  // ─── Render ───────────────────────────────────────────────────────

  const toolbarItems: { tool: Tool; icon: React.ReactNode; label: string; shortLabel: string }[] = useMemo(
    () => [
      { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: t('editor.toolbar.select.label'), shortLabel: t('editor.toolbar.select.short') },
      { tool: 'player', icon: <UserPlus className="h-4 w-4" />, label: t('editor.toolbar.player.label'), shortLabel: t('editor.toolbar.player.short') },
      { tool: 'movement', icon: <MoveRight className="h-4 w-4" />, label: t('editor.toolbar.movement.label'), shortLabel: t('editor.toolbar.movement.short') },
      { tool: 'zone', icon: <Square className="h-4 w-4" />, label: t('editor.toolbar.zone.label'), shortLabel: t('editor.toolbar.zone.short') },
      { tool: 'annotation', icon: <Type className="h-4 w-4" />, label: t('editor.toolbar.annotation.label'), shortLabel: t('editor.toolbar.annotation.short') },
    ],
    [t]
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="space-y-3"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ outline: 'none' }}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Tool buttons */}
          {toolbarItems.map(({ tool, icon, label, shortLabel }) => (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setActiveTool(tool)
                    setMovementStart(null)
                    setZoneStart(null)
                    setMousePos(null)
                  }}
                >
                  {icon}
                  <span className="hidden sm:inline">{shortLabel}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}

          <div className="w-px h-6 bg-border mx-1" />

          {/* Undo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={history.length === 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('editor.toolbar.undo')}</TooltipContent>
          </Tooltip>

          {/* Delete selected */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={deleteSelected}
                disabled={!selectedId}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('editor.toolbar.deleteSelected')}</TooltipContent>
          </Tooltip>

          {/* Clear all */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={clearAll}
                disabled={players.length === 0 && movements.length === 0}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('editor.toolbar.clearAll')}</TooltipContent>
          </Tooltip>
        </div>

        {/* Tool-specific options */}
        <div className="min-h-[36px] flex flex-wrap items-center gap-2">
          {activeTool === 'player' && (
            <>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs whitespace-nowrap">{t('editor.options.position')}</Label>
                <div className="flex gap-0.5">
                  {PLAYER_LABELS.slice(0, 6).map((l) => (
                    <Button
                      key={l}
                      variant={playerLabel === l ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 w-8 text-xs p-0"
                      onClick={() => setPlayerLabel(l)}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">{t('editor.options.team')}</Label>
                <Button
                  variant={playerTeam === 'home' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  style={playerTeam === 'home' ? { backgroundColor: '#dc2626' } : {}}
                  onClick={() => setPlayerTeam('home')}
                >
                  {t('editor.options.teamHome')}
                </Button>
                <Button
                  variant={playerTeam === 'away' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  style={playerTeam === 'away' ? { backgroundColor: '#2563eb' } : {}}
                  onClick={() => setPlayerTeam('away')}
                >
                  {t('editor.options.teamAway')}
                </Button>
              </div>
              {sportType === 'ICE_HOCKEY' && (
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">{t('editor.options.quick')}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => addHockeyPreset('attack')}
                  >
                    <UsersRound className="h-3.5 w-3.5" />
                    {t('editor.hockeyPresets.attack')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => addHockeyPreset('defense')}
                  >
                    <ShieldPlus className="h-3.5 w-3.5" />
                    {t('editor.hockeyPresets.defense')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => addHockeyPreset('fiveOnFive')}
                  >
                    5v5
                  </Button>
                </div>
              )}
            </>
          )}

          {activeTool === 'movement' && (
            <>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs whitespace-nowrap">{t('editor.options.type')}</Label>
                {(Object.keys(MOVEMENT_STYLES) as MovementType[]).map((t) => (
                  <Button
                    key={t}
                    variant={movementType === t ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setMovementType(t)}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: MOVEMENT_STYLES[t].color }}
                    />
                    {MOVEMENT_STYLES[t].label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs whitespace-nowrap">{t('editor.options.phase')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setMovementPhase((value) => Math.max(1, value - 1))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={movementPhase}
                  onChange={(e) => setMovementPhase(Math.max(1, Number(e.target.value) || 1))}
                  className="h-7 w-16 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setMovementPhase((value) => value + 1)}
                >
                  +
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t('editor.options.parallelMovements')}
                </span>
              </div>
              {movementStart && (
                <span className="text-xs text-muted-foreground">
                  {t('editor.hints.selectMovementEndpoint')}
                </span>
              )}
            </>
          )}

          {activeTool === 'zone' && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">{t('editor.options.color')}</Label>
              {ZONE_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded border-2 ${zoneColor === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setZoneColor(c)}
                />
              ))}
              {zoneStart && (
                <span className="text-xs text-muted-foreground ml-2">
                  {t('editor.hints.drawZone')}
                </span>
              )}
            </div>
          )}

          {activeTool === 'annotation' && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">{t('editor.options.annotationLabel')}</Label>
              <Input
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder={t('editor.annotationPlaceholder')}
                className="h-7 text-xs w-40"
              />
              <span className="text-xs text-muted-foreground">
                {t('editor.hints.placeAnnotation')}
              </span>
            </div>
          )}

          {activeTool === 'select' && !selectedId && (
            <span className="text-xs text-muted-foreground">
              {t('editor.hints.selectElement')}
            </span>
          )}
        </div>

        {/* Selected player editor */}
        {activeTool === 'select' && selectedPlayer && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Label className="text-xs font-medium">{t('editor.selection.selectedPlayer')}</Label>
            <div className="flex items-center gap-1">
              <Label className="text-xs">{t('editor.options.position')}</Label>
              <div className="flex gap-0.5">
                {PLAYER_LABELS.slice(0, 6).map((l) => (
                  <Button
                    key={l}
                    variant={selectedPlayer.label === l ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 w-7 text-[10px] p-0"
                    onClick={() => updateSelectedPlayer({ label: l })}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={selectedPlayer.team === 'home' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px]"
                style={selectedPlayer.team === 'home' ? { backgroundColor: '#dc2626' } : {}}
                onClick={() => updateSelectedPlayer({ team: 'home' })}
              >
                {t('editor.options.teamHome')}
              </Button>
              <Button
                variant={selectedPlayer.team === 'away' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px]"
                style={selectedPlayer.team === 'away' ? { backgroundColor: '#2563eb' } : {}}
                onClick={() => updateSelectedPlayer({ team: 'away' })}
              >
                {t('editor.options.teamAway')}
              </Button>
            </div>
          </div>
        )}

        {activeTool === 'select' && selectedMovement && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Label className="text-xs font-medium">{t('editor.selection.selectedMovement')}</Label>
            <div className="flex items-center gap-1">
              <Label className="text-xs">{t('editor.options.type')}</Label>
              {(Object.keys(MOVEMENT_STYLES) as MovementType[]).map((t) => (
                <Button
                  key={t}
                  variant={selectedMovement.type === t ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => updateSelectedMovement({
                    type: t,
                    dashed: t === 'pass',
                    playerId: t === 'skate' ? selectedMovement.playerId ?? null : null,
                  })}
                >
                  {MOVEMENT_STYLES[t].label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs">{t('editor.options.phase')}</Label>
              <Input
                type="number"
                min={1}
                value={selectedMovement.phase ?? 1}
                onChange={(e) => updateSelectedMovement({ phase: Math.max(1, Number(e.target.value) || 1) })}
                className="h-6 w-16 text-[10px]"
              />
            </div>
            {selectedMovement.type === 'skate' && (
              <div className="flex items-center gap-1">
                <Label className="text-xs">{t('editor.options.player')}</Label>
                <select
                  value={selectedMovement.playerId ?? 'auto'}
                  onChange={(e) => updateSelectedMovement({ playerId: e.target.value === 'auto' ? null : e.target.value })}
                  className="h-6 rounded border bg-background px-2 text-[10px]"
                >
                  <option value="auto">{t('editor.options.auto')}</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.label} ({player.team === 'home' ? t('editor.teamColors.home') : t('editor.teamColors.away')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {phaseGroups.length > 0 && (
          <div className="rounded-md border bg-background p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <div className="mr-1 flex items-center gap-1.5 text-xs font-medium">
                  <Layers3 className="h-3.5 w-3.5" />
                  {t('editor.sequence.title')}
                </div>
                {phaseGroups.map((group) => {
                  const isActive = group.phase === activePhase
                  return (
                    <button
                      key={group.phase}
                      type="button"
                      onClick={() => selectPhase(group.phase)}
                      className={`flex h-8 max-w-[180px] items-center gap-1.5 rounded-md border px-2 text-left text-xs transition-colors ${
                        isActive
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-muted/40 hover:bg-muted'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isActive ? 'bg-background text-foreground' : 'bg-background text-foreground'
                      }`}>
                        {group.phase}
                      </span>
                      <span className="truncate">
                        {t('editor.sequence.movementCount', { count: group.movements.length })}
                        {group.label ? ` · ${group.label}` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={createNextPhase}
                >
                  {t('editor.sequence.newPhase')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => duplicatePhase(activePhase)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t('editor.sequence.duplicatePhase')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-destructive"
                  onClick={() => deletePhase(activePhase)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('editor.sequence.deletePhase')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SVG Rink Canvas */}
        <div className="border rounded-lg overflow-hidden bg-slate-50">
          <svg
            ref={svgRef}
            viewBox={`${-VIEWBOX_PADDING} ${-VIEWBOX_PADDING} ${SURFACE_W + VIEWBOX_PADDING * 2} ${SURFACE_H + VIEWBOX_PADDING * 2}`}
            className="w-full"
            style={{
              cursor:
                activeTool === 'select'
                  ? draggingId ? 'grabbing' : 'default'
                  : activeTool === 'player'
                    ? 'crosshair'
                    : 'crosshair',
              userSelect: 'none',
              touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Sport surface (dynamic) */}
            <SurfaceComponent />

            {/* Arrow markers */}
            <defs>
              <marker id="ed-arrow-skate" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#1a1a1a" />
              </marker>
              <marker id="ed-arrow-pass" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#2563eb" />
              </marker>
              <marker id="ed-arrow-shot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#dc2626" />
              </marker>
              <marker id="ed-arrow-puck" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#1a1a1a" />
              </marker>
            </defs>

            {/* Zones */}
            {zones.map((z) => (
              <g
                key={z.id}
                onClick={(e) => {
                  if (activeTool === 'select') {
                    e.stopPropagation()
                    setSelectedId(z.id)
                  }
                }}
              >
                <rect
                  x={z.x}
                  y={z.y}
                  width={z.width}
                  height={z.height}
                  fill={z.color}
                  opacity={0.15}
                  rx="2"
                  stroke={selectedId === z.id ? '#000' : 'none'}
                  strokeWidth={selectedId === z.id ? 0.5 : 0}
                  strokeDasharray={selectedId === z.id ? '1.5 1' : undefined}
                />
                {z.label && (
                  <text
                    x={z.x + z.width / 2}
                    y={z.y + z.height / 2}
                    textAnchor="middle"
                    fontSize="3"
                    fill={z.color}
                    fontWeight="bold"
                  >
                    {z.label}
                  </text>
                )}
              </g>
            ))}

            {/* Zone preview while drawing */}
            {activeTool === 'zone' && zoneStart && mousePos && (
              <rect
                x={Math.min(zoneStart.x, mousePos.x)}
                y={Math.min(zoneStart.y, mousePos.y)}
                width={Math.abs(mousePos.x - zoneStart.x)}
                height={Math.abs(mousePos.y - zoneStart.y)}
                fill={zoneColor}
                opacity={0.1}
                stroke={zoneColor}
                strokeWidth={0.4}
                strokeDasharray="1.5 1"
                rx="2"
              />
            )}

            {/* Movements */}
            {movements.map((m) => {
              const color = m.color || MOVEMENT_STYLES[m.type]?.color || '#1a1a1a'
              const markerId = `ed-arrow-${m.type}`
              return (
                <g
                  key={m.id}
                  onClick={(e) => {
                    if (activeTool === 'select') {
                      e.stopPropagation()
                      setSelectedId(m.id)
                    }
                  }}
                >
                  <line
                    x1={m.fromX}
                    y1={m.fromY}
                    x2={m.toX}
                    y2={m.toY}
                    stroke={selectedId === m.id ? '#000' : color}
                    strokeWidth={selectedId === m.id ? 1 : m.type === 'shot' ? 0.8 : 0.6}
                    strokeDasharray={m.dashed || m.type === 'pass' ? '1.5 1' : undefined}
                    markerEnd={`url(#${markerId})`}
                  />
                  {/* Invisible fat line for easier click target */}
                  <line
                    x1={m.fromX}
                    y1={m.fromY}
                    x2={m.toX}
                    y2={m.toY}
                    stroke="transparent"
                    strokeWidth={3}
                  />
                  {m.phase && (
                    <g>
                      <circle
                        cx={(m.fromX + m.toX) / 2}
                        cy={(m.fromY + m.toY) / 2}
                        r="2.3"
                        fill="white"
                        stroke={selectedId === m.id ? '#000' : color}
                        strokeWidth="0.4"
                      />
                      <text
                        x={(m.fromX + m.toX) / 2}
                        y={(m.fromY + m.toY) / 2 + 0.8}
                        textAnchor="middle"
                        fontSize="2.4"
                        fill={selectedId === m.id ? '#000' : color}
                        fontWeight="700"
                      >
                        {m.phase}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Movement preview while drawing */}
            {activeTool === 'movement' && movementStart && mousePos && (
              <line
                x1={movementStart.x}
                y1={movementStart.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke={MOVEMENT_STYLES[movementType].color}
                strokeWidth={0.5}
                strokeDasharray="1 1"
                opacity={0.6}
              />
            )}

            {/* Players */}
            {players.map((p) => {
              const fillColor = p.color || (p.team === 'home' ? '#dc2626' : '#2563eb')
              const isSelected = selectedId === p.id
              return (
                <g
                  key={p.id}
                  style={{ cursor: activeTool === 'select' ? 'grab' : undefined }}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="none"
                      stroke="#000"
                      strokeWidth="0.4"
                      strokeDasharray="1 0.8"
                    />
                  )}
                  <circle cx={p.x} cy={p.y} r="3" fill={fillColor} stroke="white" strokeWidth="0.4" />
                  <text
                    x={p.x}
                    y={p.y + 1}
                    textAnchor="middle"
                    fontSize="2.5"
                    fill="white"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {p.label}
                  </text>
                </g>
              )
            })}

            {/* Annotations */}
            {annotations.map((a) => (
              <text
                key={a.id}
                x={a.x}
                y={a.y}
                textAnchor="middle"
                fontSize="2.8"
                fill={selectedId === a.id ? '#000' : '#1a1a1a'}
                fontWeight={selectedId === a.id ? 'bold' : '600'}
                fontFamily="sans-serif"
                style={{ cursor: activeTool === 'select' ? 'pointer' : undefined }}
                onClick={(e) => {
                  if (activeTool === 'select') {
                    e.stopPropagation()
                    setSelectedId(a.id)
                  }
                }}
                textDecoration={selectedId === a.id ? 'underline' : undefined}
              >
                {a.text}
              </text>
            ))}

            {/* Movement start indicator */}
            {activeTool === 'movement' && movementStart && (
              <circle
                cx={movementStart.x}
                cy={movementStart.y}
                r="1.5"
                fill={MOVEMENT_STYLES[movementType].color}
                opacity={0.6}
              />
            )}
          </svg>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('editor.statusBar.players', { count: players.length })} · {t('editor.statusBar.movements', { count: movements.length })}
            {zones.length > 0 && ` · ${t('editor.statusBar.zones', { count: zones.length })}`}
            {annotations.length > 0 && ` · ${t('editor.statusBar.annotations', { count: annotations.length })}`}
          </span>
          <span>{t('editor.statusBar.placeHint')}</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
