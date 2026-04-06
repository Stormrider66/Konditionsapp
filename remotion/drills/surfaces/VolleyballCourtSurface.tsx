import React from "react";

/**
 * Volleyball Court — SVG surface layer for Remotion + editor.
 *
 * FIVB standard: 18m × 9m
 * Coordinate system: viewBox 0 0 180 90 (scale: 10x meters)
 * Center (net) at x=90
 */

export const VolleyballCourtSurface: React.FC = () => {
  return (
    <g>
      {/* Court outline */}
      <rect x="0" y="0" width="180" height="90" fill="#e8a840" stroke="#4a3520" strokeWidth="0.8" />

      {/* Net / center line */}
      <line x1="90" y1="0" x2="90" y2="90" stroke="#333" strokeWidth="1" />
      {/* Net posts (visual indicator) */}
      <circle cx="90" cy="0" r="1" fill="#333" />
      <circle cx="90" cy="90" r="1" fill="#333" />

      {/* Attack lines (3m from net = 30 units) */}
      <line x1="60" y1="0" x2="60" y2="90" stroke="#ffffff" strokeWidth="0.5" />
      <line x1="120" y1="0" x2="120" y2="90" stroke="#ffffff" strokeWidth="0.5" />

      {/* Side court boundaries */}
      <line x1="0" y1="0" x2="180" y2="0" stroke="#ffffff" strokeWidth="0.6" />
      <line x1="0" y1="90" x2="180" y2="90" stroke="#ffffff" strokeWidth="0.6" />
      <line x1="0" y1="0" x2="0" y2="90" stroke="#ffffff" strokeWidth="0.6" />
      <line x1="180" y1="0" x2="180" y2="90" stroke="#ffffff" strokeWidth="0.6" />

      {/* Service zones (behind end lines, visual indicators) */}
      <line x1="0" y1="0" x2="0" y2="-3" stroke="#ffffff" strokeWidth="0.3" />
      <line x1="180" y1="0" x2="180" y2="-3" stroke="#ffffff" strokeWidth="0.3" />
      <line x1="0" y1="90" x2="0" y2="93" stroke="#ffffff" strokeWidth="0.3" />
      <line x1="180" y1="90" x2="180" y2="93" stroke="#ffffff" strokeWidth="0.3" />

      {/* Zone labels (faint) */}
      <text x="30" y="8" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">Front</text>
      <text x="30" y="85" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">Back</text>
      <text x="150" y="8" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">Front</text>
      <text x="150" y="85" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">Back</text>
    </g>
  );
};

export const VOLLEYBALL_COURT_CONFIG = {
  width: 180,
  height: 90,
  label: "Volleybollplan",
  bgColor: "#e8a840",
} as const;
