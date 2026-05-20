import type { AthleteData, TestData } from './types'

type SportContextLocale = 'en' | 'sv'

function dateLocale(locale: SportContextLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

/**
 * Build basic profile context
 */
export function buildBasicProfileContext(athlete: AthleteData): string {
  let context = `## Atletprofil\n`;
  // GDPR: Use pseudonym instead of real name for AI context
  context += `- **Namn**: Atleten\n`;

  if (athlete.gender) {
    context += `- **Kön**: ${athlete.gender === 'MALE' ? 'Man' : 'Kvinna'}\n`;
  }

  if (athlete.birthDate) {
    const age = Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    context += `- **Ålder**: ${age} år\n`;
  }

  if (athlete.height) {
    context += `- **Längd**: ${athlete.height} cm\n`;
  }

  if (athlete.weight) {
    context += `- **Vikt**: ${athlete.weight} kg\n`;
  }

  if (athlete.sportProfile?.primarySport) {
    const sportNames: Record<string, string> = {
      RUNNING: 'Löpning',
      CYCLING: 'Cykling',
      SWIMMING: 'Simning',
      TRIATHLON: 'Triathlon',
      HYROX: 'HYROX',
      SKIING: 'Längdskidåkning',
      GENERAL_FITNESS: 'Allmän fitness',
      FUNCTIONAL_FITNESS: 'Funktionell fitness',
      STRENGTH: 'Styrketräning',
      TEAM_ICE_HOCKEY: 'Ishockey',
      TEAM_FOOTBALL: 'Fotboll',
      TEAM_HANDBALL: 'Handboll',
      TEAM_FLOORBALL: 'Innebandy',
    };
    context += `- **Primär sport**: ${sportNames[athlete.sportProfile.primarySport] || athlete.sportProfile.primarySport}\n`;
  }

  return context;
}

/**
 * Build test data context
 */
export function buildTestContext(tests: TestData[], locale: SportContextLocale = 'en'): string {
  if (tests.length === 0) return '';

  const latestTest = tests[0]; // Assuming sorted by date desc

  let context = `\n## Senaste testresultat\n`;
  context += `- **Testdatum**: ${new Date(latestTest.testDate).toLocaleDateString(dateLocale(locale))}\n`;
  context += `- **Testtyp**: ${latestTest.testType}\n`;

  if (latestTest.maxHR) {
    context += `- **Max puls**: ${latestTest.maxHR} bpm\n`;
  }

  if (latestTest.vo2max) {
    context += `- **VO2max**: ${latestTest.vo2max} ml/kg/min\n`;
  }

  if (latestTest.aerobicThreshold) {
    context += `- **Aerob tröskel**: ${JSON.stringify(latestTest.aerobicThreshold)}\n`;
  }

  if (latestTest.anaerobicThreshold) {
    context += `- **Anaerob tröskel**: ${JSON.stringify(latestTest.anaerobicThreshold)}\n`;
  }

  return context;
}
