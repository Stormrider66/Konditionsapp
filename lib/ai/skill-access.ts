export type KnowledgeSkillAccessMode = 'full' | 'athlete_coached' | 'athlete_self_coached'

const ATHLETE_COACHED_SAFE_CATEGORIES = new Set([
  'SPORT_SPECIFIC',
  'RECOVERY',
  'NUTRITION',
  'STRENGTH',
  'INJURY_PREVENTION',
  'PERFORMANCE',
  'TESTING',
  'PHYSIOLOGY',
  'MONITORING',
  'MOBILITY',
  'PSYCHOLOGY',
])

const ATHLETE_SELF_COACHED_SAFE_CATEGORIES = new Set([
  'SPORT_SPECIFIC',
  'RECOVERY',
  'NUTRITION',
  'STRENGTH',
  'INJURY_PREVENTION',
  'PERFORMANCE',
  'MOBILITY',
  'PSYCHOLOGY',
])

export function getAllowedKnowledgeSkillCategories(mode: KnowledgeSkillAccessMode): Set<string> | null {
  if (mode === 'full') return null
  if (mode === 'athlete_coached') return ATHLETE_COACHED_SAFE_CATEGORIES
  return ATHLETE_SELF_COACHED_SAFE_CATEGORIES
}

export function getKnowledgeSkillMaxSelectable(mode: KnowledgeSkillAccessMode): number {
  return mode === 'athlete_self_coached' ? 3 : 5
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function getAthleteSkillSafetyNote(
  mode: KnowledgeSkillAccessMode,
  locale: AppLocale = 'en'
): string {
  if (mode === 'athlete_self_coached') {
    return [
      t(
        locale,
        'The athlete is self-coached. Keep use of selected knowledge skills educational and cautious.',
        'Atleten är self-coached. Håll användningen av valda kunskapsskills pedagogisk och försiktig.'
      ),
      t(
        locale,
        'Do not provide medical conclusions, aggressive performance programming, or advanced test interpretation that requires coach review.',
        'Ge inte medicinska slutsatser, aggressiv prestationsprogrammering eller avancerad testtolkning som kräver coachgranskning.'
      ),
      t(
        locale,
        'Suggest that the athlete contacts healthcare or a coach for pain, injury, concerning symptoms, or uncertainty.',
        'Föreslå att atleten kontaktar vård/coach vid smärta, skada, oroande symtom eller osäkerhet.'
      ),
    ].join(' ')
  }

  return [
    t(
      locale,
      'The athlete has a coach connection. Keep selected knowledge skills educational and supportive.',
      'Atleten har en coachkoppling. Håll valda kunskapsskills pedagogiska och stödjande.'
    ),
    t(
      locale,
      'For test interpretation, rehab, or larger training changes: explain with appropriate caveats and suggest coach review.',
      'Vid testtolkning, rehab eller större träningsändringar: förklara med reservationer och föreslå coachgranskning.'
    ),
  ].join(' ')
}
