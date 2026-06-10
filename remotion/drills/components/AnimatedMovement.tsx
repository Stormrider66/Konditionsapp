import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { angleOnMovement, partialMovementPathD, pointOnMovement } from "../movement-path";

interface AnimatedMovementProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  controlX?: number;
  controlY?: number;
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
 * Used to show skating paths (straight or curved), passes, and shots.
 */
export const AnimatedMovement: React.FC<AnimatedMovementProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  controlX,
  controlY,
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

  const geometry = { fromX, fromY, toX, toY, controlX, controlY };
  const tip = pointOnMovement(geometry, progress);
  const angle = angleOnMovement(geometry, progress);
  const arrowSize = 1.5;

  return (
    <g>
      {/* Path drawn up to the current progress */}
      <path
        d={partialMovementPathD(geometry, progress)}
        fill="none"
        stroke={strokeColor}
        strokeWidth={style.width}
        strokeDasharray={style.dash}
        opacity={0.7}
      />

      {/* Arrowhead at current tip (only while animating or when complete) */}
      {progress > 0.05 && (
        <g transform={`translate(${tip.x}, ${tip.y}) rotate(${angle})`}>
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
