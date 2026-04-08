/**
 * Pre-built ice hockey drill templates.
 *
 * Each template provides a complete DrillStructure that coaches can
 * pick from a library and optionally customize in the editor.
 *
 * Coordinate system: 200×85 (IIHF standard)
 * Center ice (100, 42.5), blue lines at x=65/135
 */

import type { DrillStructure } from '@/components/coach/drills/IceHockeyRink'

export interface DrillTemplate {
  id: string
  name: string
  description: string
  category: DrillCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  playerCount: number
  sportType: string
  structure: DrillStructure
}

export type DrillCategory =
  | 'breakout'
  | 'forecheck'
  | 'powerplay'
  | 'penaltykill'
  | 'regroup'
  | 'rush'
  | 'shooting'
  | 'passing'
  | 'warmup'

export const DRILL_CATEGORIES: { value: DrillCategory; label: string }[] = [
  { value: 'breakout', label: 'Breakout' },
  { value: 'forecheck', label: 'Forecheck' },
  { value: 'powerplay', label: 'Powerplay' },
  { value: 'penaltykill', label: 'Boxplay' },
  { value: 'regroup', label: 'Regroup' },
  { value: 'rush', label: 'Rush' },
  { value: 'shooting', label: 'Skottövning' },
  { value: 'passing', label: 'Passningsövning' },
  { value: 'warmup', label: 'Uppvärmning' },
]

export const HOCKEY_DRILL_TEMPLATES: DrillTemplate[] = [
  // ─── BREAKOUT ─────────────────────────────────────────────────

  {
    id: 'breakout-basic-5v0',
    name: 'Breakout 5v0 — Grundövning',
    description: 'Grundläggande breakout från egen zon. Back hämtar puck, passning till center, wing-stöd längs sargen.',
    category: 'breakout',
    difficulty: 'beginner',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'ld', x: 18, y: 30, label: 'LD', team: 'home' },
        { id: 'rd', x: 18, y: 55, label: 'RD', team: 'home' },
        { id: 'c', x: 40, y: 42.5, label: 'C', team: 'home' },
        { id: 'lw', x: 55, y: 12, label: 'LW', team: 'home' },
        { id: 'rw', x: 55, y: 73, label: 'RW', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 8, fromY: 42, toX: 18, toY: 30, type: 'puck' },
        { id: 'm2', fromX: 18, fromY: 30, toX: 35, toY: 30, type: 'skate' },
        { id: 'm3', fromX: 35, fromY: 30, toX: 55, toY: 42.5, type: 'pass' },
        { id: 'm4', fromX: 40, fromY: 42.5, toX: 80, toY: 42.5, type: 'skate' },
        { id: 'm5', fromX: 55, fromY: 12, toX: 100, toY: 15, type: 'skate' },
        { id: 'm6', fromX: 55, fromY: 73, toX: 100, toY: 70, type: 'skate' },
      ],
      zones: [
        { id: 'z1', x: 0, y: 0, width: 65, height: 85, color: '#3b82f6', label: 'Egen zon' },
      ],
      annotations: [
        { id: 'a1', x: 30, y: 8, text: '1. Back hämtar' },
        { id: 'a2', x: 70, y: 42.5, text: '2. Center mottar' },
      ],
    },
  },

  {
    id: 'breakout-reverse',
    name: 'Breakout — Reverse (bakom mål)',
    description: 'Reverse breakout. Back åker bakom eget mål, mottagande back stöttar, passning till wing på far side.',
    category: 'breakout',
    difficulty: 'intermediate',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'ld', x: 20, y: 25, label: 'LD', team: 'home' },
        { id: 'rd', x: 20, y: 60, label: 'RD', team: 'home' },
        { id: 'c', x: 50, y: 42.5, label: 'C', team: 'home' },
        { id: 'lw', x: 60, y: 10, label: 'LW', team: 'home' },
        { id: 'rw', x: 60, y: 75, label: 'RW', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 20, fromY: 25, toX: 8, toY: 38, type: 'skate' },
        { id: 'm2', fromX: 8, fromY: 38, toX: 8, toY: 47, type: 'skate' },
        { id: 'm3', fromX: 8, fromY: 47, toX: 20, toY: 60, type: 'pass' },
        { id: 'm4', fromX: 20, fromY: 60, toX: 60, toY: 75, type: 'pass' },
        { id: 'm5', fromX: 60, fromY: 75, toX: 120, toY: 70, type: 'skate' },
        { id: 'm6', fromX: 50, fromY: 42.5, toX: 100, toY: 42.5, type: 'skate' },
        { id: 'm7', fromX: 60, fromY: 10, toX: 120, toY: 15, type: 'skate' },
      ],
      zones: [],
      annotations: [
        { id: 'a1', x: 8, y: 34, text: 'Reverse' },
        { id: 'a2', x: 40, y: 68, text: 'Up' },
      ],
    },
  },

  // ─── FORECHECK ────────────────────────────────────────────────

  {
    id: 'forecheck-1-2-2',
    name: 'Forecheck 1-2-2',
    description: '1-2-2 forecheck-system. F1 pressar puckföraren, F2/F3 täcker flanker, backar håller blålinjen.',
    category: 'forecheck',
    difficulty: 'intermediate',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'f1', x: 170, y: 42.5, label: 'C', team: 'home' },
        { id: 'f2', x: 150, y: 25, label: 'LW', team: 'home' },
        { id: 'f3', x: 150, y: 60, label: 'RW', team: 'home' },
        { id: 'ld', x: 130, y: 25, label: 'LD', team: 'home' },
        { id: 'rd', x: 130, y: 60, label: 'RD', team: 'home' },
        { id: 'opp1', x: 185, y: 30, label: '1', team: 'away' },
        { id: 'opp2', x: 185, y: 55, label: '2', team: 'away' },
      ],
      movements: [
        { id: 'm1', fromX: 170, fromY: 42.5, toX: 185, toY: 35, type: 'skate' },
        { id: 'm2', fromX: 150, fromY: 25, toX: 168, toY: 20, type: 'skate' },
        { id: 'm3', fromX: 150, fromY: 60, toX: 168, toY: 65, type: 'skate' },
      ],
      zones: [
        { id: 'z1', x: 135, y: 0, width: 65, height: 85, color: '#ef4444', label: 'Press' },
      ],
      annotations: [
        { id: 'a1', x: 178, y: 42.5, text: 'F1 press' },
        { id: 'a2', x: 135, y: 8, text: 'Blålinje' },
      ],
    },
  },

  {
    id: 'forecheck-2-1-2',
    name: 'Forecheck 2-1-2 (aggressiv)',
    description: 'Aggressiv 2-1-2 forecheck. Två forwards pressar högt, center täcker mitten, backar stöttar.',
    category: 'forecheck',
    difficulty: 'advanced',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'lw', x: 170, y: 28, label: 'LW', team: 'home' },
        { id: 'rw', x: 170, y: 57, label: 'RW', team: 'home' },
        { id: 'c', x: 150, y: 42.5, label: 'C', team: 'home' },
        { id: 'ld', x: 130, y: 28, label: 'LD', team: 'home' },
        { id: 'rd', x: 130, y: 57, label: 'RD', team: 'home' },
        { id: 'opp', x: 188, y: 42.5, label: 'G', team: 'away' },
      ],
      movements: [
        { id: 'm1', fromX: 170, fromY: 28, toX: 185, toY: 25, type: 'skate' },
        { id: 'm2', fromX: 170, fromY: 57, toX: 185, toY: 60, type: 'skate' },
        { id: 'm3', fromX: 150, fromY: 42.5, toX: 165, toY: 42.5, type: 'skate' },
      ],
      zones: [
        { id: 'z1', x: 160, y: 0, width: 40, height: 85, color: '#ef4444', label: 'Hög press' },
      ],
      annotations: [],
    },
  },

  // ─── POWER PLAY ───────────────────────────────────────────────

  {
    id: 'pp-umbrella',
    name: 'Powerplay — Paraply (1-3-1)',
    description: 'Klassisk 1-3-1 powerplay-uppställning. Point skjuter, halvmurare roterar, front-man screen.',
    category: 'powerplay',
    difficulty: 'intermediate',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'point', x: 140, y: 42.5, label: 'LD', team: 'home' },
        { id: 'lhalf', x: 160, y: 20, label: 'LW', team: 'home' },
        { id: 'rhalf', x: 160, y: 65, label: 'RW', team: 'home' },
        { id: 'bumper', x: 170, y: 42.5, label: 'C', team: 'home' },
        { id: 'net', x: 183, y: 42.5, label: 'RD', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 140, fromY: 42.5, toX: 160, toY: 20, type: 'pass' },
        { id: 'm2', fromX: 160, fromY: 20, toX: 170, toY: 42.5, type: 'pass' },
        { id: 'm3', fromX: 170, fromY: 42.5, toX: 160, toY: 65, type: 'pass' },
        { id: 'm4', fromX: 160, fromY: 65, toX: 188, toY: 42.5, type: 'shot' },
      ],
      zones: [
        { id: 'z1', x: 135, y: 0, width: 65, height: 85, color: '#22c55e', label: 'PP-zon' },
      ],
      annotations: [
        { id: 'a1', x: 183, y: 50, text: 'Screen' },
      ],
    },
  },

  {
    id: 'pp-overload',
    name: 'Powerplay — Overload',
    description: 'Overload powerplay med tre spelare på en sida. Snabba passningar för att öppna skottläge.',
    category: 'powerplay',
    difficulty: 'advanced',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'point', x: 140, y: 42.5, label: 'LD', team: 'home' },
        { id: 'half', x: 155, y: 20, label: 'LW', team: 'home' },
        { id: 'low', x: 175, y: 20, label: 'C', team: 'home' },
        { id: 'bumper', x: 165, y: 40, label: 'RD', team: 'home' },
        { id: 'net', x: 180, y: 55, label: 'RW', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 140, fromY: 42.5, toX: 155, toY: 20, type: 'pass' },
        { id: 'm2', fromX: 155, fromY: 20, toX: 175, toY: 20, type: 'pass' },
        { id: 'm3', fromX: 175, fromY: 20, toX: 165, toY: 40, type: 'pass' },
        { id: 'm4', fromX: 165, fromY: 40, toX: 188, toY: 42.5, type: 'shot' },
      ],
      zones: [],
      annotations: [
        { id: 'a1', x: 160, y: 12, text: 'Overload-sida' },
      ],
    },
  },

  // ─── PENALTY KILL ─────────────────────────────────────────────

  {
    id: 'pk-diamond',
    name: 'Boxplay — Diamant',
    description: 'Diamantformation (1-2-1) boxplay. Aggressiv press högt, backar täcker slot.',
    category: 'penaltykill',
    difficulty: 'intermediate',
    playerCount: 4,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'top', x: 145, y: 42.5, label: 'C', team: 'home' },
        { id: 'left', x: 162, y: 25, label: 'LW', team: 'home' },
        { id: 'right', x: 162, y: 60, label: 'RW', team: 'home' },
        { id: 'low', x: 178, y: 42.5, label: 'LD', team: 'home' },
        { id: 'pp1', x: 140, y: 42.5, label: '1', team: 'away' },
        { id: 'pp2', x: 155, y: 18, label: '2', team: 'away' },
        { id: 'pp3', x: 155, y: 67, label: '3', team: 'away' },
        { id: 'pp4', x: 170, y: 18, label: '4', team: 'away' },
        { id: 'pp5', x: 170, y: 67, label: '5', team: 'away' },
      ],
      movements: [
        { id: 'm1', fromX: 145, fromY: 42.5, toX: 155, toY: 35, type: 'skate' },
        { id: 'm2', fromX: 162, fromY: 25, toX: 158, toY: 22, type: 'skate' },
        { id: 'm3', fromX: 162, fromY: 60, toX: 158, toY: 63, type: 'skate' },
      ],
      zones: [
        { id: 'z1', x: 155, y: 25, width: 30, height: 35, color: '#ef4444', label: 'Slot' },
      ],
      annotations: [
        { id: 'a1', x: 170, y: 42.5, text: 'Täck slot' },
      ],
    },
  },

  // ─── NEUTRAL ZONE REGROUP ─────────────────────────────────────

  {
    id: 'regroup-swing',
    name: 'Regroup — Swing',
    description: 'Neutral zone regroup med swing-pass. Backar tar emot, byter sida, passning framåt.',
    category: 'regroup',
    difficulty: 'beginner',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'ld', x: 70, y: 25, label: 'LD', team: 'home' },
        { id: 'rd', x: 70, y: 60, label: 'RD', team: 'home' },
        { id: 'c', x: 90, y: 42.5, label: 'C', team: 'home' },
        { id: 'lw', x: 100, y: 15, label: 'LW', team: 'home' },
        { id: 'rw', x: 100, y: 70, label: 'RW', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 90, fromY: 42.5, toX: 75, toY: 35, type: 'skate' },
        { id: 'm2', fromX: 75, fromY: 35, toX: 70, toY: 25, type: 'pass' },
        { id: 'm3', fromX: 70, fromY: 25, toX: 70, toY: 60, type: 'pass' },
        { id: 'm4', fromX: 70, fromY: 60, toX: 100, toY: 70, type: 'pass' },
        { id: 'm5', fromX: 100, fromY: 70, toX: 140, toY: 60, type: 'skate' },
        { id: 'm6', fromX: 100, fromY: 15, toX: 140, toY: 20, type: 'skate' },
      ],
      zones: [
        { id: 'z1', x: 65, y: 0, width: 70, height: 85, color: '#f59e0b', label: 'Neutral zon' },
      ],
      annotations: [
        { id: 'a1', x: 70, y: 42.5, text: 'Swing' },
      ],
    },
  },

  // ─── RUSH ─────────────────────────────────────────────────────

  {
    id: 'rush-3v2',
    name: '3-mot-2 Rush',
    description: 'Tre forwards i anfall mot två backar. Mittspelaren drar med sig back, passning till öppen wing.',
    category: 'rush',
    difficulty: 'intermediate',
    playerCount: 5,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'c', x: 100, y: 42.5, label: 'C', team: 'home' },
        { id: 'lw', x: 95, y: 20, label: 'LW', team: 'home' },
        { id: 'rw', x: 95, y: 65, label: 'RW', team: 'home' },
        { id: 'dld', x: 155, y: 30, label: 'LD', team: 'away' },
        { id: 'drd', x: 155, y: 55, label: 'RD', team: 'away' },
      ],
      movements: [
        { id: 'm1', fromX: 100, fromY: 42.5, toX: 145, toY: 42.5, type: 'skate' },
        { id: 'm2', fromX: 95, fromY: 20, toX: 155, toY: 20, type: 'skate' },
        { id: 'm3', fromX: 95, fromY: 65, toX: 155, toY: 65, type: 'skate' },
        { id: 'm4', fromX: 145, fromY: 42.5, toX: 165, toY: 20, type: 'pass' },
        { id: 'm5', fromX: 165, fromY: 20, toX: 188, toY: 42.5, type: 'shot' },
      ],
      zones: [],
      annotations: [
        { id: 'a1', x: 120, y: 42.5, text: 'Drag back' },
        { id: 'a2', x: 175, y: 20, text: 'Skott!' },
      ],
    },
  },

  // ─── SHOOTING ─────────────────────────────────────────────────

  {
    id: 'shooting-cross-ice',
    name: 'Skottövning — Cross-ice',
    description: 'Cross-ice skottövning. Passning tvärs isen, mottagning och direkt skott.',
    category: 'shooting',
    difficulty: 'beginner',
    playerCount: 3,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'p1', x: 155, y: 18, label: '1', team: 'home' },
        { id: 'p2', x: 155, y: 67, label: '2', team: 'home' },
        { id: 'g', x: 190, y: 42.5, label: 'G', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 155, fromY: 18, toX: 165, toY: 55, type: 'pass' },
        { id: 'm2', fromX: 155, fromY: 67, toX: 165, toY: 55, type: 'skate' },
        { id: 'm3', fromX: 165, fromY: 55, toX: 190, toY: 42.5, type: 'shot' },
      ],
      zones: [],
      annotations: [
        { id: 'a1', x: 160, y: 38, text: 'Cross-ice' },
        { id: 'a2', x: 178, y: 48, text: 'One-timer' },
      ],
    },
  },

  // ─── PASSING ──────────────────────────────────────────────────

  {
    id: 'passing-triangle',
    name: 'Passningsövning — Triangel',
    description: 'Snabb triangelpassning. Tre stationer, ständig rotation efter passning.',
    category: 'passing',
    difficulty: 'beginner',
    playerCount: 3,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'p1', x: 100, y: 22, label: '1', team: 'home' },
        { id: 'p2', x: 80, y: 55, label: '2', team: 'home' },
        { id: 'p3', x: 120, y: 55, label: '3', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 100, fromY: 22, toX: 80, toY: 55, type: 'pass' },
        { id: 'm2', fromX: 80, fromY: 55, toX: 120, toY: 55, type: 'pass' },
        { id: 'm3', fromX: 120, fromY: 55, toX: 100, toY: 22, type: 'pass' },
        { id: 'm4', fromX: 100, fromY: 22, toX: 80, toY: 55, type: 'skate' },
        { id: 'm5', fromX: 80, fromY: 55, toX: 120, toY: 55, type: 'skate' },
        { id: 'm6', fromX: 120, fromY: 55, toX: 100, toY: 22, type: 'skate' },
      ],
      zones: [],
      annotations: [
        { id: 'a1', x: 100, y: 42, text: 'Rotera efter passning' },
      ],
    },
  },

  // ─── WARMUP ───────────────────────────────────────────────────

  {
    id: 'warmup-figure8',
    name: 'Uppvärmning — Åtta',
    description: 'Åkningsövning i åttamönster runt tekonerna. Fokus på kantskär och crossovers.',
    category: 'warmup',
    difficulty: 'beginner',
    playerCount: 2,
    sportType: 'ICE_HOCKEY',
    structure: {
      players: [
        { id: 'p1', x: 80, y: 42.5, label: '1', team: 'home' },
        { id: 'p2', x: 120, y: 42.5, label: '2', team: 'home' },
      ],
      movements: [
        { id: 'm1', fromX: 80, fromY: 42.5, toX: 80, toY: 22, type: 'skate' },
        { id: 'm2', fromX: 80, fromY: 22, toX: 120, toY: 22, type: 'skate' },
        { id: 'm3', fromX: 120, fromY: 22, toX: 120, toY: 63, type: 'skate' },
        { id: 'm4', fromX: 120, fromY: 63, toX: 80, toY: 63, type: 'skate' },
        { id: 'm5', fromX: 80, fromY: 63, toX: 80, toY: 42.5, type: 'skate' },
      ],
      zones: [],
      annotations: [
        { id: 'a1', x: 100, y: 10, text: 'Crossovers' },
        { id: 'a2', x: 100, y: 75, text: 'Kantskär' },
      ],
    },
  },
]

// ─── SPORT-SPECIFIC CATEGORIES ────────────────────────────────

export type FootballCategory = 'passing' | 'shooting' | 'dribbling' | 'pressing' | 'possession' | 'set_piece' | 'warmup' | 'conditioning'
export type BasketballCategory = 'fast_break' | 'half_court' | 'defense' | 'shooting' | 'passing' | 'warmup' | 'conditioning'
export type HandballCategory = 'fast_break' | 'set_play' | 'defense' | 'shooting' | 'wing_play' | 'warmup' | 'conditioning'
export type FloorballCategory = 'breakout' | 'forecheck' | 'powerplay' | 'shooting' | 'passing' | 'warmup' | 'conditioning'
export type VolleyballCategory = 'serving' | 'receiving' | 'setting' | 'attacking' | 'blocking' | 'defense' | 'warmup'

export const SPORT_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  ICE_HOCKEY: DRILL_CATEGORIES,
  FOOTBALL: [
    { value: 'passing', label: 'Passning' },
    { value: 'shooting', label: 'Skottövning' },
    { value: 'dribbling', label: 'Dribbling' },
    { value: 'pressing', label: 'Pressing' },
    { value: 'possession', label: 'Bollinnehav' },
    { value: 'set_piece', label: 'Fasta situationer' },
    { value: 'warmup', label: 'Uppvärmning' },
    { value: 'conditioning', label: 'Kondition' },
  ],
  BASKETBALL: [
    { value: 'fast_break', label: 'Fast break' },
    { value: 'half_court', label: 'Halvplansspel' },
    { value: 'defense', label: 'Försvar' },
    { value: 'shooting', label: 'Skottövning' },
    { value: 'passing', label: 'Passning' },
    { value: 'warmup', label: 'Uppvärmning' },
    { value: 'conditioning', label: 'Kondition' },
  ],
  HANDBALL: [
    { value: 'fast_break', label: 'Kontring' },
    { value: 'set_play', label: 'Anfallsspel' },
    { value: 'defense', label: 'Försvar' },
    { value: 'shooting', label: 'Skottövning' },
    { value: 'wing_play', label: 'Kantspel' },
    { value: 'warmup', label: 'Uppvärmning' },
    { value: 'conditioning', label: 'Kondition' },
  ],
  FLOORBALL: [
    { value: 'breakout', label: 'Utspel' },
    { value: 'forecheck', label: 'Forecheck' },
    { value: 'powerplay', label: 'Powerplay' },
    { value: 'shooting', label: 'Skottövning' },
    { value: 'passing', label: 'Passning' },
    { value: 'warmup', label: 'Uppvärmning' },
    { value: 'conditioning', label: 'Kondition' },
  ],
  VOLLEYBALL: [
    { value: 'serving', label: 'Serve' },
    { value: 'receiving', label: 'Mottagning' },
    { value: 'setting', label: 'Passning/upplägg' },
    { value: 'attacking', label: 'Anfall' },
    { value: 'blocking', label: 'Blockering' },
    { value: 'defense', label: 'Försvar' },
    { value: 'warmup', label: 'Uppvärmning' },
  ],
}

/** Supported drill sports with display labels */
export const DRILL_SPORTS = [
  { value: 'ICE_HOCKEY', label: 'Ishockey' },
  { value: 'FOOTBALL', label: 'Fotboll' },
  { value: 'BASKETBALL', label: 'Basket' },
  { value: 'HANDBALL', label: 'Handboll' },
  { value: 'FLOORBALL', label: 'Innebandy' },
  { value: 'VOLLEYBALL', label: 'Volleyboll' },
]

/**
 * Get templates filtered by sport and/or category.
 */
export function getTemplatesByCategory(category?: DrillCategory): DrillTemplate[] {
  if (!category) return HOCKEY_DRILL_TEMPLATES
  return HOCKEY_DRILL_TEMPLATES.filter((t) => t.category === category)
}

export function getTemplatesBySport(sport: string, category?: string): DrillTemplate[] {
  // Currently only hockey has predefined templates
  // Other sports will use AI generation or manual creation
  if (sport === 'ICE_HOCKEY') {
    if (!category) return HOCKEY_DRILL_TEMPLATES
    return HOCKEY_DRILL_TEMPLATES.filter((t) => t.category === category)
  }
  // Return empty for other sports — coaches use AI generation or manual editor
  return []
}
