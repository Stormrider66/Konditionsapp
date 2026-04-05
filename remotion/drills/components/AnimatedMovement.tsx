import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface AnimatedMovementProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startFrame: number;
  endFrame: number;
  type: "skate" | "pass" | "shot" | "puck";
  color?: string;
}

const TYPE_STYLES: Record<string, { color: string; width: number; dash?: string }> = {
  skate: { color: "#1a1a1a", width: 0.6 },
  pass: { color: "#2563eb", width: 0.6, dash: "1.5 1" },
  shot: { color: "#dc2626", width: 0.8 },
  puck: { color: "#1a1a1a", width: 0.5, dash: "0.8 0.6" },
};

/**
 * Animated movement arrow that draws itself over a frame range.
 * Used to show skating paths, passes, and shots on the rink.
 */
export const AnimatedMovement: React.FC<AnimatedMovementProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  startFrame,
  endFrame,
  type,
  color,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (progress <= 0) return null;

  const style = TYPE_STYLES[type] || TYPE_STYLES.skate;
  const strokeColor = color || style.color;

  const currentX = interpolate(progress, [0, 1], [fromX, toX]);
  const currentY = interpolate(progress, [0, 1], [fromY, toY]);

  // Arrow angle
  const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);
  const arrowSize = 1.5;

  return (
    <g>
      {/* Line */}
      <line
        x1={fromX}
        y1={fromY}
        x2={currentX}
        y2={currentY}
        stroke={strokeColor}
        strokeWidth={style.width}
        strokeDasharray={style.dash}
        opacity={0.7}
      />

      {/* Arrowhead at current tip (only while animating or when complete) */}
      {progress > 0.05 && (
        <g transform={`translate(${currentX}, ${currentY}) rotate(${angle})`}>
          <polygon
            points={`${-arrowSize},-${arrowSize * 0.7} ${arrowSize},0 ${-arrowSize},${arrowSize * 0.7}`}
            fill={strokeColor}
            opacity={0.8}
          />
        </g>
      )}
    </g>
  );
};
