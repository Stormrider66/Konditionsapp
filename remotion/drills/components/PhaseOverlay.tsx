import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Phase {
  label: string;
  startFrame: number;
  endFrame: number;
}

interface PhaseOverlayProps {
  title: string;
  phases: Phase[];
  description?: string;
  locale?: "en" | "sv";
}

/**
 * Overlay that shows drill title, current phase label, and progress.
 * Positioned outside the rink area (above/below in the composition viewBox).
 */
export const PhaseOverlay: React.FC<PhaseOverlayProps> = ({
  title,
  phases,
  description,
  locale = "en",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find current phase
  const currentPhase = phases.find(
    (p) => frame >= p.startFrame && frame < p.endFrame
  );

  // Overall progress
  const firstStart = phases.length > 0 ? phases[0].startFrame : 0;
  const lastEnd = phases.length > 0 ? phases[phases.length - 1].endFrame : 1;
  const overallProgress = interpolate(frame, [firstStart, lastEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isComplete = frame >= lastEnd;

  // Title fade in
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Completion badge
  const badgeScale = isComplete
    ? spring({ frame: frame - lastEnd, fps, config: { damping: 12, stiffness: 150 } })
    : 0;

  const doneLabel = locale === "sv" ? "Klar" : "Done";

  return (
    <g>
      {/* Title (top-left, outside rink) */}
      <text
        x="3"
        y="-4"
        fill="#1e293b"
        fontSize="5"
        fontFamily="system-ui, sans-serif"
        fontWeight="bold"
        opacity={titleOpacity}
      >
        {title}
      </text>

      {/* Description */}
      {description && (
        <text
          x="3"
          y="-0.5"
          fill="#64748b"
          fontSize="2.8"
          fontFamily="system-ui, sans-serif"
          opacity={titleOpacity * 0.8}
        >
          {description}
        </text>
      )}

      {/* Current phase label (bottom-left, outside rink) */}
      {currentPhase && (
        <text
          x="3"
          y="92"
          fill="#475569"
          fontSize="3.5"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          {currentPhase.label}
        </text>
      )}

      {/* Progress bar (bottom, outside rink) */}
      <rect x="3" y="95" width="194" height="1.5" rx="0.75" fill="#e2e8f0" />
      <rect
        x="3"
        y="95"
        width={194 * overallProgress}
        height="1.5"
        rx="0.75"
        fill="#3b82f6"
      />

      {/* Completion badge (center of rink) */}
      {isComplete && badgeScale > 0 && (
        <g transform={`translate(100, 42.5) scale(${Math.min(badgeScale, 1)})`}>
          <rect
            x="-14"
            y="-7"
            width="28"
            height="14"
            rx="3"
            fill="white"
            stroke="#e2e8f0"
            strokeWidth="0.4"
            filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.1))"
          />
          <circle cx="-6" cy="0" r="2.5" fill="#22c55e" />
          <polyline
            points="-7.5,0 -6,1.5 -4,-1"
            fill="none"
            stroke="white"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="2"
            y="1.2"
            fill="#1e293b"
            fontSize="4"
            fontFamily="system-ui, sans-serif"
            fontWeight="bold"
          >
            {doneLabel}
          </text>
        </g>
      )}
    </g>
  );
};
