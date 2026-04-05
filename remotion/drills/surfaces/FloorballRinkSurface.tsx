import React from "react";

/**
 * Floorball Rink — SVG surface layer for Remotion + editor.
 *
 * IFF standard: 40m × 20m (same as handball but with rounded corners)
 * Coordinate system: viewBox 0 0 200 100 (scale: 5x meters)
 * Center at (100, 50)
 */

export const FloorballRinkSurface: React.FC = () => {
  return (
    <g>
      {/* Rink outline with rounded corners */}
      <rect x="0" y="0" width="200" height="100" rx="14" ry="14" fill="#f0f0f0" stroke="#333" strokeWidth="0.8" />

      {/* Center line */}
      <line x1="100" y1="0" x2="100" y2="100" stroke="#333" strokeWidth="0.5" />

      {/* Center circle */}
      <circle cx="100" cy="50" r="7.5" fill="none" stroke="#333" strokeWidth="0.5" />
      <circle cx="100" cy="50" r="0.8" fill="#333" />

      {/* Left goal crease (semicircle 2.5m radius) */}
      <path d="M 7.5 38 A 12.5 12.5 0 0 1 7.5 62" fill="rgba(173,216,230,0.3)" stroke="#333" strokeWidth="0.4" />
      {/* Right goal crease */}
      <path d="M 192.5 38 A 12.5 12.5 0 0 0 192.5 62" fill="rgba(173,216,230,0.3)" stroke="#333" strokeWidth="0.4" />

      {/* Left goal (160cm wide = 8 units) */}
      <rect x="2" y="46" width="5.5" height="8" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.6" />
      {/* Right goal */}
      <rect x="192.5" y="46" width="5.5" height="8" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.6" />

      {/* Faceoff dots */}
      <circle cx="35" cy="25" r="0.6" fill="#333" />
      <circle cx="35" cy="75" r="0.6" fill="#333" />
      <circle cx="165" cy="25" r="0.6" fill="#333" />
      <circle cx="165" cy="75" r="0.6" fill="#333" />

      {/* Substitution zone markers (along one long side) */}
      <line x1="80" y1="0" x2="80" y2="1.5" stroke="#333" strokeWidth="0.4" />
      <line x1="120" y1="0" x2="120" y2="1.5" stroke="#333" strokeWidth="0.4" />
    </g>
  );
};

export const FLOORBALL_RINK_CONFIG = {
  width: 200,
  height: 100,
  label: "Innebandyrink",
  bgColor: "#f0f0f0",
} as const;
