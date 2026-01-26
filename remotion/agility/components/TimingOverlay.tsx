import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface TimingOverlayProps {
  startFrame: number;
  endFrame: number;
  finalTime: number;
  benchmarkTier: "elite" | "excellent" | "good" | "average" | "developing";
  locale?: "en" | "sv";
}

const tierLabels = {
  en: {
    elite: "Elite",
    excellent: "Excellent",
    good: "Good",
    average: "Average",
    developing: "Developing",
  },
  sv: {
    elite: "Elit",
    excellent: "Utmärkt",
    good: "Bra",
    average: "Medel",
    developing: "Utveckling",
  },
};

const phaseLabels = {
  en: {
    sprintRight: "Sprint Right",
    sprintLeft: "Sprint Left",
    finish: "Finish Right",
  },
  sv: {
    sprintRight: "Sprint höger",
    sprintLeft: "Sprint vänster",
    finish: "Mål höger",
  },
};

const tierColors: Record<string, { bg: string; text: string }> = {
  elite: { bg: "#7c3aed", text: "#ffffff" },
  excellent: { bg: "#059669", text: "#ffffff" },
  good: { bg: "#2563eb", text: "#ffffff" },
  average: { bg: "#d97706", text: "#ffffff" },
  developing: { bg: "#dc2626", text: "#ffffff" },
};

export const TimingOverlay: React.FC<TimingOverlayProps> = ({
  startFrame,
  endFrame,
  finalTime,
  benchmarkTier,
  locale = "sv",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate elapsed time during animation
  const elapsedProgress = interpolate(
    frame,
    [startFrame, endFrame],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const currentTime = elapsedProgress * finalTime;
  const isComplete = frame >= endFrame;

  // Badge animation when complete
  const badgeScale = spring({
    frame: frame - endFrame,
    fps,
    config: {
      damping: 10,
      stiffness: 150,
    },
  });

  const tier = tierColors[benchmarkTier];
  const tLabels = tierLabels[locale];
  const pLabels = phaseLabels[locale];

  return (
    <g>
      {/* Timer display */}
      <g transform="translate(700, 40)">
        <rect
          x={-60}
          y={-25}
          width={120}
          height={50}
          rx={8}
          fill="#1e293b"
          opacity={0.9}
        />
        <text
          textAnchor="middle"
          fill="#ffffff"
          fontSize={28}
          fontFamily="monospace"
          fontWeight="bold"
          dominantBaseline="middle"
        >
          {currentTime.toFixed(2)}s
        </text>
      </g>

      {/* Phase indicator */}
      {frame >= startFrame && (
        <g transform="translate(400, 380)">
          <text
            textAnchor="middle"
            fill="#64748b"
            fontSize={14}
            fontFamily="system-ui, sans-serif"
          >
            {elapsedProgress < 0.25
              ? `${pLabels.sprintRight} 4.57m`
              : elapsedProgress < 0.75
                ? `${pLabels.sprintLeft} 9.14m`
                : `${pLabels.finish} 4.57m`}
          </text>
        </g>
      )}

      {/* Final result badge */}
      {isComplete && (
        <g transform={`translate(400, 200) scale(${Math.min(badgeScale, 1)})`}>
          {/* Background card */}
          <rect
            x={-120}
            y={-60}
            width={240}
            height={120}
            rx={12}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth={2}
            filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))"
          />

          {/* Final time */}
          <text
            y={-20}
            textAnchor="middle"
            fill="#1e293b"
            fontSize={36}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {finalTime.toFixed(2)}s
          </text>

          {/* Tier badge */}
          <rect
            x={-50}
            y={10}
            width={100}
            height={30}
            rx={15}
            fill={tier.bg}
          />
          <text
            y={30}
            textAnchor="middle"
            fill={tier.text}
            fontSize={14}
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
          >
            {tLabels[benchmarkTier]}
          </text>
        </g>
      )}
    </g>
  );
};
