import React from "react";

/**
 * Football / Soccer Pitch — SVG surface layer for Remotion + editor.
 *
 * FIFA standard pitch proportions: 105m × 68m
 * Coordinate system: viewBox 0 0 210 136 (scale: 2x meters)
 * Center at (105, 68)
 */

export const FootballPitchSurface: React.FC = () => {
  return (
    <g>
      {/* Pitch outline */}
      <rect x="0" y="0" width="210" height="136" fill="#4a8c3f" stroke="white" strokeWidth="0.8" />

      {/* Halfway line */}
      <line x1="105" y1="0" x2="105" y2="136" stroke="white" strokeWidth="0.6" />

      {/* Center circle */}
      <circle cx="105" cy="68" r="18.3" fill="none" stroke="white" strokeWidth="0.6" />
      <circle cx="105" cy="68" r="0.8" fill="white" />

      {/* Left penalty area */}
      <rect x="0" y="27.2" width="33" height="81.6" fill="none" stroke="white" strokeWidth="0.6" />
      {/* Left goal area */}
      <rect x="0" y="44.2" width="11" height="47.6" fill="none" stroke="white" strokeWidth="0.6" />
      {/* Left penalty spot */}
      <circle cx="22" cy="68" r="0.8" fill="white" />
      {/* Left penalty arc */}
      <path d="M 33 51 A 18.3 18.3 0 0 1 33 85" fill="none" stroke="white" strokeWidth="0.6" />

      {/* Right penalty area */}
      <rect x="177" y="27.2" width="33" height="81.6" fill="none" stroke="white" strokeWidth="0.6" />
      {/* Right goal area */}
      <rect x="199" y="44.2" width="11" height="47.6" fill="none" stroke="white" strokeWidth="0.6" />
      {/* Right penalty spot */}
      <circle cx="188" cy="68" r="0.8" fill="white" />
      {/* Right penalty arc */}
      <path d="M 177 51 A 18.3 18.3 0 0 0 177 85" fill="none" stroke="white" strokeWidth="0.6" />

      {/* Left goal */}
      <rect x="-4" y="61.3" width="4" height="13.4" rx="0.5" fill="none" stroke="white" strokeWidth="0.6" />
      {/* Right goal */}
      <rect x="210" y="61.3" width="4" height="13.4" rx="0.5" fill="none" stroke="white" strokeWidth="0.6" />

      {/* Corner arcs */}
      <path d="M 2 0 A 2 2 0 0 0 0 2" fill="none" stroke="white" strokeWidth="0.4" />
      <path d="M 208 0 A 2 2 0 0 1 210 2" fill="none" stroke="white" strokeWidth="0.4" />
      <path d="M 0 134 A 2 2 0 0 0 2 136" fill="none" stroke="white" strokeWidth="0.4" />
      <path d="M 210 134 A 2 2 0 0 1 208 136" fill="none" stroke="white" strokeWidth="0.4" />
    </g>
  );
};

// Coordinate system info for the editor
export const FOOTBALL_PITCH_CONFIG = {
  width: 210,
  height: 136,
  label: "Fotbollsplan",
  bgColor: "#4a8c3f",
} as const;
