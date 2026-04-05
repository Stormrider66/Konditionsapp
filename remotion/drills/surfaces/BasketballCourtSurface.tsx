import React from "react";

/**
 * Basketball Court — SVG surface layer for Remotion + editor.
 *
 * FIBA standard: 28m × 15m
 * Coordinate system: viewBox 0 0 280 150 (scale: 10x meters)
 * Center at (140, 75)
 */

export const BasketballCourtSurface: React.FC = () => {
  return (
    <g>
      {/* Court outline */}
      <rect x="0" y="0" width="280" height="150" fill="#c68642" stroke="#4a3520" strokeWidth="0.8" />

      {/* Halfway line */}
      <line x1="140" y1="0" x2="140" y2="150" stroke="#4a3520" strokeWidth="0.6" />

      {/* Center circle */}
      <circle cx="140" cy="75" r="18" fill="none" stroke="#4a3520" strokeWidth="0.6" />
      <circle cx="140" cy="75" r="0.8" fill="#4a3520" />

      {/* Left key / paint area */}
      <rect x="0" y="44" width="58" height="62" fill="none" stroke="#4a3520" strokeWidth="0.6" />
      {/* Left free-throw circle */}
      <circle cx="58" cy="75" r="18" fill="none" stroke="#4a3520" strokeWidth="0.6" />
      {/* Left restricted area arc */}
      <path d="M 0 50 A 40 40 0 0 1 0 100" fill="none" stroke="#4a3520" strokeWidth="0.5" />
      {/* Left backboard */}
      <line x1="12" y1="65" x2="12" y2="85" stroke="#4a3520" strokeWidth="0.8" />
      {/* Left basket */}
      <circle cx="15.75" cy="75" r="2.3" fill="none" stroke="#cc0000" strokeWidth="0.6" />

      {/* Right key / paint area */}
      <rect x="222" y="44" width="58" height="62" fill="none" stroke="#4a3520" strokeWidth="0.6" />
      {/* Right free-throw circle */}
      <circle cx="222" cy="75" r="18" fill="none" stroke="#4a3520" strokeWidth="0.6" />
      {/* Right restricted area arc */}
      <path d="M 280 50 A 40 40 0 0 0 280 100" fill="none" stroke="#4a3520" strokeWidth="0.5" />
      {/* Right backboard */}
      <line x1="268" y1="65" x2="268" y2="85" stroke="#4a3520" strokeWidth="0.8" />
      {/* Right basket */}
      <circle cx="264.25" cy="75" r="2.3" fill="none" stroke="#cc0000" strokeWidth="0.6" />

      {/* Three-point lines */}
      <path d="M 0 18 L 14 18 A 67.5 67.5 0 0 1 14 132 L 0 132" fill="none" stroke="#4a3520" strokeWidth="0.6" />
      <path d="M 280 18 L 266 18 A 67.5 67.5 0 0 0 266 132 L 280 132" fill="none" stroke="#4a3520" strokeWidth="0.6" />
    </g>
  );
};

export const BASKETBALL_COURT_CONFIG = {
  width: 280,
  height: 150,
  label: "Basketplan",
  bgColor: "#c68642",
} as const;
