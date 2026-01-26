import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface IllinoisAgilityAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Course dimensions: 10m x 5m
const COURSE_LENGTH = 10;
const COURSE_WIDTH = 5;

// Cone positions (scaled for 800x400 canvas)
// Start/Finish line
const CONE_START = { x: 100, y: 320 };
const CONE_FINISH = { x: 100, y: 80 };

// Far corners
const CONE_FAR_BOTTOM = { x: 700, y: 320 };
const CONE_FAR_TOP = { x: 700, y: 80 };

// Center weaving cones (4 cones, 3.3m apart = ~80px spacing)
const WEAVE_CONES = [
  { x: 400, y: 280 },
  { x: 400, y: 200 },
  { x: 400, y: 120 },
];

// Animation phases (in frames at 30fps)
const PHASES = {
  coneSetup: { start: 0, end: 40 },
  athleteAppear: { start: 40, end: 55 },
  sprintUp: { start: 55, end: 100 },
  weaveDown: { start: 100, end: 200 },
  weaveUp: { start: 200, end: 300 },
  sprintDown: { start: 300, end: 345 },
  showResult: { start: 345, end: 400 },
};

// Translations
const translations = {
  en: {
    title: "Illinois Agility Test",
    start: "Start",
    finish: "Finish",
    meters: "m",
    instruction: "Lie prone at start, sprint to far cone, weave through center cones, sprint to finish",
  },
  sv: {
    title: "Illinois Agilitytest",
    start: "Start",
    finish: "Mål",
    meters: "m",
    instruction: "Ligg på magen vid start, sprinta till bortre konen, väv genom mittkoner, sprinta till mål",
  },
};

export const IllinoisAgilityAnimation: React.FC<IllinoisAgilityAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  // Calculate athlete position
  const athletePosition = useMemo(() => {
    if (frame < PHASES.sprintUp.start) {
      return CONE_START;
    }

    // Phase 1: Sprint up to far bottom corner
    if (frame < PHASES.weaveDown.start) {
      const progress = interpolate(
        frame,
        [PHASES.sprintUp.start, PHASES.sprintUp.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: interpolate(progress, [0, 1], [CONE_START.x, CONE_FAR_BOTTOM.x]),
        y: CONE_START.y,
      };
    }

    // Phase 2: Weave down through cones (going up visually)
    if (frame < PHASES.weaveUp.start) {
      const progress = interpolate(
        frame,
        [PHASES.weaveDown.start, PHASES.weaveDown.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

      // Create weaving path
      const weavePhase = progress * 4; // 4 segments
      const segment = Math.floor(weavePhase);
      const segmentProgress = weavePhase - segment;

      let x: number, y: number;

      if (segment === 0) {
        // Far corner to first weave cone (right side)
        x = interpolate(segmentProgress, [0, 1], [CONE_FAR_BOTTOM.x, WEAVE_CONES[0].x + 40]);
        y = interpolate(segmentProgress, [0, 1], [CONE_FAR_BOTTOM.y, WEAVE_CONES[0].y]);
      } else if (segment === 1) {
        // Weave left of second cone
        x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].x + 40, WEAVE_CONES[1].x - 40]);
        y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].y, WEAVE_CONES[1].y]);
      } else if (segment === 2) {
        // Weave right of third cone
        x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].x - 40, WEAVE_CONES[2].x + 40]);
        y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].y, WEAVE_CONES[2].y]);
      } else {
        // To far top corner
        x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].x + 40, CONE_FAR_TOP.x]);
        y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].y, CONE_FAR_TOP.y]);
      }

      return { x, y };
    }

    // Phase 3: Weave back (going down visually)
    if (frame < PHASES.sprintDown.start) {
      const progress = interpolate(
        frame,
        [PHASES.weaveUp.start, PHASES.weaveUp.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

      const weavePhase = progress * 4;
      const segment = Math.floor(weavePhase);
      const segmentProgress = weavePhase - segment;

      let x: number, y: number;

      if (segment === 0) {
        // Far top to third weave cone (left side)
        x = interpolate(segmentProgress, [0, 1], [CONE_FAR_TOP.x, WEAVE_CONES[2].x - 40]);
        y = interpolate(segmentProgress, [0, 1], [CONE_FAR_TOP.y, WEAVE_CONES[2].y]);
      } else if (segment === 1) {
        // Weave right of second cone
        x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].x - 40, WEAVE_CONES[1].x + 40]);
        y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].y, WEAVE_CONES[1].y]);
      } else if (segment === 2) {
        // Weave left of first cone
        x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].x + 40, WEAVE_CONES[0].x - 40]);
        y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].y, WEAVE_CONES[0].y]);
      } else {
        // To far bottom corner
        x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].x - 40, CONE_FAR_BOTTOM.x]);
        y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].y, CONE_FAR_BOTTOM.y]);
      }

      return { x, y };
    }

    // Phase 4: Sprint down to finish
    const progress = interpolate(
      frame,
      [PHASES.sprintDown.start, PHASES.sprintDown.end],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return {
      x: interpolate(progress, [0, 1], [CONE_FAR_BOTTOM.x, CONE_FINISH.x]),
      y: CONE_FINISH.y,
    };
  }, [frame]);

  // Build trail
  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];

    if (frame >= PHASES.sprintUp.start) {
      for (let f = PHASES.sprintUp.start; f <= Math.min(frame, PHASES.sprintDown.end); f += 4) {
        // Simplified - just add current position calculations for each frame
        // This is computationally expensive but acceptable for animation
        let x: number, y: number;

        if (f < PHASES.weaveDown.start) {
          const progress = interpolate(f, [PHASES.sprintUp.start, PHASES.sprintUp.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_START.x, CONE_FAR_BOTTOM.x]);
          y = CONE_START.y;
        } else if (f < PHASES.weaveUp.start) {
          const progress = interpolate(f, [PHASES.weaveDown.start, PHASES.weaveDown.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const weavePhase = progress * 4;
          const segment = Math.floor(weavePhase);
          const segmentProgress = weavePhase - segment;

          if (segment === 0) {
            x = interpolate(segmentProgress, [0, 1], [CONE_FAR_BOTTOM.x, WEAVE_CONES[0].x + 40]);
            y = interpolate(segmentProgress, [0, 1], [CONE_FAR_BOTTOM.y, WEAVE_CONES[0].y]);
          } else if (segment === 1) {
            x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].x + 40, WEAVE_CONES[1].x - 40]);
            y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].y, WEAVE_CONES[1].y]);
          } else if (segment === 2) {
            x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].x - 40, WEAVE_CONES[2].x + 40]);
            y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].y, WEAVE_CONES[2].y]);
          } else {
            x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].x + 40, CONE_FAR_TOP.x]);
            y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].y, CONE_FAR_TOP.y]);
          }
        } else if (f < PHASES.sprintDown.start) {
          const progress = interpolate(f, [PHASES.weaveUp.start, PHASES.weaveUp.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const weavePhase = progress * 4;
          const segment = Math.floor(weavePhase);
          const segmentProgress = weavePhase - segment;

          if (segment === 0) {
            x = interpolate(segmentProgress, [0, 1], [CONE_FAR_TOP.x, WEAVE_CONES[2].x - 40]);
            y = interpolate(segmentProgress, [0, 1], [CONE_FAR_TOP.y, WEAVE_CONES[2].y]);
          } else if (segment === 1) {
            x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].x - 40, WEAVE_CONES[1].x + 40]);
            y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[2].y, WEAVE_CONES[1].y]);
          } else if (segment === 2) {
            x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].x + 40, WEAVE_CONES[0].x - 40]);
            y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[1].y, WEAVE_CONES[0].y]);
          } else {
            x = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].x - 40, CONE_FAR_BOTTOM.x]);
            y = interpolate(segmentProgress, [0, 1], [WEAVE_CONES[0].y, CONE_FAR_BOTTOM.y]);
          }
        } else {
          const progress = interpolate(f, [PHASES.sprintDown.start, PHASES.sprintDown.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_FAR_BOTTOM.x, CONE_FINISH.x]);
          y = CONE_FINISH.y;
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

      {/* Course outline */}
      <rect
        x={100}
        y={80}
        width={600}
        height={240}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Distance labels */}
      <text x={400} y={60} textAnchor="middle" fill="#64748b" fontSize={12}>
        {COURSE_LENGTH} {t.meters}
      </text>
      <text x={720} y={200} fill="#64748b" fontSize={12}>
        {COURSE_WIDTH} {t.meters}
      </text>

      {/* Corner cones */}
      <Cone x={CONE_START.x} y={CONE_START.y} label={t.start} delay={0} />
      <Cone x={CONE_FINISH.x} y={CONE_FINISH.y} label={t.finish} delay={5} />
      <Cone x={CONE_FAR_BOTTOM.x} y={CONE_FAR_BOTTOM.y} delay={10} />
      <Cone x={CONE_FAR_TOP.x} y={CONE_FAR_TOP.y} delay={15} />

      {/* Weaving cones */}
      {WEAVE_CONES.map((cone, i) => (
        <Cone key={i} x={cone.x} y={cone.y} delay={20 + i * 5} />
      ))}

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
        startFrame={PHASES.sprintUp.start}
        endFrame={PHASES.sprintDown.end}
        finalTime={athleteTime}
        benchmarkTier={benchmarkTier}
        locale={locale}
      />

      {/* Instructions */}
      {frame < PHASES.athleteAppear.end && (
        <text
          x={400}
          y={385}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {t.instruction}
        </text>
      )}
    </DrillAnimation>
  );
};
