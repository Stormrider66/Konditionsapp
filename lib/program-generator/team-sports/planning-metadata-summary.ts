import type { TeamSportPlanningSummary } from './explainability'

type AppLocale = 'en' | 'sv'

export function buildTeamSportPlanningSummaryFromMetadata(input: {
  metadata: unknown
  locale?: AppLocale
}): TeamSportPlanningSummary | null {
  const metadata = input.metadata
  const locale = input.locale === 'sv' ? 'sv' : 'en'

  if (!isRecord(metadata) || metadata.version !== 1) {
    return null
  }

  const prevention = stringArray(metadata.prevention)
  const loadGuidance = stringArray(metadata.loadGuidance)
  const intensityMultiplier = typeof metadata.intensityMultiplier === 'number'
    ? metadata.intensityMultiplier
    : 1

  if (metadata.sport === 'TEAM_FOOTBALL') {
    const football = isRecord(metadata.football) ? metadata.football : {}

    return {
      sport: 'football',
      title: t(locale, 'Planeringsantaganden för fotboll', 'Football planning assumptions'),
      description: t(
        locale,
        'Programmet sparade de antaganden som styrde matchrytm, position, belastning och prevention när planen skapades.',
        'The program saved the assumptions that shaped match rhythm, position, load, and prevention when the plan was created.'
      ),
      assumptions: [
        { label: t(locale, 'Position', 'Position'), value: footballPositionLabel(String(metadata.position || ''), locale) },
        { label: t(locale, 'Säsongsfas', 'Season phase'), value: phaseLabel(String(metadata.seasonPhase || ''), locale) },
        { label: t(locale, 'Matcher/vecka', 'Matches/week'), value: displayValue(football.matchesPerWeek) },
        { label: t(locale, 'Planerade pass/vecka', 'Planned sessions/week'), value: displayValue(football.sessionsPerWeek) },
        { label: t(locale, 'Intensitetsfaktor', 'Intensity factor'), value: `${Math.round(intensityMultiplier * 100)}%` },
      ],
      prevention,
      loadGuidance,
    }
  }

  if (metadata.sport === 'TEAM_ICE_HOCKEY') {
    const hockey = isRecord(metadata.hockey) ? metadata.hockey : {}

    return {
      sport: 'hockey',
      title: t(locale, 'Planeringsantaganden för hockey', 'Hockey planning assumptions'),
      description: t(
        locale,
        'Programmet sparade de antaganden som styrde position, säsongsfas, matchbelastning och off-ice-balans när planen skapades.',
        'The program saved the assumptions that shaped position, season phase, game load, and off-ice balance when the plan was created.'
      ),
      assumptions: [
        { label: t(locale, 'Position', 'Position'), value: hockeyPositionLabel(String(metadata.position || ''), locale) },
        { label: t(locale, 'Säsongsfas', 'Season phase'), value: phaseLabel(String(metadata.seasonPhase || ''), locale) },
        { label: t(locale, 'Matcher denna vecka', 'Games this week'), value: displayValue(hockey.matchesThisWeek) },
        { label: t(locale, 'Off-ice-pass', 'Off-ice sessions'), value: displayValue(hockey.requestedSessions) },
        { label: t(locale, 'Intensitetsfaktor', 'Intensity factor'), value: `${Math.round(intensityMultiplier * 100)}%` },
      ],
      prevention,
      loadGuidance,
    }
  }

  return null
}

function displayValue(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '-'
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function phaseLabel(phase: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    off_season: { sv: 'Off-season', en: 'Off-season' },
    pre_season: { sv: 'Försäsong', en: 'Pre-season' },
    in_season: { sv: 'Tävlingssäsong', en: 'In-season' },
    playoffs: { sv: 'Slutspel', en: 'Playoffs' },
  }
  return labels[phase]?.[locale] ?? (phase || '-')
}

function footballPositionLabel(position: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
    defender: { sv: 'Försvarare', en: 'Defender' },
    midfielder: { sv: 'Mittfältare', en: 'Midfielder' },
    forward: { sv: 'Forward', en: 'Forward' },
  }
  return labels[position]?.[locale] ?? (position || '-')
}

function hockeyPositionLabel(position: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    center: { sv: 'Center', en: 'Center' },
    wing: { sv: 'Ytterforward', en: 'Wing' },
    defense: { sv: 'Back', en: 'Defense' },
    goalie: { sv: 'Målvakt', en: 'Goalie' },
  }
  return labels[position]?.[locale] ?? (position || '-')
}

function t(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
