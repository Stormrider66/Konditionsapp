import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { IceHockeyRinkSurface } from "../surfaces/IceHockeyRinkSurface";
import { FootballPitchSurface } from "../surfaces/FootballPitchSurface";
import { HandballCourtSurface } from "../surfaces/HandballCourtSurface";
import { BasketballCourtSurface } from "../surfaces/BasketballCourtSurface";
import { FloorballRinkSurface } from "../surfaces/FloorballRinkSurface";
import { VolleyballCourtSurface } from "../surfaces/VolleyballCourtSurface";
import { DrillPlayer } from "../components/DrillPlayer";
import { Puck } from "../components/Puck";
import { AnimatedMovement } from "../components/AnimatedMovement";
import { PhaseOverlay } from "../components/PhaseOverlay";

// ─── Sport surface mapping (inline to avoid index barrel in Remotion) ────

type SportType = "ICE_HOCKEY" | "FOOTBALL" | "HANDBALL" | "BASKETBALL" | "FLOORBALL" | "VOLLEYBALL";

const SPORT_SURFACE_MAP: Record<SportType, { Surface: React.FC; w: number; h: number; bg: string }> = {
  ICE_HOCKEY: { Surface: IceHockeyRinkSurface, w: 200, h: 85, bg: "#f0f4f8" },
  FOOTBALL: { Surface: FootballPitchSurface, w: 210, h: 136, bg: "#3a7d32" },
  HANDBALL: { Surface: HandballCourtSurface, w: 200, h: 100, bg: "#c49a5c" },
  BASKETBALL: { Surface: BasketballCourtSurface, w: 280, h: 150, bg: "#b07838" },
  FLOORBALL: { Surface: FloorballRinkSurface, w: 200, h: 100, bg: "#e8e8e8" },
  VOLLEYBALL: { Surface: VolleyballCourtSurface, w: 180, h: 90, bg: "#d49530" },
};

const SPORT_MOVEMENT_LABELS: Record<SportType, Record<string, Record<string, string>>> = {
  ICE_HOCKEY: { sv: { skate: "Åkning", pass: "Passning", shot: "Skott", puck: "Puck" }, en: { skate: "Skate", pass: "Pass", shot: "Shot", puck: "Puck" } },
  FOOTBALL: { sv: { skate: "Löpning", pass: "Passning", shot: "Skott", puck: "Boll" }, en: { skate: "Run", pass: "Pass", shot: "Shot", puck: "Ball" } },
  HANDBALL: { sv: { skate: "Löpning", pass: "Passning", shot: "Skott", puck: "Boll" }, en: { skate: "Run", pass: "Pass", shot: "Shot", puck: "Ball" } },
  BASKETBALL: { sv: { skate: "Löpning", pass: "Passning", shot: "Skott", puck: "Boll" }, en: { skate: "Run", pass: "Pass", shot: "Shot", puck: "Ball" } },
  FLOORBALL: { sv: { skate: "Löpning", pass: "Passning", shot: "Skott", puck: "Boll" }, en: { skate: "Run", pass: "Pass", shot: "Shot", puck: "Ball" } },
  VOLLEYBALL: { sv: { skate: "Löpning", pass: "Passning", shot: "Smash", puck: "Boll" }, en: { skate: "Run", pass: "Pass", shot: "Spike", puck: "Ball" } },
};

// ─── Types (mirrors the DrillStructure from IceHockeyRink.tsx) ───────────

interface Player {
  id: string;
  x: number;
  y: number;
  label: string;
  team: "home" | "away";
  color?: string;
}

interface Movement {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: "skate" | "pass" | "shot" | "puck";
  playerId?: string | null;
  phase?: number;
  color?: string;
  dashed?: boolean;
}

interface Zone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label?: string;
}

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface DrillStructure {
  players: Player[];
  movements: Movement[];
  zones?: Zone[];
  annotations?: Annotation[];
}

// ─── Props ───────────────────────────────────────────────────────────────

export interface IceHockeyDrillAnimationProps {
  title: string;
  description?: string;
  structure: DrillStructure;
  locale?: "en" | "sv";
  sportType?: SportType;
}

// ─── Constants ───────────────────────────────────────────────────────────

const FPS = 30;
const PLAYER_APPEAR_DURATION = 20; // frames for players to fade in
const PHASE_GAP = 10; // pause frames between movement phases
const MOVEMENT_DURATION = 45; // frames per movement animation
const HOLD_END = 60; // frames to hold at end (show completion badge)

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Build a timeline from the movements array.
 * Legacy drills without phase values still play one movement after another.
 * New living-play drills can set the same phase number on several movements,
 * and those movements animate at the same time.
 */
function buildTimeline(movements: Movement[]) {
  let currentFrame = PLAYER_APPEAR_DURATION + 10; // start after players appear
  const timeline: {
    movement: Movement;
    startFrame: number;
    endFrame: number;
  }[] = [];

  const hasExplicitPhases = movements.some((m) => typeof m.phase === "number" && m.phase > 0);

  if (!hasExplicitPhases) {
    for (let i = 0; i < movements.length; i++) {
      const m = movements[i];
      const start = currentFrame;
      const end = start + MOVEMENT_DURATION;
      timeline.push({ movement: m, startFrame: start, endFrame: end });
      currentFrame = end + PHASE_GAP;
    }

    return { timeline, totalFrames: currentFrame + HOLD_END };
  }

  const phaseOrder = Array.from(new Set(movements.map((m, index) => m.phase ?? index + 1))).sort((a, b) => a - b);

  for (const phase of phaseOrder) {
    const phaseMovements = movements.filter((m, index) => (m.phase ?? index + 1) === phase);
    const start = currentFrame;
    const end = start + MOVEMENT_DURATION;
    for (const movement of phaseMovements) {
      timeline.push({ movement, startFrame: start, endFrame: end });
    }
    currentFrame = end + PHASE_GAP;
  }

  return { timeline, totalFrames: currentFrame + HOLD_END };
}

/**
 * Given the current frame and the timeline, compute where each player
 * currently is (applying movements that target them).
 */
function computePlayerPositions(
  players: Player[],
  timeline: { movement: Movement; startFrame: number; endFrame: number }[],
  frame: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const p of players) {
    positions.set(p.id, { x: p.x, y: p.y });
  }

  const phaseStarts = Array.from(new Set(timeline.map((entry) => entry.startFrame))).sort((a, b) => a - b);

  for (const phaseStart of phaseStarts) {
    const entries = timeline.filter((entry) => entry.startFrame === phaseStart && entry.movement.type === "skate");
    if (entries.length === 0) continue;

    const basePositions = new Map(positions);
    const usedPlayerIds = new Set<string>();
    const assignments = entries.map((entry) => {
      const explicitPlayer = entry.movement.playerId && players.some((p) => p.id === entry.movement.playerId)
        ? entry.movement.playerId
        : null;

      if (explicitPlayer && !usedPlayerIds.has(explicitPlayer)) {
        usedPlayerIds.add(explicitPlayer);
        return { entry, playerId: explicitPlayer };
      }

      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const p of players) {
        if (usedPlayerIds.has(p.id)) continue;
        const pos = basePositions.get(p.id)!;
        const dx = pos.x - entry.movement.fromX;
        const dy = pos.y - entry.movement.fromY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestId = p.id;
        }
      }

      if (bestId) usedPlayerIds.add(bestId);
      return { entry, playerId: bestId };
    });

    if (frame < phaseStart) continue;

    for (const assignment of assignments) {
      if (!assignment.playerId) continue;
      const { entry } = assignment;
      const basePos = basePositions.get(assignment.playerId);
      if (!basePos) continue;

      const progress = interpolate(
        frame,
        [entry.startFrame, entry.endFrame],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      positions.set(assignment.playerId, {
        x: interpolate(progress, [0, 1], [basePos.x, entry.movement.toX]),
        y: interpolate(progress, [0, 1], [basePos.y, entry.movement.toY]),
      });
    }
  }

  return positions;
}

// ─── Component ───────────────────────────────────────────────────────────

export const IceHockeyDrillAnimation: React.FC<IceHockeyDrillAnimationProps> = ({
  title,
  description,
  structure,
  locale = "en",
  sportType = "ICE_HOCKEY",
}) => {
  const sportSurface = SPORT_SURFACE_MAP[sportType] || SPORT_SURFACE_MAP.ICE_HOCKEY;
  const sportLabels = SPORT_MOVEMENT_LABELS[sportType]?.[locale] || SPORT_MOVEMENT_LABELS.ICE_HOCKEY[locale];
  const SurfaceComponent = sportSurface.Surface;
  const surfW = sportSurface.w;
  const surfH = sportSurface.h;
  const frame = useCurrentFrame();
  const { timeline, totalFrames: _ } = useMemo(
    () => buildTimeline(structure.movements),
    [structure.movements]
  );

  // Player fade-in progress
  const playerOpacity = interpolate(frame, [5, PLAYER_APPEAR_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Compute current player positions
  const playerPositions = useMemo(
    () => computePlayerPositions(structure.players, timeline, frame),
    [structure.players, timeline, frame]
  );

  // Build trails: accumulate positions over past frames for each player
  const playerTrails = useMemo(() => {
    const trails = new Map<string, { x: number; y: number }[]>();
    for (const p of structure.players) {
      const points: { x: number; y: number }[] = [];
      // Sample every 3 frames for performance
      for (let f = 0; f <= frame; f += 3) {
        const pos = computePlayerPositions(structure.players, timeline, f).get(p.id);
        if (pos) points.push(pos);
      }
      trails.set(p.id, points);
    }
    return trails;
  }, [structure.players, timeline, frame]);

  // Find puck movements and compute puck position
  const puckTimeline = timeline.filter(
    (t) => t.movement.type === "pass" || t.movement.type === "shot" || t.movement.type === "puck"
  );
  const activePuck = puckTimeline.find(
    (t) => frame >= t.startFrame && frame < t.endFrame + 15
  );

  const puckPos = useMemo(() => {
    if (!activePuck) return null;
    const progress = interpolate(
      frame,
      [activePuck.startFrame, activePuck.endFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return {
      x: interpolate(progress, [0, 1], [activePuck.movement.fromX, activePuck.movement.toX]),
      y: interpolate(progress, [0, 1], [activePuck.movement.fromY, activePuck.movement.toY]),
    };
  }, [activePuck, frame]);

  // Build phase labels from movements (sport-aware)
  const phases = useMemo(() => {
    const phaseStarts = Array.from(new Set(timeline.map((entry) => entry.startFrame))).sort((a, b) => a - b);
    return phaseStarts.map((startFrame, i) => {
      const entries = timeline.filter((entry) => entry.startFrame === startFrame);
      const firstType = entries[0]?.movement.type ?? "skate";
      const typeLabel = sportLabels[firstType] || firstType;
      const movementsLabel = locale === "sv" ? "rörelser" : "movements";
      return {
        label: entries.length > 1 ? `${i + 1}. ${entries.length} ${movementsLabel}` : `${i + 1}. ${typeLabel}`,
        startFrame,
        endFrame: Math.max(...entries.map((entry) => entry.endFrame)),
      };
    });
  }, [timeline, sportLabels]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: sportSurface.bg,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`-5 -10 ${surfW + 10} ${surfH + 20}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Sport surface (dynamic) */}
        <SurfaceComponent />

        {/* Zone overlays */}
        {structure.zones?.map((zone) => (
          <g key={zone.id}>
            <rect
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={zone.color}
              opacity={0.15}
              rx="2"
            />
            {zone.label && (
              <text
                x={zone.x + zone.width / 2}
                y={zone.y + zone.height / 2}
                textAnchor="middle"
                fontSize="3"
                fill={zone.color}
                fontWeight="bold"
              >
                {zone.label}
              </text>
            )}
          </g>
        ))}

        {/* Animated movement arrows */}
        {timeline.map((entry) => (
          <AnimatedMovement
            key={entry.movement.id}
            fromX={entry.movement.fromX}
            fromY={entry.movement.fromY}
            toX={entry.movement.toX}
            toY={entry.movement.toY}
            startFrame={entry.startFrame}
            endFrame={entry.endFrame}
            type={entry.movement.type}
            color={entry.movement.color}
          />
        ))}

        {/* Players */}
        {structure.players.map((p) => {
          const pos = playerPositions.get(p.id) || { x: p.x, y: p.y };
          const trail = playerTrails.get(p.id) || [];
          const fillColor = p.color || (p.team === "home" ? "#dc2626" : "#2563eb");

          return (
            <DrillPlayer
              key={p.id}
              x={pos.x}
              y={pos.y}
              label={p.label}
              color={fillColor}
              trail={trail}
              opacity={playerOpacity}
            />
          );
        })}

        {/* Puck */}
        {puckPos && <Puck x={puckPos.x} y={puckPos.y} />}

        {/* Annotations */}
        {structure.annotations?.map((a) => (
          <text
            key={a.id}
            x={a.x}
            y={a.y}
            textAnchor="middle"
            fontSize="2.8"
            fill="#1a1a1a"
            fontWeight="600"
            fontFamily="sans-serif"
            opacity={playerOpacity}
          >
            {a.text}
          </text>
        ))}

        {/* Phase overlay (title, progress, phase labels) */}
        <PhaseOverlay
          title={title}
          description={description}
          phases={phases}
          locale={locale}
        />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Calculate total frame duration for a given drill structure.
 * Used by the Remotion Composition and Player to set durationInFrames.
 */
export function calculateDrillDuration(movements: Movement[]): number {
  const { totalFrames } = buildTimeline(movements);
  return totalFrames;
}
