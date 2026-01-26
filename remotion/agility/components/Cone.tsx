import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface ConeProps {
  x: number;
  y: number;
  label?: string;
  delay?: number;
}

export const Cone: React.FC<ConeProps> = ({ x, y, label, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <g transform={`translate(${x}, ${y})`} style={{ opacity }}>
      {/* Cone base shadow */}
      <ellipse
        cx={0}
        cy={4}
        rx={16 * scale}
        ry={6 * scale}
        fill="rgba(0, 0, 0, 0.15)"
      />
      {/* Cone body */}
      <polygon
        points={`0,${-24 * scale} ${-14 * scale},${8 * scale} ${14 * scale},${8 * scale}`}
        fill="#f97316"
        stroke="#ea580c"
        strokeWidth={2}
      />
      {/* Cone highlight */}
      <polygon
        points={`0,${-20 * scale} ${-4 * scale},${4 * scale} ${4 * scale},${4 * scale}`}
        fill="#fdba74"
        opacity={0.5}
      />
      {/* Label */}
      {label && (
        <text
          y={35}
          textAnchor="middle"
          fill="#64748b"
          fontSize={14}
          fontFamily="system-ui, sans-serif"
          fontWeight={500}
        >
          {label}
        </text>
      )}
    </g>
  );
};
