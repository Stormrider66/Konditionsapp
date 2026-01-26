import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface ConeZigZagAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Zig-zag pattern - 6 cones alternating left/right
const CONES = [
  { x: 100, y: 200, label: "S" },   // Start
  { x: 180, y: 130, label: "1" },   // Up-right
  { x: 260, y: 270, label: "2" },   // Down-right
  { x: 340, y: 130, label: "3" },   // Up-right
  { x: 420, y: 270, label: "4" },   // Down-right
  { x: 500, y: 130, label: "5" },   // Up-right
  { x: 580, y: 270, label: "6" },   // Down-right
  { x: 700, y: 200, label: "F" },   // Finish
];

// Animation phases
const PHASES = {
  coneSetup: { start: 0, end: 40 },
  athleteAppear: { start: 40, end: 55 },
  leg1: { start: 55, end: 85 },    // Start to 1
  leg2: { start: 85, end: 115 },   // 1 to 2
  leg3: { start: 115, end: 145 },  // 2 to 3
  leg4: { start: 145, end: 175 },  // 3 to 4
  leg5: { start: 175, end: 205 },  // 4 to 5
  leg6: { start: 205, end: 235 },  // 5 to 6
  leg7: { start: 235, end: 265 },  // 6 to Finish
  showResult: { start: 265, end: 330 },
};

const translations = {
  en: {
    title: "Cone Zig-Zag",
    start: "Start",
    finish: "Finish",
    meters: "m",
    instruction: "Sprint in zig-zag pattern, cutting sharply around each cone",
  },
  sv: {
    title: "Kon Sicksack",
    start: "Start",
    finish: "Mål",
    meters: "m",
    instruction: "Sprinta i sicksackmönster, sväng skarpt runt varje kon",
  },
};

export const ConeZigZagAnimation: React.FC<ConeZigZagAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  const athletePosition = useMemo(() => {
    if (frame < PHASES.leg1.start) return CONES[0];

    const legPhases = [
      { phase: PHASES.leg1, from: 0, to: 1 },
      { phase: PHASES.leg2, from: 1, to: 2 },
      { phase: PHASES.leg3, from: 2, to: 3 },
      { phase: PHASES.leg4, from: 3, to: 4 },
      { phase: PHASES.leg5, from: 4, to: 5 },
      { phase: PHASES.leg6, from: 5, to: 6 },
      { phase: PHASES.leg7, from: 6, to: 7 },
    ];

    for (const { phase, from, to } of legPhases) {
      if (frame < phase.end || (phase === PHASES.leg7 && frame < PHASES.showResult.start)) {
        if (frame >= phase.start) {
          const progress = interpolate(frame, [phase.start, phase.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return {
            x: interpolate(progress, [0, 1], [CONES[from].x, CONES[to].x]),
            y: interpolate(progress, [0, 1], [CONES[from].y, CONES[to].y]),
          };
        }
      }
    }

    return CONES[7];
  }, [frame]);

  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    if (frame >= PHASES.leg1.start) {
      const legPhases = [
        { phase: PHASES.leg1, from: 0, to: 1 },
        { phase: PHASES.leg2, from: 1, to: 2 },
        { phase: PHASES.leg3, from: 2, to: 3 },
        { phase: PHASES.leg4, from: 3, to: 4 },
        { phase: PHASES.leg5, from: 4, to: 5 },
        { phase: PHASES.leg6, from: 5, to: 6 },
        { phase: PHASES.leg7, from: 6, to: 7 },
      ];

      for (let f = PHASES.leg1.start; f <= Math.min(frame, PHASES.leg7.end); f += 3) {
        let x: number = CONES[0].x;
        let y: number = CONES[0].y;

        for (const { phase, from, to } of legPhases) {
          if (f >= phase.start && f <= phase.end) {
            const progress = interpolate(f, [phase.start, phase.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            x = interpolate(progress, [0, 1], [CONES[from].x, CONES[to].x]);
            y = interpolate(progress, [0, 1], [CONES[from].y, CONES[to].y]);
            break;
          } else if (f > phase.end) {
            x = CONES[to].x;
            y = CONES[to].y;
          }
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

      {/* Zig-zag pattern outline */}
      <path
        d={`M ${CONES.map(c => `${c.x} ${c.y}`).join(" L ")}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Distance labels */}
      <text x={400} y={320} fill="#64748b" fontSize={11} textAnchor="middle">
        ~3 {t.meters} {locale === "sv" ? "mellan konerna" : "between cones"}
      </text>

      {/* Cones */}
      {CONES.map((cone, i) => (
        <Cone
          key={i}
          x={cone.x}
          y={cone.y}
          label={i === 0 ? t.start : i === 7 ? t.finish : cone.label}
          delay={i * 4}
        />
      ))}

      {showAthlete && <Athlete x={athletePosition.x} y={athletePosition.y} trail={trail} />}

      <TimingOverlay
        startFrame={PHASES.leg1.start}
        endFrame={PHASES.leg7.end}
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
