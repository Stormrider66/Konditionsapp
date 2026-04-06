'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DrillStructure } from '@/components/coach/drills/IceHockeyRink'
import { getSportConfig, type DrillSportType } from '@/remotion/drills/surfaces'
import { DrillAnimationPlayer } from '@/components/coach/drills/DrillAnimationPlayer'
import {
  ChevronLeft,
  ChevronRight,
  Play,
  SkipBack,
  User,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────

interface Movement {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  type: 'skate' | 'pass' | 'shot' | 'puck'
  color?: string
  dashed?: boolean
}

interface AthleteDrillViewerProps {
  title: string
  description?: string
  structure: DrillStructure
  sportType?: string
  highlightPosition?: string // e.g. "LW" — athlete's position
}

const MOVEMENT_LABELS: Record<string, string> = {
  skate: 'Åkning',
  pass: 'Passning',
  shot: 'Skott',
  puck: 'Puck',
}

const MOVEMENT_COLORS: Record<string, string> = {
  skate: '#1a1a1a',
  pass: '#2563eb',
  shot: '#dc2626',
  puck: '#666',
}

// ─── Component ──────────────────────────────────────────────────────────

export function AthleteDrillViewer({
  title,
  description,
  structure,
  sportType = 'ICE_HOCKEY',
  highlightPosition,
}: AthleteDrillViewerProps) {
  const [currentStep, setCurrentStep] = useState(-1) // -1 = overview
  const [showAnimation, setShowAnimation] = useState(false)
  const sportConfig = useMemo(() => getSportConfig(sportType), [sportType])
  const SurfaceComponent = sportConfig.Surface

  const movements = structure.movements || []
  const totalSteps = movements.length

  // Highlighted player (the athlete's position)
  const highlightedPlayer = useMemo(() => {
    if (!highlightPosition) return null
    return structure.players.find(
      (p) => p.label.toUpperCase() === highlightPosition.toUpperCase()
    )
  }, [structure.players, highlightPosition])

  // Build a cumulative structure up to current step
  const visibleStructure = useMemo((): DrillStructure => {
    if (currentStep < 0) return structure // show all

    const visibleMovements = movements.slice(0, currentStep + 1)
    return {
      ...structure,
      movements: visibleMovements,
    }
  }, [structure, movements, currentStep])

  // Current movement info
  const currentMovement = currentStep >= 0 && currentStep < totalSteps
    ? movements[currentStep]
    : null

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1))
    setShowAnimation(false)
  }, [totalSteps])

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, -1))
    setShowAnimation(false)
  }, [])

  const goToOverview = useCallback(() => {
    setCurrentStep(-1)
    setShowAnimation(false)
  }, [])

  if (showAnimation) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setShowAnimation(false)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Steg-för-steg
        </Button>
        <DrillAnimationPlayer
          title={title}
          description={description}
          structure={structure}
          locale="sv"
          sportType={sportType as DrillSportType}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Step-by-step surface view */}
      <div className="border rounded-lg overflow-hidden bg-slate-50">
        <svg
          viewBox={`-2 -2 ${sportConfig.width + 4} ${sportConfig.height + 4}`}
          className="w-full"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Dynamic sport surface */}
          <SurfaceComponent />

          {/* Arrow markers */}
          <defs>
            <marker id="av-arrow-skate" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#1a1a1a" />
            </marker>
            <marker id="av-arrow-pass" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#2563eb" />
            </marker>
            <marker id="av-arrow-shot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* Zones */}
          {structure.zones?.map((z) => (
            <rect
              key={z.id}
              x={z.x}
              y={z.y}
              width={z.width}
              height={z.height}
              fill={z.color}
              opacity={0.12}
              rx="2"
            />
          ))}

          {/* Visible movements (up to current step) */}
          {visibleStructure.movements.map((m, i) => {
            const color = m.color || MOVEMENT_COLORS[m.type] || '#1a1a1a'
            const isCurrentStep = i === currentStep
            return (
              <line
                key={m.id}
                x1={m.fromX}
                y1={m.fromY}
                x2={m.toX}
                y2={m.toY}
                stroke={color}
                strokeWidth={isCurrentStep ? 1.2 : 0.6}
                strokeDasharray={m.dashed || m.type === 'pass' ? '1.5 1' : undefined}
                markerEnd={`url(#av-arrow-${m.type === 'puck' ? 'skate' : m.type})`}
                opacity={isCurrentStep ? 1 : 0.4}
              />
            )
          })}

          {/* Players */}
          {structure.players.map((p) => {
            const isHighlighted = highlightedPlayer && p.id === highlightedPlayer.id
            const fillColor = p.color || (p.team === 'home' ? '#dc2626' : '#2563eb')
            return (
              <g key={p.id}>
                {/* Highlight ring for athlete's position */}
                {isHighlighted && (
                  <>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5.5"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="0.6"
                      strokeDasharray="1.2 0.8"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5"
                      fill="#f59e0b"
                      opacity={0.15}
                    />
                  </>
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
          {structure.annotations?.map((a) => (
            <text
              key={a.id}
              x={a.x}
              y={a.y}
              textAnchor="middle"
              fontSize="2.5"
              fill="#1a1a1a"
              fontWeight="600"
              fontFamily="sans-serif"
            >
              {a.text}
            </text>
          ))}
        </svg>
      </div>

      {/* Current step info */}
      {currentMovement && (
        <div className="bg-muted/50 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <Badge
              className="text-[10px]"
              style={{ backgroundColor: MOVEMENT_COLORS[currentMovement.type], color: 'white' }}
            >
              {MOVEMENT_LABELS[currentMovement.type]}
            </Badge>
            <span className="text-sm font-medium">
              Steg {currentStep + 1} av {totalSteps}
            </span>
          </div>
        </div>
      )}

      {currentStep < 0 && (
        <div className="bg-muted/50 rounded-md px-3 py-2 text-sm text-muted-foreground">
          Översikt — alla rörelser visas
        </div>
      )}

      {/* Navigation controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={goToOverview}
            disabled={currentStep < 0}
            className="h-8"
          >
            <SkipBack className="h-3.5 w-3.5 mr-1" />
            Översikt
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goPrev}
            disabled={currentStep < 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goNext}
            disabled={currentStep >= totalSteps - 1}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {highlightPosition && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <User className="h-2.5 w-2.5" />
              {highlightPosition}
            </Badge>
          )}
          {totalSteps > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowAnimation(true)}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Animera
            </Button>
          )}
        </div>
      </div>

      {/* Step dots */}
      {totalSteps > 0 && (
        <div className="flex items-center justify-center gap-1">
          <button
            className={`w-2 h-2 rounded-full transition-colors ${currentStep < 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            onClick={goToOverview}
          />
          {movements.map((_, i) => (
            <button
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? 'bg-primary' : i < currentStep ? 'bg-primary/40' : 'bg-muted-foreground/30'}`}
              onClick={() => {
                setCurrentStep(i)
                setShowAnimation(false)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
