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

export function getAthleteSkillSafetyNote(mode: KnowledgeSkillAccessMode): string {
  if (mode === 'athlete_self_coached') {
    return [
      'Atleten är self-coached. Håll användningen av valda kunskapsskills pedagogisk och försiktig.',
      'Ge inte medicinska slutsatser, aggressiv prestationsprogrammering eller avancerad testtolkning som kräver coachgranskning.',
      'Föreslå att atleten kontaktar vård/coach vid smärta, skada, oroande symtom eller osäkerhet.',
    ].join(' ')
  }

  return [
    'Atleten har en coachkoppling. Håll valda kunskapsskills pedagogiska och stödjande.',
    'Vid testtolkning, rehab eller större träningsändringar: förklara med reservationer och föreslå coachgranskning.',
  ].join(' ')
}
