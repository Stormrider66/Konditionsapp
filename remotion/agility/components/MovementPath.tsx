import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface PathSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  startFrame: number;
  endFrame: number;
  label?: string;
}

interface MovementPathProps {
  segments: PathSegment[];
}

export const MovementPath: React.FC<MovementPathProps> = ({ segments }) => {
  const frame = useCurrentFrame();

  return (
    <g>
      {segments.map((segment, index) => {
        const progress = interpolate(
          frame,
          [segment.startFrame, segment.endFrame],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );

        if (progress <= 0) return null;

        const currentX = interpolate(
          progress,
          [0, 1],
          [segment.from.x, segment.to.x]
        );
        const currentY = interpolate(
          progress,
          [0, 1],
          [segment.from.y, segment.to.y]
        );

        // Calculate angle for arrow
        const angle =
          Math.atan2(
            segment.to.y - segment.from.y,
            segment.to.x - segment.from.x
          ) *
          (180 / Math.PI);

        return (
          <g key={index}>
            {/* Path line */}
            <line
              x1={segment.from.x}
              y1={segment.from.y}
              x2={currentX}
              y2={currentY}
              stroke="#94a3b8"
              strokeWidth={3}
              strokeDasharray="8,4"
              opacity={0.6}
            />

            {/* Direction arrow at current position */}
            {progress > 0.1 && progress < 0.95 && (
              <g transform={`translate(${currentX}, ${currentY}) rotate(${angle})`}>
                <polygon
                  points="-8,-6 8,0 -8,6"
                  fill="#64748b"
                  opacity={0.8}
                />
              </g>
            )}

            {/* Segment label */}
            {segment.label && progress >= 1 && (
              <text
                x={(segment.from.x + segment.to.x) / 2}
                y={(segment.from.y + segment.to.y) / 2 - 15}
                textAnchor="middle"
                fill="#64748b"
                fontSize={12}
                fontFamily="system-ui, sans-serif"
              >
                {segment.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};
