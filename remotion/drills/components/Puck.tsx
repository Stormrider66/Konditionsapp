import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface PuckProps {
  x: number;
  y: number;
  trail?: { x: number; y: number }[];
  visible?: boolean;
}

/**
 * Animated hockey puck with optional trail.
 * Coordinates in rink-space (0-200 x, 0-85 y).
 */
export const Puck: React.FC<PuckProps> = ({
  x,
  y,
  trail = [],
  visible = true,
}) => {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame * 0.4), [-1, 1], [0.6, 1]);

  if (!visible) return null;

  return (
    <g>
      {/* Puck trail (dotted) */}
      {trail.length > 1 && (
        <polyline
          points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={0.6}
          strokeDasharray="0.8 0.6"
          opacity={0.4}
        />
      )}

      {/* Shadow */}
      <ellipse cx={x} cy={y + 0.6} rx={1.6} ry={0.5} fill="rgba(0,0,0,0.2)" />

      {/* Puck body */}
      <circle cx={x} cy={y} r={1.2} fill="#1a1a1a" opacity={glow} />
      <circle cx={x - 0.3} cy={y - 0.3} r={0.4} fill="#444" opacity={0.5} />
    </g>
  );
};
