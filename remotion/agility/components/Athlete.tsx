import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface AthleteProps {
  x: number;
  y: number;
  trail?: { x: number; y: number }[];
  showStance?: boolean;
}

export const Athlete: React.FC<AthleteProps> = ({
  x,
  y,
  trail = [],
  showStance = false,
}) => {
  const frame = useCurrentFrame();

  // Pulse animation for the athlete dot
  const pulse = interpolate(
    Math.sin(frame * 0.3),
    [-1, 1],
    [0.9, 1.1]
  );

  return (
    <g>
      {/* Motion trail */}
      {trail.length > 1 && (
        <path
          d={`M ${trail.map((p) => `${p.x},${p.y}`).join(" L ")}`}
          fill="none"
          stroke="#93c5fd"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.6}
        />
      )}

      {/* Trail dots */}
      {trail.slice(-10).map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={3 + i * 0.3}
          fill="#93c5fd"
          opacity={0.2 + i * 0.05}
        />
      ))}

      {/* Athlete body */}
      <g transform={`translate(${x}, ${y})`}>
        {/* Shadow */}
        <ellipse
          cx={0}
          cy={4}
          rx={14 * pulse}
          ry={5}
          fill="rgba(59, 130, 246, 0.2)"
        />

        {/* Main body */}
        <circle
          cx={0}
          cy={0}
          r={12 * pulse}
          fill="#3b82f6"
          stroke="#2563eb"
          strokeWidth={2}
        />

        {/* Inner highlight */}
        <circle
          cx={-3}
          cy={-3}
          r={4}
          fill="#60a5fa"
          opacity={0.6}
        />

        {/* 3-point stance indicator */}
        {showStance && (
          <>
            <circle cx={-8} cy={12} r={3} fill="#1e40af" />
            <circle cx={8} cy={12} r={3} fill="#1e40af" />
            <circle cx={0} cy={18} r={3} fill="#1e40af" />
          </>
        )}
      </g>
    </g>
  );
};
