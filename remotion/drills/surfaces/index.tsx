import React from "react";
import { IceHockeyRinkSurface } from "./IceHockeyRinkSurface";
import { FootballPitchSurface, FOOTBALL_PITCH_CONFIG } from "./FootballPitchSurface";
import { HandballCourtSurface, HANDBALL_COURT_CONFIG } from "./HandballCourtSurface";
import { BasketballCourtSurface, BASKETBALL_COURT_CONFIG } from "./BasketballCourtSurface";
import { FloorballRinkSurface, FLOORBALL_RINK_CONFIG } from "./FloorballRinkSurface";
import { VolleyballCourtSurface, VOLLEYBALL_COURT_CONFIG } from "./VolleyballCourtSurface";

// ─── Sport type literals ────────────────────────────────────────────────

export type DrillSportType =
  | "ICE_HOCKEY"
  | "FOOTBALL"
  | "HANDBALL"
  | "BASKETBALL"
  | "FLOORBALL"
  | "VOLLEYBALL";

// ─── Config per sport ───────────────────────────────────────────────────

export interface SportSurfaceConfig {
  /** viewBox width */
  width: number;
  /** viewBox height */
  height: number;
  /** Swedish label */
  label: string;
  /** Surface background color (for composition) */
  bgColor: string;
  /** SVG surface component */
  Surface: React.FC;
  /** Position labels for the sport */
  positionLabels: string[];
  /** Ball/puck name */
  ballLabel: string;
  /** Movement type labels (override defaults per sport) */
  movementLabels: {
    skate: string;
    pass: string;
    shot: string;
    puck: string;
  };
}

export const SPORT_SURFACES: Record<DrillSportType, SportSurfaceConfig> = {
  ICE_HOCKEY: {
    width: 200,
    height: 85,
    label: "Ishockey",
    bgColor: "#e8f4f8",
    Surface: IceHockeyRinkSurface,
    positionLabels: ["C", "LW", "RW", "LD", "RD", "G"],
    ballLabel: "Puck",
    movementLabels: {
      skate: "Åkning",
      pass: "Passning",
      shot: "Skott",
      puck: "Puck",
    },
  },
  FOOTBALL: {
    ...FOOTBALL_PITCH_CONFIG,
    Surface: FootballPitchSurface,
    positionLabels: ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"],
    ballLabel: "Boll",
    movementLabels: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  HANDBALL: {
    ...HANDBALL_COURT_CONFIG,
    Surface: HandballCourtSurface,
    positionLabels: ["MV", "VB", "HB", "VH", "HH", "M9", "M6"],
    ballLabel: "Boll",
    movementLabels: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  BASKETBALL: {
    ...BASKETBALL_COURT_CONFIG,
    Surface: BasketballCourtSurface,
    positionLabels: ["PG", "SG", "SF", "PF", "C"],
    ballLabel: "Boll",
    movementLabels: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  FLOORBALL: {
    ...FLOORBALL_RINK_CONFIG,
    Surface: FloorballRinkSurface,
    positionLabels: ["C", "LW", "RW", "LD", "RD", "G"],
    ballLabel: "Boll",
    movementLabels: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  VOLLEYBALL: {
    ...VOLLEYBALL_COURT_CONFIG,
    Surface: VolleyballCourtSurface,
    positionLabels: ["S", "OH", "OPP", "MB", "L", "RS"],
    ballLabel: "Boll",
    movementLabels: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Smash",
      puck: "Boll",
    },
  },
};

/**
 * Get sport config, falling back to ICE_HOCKEY for unknown types.
 */
export function getSportConfig(sportType?: string): SportSurfaceConfig {
  if (sportType && sportType in SPORT_SURFACES) {
    return SPORT_SURFACES[sportType as DrillSportType];
  }
  return SPORT_SURFACES.ICE_HOCKEY;
}

/**
 * All available sport types as array (for selectors).
 */
export const DRILL_SPORT_OPTIONS: { value: DrillSportType; label: string }[] = [
  { value: "ICE_HOCKEY", label: "Ishockey" },
  { value: "FOOTBALL", label: "Fotboll" },
  { value: "HANDBALL", label: "Handboll" },
  { value: "BASKETBALL", label: "Basket" },
  { value: "FLOORBALL", label: "Innebandy" },
  { value: "VOLLEYBALL", label: "Volleyboll" },
];
