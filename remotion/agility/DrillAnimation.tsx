import React from "react";
import { AbsoluteFill } from "remotion";

interface DrillAnimationProps {
  children: React.ReactNode;
  backgroundColor?: string;
}

export const DrillAnimation: React.FC<DrillAnimationProps> = ({
  children,
  backgroundColor = "#f8fafc",
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid meet"
      >
        {children}
      </svg>
    </AbsoluteFill>
  );
};
