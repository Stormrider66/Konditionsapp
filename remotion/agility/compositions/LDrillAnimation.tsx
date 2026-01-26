import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface LDrillAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// 5 yards = 4.57 meters between cones
const DISTANCE = 4.57;

// Cone positions in L-shape
const CONE_A = { x: 250, y: 300 }; // Start
const CONE_B = { x: 250, y: 150 }; // Top (5 yards up)
const CONE_C = { x: 500, y: 150 }; // Right (5 yards right from B)

// Animation phases (in frames at 30fps)
const PHASES = {
  coneSetup: { start: 0, end: 30 },
  athleteAppear: { start: 30, end: 45 },
  sprintToB: { start: 45, end: 85 },      // Sprint to B, touch line
  returnToA: { start: 85, end: 125 },     // Return to A
  sprintToB2: { start: 125, end: 165 },   // Sprint to B again
  turnAroundB: { start: 165, end: 200 },  // Turn around B to C side
  weaveToC: { start: 200, end: 250 },     // Weave around C
  weaveBack: { start: 250, end: 300 },    // Figure-8 back around B
  finishToA: { start: 300, end: 340 },    // Sprint finish to A
  showResult: { start: 340, end: 400 },
};

// Translations
const translations = {
  en: {
    title: "L-Drill (3 Cone Drill)",
    coneA: "A (Start)",
    coneB: "B",
    coneC: "C",
    meters: "m",
    instruction: "Sprint A→B→A, sprint to B, turn, weave figure-8 around B and C, return to A",
  },
  sv: {
    title: "L-Drill (3-konövning)",
    coneA: "A (Start)",
    coneB: "B",
    coneC: "C",
    meters: "m",
    instruction: "Sprinta A→B→A, sprinta till B, vänd, väv figur-8 runt B och C, tillbaka till A",
  },
};

export const LDrillAnimation: React.FC<LDrillAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  // Calculate athlete position
  const athletePosition = useMemo(() => {
    if (frame < PHASES.sprintToB.start) {
      return CONE_A;
    }

    // Phase 1: Sprint to B
    if (frame < PHASES.returnToA.start) {
      const progress = interpolate(
        frame,
        [PHASES.sprintToB.start, PHASES.sprintToB.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: CONE_A.x,
        y: interpolate(progress, [0, 1], [CONE_A.y, CONE_B.y]),
      };
    }

    // Phase 2: Return to A
    if (frame < PHASES.sprintToB2.start) {
      const progress = interpolate(
        frame,
        [PHASES.returnToA.start, PHASES.returnToA.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: CONE_A.x,
        y: interpolate(progress, [0, 1], [CONE_B.y, CONE_A.y]),
      };
    }

    // Phase 3: Sprint to B again
    if (frame < PHASES.turnAroundB.start) {
      const progress = interpolate(
        frame,
        [PHASES.sprintToB2.start, PHASES.sprintToB2.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return {
        x: CONE_A.x,
        y: interpolate(progress, [0, 1], [CONE_A.y, CONE_B.y]),
      };
    }

    // Phase 4: Turn around B (going to right side)
    if (frame < PHASES.weaveToC.start) {
      const progress = interpolate(
        frame,
        [PHASES.turnAroundB.start, PHASES.turnAroundB.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      // Arc around B to the right
      const angle = interpolate(progress, [0, 1], [Math.PI, Math.PI / 2]);
      const radius = 40;
      return {
        x: CONE_B.x + Math.cos(angle) * radius,
        y: CONE_B.y - Math.sin(angle) * radius,
      };
    }

    // Phase 5: Sprint/weave to C
    if (frame < PHASES.weaveBack.start) {
      const progress = interpolate(
        frame,
        [PHASES.weaveToC.start, PHASES.weaveToC.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      // Go to C and around it
      const midX = (CONE_B.x + CONE_C.x) / 2;

      if (progress < 0.6) {
        // Sprint to C
        const sprintProgress = progress / 0.6;
        return {
          x: interpolate(sprintProgress, [0, 1], [CONE_B.x + 40, CONE_C.x]),
          y: CONE_C.y,
        };
      } else {
        // Arc around C
        const arcProgress = (progress - 0.6) / 0.4;
        const angle = interpolate(arcProgress, [0, 1], [0, Math.PI]);
        const radius = 40;
        return {
          x: CONE_C.x + Math.cos(angle) * radius,
          y: CONE_C.y - Math.sin(angle) * radius,
        };
      }
    }

    // Phase 6: Weave back (figure-8 around B)
    if (frame < PHASES.finishToA.start) {
      const progress = interpolate(
        frame,
        [PHASES.weaveBack.start, PHASES.weaveBack.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

      if (progress < 0.5) {
        // Return toward B
        const returnProgress = progress / 0.5;
        return {
          x: interpolate(returnProgress, [0, 1], [CONE_C.x - 40, CONE_B.x + 40]),
          y: CONE_B.y,
        };
      } else {
        // Arc around B to exit
        const arcProgress = (progress - 0.5) / 0.5;
        const angle = interpolate(arcProgress, [0, 1], [0, Math.PI / 2]);
        const radius = 40;
        return {
          x: CONE_B.x + Math.cos(angle) * radius,
          y: CONE_B.y + Math.sin(angle) * radius,
        };
      }
    }

    // Phase 7: Sprint finish to A
    const progress = interpolate(
      frame,
      [PHASES.finishToA.start, PHASES.finishToA.end],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return {
      x: CONE_A.x,
      y: interpolate(progress, [0, 1], [CONE_B.y + 40, CONE_A.y]),
    };
  }, [frame]);

  // Build trail
  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];

    if (frame >= PHASES.sprintToB.start) {
      for (let f = PHASES.sprintToB.start; f <= Math.min(frame, PHASES.finishToA.end); f += 3) {
        // Recalculate position for each frame (simplified)
        let x: number, y: number;

        if (f < PHASES.returnToA.start) {
          const progress = interpolate(f, [PHASES.sprintToB.start, PHASES.sprintToB.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = CONE_A.x;
          y = interpolate(progress, [0, 1], [CONE_A.y, CONE_B.y]);
        } else if (f < PHASES.sprintToB2.start) {
          const progress = interpolate(f, [PHASES.returnToA.start, PHASES.returnToA.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = CONE_A.x;
          y = interpolate(progress, [0, 1], [CONE_B.y, CONE_A.y]);
        } else if (f < PHASES.turnAroundB.start) {
          const progress = interpolate(f, [PHASES.sprintToB2.start, PHASES.sprintToB2.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = CONE_A.x;
          y = interpolate(progress, [0, 1], [CONE_A.y, CONE_B.y]);
        } else if (f < PHASES.weaveToC.start) {
          const progress = interpolate(f, [PHASES.turnAroundB.start, PHASES.turnAroundB.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const angle = interpolate(progress, [0, 1], [Math.PI, Math.PI / 2]);
          x = CONE_B.x + Math.cos(angle) * 40;
          y = CONE_B.y - Math.sin(angle) * 40;
        } else if (f < PHASES.weaveBack.start) {
          const progress = interpolate(f, [PHASES.weaveToC.start, PHASES.weaveToC.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          if (progress < 0.6) {
            const sprintProgress = progress / 0.6;
            x = interpolate(sprintProgress, [0, 1], [CONE_B.x + 40, CONE_C.x]);
            y = CONE_C.y;
          } else {
            const arcProgress = (progress - 0.6) / 0.4;
            const angle = interpolate(arcProgress, [0, 1], [0, Math.PI]);
            x = CONE_C.x + Math.cos(angle) * 40;
            y = CONE_C.y - Math.sin(angle) * 40;
          }
        } else if (f < PHASES.finishToA.start) {
          const progress = interpolate(f, [PHASES.weaveBack.start, PHASES.weaveBack.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          if (progress < 0.5) {
            const returnProgress = progress / 0.5;
            x = interpolate(returnProgress, [0, 1], [CONE_C.x - 40, CONE_B.x + 40]);
            y = CONE_B.y;
          } else {
            const arcProgress = (progress - 0.5) / 0.5;
            const angle = interpolate(arcProgress, [0, 1], [0, Math.PI / 2]);
            x = CONE_B.x + Math.cos(angle) * 40;
            y = CONE_B.y + Math.sin(angle) * 40;
          }
        } else {
          const progress = interpolate(f, [PHASES.finishToA.start, PHASES.finishToA.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = CONE_A.x;
          y = interpolate(progress, [0, 1], [CONE_B.y + 40, CONE_A.y]);
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

      {/* L-shape outline */}
      <path
        d={`M ${CONE_A.x} ${CONE_A.y} L ${CONE_B.x} ${CONE_B.y} L ${CONE_C.x} ${CONE_C.y}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Distance labels */}
      <text x={CONE_A.x - 40} y={(CONE_A.y + CONE_B.y) / 2} fill="#64748b" fontSize={12} textAnchor="middle">
        {DISTANCE} {t.meters}
      </text>
      <text x={(CONE_B.x + CONE_C.x) / 2} y={CONE_B.y - 20} textAnchor="middle" fill="#64748b" fontSize={12}>
        {DISTANCE} {t.meters}
      </text>

      {/* Cones */}
      <Cone x={CONE_A.x} y={CONE_A.y} label={t.coneA} delay={0} />
      <Cone x={CONE_B.x} y={CONE_B.y} label={t.coneB} delay={10} />
      <Cone x={CONE_C.x} y={CONE_C.y} label={t.coneC} delay={20} />

      {/* Athlete */}
      {showAthlete && (
        <Athlete
          x={athletePosition.x}
          y={athletePosition.y}
          trail={trail}
        />
      )}

      {/* Phase indicator */}
      {frame >= PHASES.sprintToB.start && frame < PHASES.showResult.start && (
        <text
          x={650}
          y={200}
          fill="#3b82f6"
          fontSize={12}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {frame < PHASES.returnToA.start && "A → B"}
          {frame >= PHASES.returnToA.start && frame < PHASES.sprintToB2.start && "B → A"}
          {frame >= PHASES.sprintToB2.start && frame < PHASES.weaveToC.start && "A → B"}
          {frame >= PHASES.weaveToC.start && frame < PHASES.weaveBack.start && "→ C (weave)"}
          {frame >= PHASES.weaveBack.start && frame < PHASES.finishToA.start && "C → B (weave)"}
          {frame >= PHASES.finishToA.start && "B → A (finish)"}
        </text>
      )}

      {/* Timing overlay */}
      <TimingOverlay
        startFrame={PHASES.sprintToB.start}
        endFrame={PHASES.finishToA.end}
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
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {t.instruction}
        </text>
      )}
    </DrillAnimation>
  );
};
