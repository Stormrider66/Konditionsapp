import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface ArrowheadAnimationProps {
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Arrowhead pattern - start, center (10m), left and right at 45° angles
const CONE_START = { x: 400, y: 350 };
const CONE_CENTER = { x: 400, y: 180 };
const CONE_LEFT = { x: 250, y: 100 };
const CONE_RIGHT = { x: 550, y: 100 };

// Animation phases
const PHASES = {
  coneSetup: { start: 0, end: 30 },
  athleteAppear: { start: 30, end: 45 },
  toCenter: { start: 45, end: 85 },
  toLeft: { start: 85, end: 125 },
  backCenter: { start: 125, end: 165 },
  toRight: { start: 165, end: 205 },
  toFinish: { start: 205, end: 245 },
  showResult: { start: 245, end: 300 },
};

const translations = {
  en: {
    title: "Arrowhead Agility Test",
    start: "Start/Finish",
    center: "Center",
    left: "Left",
    right: "Right",
    meters: "m",
    instruction: "Sprint to center, angle to left cone, return through center, angle to right, finish",
  },
  sv: {
    title: "Pilspets Agilitytest",
    start: "Start/Mål",
    center: "Mitt",
    left: "Vänster",
    right: "Höger",
    meters: "m",
    instruction: "Sprinta till mitten, vinkla till vänster kon, tillbaka genom mitten, vinkla höger, mål",
  },
};

export const ArrowheadAnimation: React.FC<ArrowheadAnimationProps> = ({
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  const athletePosition = useMemo(() => {
    if (frame < PHASES.toCenter.start) return CONE_START;

    if (frame < PHASES.toLeft.start) {
      const progress = interpolate(frame, [PHASES.toCenter.start, PHASES.toCenter.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONE_START.x, CONE_CENTER.x]),
        y: interpolate(progress, [0, 1], [CONE_START.y, CONE_CENTER.y]),
      };
    }

    if (frame < PHASES.backCenter.start) {
      const progress = interpolate(frame, [PHASES.toLeft.start, PHASES.toLeft.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_LEFT.x]),
        y: interpolate(progress, [0, 1], [CONE_CENTER.y, CONE_LEFT.y]),
      };
    }

    if (frame < PHASES.toRight.start) {
      const progress = interpolate(frame, [PHASES.backCenter.start, PHASES.backCenter.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONE_LEFT.x, CONE_CENTER.x]),
        y: interpolate(progress, [0, 1], [CONE_LEFT.y, CONE_CENTER.y]),
      };
    }

    if (frame < PHASES.toFinish.start) {
      const progress = interpolate(frame, [PHASES.toRight.start, PHASES.toRight.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return {
        x: interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_RIGHT.x]),
        y: interpolate(progress, [0, 1], [CONE_CENTER.y, CONE_RIGHT.y]),
      };
    }

    const progress = interpolate(frame, [PHASES.toFinish.start, PHASES.toFinish.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return {
      x: interpolate(progress, [0, 1], [CONE_RIGHT.x, CONE_START.x]),
      y: interpolate(progress, [0, 1], [CONE_RIGHT.y, CONE_START.y]),
    };
  }, [frame]);

  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    if (frame >= PHASES.toCenter.start) {
      for (let f = PHASES.toCenter.start; f <= Math.min(frame, PHASES.toFinish.end); f += 3) {
        let x: number, y: number;
        if (f < PHASES.toLeft.start) {
          const progress = interpolate(f, [PHASES.toCenter.start, PHASES.toCenter.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_START.x, CONE_CENTER.x]);
          y = interpolate(progress, [0, 1], [CONE_START.y, CONE_CENTER.y]);
        } else if (f < PHASES.backCenter.start) {
          const progress = interpolate(f, [PHASES.toLeft.start, PHASES.toLeft.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_LEFT.x]);
          y = interpolate(progress, [0, 1], [CONE_CENTER.y, CONE_LEFT.y]);
        } else if (f < PHASES.toRight.start) {
          const progress = interpolate(f, [PHASES.backCenter.start, PHASES.backCenter.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_LEFT.x, CONE_CENTER.x]);
          y = interpolate(progress, [0, 1], [CONE_LEFT.y, CONE_CENTER.y]);
        } else if (f < PHASES.toFinish.start) {
          const progress = interpolate(f, [PHASES.toRight.start, PHASES.toRight.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_CENTER.x, CONE_RIGHT.x]);
          y = interpolate(progress, [0, 1], [CONE_CENTER.y, CONE_RIGHT.y]);
        } else {
          const progress = interpolate(f, [PHASES.toFinish.start, PHASES.toFinish.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          x = interpolate(progress, [0, 1], [CONE_RIGHT.x, CONE_START.x]);
          y = interpolate(progress, [0, 1], [CONE_RIGHT.y, CONE_START.y]);
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

      {/* Arrowhead outline */}
      <path
        d={`M ${CONE_START.x} ${CONE_START.y} L ${CONE_CENTER.x} ${CONE_CENTER.y} L ${CONE_LEFT.x} ${CONE_LEFT.y} M ${CONE_CENTER.x} ${CONE_CENTER.y} L ${CONE_RIGHT.x} ${CONE_RIGHT.y}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Distance labels */}
      <text x={360} y={270} fill="#64748b" fontSize={12}>10 {t.meters}</text>
      <text x={310} y={130} fill="#64748b" fontSize={12}>45°</text>
      <text x={470} y={130} fill="#64748b" fontSize={12}>45°</text>

      <Cone x={CONE_START.x} y={CONE_START.y} label={t.start} delay={0} />
      <Cone x={CONE_CENTER.x} y={CONE_CENTER.y} label={t.center} delay={10} />
      <Cone x={CONE_LEFT.x} y={CONE_LEFT.y} label={t.left} delay={20} />
      <Cone x={CONE_RIGHT.x} y={CONE_RIGHT.y} label={t.right} delay={25} />

      {showAthlete && <Athlete x={athletePosition.x} y={athletePosition.y} trail={trail} />}

      <TimingOverlay
        startFrame={PHASES.toCenter.start}
        endFrame={PHASES.toFinish.end}
        finalTime={athleteTime}
        benchmarkTier={benchmarkTier}
        locale={locale}
      />

      {frame < PHASES.athleteAppear.end && (
        <text x={400} y={385} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="system-ui, sans-serif">
          {t.instruction}
        </text>
      )}
    </DrillAnimation>
  );
};
