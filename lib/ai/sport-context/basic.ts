import type { AthleteData, TestData } from './types'

type SportContextLocale = 'en' | 'sv'

function dateLocale(locale: SportContextLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

/**
 * Build basic profile context
 */
export function buildBasicProfileContext(athlete: AthleteData, locale: SportContextLocale = 'en'): string {
  const isSv = locale === 'sv'
  const sportNames: Record<SportContextLocale, Record<string, string>> = {
    en: {
      RUNNING: 'Running',
      CYCLING: 'Cycling',
      SWIMMING: 'Swimming',
      TRIATHLON: 'Triathlon',
      HYROX: 'HYROX',
      SKIING: 'Cross-country skiing',
      GENERAL_FITNESS: 'General fitness',
      FUNCTIONAL_FITNESS: 'Functional fitness',
      STRENGTH: 'Strength training',
      TEAM_ICE_HOCKEY: 'Ice hockey',
      TEAM_FOOTBALL: 'Football',
      TEAM_HANDBALL: 'Handball',
      TEAM_FLOORBALL: 'Floorball',
    },
    sv: {
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
    },
  }

  let context = `## ${isSv ? 'Atletprofil' : 'Athlete profile'}\n`;
  // GDPR: Use pseudonym instead of real name for AI context
  context += `- **${isSv ? 'Namn' : 'Name'}**: ${isSv ? 'Atleten' : 'The athlete'}\n`;

  if (athlete.gender) {
    const gender = athlete.gender === 'MALE'
      ? (isSv ? 'Man' : 'Male')
      : (isSv ? 'Kvinna' : 'Female')
    context += `- **${isSv ? 'Kön' : 'Gender'}**: ${gender}\n`;
  }

  if (athlete.birthDate) {
    const age = Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    context += `- **${isSv ? 'Ålder' : 'Age'}**: ${age} ${isSv ? 'år' : 'years'}\n`;
  }

  if (athlete.height) {
    context += `- **${isSv ? 'Längd' : 'Height'}**: ${athlete.height} cm\n`;
  }

  if (athlete.weight) {
    context += `- **${isSv ? 'Vikt' : 'Weight'}**: ${athlete.weight} kg\n`;
  }

  if (athlete.sportProfile?.primarySport) {
    context += `- **${isSv ? 'Primär sport' : 'Primary sport'}**: ${sportNames[locale][athlete.sportProfile.primarySport] || athlete.sportProfile.primarySport}\n`;
  }

  return context;
}

/**
 * Build test data context
 */
export function buildTestContext(tests: TestData[], locale: SportContextLocale = 'en'): string {
  if (tests.length === 0) return '';

  const latestTest = tests[0]; // Assuming sorted by date desc

  const isSv = locale === 'sv'
  let context = `\n## ${isSv ? 'Senaste testresultat' : 'Latest test result'}\n`;
  context += `- **${isSv ? 'Testdatum' : 'Test date'}**: ${new Date(latestTest.testDate).toLocaleDateString(dateLocale(locale))}\n`;
  context += `- **${isSv ? 'Testtyp' : 'Test type'}**: ${latestTest.testType}\n`;

  if (latestTest.maxHR) {
    context += `- **${isSv ? 'Max puls' : 'Max heart rate'}**: ${latestTest.maxHR} bpm\n`;
  }

  if (latestTest.vo2max) {
    context += `- **VO2max**: ${latestTest.vo2max} ml/kg/min\n`;
  }

  if (latestTest.aerobicThreshold) {
    context += `- **${isSv ? 'Aerob tröskel' : 'Aerobic threshold'}**: ${JSON.stringify(latestTest.aerobicThreshold)}\n`;
  }

  if (latestTest.anaerobicThreshold) {
    context += `- **${isSv ? 'Anaerob tröskel' : 'Anaerobic threshold'}**: ${JSON.stringify(latestTest.anaerobicThreshold)}\n`;
  }

  return context;
}
