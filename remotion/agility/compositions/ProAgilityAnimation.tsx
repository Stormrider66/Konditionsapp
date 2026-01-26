import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { MovementPath } from "../components/MovementPath";
import { TimingOverlay } from "../components/TimingOverlay";

interface ProAgilityAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// 5 yards = 4.57 meters
const DISTANCE_SHORT = 4.57;
const DISTANCE_LONG = 9.14;

// Cone positions (top-down view)
const CONE_LEFT = { x: 200, y: 200 };
const CONE_CENTER = { x: 400, y: 200 };
const CONE_RIGHT = { x: 600, y: 200 };

// Animation phases (in frames at 30fps)
const PHASES = {
  coneSetup: { start: 0, end: 30 },
  athleteAppear: { start: 30, end: 60 },
  sprintRight: { start: 60, end: 120 },
  sprintLeft: { start: 120, end: 240 },
  sprintFinish: { start: 240, end: 300 },
  showResult: { start: 300, end: 360 },
};

// Translations
const translations = {
  en: {
    title: "5-10-5 Pro Agility Drill",
    left: "Left",
    right: "Right",
    startFinish: "Start/Finish",
    sprintRight: "Sprint Right",
    sprintLeft: "Sprint Left",
    finish: "Finish",
    meters: "m",
    instruction: "Athlete starts in 3-point stance at center cone",
  },
  sv: {
    title: "5-10-5 Pro Agility Test",
    left: "Vänster",
    right: "Höger",
    startFinish: "Start/Mål",
    sprintRight: "Sprint höger",
    sprintLeft: "Sprint vänster",
    finish: "Mål",
    meters: "m",
    instruction: "Idrottaren startar i 3-punktsställning vid mittkonen",
  },
};

export const ProAgilityAnimation: React.FC<ProAgilityAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  // Calculate athlete position based on current frame
  const athletePosition = useMemo(() => {
    // Before movement starts
    if (frame < PHASES.sprintRight.start) {
      return CONE_CENTER;
    }

    // Phase 1: Sprint right (center to right)
    if (frame < PHASES.sprintLeft.start) {
      const progress = interpolate(
        frame,
        [PHASES.sprintRight.start, PHASES.sprintRight.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_RIGHT.x]),
        y: CONE_CENTER.y,
      };
    }

    // Phase 2: Sprint left (right to left)
    if (frame < PHASES.sprintFinish.start) {
      const progress = interpolate(
        frame,
        [PHASES.sprintLeft.start, PHASES.sprintLeft.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: interpolate(progress, [0, 1], [CONE_RIGHT.x, CONE_LEFT.x]),
        y: CONE_CENTER.y,
      };
    }

    // Phase 3: Sprint to finish (left to center)
    const progress = interpolate(
      frame,
      [PHASES.sprintFinish.start, PHASES.sprintFinish.end],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return {
      x: interpolate(progress, [0, 1], [CONE_LEFT.x, CONE_CENTER.x]),
      y: CONE_CENTER.y,
    };
  }, [frame]);

  // Build trail from movement history
  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];

    if (frame >= PHASES.sprintRight.start) {
      // Add points for the trail
      for (let f = PHASES.sprintRight.start; f <= Math.min(frame, PHASES.sprintFinish.end); f += 3) {
        let x: number;

        if (f < PHASES.sprintLeft.start) {
          const progress = interpolate(
            f,
            [PHASES.sprintRight.start, PHASES.sprintRight.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_RIGHT.x]);
        } else if (f < PHASES.sprintFinish.start) {
          const progress = interpolate(
            f,
            [PHASES.sprintLeft.start, PHASES.sprintLeft.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = interpolate(progress, [0, 1], [CONE_RIGHT.x, CONE_LEFT.x]);
        } else {
          const progress = interpolate(
            f,
            [PHASES.sprintFinish.start, PHASES.sprintFinish.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          x = interpolate(progress, [0, 1], [CONE_LEFT.x, CONE_CENTER.x]);
        }

        points.push({ x, y: CONE_CENTER.y });
      }
    }

    return points;
  }, [frame]);

  // Movement path segments
  const pathSegments = [
    {
      from: CONE_CENTER,
      to: CONE_RIGHT,
      startFrame: PHASES.sprintRight.start,
      endFrame: PHASES.sprintRight.end,
      label: `${DISTANCE_SHORT}${t.meters}`,
    },
    {
      from: CONE_RIGHT,
      to: CONE_LEFT,
      startFrame: PHASES.sprintLeft.start,
      endFrame: PHASES.sprintLeft.end,
      label: `${DISTANCE_LONG}${t.meters}`,
    },
    {
      from: CONE_LEFT,
      to: CONE_CENTER,
      startFrame: PHASES.sprintFinish.start,
      endFrame: PHASES.sprintFinish.end,
      label: `${DISTANCE_SHORT}${t.meters}`,
    },
  ];

  const showAthlete = frame >= PHASES.athleteAppear.start;
  const showStance = frame >= PHASES.athleteAppear.start && frame < PHASES.sprintRight.start;

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

      {/* Distance labels between cones */}
      <g>
        {/* Left to Center distance */}
        <line x1={220} y1={140} x2={380} y2={140} stroke="#cbd5e1" strokeWidth={1} />
        <text
          x={300}
          y={135}
          textAnchor="middle"
          fill="#64748b"
          fontSize={14}
          fontFamily="system-ui, sans-serif"
        >
          {DISTANCE_SHORT} {t.meters}
        </text>

        {/* Center to Right distance */}
        <line x1={420} y1={140} x2={580} y2={140} stroke="#cbd5e1" strokeWidth={1} />
        <text
          x={500}
          y={135}
          textAnchor="middle"
          fill="#64748b"
          fontSize={14}
          fontFamily="system-ui, sans-serif"
        >
          {DISTANCE_SHORT} {t.meters}
        </text>
      </g>

      {/* Movement path preview */}
      <MovementPath segments={pathSegments} />

      {/* Cones */}
      <Cone x={CONE_LEFT.x} y={CONE_LEFT.y} label={t.left} delay={0} />
      <Cone x={CONE_CENTER.x} y={CONE_CENTER.y} label={t.startFinish} delay={10} />
      <Cone x={CONE_RIGHT.x} y={CONE_RIGHT.y} label={t.right} delay={20} />

      {/* Athlete */}
      {showAthlete && (
        <Athlete
          x={athletePosition.x}
          y={athletePosition.y}
          trail={trail}
          showStance={showStance}
        />
      )}

      {/* Timing overlay */}
      <TimingOverlay
        startFrame={PHASES.sprintRight.start}
        endFrame={PHASES.sprintFinish.end}
        finalTime={athleteTime}
        benchmarkTier={benchmarkTier}
        locale={locale}
      />

      {/* Instructions */}
      {frame < PHASES.athleteAppear.end && (
        <text
          x={400}
          y={320}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={14}
          fontFamily="system-ui, sans-serif"
        >
          {t.instruction}
        </text>
      )}
    </DrillAnimation>
  );
};
