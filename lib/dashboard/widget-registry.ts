/**
 * Dashboard Widget Registry
 *
 * Central catalog of every widget that can appear on athlete or coach
 * dashboards. Widget keys are a public API: once shipped, NEVER rename a key —
 * doing so will orphan every user's saved preferences. Add new widgets by
 * appending entries; deprecate by setting `deprecated: true`.
 *
 * Used by:
 *   - lib/dashboard/resolve-widgets.ts  (resolution + filtering)
 *   - app/.../settings/dashboard         (settings UI)
 *   - app/.../dashboard/page.tsx         (visibility checks)
 */

import type { SportType } from '@prisma/client'

export type WidgetCategory =
  | 'overview'
  | 'training'
  | 'health'
  | 'ai-insights'
  | 'nutrition'
  | 'social'
  | 'sport-specific'
  | 'coach-clients'
  | 'coach-team'
  | 'coach-business'

export type WidgetAudience =
  | 'athlete'
  | 'coach-pt'
  | 'coach-team'
  | 'coach-gym'

export interface WidgetDefinition {
  /** Stable identifier — NEVER rename after shipping. */
  key: string
  /** i18n key for display name (falls back to inline string). */
  name: string
  /** i18n key for description (falls back to inline string). */
  description: string
  category: WidgetCategory
  audience: WidgetAudience[]
  /** Required widgets cannot be hidden by users (safety / billing critical). */
  required?: boolean
  defaultVisible: boolean
  /** Default render order (lower = earlier). */
  defaultOrder: number
  /** If set, widget is only relevant when the active sport is in this list. */
  sports?: SportType[]
  /** Optional subscription feature gate key. */
  featureGate?: string
  /** Marked deprecated — won't appear in settings UI but still renders if existing prefs reference it. */
  deprecated?: boolean
}

// ---------------------------------------------------------------------------
// ATHLETE WIDGETS
// ---------------------------------------------------------------------------
const ATHLETE_WIDGETS: WidgetDefinition[] = [
  // --- Overview / Hero ---
  {
    key: 'hero-card-slider',
    name: 'Dagens pass',
    description: 'Visar dagens schemalagda pass och WODs',
    category: 'overview',
    audience: ['athlete'],
    required: true,
    defaultVisible: true,
    defaultOrder: 10,
  },
  {
    key: 'readiness-panel',
    name: 'Readiness',
    description: 'Daglig återhämtning, träningsbelastning och fatigue',
    category: 'health',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 20,
  },

  // --- Contextual / AI cards ---
  {
    key: 'milestone-celebration',
    name: 'Milstolpar',
    description: 'Firar uppnådda milstolpar och PRs',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 30,
  },
  {
    key: 'morning-briefing',
    name: 'Morgonbriefing',
    description: 'AI-genererad daglig sammanfattning',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 40,
  },
  {
    key: 'pre-workout-nudge',
    name: 'Förberedelser inför pass',
    description: 'Påminnelser och förberedande tips innan pass',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 50,
  },
  {
    key: 'pattern-alert',
    name: 'Mönsterdetektering',
    description: 'AI upptäcker återkommande mönster i din träning',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 60,
  },
  {
    key: 'mental-prep',
    name: 'Mental förberedelse',
    description: 'Mental coaching inför viktiga pass och tävlingar',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 70,
  },
  {
    key: 'nutrition-timing',
    name: 'Näringstiming',
    description: 'Förslag på näringsintag före/efter pass',
    category: 'nutrition',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 80,
  },
  {
    key: 'post-workout-check',
    name: 'Efterträningskoll',
    description: 'Snabb återkoppling efter genomfört pass',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 90,
  },
  {
    key: 'ai-suggestions-banner',
    name: 'AI-förslag',
    description: 'Intelligenta träningsförslag baserade på din data',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 100,
  },

  // --- Sport-specific dashboards ---
  {
    key: 'sport-specific-dashboard',
    name: 'Sportspecifik översikt',
    description: 'Specialiserad vy för din primära sport',
    category: 'sport-specific',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 110,
  },

  // --- Secondary grid (left) ---
  {
    key: 'upcoming-team-events',
    name: 'Kommande lagaktiviteter',
    description: 'Träningar, matcher och tester från ditt lag',
    category: 'social',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 120,
    // Only relevant for team / racket sports where athletes are part of a team
    sports: [
      'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
      'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
    ],
  },
  {
    key: 'upcoming-workouts',
    name: 'Kommande pass',
    description: 'Schemalagda pass kommande 7 dagar',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 130,
  },
  {
    key: 'weekly-training-summary',
    name: 'Veckosammanfattning',
    description: 'Sammanställning av veckans träning',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 140,
  },
  {
    key: 'training-trend-chart',
    name: 'Träningstrender',
    description: '12 veckors träningsbelastning över tid',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 150,
  },
  {
    key: 'zone-distribution-chart',
    name: 'Zonfördelning',
    description: 'Fördelning av träning över intensitetszoner',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 160,
    // Zone training is meaningful for endurance + triathlon
    sports: ['RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON'],
  },
  {
    key: 'nutrition-dashboard',
    name: 'Kost',
    description: 'Dagens näringsintag och makros',
    category: 'nutrition',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 170,
  },
  {
    key: 'integrated-recent-activity',
    name: 'Senaste aktiviteter',
    description: 'Strava, Garmin och loggad träning',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 180,
  },
  {
    key: 'interval-results-history',
    name: 'Intervallresultat',
    description: 'Historik från live-intervalltester',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 190,
    // Interval testing is most common for endurance + team conditioning
    sports: [
      'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON',
      'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
      'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL',
    ],
  },
  {
    key: 'athlete-drill-list',
    name: 'Drills',
    description: 'Tilldelade drills och övningar från coach',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 200,
    // Drills are mainly for team + racket sports
    sports: [
      'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
      'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
    ],
  },

  // --- Secondary grid (right) ---
  {
    key: 'accountability-streak',
    name: 'Streak',
    description: 'Daglig accountability-streak',
    category: 'overview',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 210,
  },
  {
    key: 'agent-recommendations',
    name: 'AI-rekommendationer',
    description: 'Personliga rekommendationer från AI-agenten',
    category: 'ai-insights',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 220,
  },
  {
    key: 'active-restrictions',
    name: 'Aktiva restriktioner',
    description: 'Skador och träningsrestriktioner — säkerhetskritiskt',
    category: 'health',
    audience: ['athlete'],
    required: true,
    defaultVisible: true,
    defaultOrder: 230,
  },
  {
    key: 'active-programs',
    name: 'Aktiva program',
    description: 'Pågående träningsprogram',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 240,
  },
  {
    key: 'wod-history-summary',
    name: 'WOD-historik',
    description: 'AI-genererade pass och statistik',
    category: 'training',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 250,
    // WODs are CrossFit/HYROX/general fitness style
    sports: ['HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH'],
  },
  {
    key: 'garmin-health-card',
    name: 'Garmin hälsodata',
    description: 'HRV, vilopuls, sömn och stress från Garmin',
    category: 'health',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 260,
  },
  {
    key: 'oura-health-card',
    name: 'Oura Ring',
    description: 'Beredskap, sömnpoäng, HRV, vilopuls och SpO₂ från Oura',
    category: 'health',
    audience: ['athlete'],
    defaultVisible: true,
    defaultOrder: 265,
  },
]

// ---------------------------------------------------------------------------
// COACH WIDGETS
// ---------------------------------------------------------------------------
const COACH_WIDGETS: WidgetDefinition[] = [
  // --- Stat cards (top of page) ---
  {
    key: 'dashboard-stat-cards',
    name: 'Statistikkort',
    description: 'Översikt över klienter, program och senaste aktivitet',
    category: 'overview',
    audience: ['coach-pt', 'coach-team', 'coach-gym'],
    defaultVisible: true,
    defaultOrder: 10,
  },

  // --- PT mode ---
  {
    key: 'athlete-attention-list',
    name: 'Atleter som behöver uppmärksamhet',
    description: 'Prioritetslista över atleter med varningar',
    category: 'coach-clients',
    audience: ['coach-pt'],
    defaultVisible: true,
    defaultOrder: 20,
  },
  {
    key: 'client-status-grid',
    name: 'Klientstatus',
    description: 'Översiktsrutnät över alla klienter',
    category: 'coach-clients',
    audience: ['coach-pt'],
    defaultVisible: true,
    defaultOrder: 30,
  },
  {
    key: 'todays-appointments',
    name: 'Dagens möten',
    description: 'Bokade pass och möten idag',
    category: 'overview',
    audience: ['coach-pt', 'coach-gym'],
    defaultVisible: true,
    defaultOrder: 40,
  },
  {
    key: 'coach-ai-assistant',
    name: 'AI-assistent',
    description: 'AI-coachpanelen för programförslag och frågor',
    category: 'ai-insights',
    audience: ['coach-pt', 'coach-team', 'coach-gym'],
    defaultVisible: true,
    defaultOrder: 50,
  },
  {
    key: 'coach-quick-actions',
    name: 'Snabbåtgärder',
    description: 'Genvägar till vanliga coachuppgifter',
    category: 'overview',
    audience: ['coach-pt', 'coach-team', 'coach-gym'],
    defaultVisible: true,
    defaultOrder: 60,
  },
  {
    key: 'recent-tests',
    name: 'Senaste tester',
    description: 'Fysiologiska tester de senaste 30 dagarna',
    category: 'coach-clients',
    audience: ['coach-pt'],
    defaultVisible: true,
    defaultOrder: 70,
  },
  {
    key: 'upcoming-events',
    name: 'Kommande händelser',
    description: 'Tävlingar och händelser kommande 7 dagar',
    category: 'overview',
    audience: ['coach-pt'],
    defaultVisible: true,
    defaultOrder: 80,
  },

  // --- Team mode ---
  {
    key: 'today-timeline',
    name: 'Dagens tidslinje',
    description: 'Tidslinje över lagets dag',
    category: 'coach-team',
    audience: ['coach-team'],
    defaultVisible: true,
    defaultOrder: 90,
  },
  {
    key: 'team-roster-grid',
    name: 'Lagrutnät',
    description: 'Översikt över hela laget',
    category: 'coach-team',
    audience: ['coach-team'],
    defaultVisible: true,
    defaultOrder: 100,
  },

  // --- Gym mode ---
  {
    key: 'gym-classes',
    name: 'Gruppass',
    description: 'Schema för gruppass',
    category: 'coach-business',
    audience: ['coach-gym'],
    defaultVisible: true,
    defaultOrder: 110,
  },
  {
    key: 'gym-client-list',
    name: 'PT-klienter',
    description: 'Lista över personliga klienter',
    category: 'coach-business',
    audience: ['coach-gym'],
    defaultVisible: true,
    defaultOrder: 120,
  },
  {
    key: 'coach-tasks',
    name: 'Att-göra',
    description: 'Coachuppgifter och påminnelser',
    category: 'coach-business',
    audience: ['coach-gym'],
    defaultVisible: true,
    defaultOrder: 130,
  },
  {
    key: 'social-media',
    name: 'Sociala medier',
    description: 'Schemalagda sociala media-poster',
    category: 'coach-business',
    audience: ['coach-gym'],
    defaultVisible: true,
    defaultOrder: 140,
  },
  {
    key: 'competitions',
    name: 'Tävlingar',
    description: 'Tävlingskalender och anmälningar',
    category: 'coach-business',
    audience: ['coach-gym'],
    defaultVisible: true,
    defaultOrder: 150,
  },
  {
    key: 'strength-pr-feed',
    name: 'PR-flöde',
    description: 'Senaste personliga rekord från klienter',
    category: 'coach-business',
    audience: ['coach-gym'],
    defaultVisible: true,
    defaultOrder: 160,
  },
]

// ---------------------------------------------------------------------------
// REGISTRY EXPORTS
// ---------------------------------------------------------------------------

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = Object.fromEntries(
  [...ATHLETE_WIDGETS, ...COACH_WIDGETS].map(w => [w.key, w])
)

export function getWidgetsForAudience(audience: WidgetAudience): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(
    w => w.audience.includes(audience) && !w.deprecated
  )
}

export function getAthleteWidgets(): WidgetDefinition[] {
  return getWidgetsForAudience('athlete')
}

export function getCoachWidgets(mode: 'PT' | 'TEAM' | 'GYM'): WidgetDefinition[] {
  const audience: WidgetAudience =
    mode === 'PT' ? 'coach-pt' : mode === 'TEAM' ? 'coach-team' : 'coach-gym'
  // Stat cards + AI assistant + quick actions are shared across all coach modes
  return getWidgetsForAudience(audience)
}

/**
 * Group widgets by category for the settings UI.
 */
export function groupByCategory(widgets: WidgetDefinition[]): Record<WidgetCategory, WidgetDefinition[]> {
  const groups = {} as Record<WidgetCategory, WidgetDefinition[]>
  for (const w of widgets) {
    if (!groups[w.category]) groups[w.category] = []
    groups[w.category].push(w)
  }
  return groups
}

// ---------------------------------------------------------------------------
// PRESETS
// ---------------------------------------------------------------------------

export type PresetKey = 'standard' | 'minimal' | 'performance' | 'recovery' | 'sport-focus'

export interface Preset {
  key: PresetKey
  name: string
  description: string
  /** Returns the visible widget keys for this preset, given the athlete's sport. */
  resolve: (allWidgets: WidgetDefinition[], sport?: SportType | null) => Set<string>
}

const teamSports: SportType[] = [
  'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
  'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL',
]
const enduranceSports: SportType[] = ['RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON']
const strengthFocusSports: SportType[] = ['STRENGTH', 'HYROX', 'FUNCTIONAL_FITNESS', 'GENERAL_FITNESS']

export const PRESETS: Record<PresetKey, Preset> = {
  standard: {
    key: 'standard',
    name: 'Standard',
    description: 'Visa allt — den fullständiga dashboard-vyn',
    resolve: (all) => new Set(all.filter(w => w.defaultVisible).map(w => w.key)),
  },
  minimal: {
    key: 'minimal',
    name: 'Minimal',
    description: 'Bara det viktigaste: dagens pass, readiness och program',
    resolve: (all) => {
      const keep = new Set([
        'hero-card-slider',
        'readiness-panel',
        'active-restrictions',
        'active-programs',
        'upcoming-workouts',
        'morning-briefing',
      ])
      return new Set(all.filter(w => w.required || keep.has(w.key)).map(w => w.key))
    },
  },
  performance: {
    key: 'performance',
    name: 'Prestation',
    description: 'Fokus på träningsanalys, trender och AI-insikter',
    resolve: (all) => {
      const keep = new Set([
        'hero-card-slider',
        'readiness-panel',
        'active-restrictions',
        'morning-briefing',
        'pre-workout-nudge',
        'pattern-alert',
        'mental-prep',
        'ai-suggestions-banner',
        'agent-recommendations',
        'sport-specific-dashboard',
        'weekly-training-summary',
        'training-trend-chart',
        'zone-distribution-chart',
        'integrated-recent-activity',
        'wod-history-summary',
        'active-programs',
        'upcoming-workouts',
        'garmin-health-card',
        'oura-health-card',
      ])
      return new Set(all.filter(w => w.required || keep.has(w.key)).map(w => w.key))
    },
  },
  recovery: {
    key: 'recovery',
    name: 'Återhämtning',
    description: 'Fokus på readiness, sömn, näring och mental hälsa',
    resolve: (all) => {
      const keep = new Set([
        'hero-card-slider',
        'readiness-panel',
        'active-restrictions',
        'garmin-health-card',
        'oura-health-card',
        'mental-prep',
        'nutrition-timing',
        'nutrition-dashboard',
        'post-workout-check',
        'morning-briefing',
        'pattern-alert',
        'milestone-celebration',
        'accountability-streak',
      ])
      return new Set(all.filter(w => w.required || keep.has(w.key)).map(w => w.key))
    },
  },
  'sport-focus': {
    key: 'sport-focus',
    name: 'Sport-fokus',
    description: 'Anpassad efter din primära sport (lag-, kondition- eller styrkefokus)',
    resolve: (all, sport) => {
      // Sport-aware curated set
      const base = new Set([
        'hero-card-slider',
        'readiness-panel',
        'active-restrictions',
        'sport-specific-dashboard',
        'active-programs',
        'upcoming-workouts',
      ])
      if (sport && teamSports.includes(sport)) {
        base.add('upcoming-team-events')
        base.add('athlete-drill-list')
        base.add('interval-results-history')
        base.add('agent-recommendations')
      } else if (sport && enduranceSports.includes(sport)) {
        base.add('weekly-training-summary')
        base.add('training-trend-chart')
        base.add('zone-distribution-chart')
        base.add('integrated-recent-activity')
        base.add('garmin-health-card')
        base.add('oura-health-card')
        base.add('morning-briefing')
      } else if (sport && strengthFocusSports.includes(sport)) {
        base.add('wod-history-summary')
        base.add('weekly-training-summary')
        base.add('nutrition-dashboard')
        base.add('milestone-celebration')
      } else if (sport === 'TENNIS' || sport === 'PADEL') {
        base.add('upcoming-team-events')
        base.add('agent-recommendations')
        base.add('weekly-training-summary')
      }
      return new Set(all.filter(w => w.required || base.has(w.key)).map(w => w.key))
    },
  },
}

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  overview: 'Översikt',
  training: 'Träning',
  health: 'Hälsa & återhämtning',
  'ai-insights': 'AI-insikter',
  nutrition: 'Kost',
  social: 'Lag & socialt',
  'sport-specific': 'Sportspecifikt',
  'coach-clients': 'Klienter',
  'coach-team': 'Lag',
  'coach-business': 'Verksamhet',
}
