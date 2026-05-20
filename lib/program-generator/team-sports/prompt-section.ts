import {
  buildFootballPlanningContext,
  buildHockeyPlanningContext,
  type FootballPlanningContext,
  type HockeyPlanningContext,
} from './planning-context'

type AppLocale = 'en' | 'sv'
type PromptVariant = 'markdown' | 'compact'

type TeamSportPromptInput = {
  sport: string
  goal?: string
  sessionsPerWeek?: number
  locale?: AppLocale
  variant?: PromptVariant
  hockeySettings?: Record<string, unknown> | null
  footballSettings?: Record<string, unknown> | null
}

export function buildTeamSportPromptSection(input: TeamSportPromptInput): string {
  const locale = input.locale === 'en' ? 'en' : 'sv'
  const variant = input.variant || 'compact'
  const goal = input.goal || 'in-season-maintenance'

  if (input.sport === 'TEAM_ICE_HOCKEY' && input.hockeySettings) {
    const planning = buildHockeyPlanningContext({
      goal,
      sessionsPerWeek: input.sessionsPerWeek,
      hockeySettings: input.hockeySettings,
    })
    return formatHockeySection(planning, input.hockeySettings, locale, variant)
  }

  if (input.sport === 'TEAM_FOOTBALL' && input.footballSettings) {
    const planning = buildFootballPlanningContext({
      goal,
      sessionsPerWeek: input.sessionsPerWeek,
      footballSettings: input.footballSettings,
    })
    return formatFootballSection(planning, input.footballSettings, locale, variant)
  }

  return ''
}

function formatHockeySection(
  planning: HockeyPlanningContext,
  settings: Record<string, unknown>,
  locale: AppLocale,
  variant: PromptVariant
): string {
  const lines = [
    heading(locale, variant, 'ISHOCKEYSPECIFIK PROFIL', 'ISHOCKEYSPECIFIKT:', 'ICE HOCKEY CONTEXT:'),
    formatSetting(locale, variant, 'Position', 'Position', planning.position),
    formatSetting(locale, variant, 'Säsongsfas', 'Season phase', planning.phase),
    formatSetting(locale, variant, 'Matcher denna vecka', 'Games this week', planning.matchesThisWeek),
    formatSetting(locale, variant, 'Rekommenderade off-ice-pass', 'Recommended off-ice sessions', planning.requestedSessions),
    formatSetting(locale, variant, 'Lag', 'Team', settings.teamName),
    formatSetting(locale, variant, 'Liga/nivå', 'League/level', settings.leagueLevel),
    formatSetting(locale, variant, 'Istid per match', 'Ice time per game', withUnit(settings.averageIceTimeMinutes, 'min')),
    formatSetting(locale, variant, 'Byten per match', 'Shifts per game', settings.shiftsPerGame),
    formatSetting(locale, variant, 'Spelstil', 'Play style', settings.playStyle),
    formatBooleanSetting(locale, variant, 'Tillgång till is', 'Access to ice', settings.hasAccessToIce),
    formatBooleanSetting(locale, variant, 'Tillgång till gym', 'Access to gym', settings.hasAccessToGym),
    formatListSetting(locale, variant, 'Styrkefokus', 'Strength focus', settings.strengthFocus),
    formatListSetting(locale, variant, 'Utvecklingsområden', 'Development areas', settings.weaknesses),
    formatListSetting(locale, variant, 'Skadehistorik', 'Injury history', settings.injuryHistory),
    formatListSetting(
      locale,
      variant,
      'Prioriterad prevention',
      'Priority prevention',
      planning.prevention.slice(0, 4).map((exercise) => exercise.name)
    ),
    formatListSetting(locale, variant, 'Belastningsstyrning', 'Load guidance', planning.loadGuidance.notes),
    locale === 'sv'
      ? 'Krav: använd positionens krav, säsongsfas och matchbelastning. Inkludera relevant skadeprevention. Undvik hård off-ice kondition vid hög matchbelastning.'
      : 'Requirement: use position demands, season phase, and game load. Include relevant injury prevention and avoid hard off-ice conditioning during high game load.',
  ].filter(Boolean)

  return withVariantSpacing(lines, variant)
}

function formatFootballSection(
  planning: FootballPlanningContext,
  settings: Record<string, unknown>,
  locale: AppLocale,
  variant: PromptVariant
): string {
  const benchmarks = isRecord(settings.benchmarks) ? settings.benchmarks : {}
  const lines = [
    heading(locale, variant, 'FOTBOLLSSPECIFIK PROFIL', 'FOTBOLLSSPECIFIKT:', 'FOOTBALL CONTEXT:'),
    formatSetting(locale, variant, 'Position', 'Position', planning.position),
    formatSetting(locale, variant, 'Detaljerad position', 'Position detail', settings.positionDetail),
    formatSetting(locale, variant, 'Säsongsfas', 'Season phase', planning.phase),
    formatSetting(locale, variant, 'Matcher per vecka', 'Matches per week', planning.matchesPerWeek),
    formatSetting(locale, variant, 'Rekommenderade träningspass', 'Recommended training sessions', planning.sessionsPerWeek),
    formatSetting(locale, variant, 'Lag', 'Team', settings.teamName),
    formatSetting(locale, variant, 'Liga/nivå', 'League/level', settings.leagueLevel),
    formatSetting(locale, variant, 'Minuter per match', 'Minutes per match', settings.avgMinutesPerMatch),
    formatSetting(locale, variant, 'Spelstil', 'Play style', settings.playStyle),
    formatBooleanSetting(locale, variant, 'GPS-data finns', 'GPS data available', settings.hasGPSData),
    formatSetting(locale, variant, 'GPS-system', 'GPS system', settings.gpsProvider),
    formatSetting(locale, variant, 'Matchdistans', 'Match distance', withUnit(settings.avgMatchDistanceKm, 'km')),
    formatSetting(locale, variant, 'Sprintdistans', 'Sprint distance', withUnit(settings.avgSprintDistanceM, 'm')),
    formatSetting(locale, variant, 'Yo-Yo IR1', 'Yo-Yo IR1', benchmarks.yoyoIR1Level),
    formatSetting(locale, variant, '10m sprint', '10m sprint', withUnit(benchmarks.sprint10m, 's')),
    formatSetting(locale, variant, '30m sprint', '30m sprint', withUnit(benchmarks.sprint30m, 's')),
    formatSetting(locale, variant, 'CMJ', 'CMJ', withUnit(benchmarks.cmjHeight, 'cm')),
    formatListSetting(locale, variant, 'Styrkefokus', 'Strength focus', settings.strengthFocus),
    formatListSetting(locale, variant, 'Utvecklingsområden', 'Development areas', settings.weaknesses),
    formatListSetting(locale, variant, 'Skadehistorik', 'Injury history', settings.injuryHistory),
    formatListSetting(
      locale,
      variant,
      'Prioriterad prevention',
      'Priority prevention',
      planning.prevention.slice(0, 4).map((exercise) => exercise.name)
    ),
    formatListSetting(locale, variant, 'Belastningsstyrning', 'Load guidance', planning.loadGuidance.notes),
    locale === 'sv'
      ? 'Krav: planera runt matchdagar med MD+1 återhämtning och MD-1 aktivering. Inkludera FIFA 11+ eller motsvarande skadeprevention.'
      : 'Requirement: plan around match days with MD+1 recovery and MD-1 activation. Include FIFA 11+ or equivalent injury prevention.',
  ].filter(Boolean)

  return withVariantSpacing(lines, variant)
}

function heading(locale: AppLocale, variant: PromptVariant, markdownSv: string, compactSv: string, compactEn: string): string {
  if (variant === 'markdown') return locale === 'sv' ? `\n## ${markdownSv}` : `\n## ${compactEn.replace(/:$/, '')}`
  return locale === 'sv' ? compactSv : compactEn
}

function formatSetting(
  locale: AppLocale,
  variant: PromptVariant,
  svLabel: string,
  enLabel: string,
  value: unknown
): string | null {
  if (value === null || value === undefined || value === '') return null
  const label = locale === 'sv' ? svLabel : enLabel
  return variant === 'markdown' ? `- **${label}**: ${String(value)}` : `- ${label}: ${String(value)}`
}

function formatBooleanSetting(
  locale: AppLocale,
  variant: PromptVariant,
  svLabel: string,
  enLabel: string,
  value: unknown
): string | null {
  if (typeof value !== 'boolean') return null
  return formatSetting(locale, variant, svLabel, enLabel, locale === 'sv' ? (value ? 'Ja' : 'Nej') : (value ? 'Yes' : 'No'))
}

function formatListSetting(
  locale: AppLocale,
  variant: PromptVariant,
  svLabel: string,
  enLabel: string,
  value: unknown
): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  return formatSetting(locale, variant, svLabel, enLabel, value.map(String).join(', '))
}

function withUnit(value: unknown, unit: string): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return `${String(value)} ${unit}`
}

function withVariantSpacing(lines: Array<string | null>, variant: PromptVariant): string {
  const body = lines.filter(Boolean).join('\n')
  return variant === 'markdown' ? `${body}\n` : body
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
