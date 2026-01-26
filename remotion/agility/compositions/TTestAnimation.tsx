import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface TTestAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Distances in meters
const FORWARD_DISTANCE = 10; // 10m forward
const LATERAL_DISTANCE = 5; // 5m to each side

// Cone positions (top-down view)
const CONE_START = { x: 400, y: 350 };
const CONE_CENTER = { x: 400, y: 150 };
const CONE_LEFT = { x: 250, y: 150 };
const CONE_RIGHT = { x: 550, y: 150 };

// Animation phases (in frames at 30fps)
const PHASES = {
  coneSetup: { start: 0, end: 30 },
  athleteAppear: { start: 30, end: 50 },
  sprintForward: { start: 50, end: 110 },
  shuffleLeft: { start: 110, end: 160 },
  shuffleRight: { start: 160, end: 260 },
  shuffleCenter: { start: 260, end: 310 },
  backpedal: { start: 310, end: 370 },
  showResult: { start: 370, end: 420 },
};

// Translations
const translations = {
  en: {
    title: "T-Test Agility Drill",
    start: "Start",
    center: "Center",
    left: "Left",
    right: "Right",
    meters: "m",
    instruction: "Sprint forward, shuffle left, shuffle right, shuffle to center, backpedal to start",
  },
  sv: {
    title: "T-Test Agilityövning",
    start: "Start",
    center: "Mitt",
    left: "Vänster",
    right: "Höger",
    meters: "m",
    instruction: "Sprinta framåt, sidosteg vänster, sidosteg höger, sidosteg till mitten, backa till start",
  },
};

export const TTestAnimation: React.FC<TTestAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  // Calculate athlete position based on current frame
  const athletePosition = useMemo(() => {
    // Before movement starts
    if (frame < PHASES.sprintForward.start) {
      return CONE_START;
    }

    // Phase 1: Sprint forward (start to center)
    if (frame < PHASES.shuffleLeft.start) {
      const progress = interpolate(
        frame,
        [PHASES.sprintForward.start, PHASES.sprintForward.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: CONE_START.x,
        y: interpolate(progress, [0, 1], [CONE_START.y, CONE_CENTER.y]),
      };
    }

    // Phase 2: Shuffle left (center to left)
    if (frame < PHASES.shuffleRight.start) {
      const progress = interpolate(
        frame,
        [PHASES.shuffleLeft.start, PHASES.shuffleLeft.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_LEFT.x]),
        y: CONE_CENTER.y,
      };
    }

    // Phase 3: Shuffle right (left to right - 10m total)
    if (frame < PHASES.shuffleCenter.start) {
      const progress = interpolate(
        frame,
        [PHASES.shuffleRight.start, PHASES.shuffleRight.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: interpolate(progress, [0, 1], [CONE_LEFT.x, CONE_RIGHT.x]),
        y: CONE_CENTER.y,
      };
    }

    // Phase 4: Shuffle back to center (right to center)
    if (frame < PHASES.backpedal.start) {
      const progress = interpolate(
        frame,
        [PHASES.shuffleCenter.start, PHASES.shuffleCenter.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: interpolate(progress, [0, 1], [CONE_RIGHT.x, CONE_CENTER.x]),
        y: CONE_CENTER.y,
      };
    }

    // Phase 5: Backpedal (center to start)
    const progress = interpolate(
      frame,
      [PHASES.backpedal.start, PHASES.backpedal.end],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return {
      x: CONE_CENTER.x,
      y: interpolate(progress, [0, 1], [CONE_CENTER.y, CONE_START.y]),
    };
  }, [frame]);

  // Build trail from movement history
  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];

    if (frame >= PHASES.sprintForward.start) {
      for (let f = PHASES.sprintForward.start; f <= Math.min(frame, PHASES.backpedal.end); f += 3) {
        let x: number, y: number;

        if (f < PHASES.shuffleLeft.start) {
          const progress = interpolate(
            f,
            [PHASES.sprintForward.start, PHASES.sprintForward.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = CONE_START.x;
          y = interpolate(progress, [0, 1], [CONE_START.y, CONE_CENTER.y]);
        } else if (f < PHASES.shuffleRight.start) {
          const progress = interpolate(
            f,
            [PHASES.shuffleLeft.start, PHASES.shuffleLeft.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_LEFT.x]);
          y = CONE_CENTER.y;
        } else if (f < PHASES.shuffleCenter.start) {
          const progress = interpolate(
            f,
            [PHASES.shuffleRight.start, PHASES.shuffleRight.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = interpolate(progress, [0, 1], [CONE_LEFT.x, CONE_RIGHT.x]);
          y = CONE_CENTER.y;
        } else if (f < PHASES.backpedal.start) {
          const progress = interpolate(
            f,
            [PHASES.shuffleCenter.start, PHASES.shuffleCenter.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = interpolate(progress, [0, 1], [CONE_RIGHT.x, CONE_CENTER.x]);
          y = CONE_CENTER.y;
        } else {
          const progress = interpolate(
            f,
            [PHASES.backpedal.start, PHASES.backpedal.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = CONE_CENTER.x;
          y = interpolate(progress, [0, 1], [CONE_CENTER.y, CONE_START.y]);
        }

        points.push({ x, y });
      }
    }

    return points;
  }, [frame]);

  const showAthlete = frame >= PHASES.athleteAppear.start;

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

      {/* Distance labels */}
      <g>
        {/* Forward distance (Start to Center) */}
        <line x1={430} y1={CONE_START.y - 10} x2={430} y2={CONE_CENTER.y + 30} stroke="#cbd5e1" strokeWidth={1} />
        <text
          x={450}
          y={(CONE_START.y + CONE_CENTER.y) / 2}
          fill="#64748b"
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        >
          {FORWARD_DISTANCE} {t.meters}
        </text>

        {/* Lateral distance (Center to Left) */}
        <line x1={CONE_LEFT.x + 15} y1={120} x2={CONE_CENTER.x - 15} y2={120} stroke="#cbd5e1" strokeWidth={1} />
        <text
          x={(CONE_LEFT.x + CONE_CENTER.x) / 2}
          y={115}
          textAnchor="middle"
          fill="#64748b"
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        >
          {LATERAL_DISTANCE} {t.meters}
        </text>

        {/* Lateral distance (Center to Right) */}
        <line x1={CONE_CENTER.x + 15} y1={120} x2={CONE_RIGHT.x - 15} y2={120} stroke="#cbd5e1" strokeWidth={1} />
        <text
          x={(CONE_CENTER.x + CONE_RIGHT.x) / 2}
          y={115}
          textAnchor="middle"
          fill="#64748b"
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        >
          {LATERAL_DISTANCE} {t.meters}
        </text>
      </g>

      {/* T-shape outline */}
      <path
        d={`M ${CONE_START.x} ${CONE_START.y} L ${CONE_CENTER.x} ${CONE_CENTER.y} M ${CONE_LEFT.x} ${CONE_LEFT.y} L ${CONE_RIGHT.x} ${CONE_RIGHT.y}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Cones */}
      <Cone x={CONE_START.x} y={CONE_START.y} label={t.start} delay={0} />
      <Cone x={CONE_CENTER.x} y={CONE_CENTER.y} label={t.center} delay={8} />
      <Cone x={CONE_LEFT.x} y={CONE_LEFT.y} label={t.left} delay={16} />
      <Cone x={CONE_RIGHT.x} y={CONE_RIGHT.y} label={t.right} delay={24} />

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
        endFrame={PHASES.backpedal.end}
        finalTime={athleteTime}
        benchmarkTier={benchmarkTier}
        locale={locale}
      />

      {/* Instructions */}
      {frame < PHASES.athleteAppear.end && (
        <text
          x={400}
          y={390}
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
