import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DrillAnimation } from "../DrillAnimation";
import { Cone } from "../components/Cone";
import { Athlete } from "../components/Athlete";
import { TimingOverlay } from "../components/TimingOverlay";

interface SprintAnimationProps {
  distance: 10 | 20 | 40;
  athleteTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

// Translations
const translations = {
  en: {
    title: (d: number) => `${d}m Sprint`,
    start: "Start",
    finish: "Finish",
    split: "Split",
    meters: "m",
    instruction: (d: number) => `Maximum effort sprint over ${d} meters from standing start`,
  },
  sv: {
    title: (d: number) => `${d}m Sprint`,
    start: "Start",
    finish: "Mål",
    split: "Mellantid",
    meters: "m",
    instruction: (d: number) => `Maximal sprint över ${d} meter från stående start`,
  },
};

export const SprintAnimation: React.FC<SprintAnimationProps> = ({
  distance,
  athleteTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const t = translations[locale];

  // Scale positions based on distance
  const startX = 100;
  const finishX = 700;
  const trackY = 200;

  // Calculate split positions for longer sprints
  const splits = useMemo(() => {
    if (distance === 10) return [];
    if (distance === 20) return [{ distance: 10, x: 400 }];
    if (distance === 40) return [
      { distance: 10, x: 250 },
      { distance: 20, x: 400 },
      { distance: 30, x: 550 },
    ];
    return [];
  }, [distance]);

  // Animation timing based on distance
  const sprintDuration = distance === 10 ? 80 : distance === 20 ? 120 : 180;
  const PHASES = useMemo(() => ({
    coneSetup: { start: 0, end: 30 },
    athleteAppear: { start: 30, end: 50 },
    sprint: { start: 50, end: 50 + sprintDuration },
    showResult: { start: 50 + sprintDuration, end: 50 + sprintDuration + 60 },
  }), [sprintDuration]);

  // Calculate athlete position
  const athletePosition = useMemo(() => {
    if (frame < PHASES.sprint.start) {
      return { x: startX, y: trackY };
    }

    if (frame < PHASES.sprint.end) {
      const progress = interpolate(
        frame,
        [PHASES.sprint.start, PHASES.sprint.end],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

      // Acceleration curve - starts slower, reaches max velocity
      const accelerationCurve = Math.pow(progress, 0.7);

      return {
        x: interpolate(accelerationCurve, [0, 1], [startX, finishX]),
        y: trackY,
      };
    }

    return { x: finishX, y: trackY };
  }, [frame, PHASES, startX, finishX, trackY]);

  // Build trail
  const trail = useMemo(() => {
    const points: { x: number; y: number }[] = [];

    if (frame >= PHASES.sprint.start) {
      for (let f = PHASES.sprint.start; f <= Math.min(frame, PHASES.sprint.end); f += 2) {
        const progress = interpolate(f, [PHASES.sprint.start, PHASES.sprint.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const accelerationCurve = Math.pow(progress, 0.7);
        points.push({
          x: interpolate(accelerationCurve, [0, 1], [startX, finishX]),
          y: trackY,
        });
      }
    }

    return points;
  }, [frame, PHASES, startX, finishX, trackY]);

  const showAthlete = frame >= PHASES.athleteAppear.start;

  // Speed visualization
  const currentSpeed = useMemo(() => {
    if (frame < PHASES.sprint.start || frame >= PHASES.sprint.end) return 0;
    const progress = interpolate(frame, [PHASES.sprint.start, PHASES.sprint.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    // Simulated speed curve - acceleration then maintenance
    const speedCurve = progress < 0.3
      ? interpolate(progress, [0, 0.3], [0, 1])
      : 1;
    return speedCurve * (distance === 10 ? 8 : distance === 20 ? 9 : 10); // m/s
  }, [frame, PHASES, distance]);

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
        {t.title(distance)}
      </text>

      {/* Track lane */}
      <rect
        x={startX - 20}
        y={trackY - 40}
        width={finishX - startX + 40}
        height={80}
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth={2}
        rx={8}
      />

      {/* Lane lines */}
      <line x1={startX} y1={trackY - 40} x2={startX} y2={trackY + 40} stroke="#94a3b8" strokeWidth={3} />
      <line x1={finishX} y1={trackY - 40} x2={finishX} y2={trackY + 40} stroke="#22c55e" strokeWidth={3} />

      {/* Split markers */}
      {splits.map((split, i) => (
        <g key={i}>
          <line x1={split.x} y1={trackY - 40} x2={split.x} y2={trackY + 40} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4,4" />
          <text x={split.x} y={trackY + 60} textAnchor="middle" fill="#64748b" fontSize={11}>
            {split.distance} {t.meters}
          </text>
        </g>
      ))}

      {/* Distance label */}
      <text x={(startX + finishX) / 2} y={trackY - 55} textAnchor="middle" fill="#64748b" fontSize={14} fontWeight="bold">
        {distance} {t.meters}
      </text>

      {/* Start/Finish labels */}
      <Cone x={startX} y={trackY + 30} label={t.start} delay={0} />
      <Cone x={finishX} y={trackY + 30} label={t.finish} delay={15} />

      {/* Speed indicator */}
      {frame >= PHASES.sprint.start && frame < PHASES.showResult.start && currentSpeed > 0 && (
        <g>
          <rect x={620} y={280} width={100} height={50} fill="white" stroke="#e2e8f0" rx={4} />
          <text x={670} y={300} textAnchor="middle" fill="#64748b" fontSize={10}>
            {locale === "sv" ? "Hastighet" : "Speed"}
          </text>
          <text x={670} y={320} textAnchor="middle" fill="#3b82f6" fontSize={16} fontWeight="bold">
            {currentSpeed.toFixed(1)} m/s
          </text>
        </g>
      )}

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
        startFrame={PHASES.sprint.start}
        endFrame={PHASES.sprint.end}
        finalTime={athleteTime}
        benchmarkTier={benchmarkTier}
        locale={locale}
      />

      {/* Instructions */}
      {frame < PHASES.athleteAppear.end && (
        <text
          x={400}
          y={370}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        >
          {t.instruction(distance)}
        </text>
      )}
    </DrillAnimation>
  );
};
