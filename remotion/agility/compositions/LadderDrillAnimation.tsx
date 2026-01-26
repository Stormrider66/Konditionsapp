import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface LadderDrillAnimationProps {
  drillType: "icky-shuffle" | "lateral-shuffle" | "high-knees" | "in-out";
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Ladder dimensions
const LADDER = {
  startX: 150,
  endX: 650,
  y: 200,
  width: 60,
  rungs: 10,
};

const rungSpacing = (LADDER.endX - LADDER.startX) / LADDER.rungs;

// Animation phases
const PHASES = {
  ladderSetup: { start: 0, end: 30 },
  athleteAppear: { start: 30, end: 45 },
  drill: { start: 45, end: 225 },
  showResult: { start: 225, end: 285 },
};

const translations = {
  en: {
    "icky-shuffle": {
      title: "Icky Shuffle",
      instruction: "In-in-out footwork pattern through ladder",
    },
    "lateral-shuffle": {
      title: "Lateral Shuffle",
      instruction: "Side-to-side quick feet through ladder",
    },
    "high-knees": {
      title: "High Knees",
      instruction: "One foot in each square with high knee drive",
    },
    "in-out": {
      title: "In-Out Drill",
      instruction: "Both feet in, both feet out through ladder",
    },
  },
  sv: {
    "icky-shuffle": {
      title: "Icky Shuffle",
      instruction: "In-in-ut fotmönster genom stegen",
    },
    "lateral-shuffle": {
      title: "Lateral Shuffle",
      instruction: "Sida-till-sida snabba fötter genom stegen",
    },
    "high-knees": {
      title: "Höga Knän",
      instruction: "En fot i varje ruta med högt knälyft",
    },
    "in-out": {
      title: "In-Ut Övning",
      instruction: "Båda fötterna in, båda fötterna ut genom stegen",
    },
  },
};

// Generate movement pattern based on drill type
function getMovementPattern(drillType: LadderDrillAnimationProps["drillType"]) {
  const points: { x: number; y: number }[] = [];

  switch (drillType) {
    case "icky-shuffle":
      // In-in-out pattern: zigzag through ladder
      for (let i = 0; i <= LADDER.rungs; i++) {
        const baseX = LADDER.startX + i * rungSpacing;
        if (i % 2 === 0) {
          points.push({ x: baseX, y: LADDER.y - 15 }); // Left side
          points.push({ x: baseX + rungSpacing / 2, y: LADDER.y }); // Center
        } else {
          points.push({ x: baseX, y: LADDER.y + 15 }); // Right side
          points.push({ x: baseX + rungSpacing / 2, y: LADDER.y }); // Center
        }
      }
      break;

    case "lateral-shuffle":
      // Side-to-side through each rung
      for (let i = 0; i <= LADDER.rungs; i++) {
        const baseX = LADDER.startX + i * rungSpacing;
        points.push({ x: baseX, y: LADDER.y - 25 }); // Above ladder
        points.push({ x: baseX, y: LADDER.y }); // In ladder
        points.push({ x: baseX, y: LADDER.y + 25 }); // Below ladder
        points.push({ x: baseX, y: LADDER.y }); // Back in ladder
      }
      break;

    case "high-knees":
      // Straight through, one foot per square
      for (let i = 0; i <= LADDER.rungs; i++) {
        const baseX = LADDER.startX + i * rungSpacing;
        // Slight vertical bounce to show high knee action
        points.push({ x: baseX, y: LADDER.y - 5 });
        points.push({ x: baseX + rungSpacing / 2, y: LADDER.y + 5 });
      }
      break;

    case "in-out":
      // Wide stance in-out pattern
      for (let i = 0; i <= LADDER.rungs; i++) {
        const baseX = LADDER.startX + i * rungSpacing;
        points.push({ x: baseX, y: LADDER.y }); // In (feet together)
        points.push({ x: baseX + rungSpacing / 3, y: LADDER.y - 20 }); // Out left
        points.push({ x: baseX + rungSpacing * 2 / 3, y: LADDER.y + 20 }); // Out right
      }
      break;
  }

  return points;
}

export const LadderDrillAnimation: React.FC<LadderDrillAnimationProps> = ({
  drillType,
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale][drillType];

  const movementPattern = useMemo(() => getMovementPattern(drillType), [drillType]);

  const athletePosition = useMemo(() => {
    if (frame < PHASES.drill.start) {
      return { x: LADDER.startX - 30, y: LADDER.y };
    }

    if (frame >= PHASES.showResult.start) {
      return { x: LADDER.endX + 30, y: LADDER.y };
    }

    const progress = interpolate(
      frame,
      [PHASES.drill.start, PHASES.drill.end],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Find position along the movement pattern
    const patternProgress = progress * (movementPattern.length - 1);
    const index = Math.floor(patternProgress);
    const subProgress = patternProgress - index;

    if (index >= movementPattern.length - 1) {
      return movementPattern[movementPattern.length - 1];
    }

    const from = movementPattern[index];
    const to = movementPattern[index + 1];

    return {
      x: interpolate(subProgress, [0, 1], [from.x, to.x]),
      y: interpolate(subProgress, [0, 1], [from.y, to.y]),
    };
  }, [frame, movementPattern]);

  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];

    if (frame >= PHASES.drill.start) {
      const endFrame = Math.min(frame, PHASES.drill.end);

      for (let f = PHASES.drill.start; f <= endFrame; f += 2) {
        const progress = interpolate(
          f,
          [PHASES.drill.start, PHASES.drill.end],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const patternProgress = progress * (movementPattern.length - 1);
        const index = Math.floor(patternProgress);
        const subProgress = patternProgress - index;

        if (index >= movementPattern.length - 1) {
          points.push(movementPattern[movementPattern.length - 1]);
        } else {
          const from = movementPattern[index];
          const to = movementPattern[index + 1];
          points.push({
            x: interpolate(subProgress, [0, 1], [from.x, to.x]),
            y: interpolate(subProgress, [0, 1], [from.y, to.y]),
          });
        }
      }
    }

    return points;
  }, [frame, movementPattern]);

  const showAthlete = frame >= PHASES.athleteAppear.start;

  // Animate ladder appearance
  const ladderOpacity = interpolate(
    frame,
    [PHASES.ladderSetup.start, PHASES.ladderSetup.end],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <DrillAnimation>
      <text x={400} y={35} textAnchor="middle" fill="#1e293b" fontSize={24} fontFamily="system-ui, sans-serif" fontWeight="bold">
        {t.title}
      </text>

      {/* Agility Ladder */}
      <g opacity={ladderOpacity}>
        {/* Ladder rails */}
        <line
          x1={LADDER.startX}
          y1={LADDER.y - LADDER.width / 2}
          x2={LADDER.endX}
          y2={LADDER.y - LADDER.width / 2}
          stroke="#f97316"
          strokeWidth={4}
        />
        <line
          x1={LADDER.startX}
          y1={LADDER.y + LADDER.width / 2}
          x2={LADDER.endX}
          y2={LADDER.y + LADDER.width / 2}
          stroke="#f97316"
          strokeWidth={4}
        />

        {/* Ladder rungs */}
        {Array.from({ length: LADDER.rungs + 1 }).map((_, i) => {
          const x = LADDER.startX + i * rungSpacing;
          return (
            <line
              key={i}
              x1={x}
              y1={LADDER.y - LADDER.width / 2}
              x2={x}
              y2={LADDER.y + LADDER.width / 2}
              stroke="#f97316"
              strokeWidth={2}
            />
          );
        })}

        {/* Square numbers */}
        {Array.from({ length: LADDER.rungs }).map((_, i) => {
          const x = LADDER.startX + i * rungSpacing + rungSpacing / 2;
          return (
            <text
              key={i}
              x={x}
              y={LADDER.y + 5}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={12}
            >
              {i + 1}
            </text>
          );
        })}
      </g>

      {/* Start/Finish markers */}
      <text x={LADDER.startX - 30} y={LADDER.y - LADDER.width / 2 - 10} textAnchor="middle" fill="#64748b" fontSize={12}>
        {locale === "sv" ? "Start" : "Start"}
      </text>
      <text x={LADDER.endX + 30} y={LADDER.y - LADDER.width / 2 - 10} textAnchor="middle" fill="#22c55e" fontSize={12}>
        {locale === "sv" ? "Mål" : "Finish"}
      </text>

      {/* Direction arrow */}
      <path
        d={`M ${LADDER.startX + 20} ${LADDER.y + 60} L ${LADDER.endX - 20} ${LADDER.y + 60}`}
        stroke="#cbd5e1"
        strokeWidth={2}
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
        </marker>
      </defs>

      {showAthlete && <Athlete x={athletePosition.x} y={athletePosition.y} trail={trail} />}

      <TimingOverlay
        startFrame={PHASES.drill.start}
        endFrame={PHASES.drill.end}
        finalTime={athleteTime}
        benchmarkTier={benchmarkTier}
        locale={locale}
      />

      {frame < PHASES.athleteAppear.end && (
        <text x={400} y={370} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="system-ui, sans-serif">
          {t.instruction}
        </text>
      )}
    </DrillAnimation>
  );
};
