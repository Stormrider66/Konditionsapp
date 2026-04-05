import React from "react";

/**
 * Handball Court — SVG surface layer for Remotion + editor.
 *
 * IHF standard: 40m × 20m
 * Coordinate system: viewBox 0 0 200 100 (scale: 5x meters)
 * Center at (100, 50)
 */

export const HandballCourtSurface: React.FC = () => {
  return (
    <g>
      {/* Court outline */}
      <rect x="0" y="0" width="200" height="100" fill="#d4a76a" stroke="#5c3d1e" strokeWidth="0.8" />

      {/* Halfway line */}
      <line x1="100" y1="0" x2="100" y2="100" stroke="#5c3d1e" strokeWidth="0.6" />

      {/* Center circle */}
      <circle cx="100" cy="50" r="2" fill="none" stroke="#5c3d1e" strokeWidth="0.5" />

      {/* Left goal area (6m arc) */}
      <path d="M 0 31 A 30 30 0 0 1 0 69" fill="none" stroke="#5c3d1e" strokeWidth="0.6" />
      {/* Left free-throw line (9m dashed arc) */}
      <path d="M 0 26 A 45 45 0 0 1 0 74" fill="none" stroke="#5c3d1e" strokeWidth="0.5" strokeDasharray="2 1.5" />
      {/* Left 7m mark */}
      <line x1="35" y1="49" x2="35" y2="51" stroke="#5c3d1e" strokeWidth="0.8" />

      {/* Right goal area (6m arc) */}
      <path d="M 200 31 A 30 30 0 0 0 200 69" fill="none" stroke="#5c3d1e" strokeWidth="0.6" />
      {/* Right free-throw line (9m dashed arc) */}
      <path d="M 200 26 A 45 45 0 0 0 200 74" fill="none" stroke="#5c3d1e" strokeWidth="0.5" strokeDasharray="2 1.5" />
      {/* Right 7m mark */}
      <line x1="165" y1="49" x2="165" y2="51" stroke="#5c3d1e" strokeWidth="0.8" />

      {/* Left goal */}
      <rect x="-4" y="42" width="4" height="16" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.6" />
      {/* Right goal */}
      <rect x="200" y="42" width="4" height="16" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.6" />

      {/* Substitution area markers */}
      <line x1="92.5" y1="0" x2="92.5" y2="2" stroke="#5c3d1e" strokeWidth="0.4" />
      <line x1="107.5" y1="0" x2="107.5" y2="2" stroke="#5c3d1e" strokeWidth="0.4" />
    </g>
  );
};

export const HANDBALL_COURT_CONFIG = {
  width: 200,
  height: 100,
  label: "Handbollsplan",
  bgColor: "#d4a76a",
} as const;
