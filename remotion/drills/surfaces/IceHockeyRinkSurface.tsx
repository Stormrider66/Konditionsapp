import React from "react";

/**
 * IIHF Standard Ice Hockey Rink — Remotion SVG surface layer.
 *
 * Coordinate system matches the existing IceHockeyRink component:
 *   viewBox 0 0 200 85  (proportional to 60 m × 26 m)
 *   Center ice at (100, 42.5)
 *   Blue lines at x = 65 and x = 135
 *   Goal lines at x = 11 and x = 189
 *
 * This component renders ONLY the rink markings (no players / movements).
 * Wrap it inside the DrillComposition container which provides the outer
 * <AbsoluteFill> + <svg> shell.
 */

export const IceHockeyRinkSurface: React.FC = () => {
  return (
    <g>
      {/* Rink outline with rounded corners */}
      <rect
        x="0"
        y="0"
        width="200"
        height="85"
        rx="14"
        ry="14"
        fill="#e8f4f8"
        stroke="#1a5276"
        strokeWidth="0.8"
      />

      {/* Center line (red) */}
      <line x1="100" y1="0" x2="100" y2="85" stroke="#cc0000" strokeWidth="0.6" />

      {/* Blue lines */}
      <line x1="65" y1="0" x2="65" y2="85" stroke="#1a5276" strokeWidth="0.6" />
      <line x1="135" y1="0" x2="135" y2="85" stroke="#1a5276" strokeWidth="0.6" />

      {/* Goal lines (red) */}
      <line x1="11" y1="0" x2="11" y2="85" stroke="#cc0000" strokeWidth="0.4" />
      <line x1="189" y1="0" x2="189" y2="85" stroke="#cc0000" strokeWidth="0.4" />

      {/* Center circle + dot */}
      <circle cx="100" cy="42.5" r="7.5" fill="none" stroke="#1a5276" strokeWidth="0.4" />
      <circle cx="100" cy="42.5" r="0.8" fill="#1a5276" />

      {/* Faceoff circles — offensive zone */}
      <circle cx="31" cy="22" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="31" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="31" cy="63" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="31" cy="63" r="0.6" fill="#cc0000" />

      {/* Faceoff circles — defensive zone */}
      <circle cx="169" cy="22" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="169" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="169" cy="63" r="7.5" fill="none" stroke="#cc0000" strokeWidth="0.4" />
      <circle cx="169" cy="63" r="0.6" fill="#cc0000" />

      {/* Neutral zone faceoff dots */}
      <circle cx="80" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="80" cy="63" r="0.6" fill="#cc0000" />
      <circle cx="120" cy="22" r="0.6" fill="#cc0000" />
      <circle cx="120" cy="63" r="0.6" fill="#cc0000" />

      {/* Goal creases */}
      <path
        d="M 7 38 A 3 3 0 0 1 7 47"
        fill="rgba(135,206,250,0.3)"
        stroke="#1a5276"
        strokeWidth="0.3"
      />
      <path
        d="M 193 38 A 3 3 0 0 0 193 47"
        fill="rgba(135,206,250,0.3)"
        stroke="#1a5276"
        strokeWidth="0.3"
      />

      {/* Goals */}
      <rect x="3" y="39.5" width="4" height="6" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.5" />
      <rect x="193" y="39.5" width="4" height="6" rx="0.5" fill="none" stroke="#cc0000" strokeWidth="0.5" />
    </g>
  );
};
