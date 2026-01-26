import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface WDrillAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// W pattern - 5 cones in W shape
const CONES = [
  { x: 100, y: 280, label: "1" },   // Start (bottom left)
  { x: 250, y: 120, label: "2" },   // Top left
  { x: 400, y: 280, label: "3" },   // Middle bottom
  { x: 550, y: 120, label: "4" },   // Top right
  { x: 700, y: 280, label: "5" },   // Finish (bottom right)
];

// Animation phases
const PHASES = {
  coneSetup: { start: 0, end: 35 },
  athleteAppear: { start: 35, end: 50 },
  leg1: { start: 50, end: 100 },    // 1 to 2
  leg2: { start: 100, end: 150 },   // 2 to 3
  leg3: { start: 150, end: 200 },   // 3 to 4
  leg4: { start: 200, end: 250 },   // 4 to 5
  showResult: { start: 250, end: 310 },
};

const translations = {
  en: {
    title: "W-Drill",
    start: "Start",
    finish: "Finish",
    meters: "m",
    instruction: "Sprint diagonally between cones in W pattern, cutting sharply at each cone",
  },
  sv: {
    title: "W-Övning",
    start: "Start",
    finish: "Mål",
    meters: "m",
    instruction: "Sprinta diagonalt mellan koner i W-mönster, sväng skarpt vid varje kon",
  },
};

export const WDrillAnimation: React.FC<WDrillAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  const athletePosition = useMemo(() => {
    if (frame < PHASES.leg1.start) return CONES[0];

    if (frame < PHASES.leg2.start) {
      const progress = interpolate(frame, [PHASES.leg1.start, PHASES.leg1.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[0].x, CONES[1].x]),
        y: interpolate(progress, [0, 1], [CONES[0].y, CONES[1].y]),
      };
    }

    if (frame < PHASES.leg3.start) {
      const progress = interpolate(frame, [PHASES.leg2.start, PHASES.leg2.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[1].x, CONES[2].x]),
        y: interpolate(progress, [0, 1], [CONES[1].y, CONES[2].y]),
      };
    }

    if (frame < PHASES.leg4.start) {
      const progress = interpolate(frame, [PHASES.leg3.start, PHASES.leg3.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[2].x, CONES[3].x]),
        y: interpolate(progress, [0, 1], [CONES[2].y, CONES[3].y]),
      };
    }

    if (frame < PHASES.showResult.start) {
      const progress = interpolate(frame, [PHASES.leg4.start, PHASES.leg4.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONES[3].x, CONES[4].x]),
        y: interpolate(progress, [0, 1], [CONES[3].y, CONES[4].y]),
      };
    }

    return CONES[4];
  }, [frame]);

  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    if (frame >= PHASES.leg1.start) {
      for (let f = PHASES.leg1.start; f <= Math.min(frame, PHASES.leg4.end); f += 3) {
        let x: number, y: number;
        if (f < PHASES.leg2.start) {
          const progress = interpolate(f, [PHASES.leg1.start, PHASES.leg1.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[0].x, CONES[1].x]);
          y = interpolate(progress, [0, 1], [CONES[0].y, CONES[1].y]);
        } else if (f < PHASES.leg3.start) {
          const progress = interpolate(f, [PHASES.leg2.start, PHASES.leg2.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[1].x, CONES[2].x]);
          y = interpolate(progress, [0, 1], [CONES[1].y, CONES[2].y]);
        } else if (f < PHASES.leg4.start) {
          const progress = interpolate(f, [PHASES.leg3.start, PHASES.leg3.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[2].x, CONES[3].x]);
          y = interpolate(progress, [0, 1], [CONES[2].y, CONES[3].y]);
        } else {
          const progress = interpolate(f, [PHASES.leg4.start, PHASES.leg4.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONES[3].x, CONES[4].x]);
          y = interpolate(progress, [0, 1], [CONES[3].y, CONES[4].y]);
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

      {/* W pattern outline */}
      <path
        d={`M ${CONES[0].x} ${CONES[0].y} L ${CONES[1].x} ${CONES[1].y} L ${CONES[2].x} ${CONES[2].y} L ${CONES[3].x} ${CONES[3].y} L ${CONES[4].x} ${CONES[4].y}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Distance labels */}
      <text x={175} y={210} fill="#64748b" fontSize={11}>5 {t.meters}</text>
      <text x={325} y={210} fill="#64748b" fontSize={11}>5 {t.meters}</text>
      <text x={475} y={210} fill="#64748b" fontSize={11}>5 {t.meters}</text>
      <text x={625} y={210} fill="#64748b" fontSize={11}>5 {t.meters}</text>

      {/* Cones */}
      {CONES.map((cone, i) => (
        <Cone
          key={i}
          x={cone.x}
          y={cone.y}
          label={i === 0 ? t.start : i === 4 ? t.finish : cone.label}
          delay={i * 6}
        />
      ))}

      {showAthlete && <Athlete x={athletePosition.x} y={athletePosition.y} trail={trail} />}

      <TimingOverlay
        startFrame={PHASES.leg1.start}
        endFrame={PHASES.leg4.end}
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
