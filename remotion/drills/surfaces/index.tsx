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
  /** Localized label */
  label: string;
  /** Swedish label */
  labelSv?: string;
  /** Surface background color (for composition) */
  bgColor: string;
  /** SVG surface component */
  Surface: React.FC;
  /** Position labels for the sport */
  positionLabels: string[];
  /** Localized ball/puck name */
  ballLabel: string;
  /** Swedish ball/puck name */
  ballLabelSv?: string;
  /** Movement type labels (override defaults per sport) */
  movementLabels: {
    skate: string;
    pass: string;
    shot: string;
    puck: string;
  };
  /** Swedish movement type labels */
  movementLabelsSv?: {
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
    label: "Ice Hockey",
    labelSv: "Ishockey",
    bgColor: "#e8f4f8",
    Surface: IceHockeyRinkSurface,
    positionLabels: ["C", "LW", "RW", "LD", "RD", "G"],
    ballLabel: "Puck",
    movementLabels: {
      skate: "Skate",
      pass: "Pass",
      shot: "Shot",
      puck: "Puck",
    },
    movementLabelsSv: {
      skate: "Åkning",
      pass: "Passning",
      shot: "Skott",
      puck: "Puck",
    },
  },
  FOOTBALL: {
    ...FOOTBALL_PITCH_CONFIG,
    label: "Football",
    labelSv: "Fotboll",
    Surface: FootballPitchSurface,
    positionLabels: ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"],
    ballLabel: "Ball",
    ballLabelSv: "Boll",
    movementLabels: {
      skate: "Run",
      pass: "Pass",
      shot: "Shot",
      puck: "Ball",
    },
    movementLabelsSv: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  HANDBALL: {
    ...HANDBALL_COURT_CONFIG,
    label: "Handball",
    labelSv: "Handboll",
    Surface: HandballCourtSurface,
    positionLabels: ["MV", "VB", "HB", "VH", "HH", "M9", "M6"],
    ballLabel: "Ball",
    ballLabelSv: "Boll",
    movementLabels: {
      skate: "Run",
      pass: "Pass",
      shot: "Shot",
      puck: "Ball",
    },
    movementLabelsSv: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  BASKETBALL: {
    ...BASKETBALL_COURT_CONFIG,
    label: "Basketball",
    labelSv: "Basket",
    Surface: BasketballCourtSurface,
    positionLabels: ["PG", "SG", "SF", "PF", "C"],
    ballLabel: "Ball",
    ballLabelSv: "Boll",
    movementLabels: {
      skate: "Run",
      pass: "Pass",
      shot: "Shot",
      puck: "Ball",
    },
    movementLabelsSv: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  FLOORBALL: {
    ...FLOORBALL_RINK_CONFIG,
    label: "Floorball",
    labelSv: "Innebandy",
    Surface: FloorballRinkSurface,
    positionLabels: ["C", "LW", "RW", "LD", "RD", "G"],
    ballLabel: "Ball",
    ballLabelSv: "Boll",
    movementLabels: {
      skate: "Run",
      pass: "Pass",
      shot: "Shot",
      puck: "Ball",
    },
    movementLabelsSv: {
      skate: "Löpning",
      pass: "Passning",
      shot: "Skott",
      puck: "Boll",
    },
  },
  VOLLEYBALL: {
    ...VOLLEYBALL_COURT_CONFIG,
    label: "Volleyball",
    labelSv: "Volleyboll",
    Surface: VolleyballCourtSurface,
    positionLabels: ["S", "OH", "OPP", "MB", "L", "RS"],
    ballLabel: "Ball",
    ballLabelSv: "Boll",
    movementLabels: {
      skate: "Run",
      pass: "Pass",
      shot: "Spike",
      puck: "Ball",
    },
    movementLabelsSv: {
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
export function getSportConfig(sportType?: string, locale: "en" | "sv" = "en"): SportSurfaceConfig {
  const config = sportType && sportType in SPORT_SURFACES
    ? SPORT_SURFACES[sportType as DrillSportType]
    : SPORT_SURFACES.ICE_HOCKEY;

  if (locale !== "sv") return config;

  return {
    ...config,
    label: config.labelSv || config.label,
    ballLabel: config.ballLabelSv || config.ballLabel,
    movementLabels: config.movementLabelsSv || config.movementLabels,
  };
}

/**
 * All available sport types as array (for selectors).
 */
export const DRILL_SPORT_OPTIONS: { value: DrillSportType; label: string }[] = [
  { value: "ICE_HOCKEY", label: "Ice Hockey" },
  { value: "FOOTBALL", label: "Football" },
  { value: "HANDBALL", label: "Handball" },
  { value: "BASKETBALL", label: "Basketball" },
  { value: "FLOORBALL", label: "Floorball" },
  { value: "VOLLEYBALL", label: "Volleyball" },
];

export function getDrillSportOptions(locale: "en" | "sv" = "en"): { value: DrillSportType; label: string }[] {
  if (locale !== "sv") return DRILL_SPORT_OPTIONS;
  return DRILL_SPORT_OPTIONS.map((option) => ({
    value: option.value,
    label: SPORT_SURFACES[option.value].labelSv || option.label,
  }));
}
