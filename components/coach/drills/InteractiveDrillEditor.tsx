'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
} from 'lucide-react'
import type { DrillStructure } from './IceHockeyRink'
import {
  getSportConfig,
  type DrillSportType,
} from '@/remotion/drills/surfaces'

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

// ─── Component ──────────────────────────────────────────────────────────

export function InteractiveDrillEditor({
  initialStructure,
  onChange,
  sportType = 'ICE_HOCKEY',
}: InteractiveDrillEditorProps) {
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

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [movementStart, setMovementStart] = useState<{ x: number; y: number } | null>(null)
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
    []
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
          setMovementStart(pos)
        } else {
          pushHistory()
          const newMovement: Movement = {
            id: nextId('m'),
            fromX: movementStart.x,
            fromY: movementStart.y,
            toX: pos.x,
            toY: pos.y,
            type: movementType,
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
      zoneStart, zoneColor, annotationText,
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

  // ─── Render ───────────────────────────────────────────────────────

  const toolbarItems: { tool: Tool; icon: React.ReactNode; label: string; shortLabel: string }[] = [
    { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Välj / Flytta', shortLabel: 'Välj' },
    { tool: 'player', icon: <UserPlus className="h-4 w-4" />, label: 'Lägg till spelare', shortLabel: 'Spelare' },
    { tool: 'movement', icon: <MoveRight className="h-4 w-4" />, label: 'Rita rörelse', shortLabel: 'Rörelse' },
    { tool: 'zone', icon: <Square className="h-4 w-4" />, label: 'Markera zon', shortLabel: 'Zon' },
    { tool: 'annotation', icon: <Type className="h-4 w-4" />, label: 'Lägg till text', shortLabel: 'Text' },
  ]

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
            <TooltipContent side="bottom">Ångra (Ctrl+Z)</TooltipContent>
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
            <TooltipContent side="bottom">Radera vald (Del)</TooltipContent>
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
            <TooltipContent side="bottom">Rensa allt</TooltipContent>
          </Tooltip>
        </div>

        {/* Tool-specific options */}
        <div className="min-h-[36px] flex flex-wrap items-center gap-2">
          {activeTool === 'player' && (
            <>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs whitespace-nowrap">Position:</Label>
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
                <Label className="text-xs">Lag:</Label>
                <Button
                  variant={playerTeam === 'home' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  style={playerTeam === 'home' ? { backgroundColor: '#dc2626' } : {}}
                  onClick={() => setPlayerTeam('home')}
                >
                  Hemma
                </Button>
                <Button
                  variant={playerTeam === 'away' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  style={playerTeam === 'away' ? { backgroundColor: '#2563eb' } : {}}
                  onClick={() => setPlayerTeam('away')}
                >
                  Borta
                </Button>
              </div>
            </>
          )}

          {activeTool === 'movement' && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs whitespace-nowrap">Typ:</Label>
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
              {movementStart && (
                <span className="text-xs text-muted-foreground ml-2">
                  Klicka på slutpunkt...
                </span>
              )}
            </div>
          )}

          {activeTool === 'zone' && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Färg:</Label>
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
                  Klicka på andra hörnet...
                </span>
              )}
            </div>
          )}

          {activeTool === 'annotation' && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Text:</Label>
              <Input
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="T.ex. 'Breakout'"
                className="h-7 text-xs w-40"
              />
              <span className="text-xs text-muted-foreground">
                Klicka på rinken för att placera
              </span>
            </div>
          )}

          {activeTool === 'select' && !selectedId && (
            <span className="text-xs text-muted-foreground">
              Klicka på en spelare för att välja och dra
            </span>
          )}
        </div>

        {/* Selected player editor */}
        {activeTool === 'select' && selectedPlayer && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Label className="text-xs font-medium">Vald spelare:</Label>
            <div className="flex items-center gap-1">
              <Label className="text-xs">Position:</Label>
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
                Hemma
              </Button>
              <Button
                variant={selectedPlayer.team === 'away' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px]"
                style={selectedPlayer.team === 'away' ? { backgroundColor: '#2563eb' } : {}}
                onClick={() => updateSelectedPlayer({ team: 'away' })}
              >
                Borta
              </Button>
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
            {players.length} spelare · {movements.length} rörelser
            {zones.length > 0 && ` · ${zones.length} zoner`}
            {annotations.length > 0 && ` · ${annotations.length} texter`}
          </span>
          <span>Klicka på rinken för att placera element</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
