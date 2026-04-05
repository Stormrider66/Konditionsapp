import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface DrillPlayerProps {
  x: number;
  y: number;
  label: string;
  color: string;
  trail?: { x: number; y: number }[];
  opacity?: number;
}

/**
 * Animated player dot with jersey label and motion trail.
 * Coordinates are in rink-space (0-200 x, 0-85 y).
 */
export const DrillPlayer: React.FC<DrillPlayerProps> = ({
  x,
  y,
  label,
  color,
  trail = [],
  opacity = 1,
}) => {
  const frame = useCurrentFrame();

  // Subtle pulse
  const pulse = interpolate(Math.sin(frame * 0.25), [-1, 1], [0.95, 1.05]);

  return (
    <g opacity={opacity}>
      {/* Motion trail */}
      {trail.length > 1 && (
        <polyline
          points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.3}
          strokeDasharray="1.5 0.8"
        />
      )}

      {/* Shadow */}
      <ellipse
        cx={x}
        cy={y + 1.2}
        rx={3.2 * pulse}
        ry={1}
        fill="rgba(0,0,0,0.15)"
      />

      {/* Player circle */}
      <circle
        cx={x}
        cy={y}
        r={3 * pulse}
        fill={color}
        stroke="white"
        strokeWidth="0.4"
      />

      {/* Label */}
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        fontSize="2.5"
        fill="white"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {label}
      </text>
    </g>
  );
};
