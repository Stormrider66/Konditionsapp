import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface BoxDrillAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Box dimensions: 5m x 5m
const BOX_SIZE = 5;

// Cone positions (5m box scaled to fit canvas)
const CONE_1 = { x: 250, y: 300 }; // Start (bottom-left)
const CONE_2 = { x: 250, y: 100 }; // Top-left
const CONE_3 = { x: 550, y: 100 }; // Top-right
const CONE_4 = { x: 550, y: 300 }; // Bottom-right

// Animation phases (in frames at 30fps)
const PHASES = {
  coneSetup: { start: 0, end: 30 },
  athleteAppear: { start: 30, end: 45 },
  sprintForward: { start: 45, end: 95 },   // Sprint to cone 2
  shuffleRight: { start: 95, end: 145 },   // Shuffle to cone 3
  backpedal: { start: 145, end: 195 },     // Backpedal to cone 4
  shuffleLeft: { start: 195, end: 245 },   // Shuffle back to start
  showResult: { start: 245, end: 300 },
};

// Translations
const translations = {
  en: {
    title: "Box Drill",
    cone1: "Start",
    cone2: "2",
    cone3: "3",
    cone4: "4",
    meters: "m",
    sprint: "Sprint",
    shuffle: "Shuffle",
    backpedal: "Backpedal",
    instruction: "Sprint forward, shuffle right, backpedal, shuffle left to start",
  },
  sv: {
    title: "Rutövning",
    cone1: "Start",
    cone2: "2",
    cone3: "3",
    cone4: "4",
    meters: "m",
    sprint: "Sprint",
    shuffle: "Sidosteg",
    backpedal: "Backa",
    instruction: "Sprinta framåt, sidosteg höger, backa, sidosteg vänster till start",
  },
};

export const BoxDrillAnimation: React.FC<BoxDrillAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  // Calculate athlete position
  const athletePosition = useMemo(() => {
    if (frame < PHASES.sprintForward.start) {
      return CONE_1;
    }

    // Phase 1: Sprint forward (1 to 2)
    if (frame < PHASES.shuffleRight.start) {
      const progress = interpolate(
        frame,
        [PHASES.sprintForward.start, PHASES.sprintForward.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: CONE_1.x,
        y: interpolate(progress, [0, 1], [CONE_1.y, CONE_2.y]),
      };
    }

    // Phase 2: Shuffle right (2 to 3)
    if (frame < PHASES.backpedal.start) {
      const progress = interpolate(
        frame,
        [PHASES.shuffleRight.start, PHASES.shuffleRight.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: interpolate(progress, [0, 1], [CONE_2.x, CONE_3.x]),
        y: CONE_2.y,
      };
    }

    // Phase 3: Backpedal (3 to 4)
    if (frame < PHASES.shuffleLeft.start) {
      const progress = interpolate(
        frame,
        [PHASES.backpedal.start, PHASES.backpedal.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: CONE_3.x,
        y: interpolate(progress, [0, 1], [CONE_3.y, CONE_4.y]),
      };
    }

    // Phase 4: Shuffle left (4 to 1)
    const progress = interpolate(
      frame,
      [PHASES.shuffleLeft.start, PHASES.shuffleLeft.end],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return {
      x: interpolate(progress, [0, 1], [CONE_4.x, CONE_1.x]),
      y: CONE_4.y,
    };
  }, [frame]);

  // Build trail
  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];

    if (frame >= PHASES.sprintForward.start) {
      for (let f = PHASES.sprintForward.start; f <= Math.min(frame, PHASES.shuffleLeft.end); f += 3) {
        let x: number, y: number;

        if (f < PHASES.shuffleRight.start) {
          const progress = interpolate(f, [PHASES.sprintForward.start, PHASES.sprintForward.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = CONE_1.x;
          y = interpolate(progress, [0, 1], [CONE_1.y, CONE_2.y]);
        } else if (f < PHASES.backpedal.start) {
          const progress = interpolate(f, [PHASES.shuffleRight.start, PHASES.shuffleRight.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_2.x, CONE_3.x]);
          y = CONE_2.y;
        } else if (f < PHASES.shuffleLeft.start) {
          const progress = interpolate(f, [PHASES.backpedal.start, PHASES.backpedal.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = CONE_3.x;
          y = interpolate(progress, [0, 1], [CONE_3.y, CONE_4.y]);
        } else {
          const progress = interpolate(f, [PHASES.shuffleLeft.start, PHASES.shuffleLeft.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_4.x, CONE_1.x]);
          y = CONE_4.y;
        }

        points.push({ x, y });
      }
    }

    return points;
  }, [frame]);

  const showAthlete = frame >= PHASES.athleteAppear.start;

  // Movement type indicators
  const showMovementLabels = frame >= PHASES.sprintForward.start && frame < PHASES.showResult.start;

  return (
    <DrillAnimation>
      {/* Title */}
      <text
        x={400}
        y={35}
        textAnchor="middle"
        fill="#1e293b"
        fontSize={24}
        fontFamily="system-ui, sans-serif"
        fontWeight="bold"
      >
        {t.title}
      </text>

      {/* Box outline */}
      <rect
        x={CONE_1.x}
        y={CONE_2.y}
        width={CONE_3.x - CONE_2.x}
        height={CONE_1.y - CONE_2.y}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Distance labels */}
      <text x={(CONE_1.x + CONE_4.x) / 2} y={CONE_1.y + 35} textAnchor="middle" fill="#64748b" fontSize={14}>
        {BOX_SIZE} {t.meters}
      </text>
      <text x={CONE_1.x - 30} y={(CONE_1.y + CONE_2.y) / 2} fill="#64748b" fontSize={14} textAnchor="middle">
        {BOX_SIZE} {t.meters}
      </text>

      {/* Movement type labels */}
      {showMovementLabels && (
        <g>
          {/* Sprint label */}
          {frame >= PHASES.sprintForward.start && frame < PHASES.shuffleRight.start && (
            <text x={CONE_1.x - 60} y={(CONE_1.y + CONE_2.y) / 2} fill="#3b82f6" fontSize={12} fontWeight="bold">
              {t.sprint} ↑
            </text>
          )}
          {/* Shuffle right label */}
          {frame >= PHASES.shuffleRight.start && frame < PHASES.backpedal.start && (
            <text x={(CONE_2.x + CONE_3.x) / 2} y={CONE_2.y - 15} textAnchor="middle" fill="#3b82f6" fontSize={12} fontWeight="bold">
              {t.shuffle} →
            </text>
          )}
          {/* Backpedal label */}
          {frame >= PHASES.backpedal.start && frame < PHASES.shuffleLeft.start && (
            <text x={CONE_3.x + 60} y={(CONE_3.y + CONE_4.y) / 2} fill="#3b82f6" fontSize={12} fontWeight="bold">
              {t.backpedal} ↓
            </text>
          )}
          {/* Shuffle left label */}
          {frame >= PHASES.shuffleLeft.start && (
            <text x={(CONE_1.x + CONE_4.x) / 2} y={CONE_4.y + 50} textAnchor="middle" fill="#3b82f6" fontSize={12} fontWeight="bold">
              ← {t.shuffle}
            </text>
          )}
        </g>
      )}

      {/* Cones */}
      <Cone x={CONE_1.x} y={CONE_1.y} label={t.cone1} delay={0} />
      <Cone x={CONE_2.x} y={CONE_2.y} label={t.cone2} delay={8} />
      <Cone x={CONE_3.x} y={CONE_3.y} label={t.cone3} delay={16} />
      <Cone x={CONE_4.x} y={CONE_4.y} label={t.cone4} delay={24} />

      {/* Athlete */}
      {showAthlete && (
        <Athlete
          x={athletePosition.x}
          y={athletePosition.y}
          trail={trail}
        />
      )}

      {/* Timing overlay */}
      <TimingOverlay
        startFrame={PHASES.sprintForward.start}
        endFrame={PHASES.shuffleLeft.end}
        finalTime={athleteTime}
        benchmarkTier={benchmarkTier}
        locale={locale}
      />

      {/* Instructions */}
      {frame < PHASES.athleteAppear.end && (
        <text
          x={400}
          y={375}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        >
          {t.instruction}
        </text>
      )}
    </DrillAnimation>
  );
};
