import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface StarDrillAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Star pattern - 5 cones in star shape (center + 4 points)
const CENTER = { x: 400, y: 200 };
const RADIUS = 120;
const CONES = [
  CENTER, // 0: Center
  { x: CENTER.x, y: CENTER.y - RADIUS, label: "1" }, // 1: Top
  { x: CENTER.x + RADIUS, y: CENTER.y, label: "2" }, // 2: Right
  { x: CENTER.x, y: CENTER.y + RADIUS, label: "3" }, // 3: Bottom
  { x: CENTER.x - RADIUS, y: CENTER.y, label: "4" }, // 4: Left
];

// Animation phases - center to each point and back
const PHASES = {
  coneSetup: { start: 0, end: 35 },
  athleteAppear: { start: 35, end: 50 },
  toTop: { start: 50, end: 80 },
  backFromTop: { start: 80, end: 110 },
  toRight: { start: 110, end: 140 },
  backFromRight: { start: 140, end: 170 },
  toBottom: { start: 170, end: 200 },
  backFromBottom: { start: 200, end: 230 },
  toLeft: { start: 230, end: 260 },
  backFromLeft: { start: 260, end: 290 },
  showResult: { start: 290, end: 350 },
};

const translations = {
  en: {
    title: "Star Drill",
    center: "Center",
    meters: "m",
    instruction: "Sprint from center to each cone and back, moving clockwise",
  },
  sv: {
    title: "Stjärnövning",
    center: "Mitt",
    meters: "m",
    instruction: "Sprinta från mitten till varje kon och tillbaka, medurs",
  },
};

export const StarDrillAnimation: React.FC<StarDrillAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  const athletePosition = useMemo(() => {
    if (frame < PHASES.toTop.start) return CENTER;

    // To Top
    if (frame < PHASES.backFromTop.start) {
      const progress = interpolate(frame, [PHASES.toTop.start, PHASES.toTop.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CENTER.x, CONES[1].x]),
        y: interpolate(progress, [0, 1], [CENTER.y, CONES[1].y]),
      };
    }

    // Back from Top
    if (frame < PHASES.toRight.start) {
      const progress = interpolate(frame, [PHASES.backFromTop.start, PHASES.backFromTop.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[1].x, CENTER.x]),
        y: interpolate(progress, [0, 1], [CONES[1].y, CENTER.y]),
      };
    }

    // To Right
    if (frame < PHASES.backFromRight.start) {
      const progress = interpolate(frame, [PHASES.toRight.start, PHASES.toRight.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CENTER.x, CONES[2].x]),
        y: interpolate(progress, [0, 1], [CENTER.y, CONES[2].y]),
      };
    }

    // Back from Right
    if (frame < PHASES.toBottom.start) {
      const progress = interpolate(frame, [PHASES.backFromRight.start, PHASES.backFromRight.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[2].x, CENTER.x]),
        y: interpolate(progress, [0, 1], [CONES[2].y, CENTER.y]),
      };
    }

    // To Bottom
    if (frame < PHASES.backFromBottom.start) {
      const progress = interpolate(frame, [PHASES.toBottom.start, PHASES.toBottom.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CENTER.x, CONES[3].x]),
        y: interpolate(progress, [0, 1], [CENTER.y, CONES[3].y]),
      };
    }

    // Back from Bottom
    if (frame < PHASES.toLeft.start) {
      const progress = interpolate(frame, [PHASES.backFromBottom.start, PHASES.backFromBottom.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[3].x, CENTER.x]),
        y: interpolate(progress, [0, 1], [CONES[3].y, CENTER.y]),
      };
    }

    // To Left
    if (frame < PHASES.backFromLeft.start) {
      const progress = interpolate(frame, [PHASES.toLeft.start, PHASES.toLeft.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CENTER.x, CONES[4].x]),
        y: interpolate(progress, [0, 1], [CENTER.y, CONES[4].y]),
      };
    }

    // Back from Left
    if (frame < PHASES.showResult.start) {
      const progress = interpolate(frame, [PHASES.backFromLeft.start, PHASES.backFromLeft.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[4].x, CENTER.x]),
        y: interpolate(progress, [0, 1], [CONES[4].y, CENTER.y]),
      };
    }

    return CENTER;
  }, [frame]);

  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    if (frame >= PHASES.toTop.start) {
      for (let f = PHASES.toTop.start; f <= Math.min(frame, PHASES.backFromLeft.end); f += 3) {
        let x: number, y: number;

        if (f < PHASES.backFromTop.start) {
          const progress = interpolate(f, [PHASES.toTop.start, PHASES.toTop.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CENTER.x, CONES[1].x]);
          y = interpolate(progress, [0, 1], [CENTER.y, CONES[1].y]);
        } else if (f < PHASES.toRight.start) {
          const progress = interpolate(f, [PHASES.backFromTop.start, PHASES.backFromTop.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[1].x, CENTER.x]);
          y = interpolate(progress, [0, 1], [CONES[1].y, CENTER.y]);
        } else if (f < PHASES.backFromRight.start) {
          const progress = interpolate(f, [PHASES.toRight.start, PHASES.toRight.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CENTER.x, CONES[2].x]);
          y = interpolate(progress, [0, 1], [CENTER.y, CONES[2].y]);
        } else if (f < PHASES.toBottom.start) {
          const progress = interpolate(f, [PHASES.backFromRight.start, PHASES.backFromRight.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[2].x, CENTER.x]);
          y = interpolate(progress, [0, 1], [CONES[2].y, CENTER.y]);
        } else if (f < PHASES.backFromBottom.start) {
          const progress = interpolate(f, [PHASES.toBottom.start, PHASES.toBottom.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CENTER.x, CONES[3].x]);
          y = interpolate(progress, [0, 1], [CENTER.y, CONES[3].y]);
        } else if (f < PHASES.toLeft.start) {
          const progress = interpolate(f, [PHASES.backFromBottom.start, PHASES.backFromBottom.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[3].x, CENTER.x]);
          y = interpolate(progress, [0, 1], [CONES[3].y, CENTER.y]);
        } else if (f < PHASES.backFromLeft.start) {
          const progress = interpolate(f, [PHASES.toLeft.start, PHASES.toLeft.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CENTER.x, CONES[4].x]);
          y = interpolate(progress, [0, 1], [CENTER.y, CONES[4].y]);
        } else {
          const progress = interpolate(f, [PHASES.backFromLeft.start, PHASES.backFromLeft.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[4].x, CENTER.x]);
          y = interpolate(progress, [0, 1], [CONES[4].y, CENTER.y]);
        }
        points.push({ x, y });
      }
    }
    return points;
  }, [frame]);

  const showAthlete = frame >= PHASES.athleteAppear.start;

  return (
    <DrillAnimation>
      <text x={400} y={35} textAnchor="middle" fill="#1e293b" fontSize={24} fontFamily="system-ui, sans-serif" fontWeight="bold">
        {t.title}
      </text>

      {/* Star pattern outline */}
      <path
        d={`M ${CENTER.x} ${CENTER.y} L ${CONES[1].x} ${CONES[1].y} M ${CENTER.x} ${CENTER.y} L ${CONES[2].x} ${CONES[2].y} M ${CENTER.x} ${CENTER.y} L ${CONES[3].x} ${CONES[3].y} M ${CENTER.x} ${CENTER.y} L ${CONES[4].x} ${CONES[4].y}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Distance labels */}
      <text x={CENTER.x + 15} y={(CENTER.y + CONES[1].y) / 2} fill="#64748b" fontSize={11}>5 {t.meters}</text>
      <text x={(CENTER.x + CONES[2].x) / 2 + 5} y={CENTER.y - 10} fill="#64748b" fontSize={11}>5 {t.meters}</text>

      {/* Cones */}
      <Cone x={CENTER.x} y={CENTER.y} label={t.center} delay={0} />
      <Cone x={CONES[1].x} y={CONES[1].y} label="1" delay={6} />
      <Cone x={CONES[2].x} y={CONES[2].y} label="2" delay={12} />
      <Cone x={CONES[3].x} y={CONES[3].y} label="3" delay={18} />
      <Cone x={CONES[4].x} y={CONES[4].y} label="4" delay={24} />

      {showAthlete && <Athlete x={athletePosition.x} y={athletePosition.y} trail={trail} />}

      <TimingOverlay
        startFrame={PHASES.toTop.start}
        endFrame={PHASES.backFromLeft.end}
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
