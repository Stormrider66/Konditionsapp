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
  basketballSettings?: Record<string, unknown> | null
  handballSettings?: Record<string, unknown> | null
  floorballSettings?: Record<string, unknown> | null
  volleyballSettings?: Record<string, unknown> | null
  tennisSettings?: Record<string, unknown> | null
  padelSettings?: Record<string, unknown> | null
}

type CourtSportPromptConfig = {
  settingsKey:
    | 'basketballSettings'
    | 'handballSettings'
    | 'floorballSettings'
    | 'volleyballSettings'
    | 'tennisSettings'
    | 'padelSettings'
  profileField: 'position' | 'playStyle'
  markdownSv: string
  compactSv: string
  compactEn: string
  sportRequirementSv: string
  sportRequirementEn: string
}

const COURT_SPORT_PROMPTS: Record<string, CourtSportPromptConfig> = {
  TEAM_BASKETBALL: {
    settingsKey: 'basketballSettings',
    profileField: 'position',
    markdownSv: 'BASKETSPECIFIK PROFIL',
    compactSv: 'BASKETSPECIFIKT:',
    compactEn: 'BASKETBALL CONTEXT:',
    sportRequirementSv: 'Krav: bygg passen runt position, hoppbelastning, repeated sprint-förmåga, court skills och relevant knä/fotledsprevention.',
    sportRequirementEn: 'Requirement: build around role, jump load, repeated sprint ability, court skills, and relevant knee/ankle prevention.',
  },
  TEAM_HANDBALL: {
    settingsKey: 'handballSettings',
    profileField: 'position',
    markdownSv: 'HANDBOLLSSPECIFIK PROFIL',
    compactSv: 'HANDBOLLSSPECIFIKT:',
    compactEn: 'HANDBALL CONTEXT:',
    sportRequirementSv: 'Krav: bygg passen runt position, kastkraft, kontaktstyrka, accelerationer och axel/knä-prevention.',
    sportRequirementEn: 'Requirement: build around position, throwing power, contact strength, accelerations, and shoulder/knee prevention.',
  },
  TEAM_FLOORBALL: {
    settingsKey: 'floorballSettings',
    profileField: 'position',
    markdownSv: 'INNEBANDYSPECIFIK PROFIL',
    compactSv: 'INNEBANDYSPECIFIKT:',
    compactEn: 'FLOORBALL CONTEXT:',
    sportRequirementSv: 'Krav: bygg passen runt position, byteskondition, låg spelposition, acceleration/broms och bål/höft-prevention.',
    sportRequirementEn: 'Requirement: build around position, shift fitness, low playing posture, acceleration/deceleration, and trunk/hip prevention.',
  },
  TEAM_VOLLEYBALL: {
    settingsKey: 'volleyballSettings',
    profileField: 'position',
    markdownSv: 'VOLLEYBOLLSPECIFIK PROFIL',
    compactSv: 'VOLLEYBOLLSPECIFIKT:',
    compactEn: 'VOLLEYBALL CONTEXT:',
    sportRequirementSv: 'Krav: bygg passen runt position, hoppvolym, landningskvalitet, axeltolerans och explosivitet.',
    sportRequirementEn: 'Requirement: build around position, jump volume, landing quality, shoulder tolerance, and explosiveness.',
  },
  TENNIS: {
    settingsKey: 'tennisSettings',
    profileField: 'playStyle',
    markdownSv: 'TENNISSPECIFIK PROFIL',
    compactSv: 'TENNISSPECIFIKT:',
    compactEn: 'TENNIS CONTEXT:',
    sportRequirementSv: 'Krav: bygg passen runt spelstil, fotarbete, rotationskraft, poängintervaller och axel/armbågs-prevention.',
    sportRequirementEn: 'Requirement: build around play style, footwork, rotational power, point intervals, and shoulder/elbow prevention.',
  },
  PADEL: {
    settingsKey: 'padelSettings',
    profileField: 'position',
    markdownSv: 'PADELSPECIFIK PROFIL',
    compactSv: 'PADELSPECIFIKT:',
    compactEn: 'PADEL CONTEXT:',
    sportRequirementSv: 'Krav: bygg passen runt sida/roll, väggspel, rotationskraft, reaktioner och axel/underarms-prevention.',
    sportRequirementEn: 'Requirement: build around side/role, wall play, rotational power, reactions, and shoulder/forearm prevention.',
  },
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

  const courtSportConfig = COURT_SPORT_PROMPTS[input.sport]
  const courtSportSettings = courtSportConfig ? input[courtSportConfig.settingsKey] : null
  if (courtSportConfig && courtSportSettings) {
    return formatCourtSportSection(courtSportConfig, courtSportSettings, input.sessionsPerWeek, locale, variant)
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

function formatCourtSportSection(
  config: CourtSportPromptConfig,
  settings: Record<string, unknown>,
  sessionsPerWeek: number | undefined,
  locale: AppLocale,
  variant: PromptVariant
): string {
  const lines = [
    heading(locale, variant, config.markdownSv, config.compactSv, config.compactEn),
    formatSetting(locale, variant, config.profileField === 'playStyle' ? 'Spelstil' : 'Position', config.profileField === 'playStyle' ? 'Play style' : 'Position', settings[config.profileField]),
    formatSetting(locale, variant, 'Säsongsfas', 'Season phase', settings.seasonPhase),
    formatSetting(locale, variant, 'Matcher per vecka', 'Matches per week', settings.matchesPerWeek),
    formatSetting(locale, variant, 'Planerade pass', 'Planned sessions', settings.sessionsPerWeek ?? sessionsPerWeek),
    formatSetting(locale, variant, 'Klubb/lag', 'Club/team', settings.clubName ?? settings.teamName),
    formatSetting(locale, variant, 'Liga/nivå', 'League/level', settings.leagueLevel),
    formatListSetting(locale, variant, 'Styrkefokus', 'Strength focus', settings.strengthFocus),
    formatListSetting(locale, variant, 'Utvecklingsområden', 'Development areas', settings.weaknesses),
    formatListSetting(locale, variant, 'Skadehistorik', 'Injury history', settings.injuryHistory),
    locale === 'sv' ? config.sportRequirementSv : config.sportRequirementEn,
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
