import type {
  AthleteProfileData,
  CoachNoteData,
  StrengthSessionData,
  TrainingLoadData,
} from './types'

type SportContextLocale = 'en' | 'sv'

function dateLocale(locale: SportContextLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function t(locale: SportContextLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// ==================== NEW CONTEXT BUILDERS ====================

export function buildTrainingLoadContextForCoach(
  load: TrainingLoadData,
  locale: SportContextLocale = 'en'
): string {
  let context = `\n### ${t(locale, 'Training load (ACWR)', 'Träningsbelastning (ACWR)')}\n`;

  if (load.acuteLoad !== null) {
    context += `- **${t(locale, 'Acute load (7d)', 'Akut belastning (7d)')}**: ${load.acuteLoad.toFixed(0)}\n`;
  }
  if (load.chronicLoad !== null) {
    context += `- **${t(locale, 'Chronic load (28d)', 'Kronisk belastning (28d)')}**: ${load.chronicLoad.toFixed(0)}\n`;
  }
  if (load.acwr !== null) {
    context += `- **${t(locale, 'ACWR ratio', 'ACWR-kvot')}**: ${load.acwr.toFixed(2)}\n`;

    // Add guidance
    if (load.acwr < 0.8) {
      context += `- **${t(locale, 'Status', 'Status')}**: ${t(locale, 'Detraining/recovery', 'Undertränad/återhämtning')}\n`;
    } else if (load.acwr <= 1.3) {
      context += `- **${t(locale, 'Status', 'Status')}**: ${t(locale, 'Optimal load', 'Optimal belastning')}\n`;
    } else if (load.acwr <= 1.5) {
      context += `- **${t(locale, 'Status', 'Status')}**: ${t(locale, 'Elevated risk - be careful', 'Förhöjd risk - var försiktig')}\n`;
    } else {
      context += `- **${t(locale, 'Status', 'Status')}**: ${t(locale, 'Critically high - recommend rest', 'Kritiskt hög - rekommendera vila')}\n`;
    }
  }
  if (load.acwrZone) {
    const zoneMap: Record<string, { en: string; sv: string }> = {
      DETRAINING: { en: 'Detraining', sv: 'Avträning' },
      OPTIMAL: { en: 'Optimal', sv: 'Optimal' },
      CAUTION: { en: 'Caution', sv: 'Varning' },
      DANGER: { en: 'Danger', sv: 'Fara' },
      CRITICAL: { en: 'Critical', sv: 'Kritisk' },
    };
    const zone = zoneMap[load.acwrZone];
    context += `- **${t(locale, 'Load zone', 'Belastningszon')}**: ${zone ? zone[locale] : load.acwrZone}\n`;
  }
  if (load.injuryRisk) {
    const riskMap: Record<string, { en: string; sv: string }> = {
      LOW: { en: 'Low', sv: 'Låg' },
      MODERATE: { en: 'Moderate', sv: 'Måttlig' },
      HIGH: { en: 'High', sv: 'Hög' },
      VERY_HIGH: { en: 'Very high', sv: 'Mycket hög' },
    };
    const risk = riskMap[load.injuryRisk];
    context += `- **${t(locale, 'Injury risk', 'Skaderisk')}**: ${risk ? risk[locale] : load.injuryRisk}\n`;
  }

  return context;
}

export function buildComplianceContextForCoach(rate: number, locale: SportContextLocale = 'en'): string {
  let context = `\n### ${t(locale, 'Training compliance (30 days)', 'Träningsefterlevnad (30 dagar)')}\n`;
  context += `- **${t(locale, 'Compliance rate', 'Efterlevnadsgrad')}**: ${rate.toFixed(0)}%\n`;

  if (rate >= 90) {
    context += `- **${t(locale, 'Assessment', 'Bedömning')}**: ${t(locale, 'Excellent - follows the program very well', 'Utmärkt - följer programmet mycket väl')}\n`;
  } else if (rate >= 70) {
    context += `- **${t(locale, 'Assessment', 'Bedömning')}**: ${t(locale, 'Good - generally follows the program', 'Bra - följer programmet i stort')}\n`;
  } else if (rate >= 50) {
    context += `- **${t(locale, 'Assessment', 'Bedömning')}**: ${t(locale, 'Moderate - misses some sessions, consider adjusting', 'Måttlig - missar en del pass, överväg anpassning')}\n`;
  } else {
    context += `- **${t(locale, 'Assessment', 'Bedömning')}**: ${t(locale, 'Low - hard to follow the program, discuss with the athlete', 'Låg - svårt att följa programmet, diskutera med atleten')}\n`;
  }

  return context;
}

export function buildStrengthContextForCoach(
  sessions: StrengthSessionData[],
  locale: SportContextLocale = 'en'
): string {
  let context = `\n### ${t(locale, 'Strength training (latest)', 'Styrketräning (senaste)')}\n`;

  const phaseMap: Record<string, { en: string; sv: string }> = {
    ANATOMICAL_ADAPTATION: { en: 'Anatomical adaptation', sv: 'Anatomisk anpassning' },
    MAX_STRENGTH: { en: 'Max strength', sv: 'Maxstyrka' },
    POWER: { en: 'Power', sv: 'Power' },
    STRENGTH_ENDURANCE: { en: 'Strength endurance', sv: 'Styrkeuthållighet' },
    MAINTENANCE: { en: 'Maintenance', sv: 'Underhåll' },
  };

  for (const session of sessions.slice(0, 3)) {
    const date = new Date(session.assignedDate).toLocaleDateString(dateLocale(locale));
    const phase = phaseMap[session.phase]?.[locale] || session.phase;
    context += `- **${session.name}** (${date}) - ${phase}\n`;

    if (session.exercises && Array.isArray(session.exercises)) {
      const exerciseNames = session.exercises
        .slice(0, 4)
        .map(e => e.exerciseName || t(locale, 'Exercise', 'Övning'))
        .join(', ');
      context += `  ${t(locale, 'Exercises', 'Övningar')}: ${exerciseNames}${session.exercises.length > 4 ? '...' : ''}\n`;
    }
  }

  return context;
}

export function buildAthleteProfileContextForCoach(
  profile: AthleteProfileData,
  sportProfile?: { runningSettings: unknown; equipment?: unknown; preferredSessionLength?: number | null } | null,
  locale: SportContextLocale = 'en'
): string {
  const fields = [
    { key: 'trainingBackground' as const, label: t(locale, 'Training background', 'Träningsbakgrund') },
    { key: 'longTermAmbitions' as const, label: t(locale, 'Long-term ambitions', 'Långsiktiga mål') },
    { key: 'seasonalFocus' as const, label: t(locale, 'Season focus', 'Säsongsfokus') },
    { key: 'personalMotivations' as const, label: t(locale, 'Motivation', 'Motivation') },
    { key: 'trainingPreferences' as const, label: t(locale, 'Preferences', 'Preferenser') },
    { key: 'constraints' as const, label: t(locale, 'Constraints', 'Begränsningar') },
    { key: 'dietaryNotes' as const, label: t(locale, 'Nutrition', 'Kost') },
  ];

  const filledFields = fields.filter(f => profile[f.key]);

  const settings = (sportProfile?.runningSettings ?? {}) as Record<string, unknown>;
  const equipmentObj = sportProfile?.equipment as Record<string, boolean> | null;

  if (filledFields.length === 0 && !settings) {
    return '';
  }

  let context = `\n### ${t(locale, "Athlete's own reflections", 'Atletens egna reflektioner')}\n`;

  for (const field of filledFields) {
    // Truncate long fields for coach context
    const value = profile[field.key];
    if (value) {
      const truncated = value.length > 200 ? value.slice(0, 200) + '...' : value;
      context += `- **${field.label}**: ${truncated}\n`;
    }
  }

  // Structured fields from SportProfile
  const truncate = (v: unknown) => {
    if (!v || typeof v !== 'string') return null;
    return v.length > 200 ? v.slice(0, 200) + '...' : v;
  };

  const workoutTypes = settings.preferredWorkoutTypes as string[] | undefined;
  if (workoutTypes?.length) {
    context += `- **${t(locale, 'Preferred session types', 'Föredragna passtyper')}**: ${workoutTypes.join(', ')}\n`;
  }
  const favExercises = truncate(settings.favoriteExercises);
  if (favExercises) {
    context += `- **${t(locale, 'Favorite exercises', 'Favoritövningar')}**: ${favExercises}\n`;
  }
  if (equipmentObj) {
    const available = Object.entries(equipmentObj).filter(([, v]) => v).map(([k]) => k);
    if (available.length > 0) {
      context += `- **${t(locale, 'Equipment', 'Utrustning')}**: ${available.join(', ')}\n`;
    }
  }
  const weak = truncate(settings.weakPoints);
  if (weak) {
    context += `- **${t(locale, 'Weak points', 'Svagheter')}**: ${weak}\n`;
  }
  const strong = truncate(settings.strongPoints);
  if (strong) {
    context += `- **${t(locale, 'Strengths', 'Styrkor')}**: ${strong}\n`;
  }
  const injuries = truncate(settings.injuriesLimitations);
  if (injuries) {
    context += `- **${t(locale, 'Injuries/limitations', 'Skador/begränsningar')}**: ${injuries}\n`;
  }
  const avoid = truncate(settings.areasToAvoid);
  if (avoid) {
    context += `- **${t(locale, 'Avoid', 'Undvik')}**: ${avoid}\n`;
  }
  if (settings.workoutVarietyPreference) {
    context += `- **${t(locale, 'Variety preference', 'Variationspreferens')}**: ${settings.workoutVarietyPreference}\n`;
  }
  if (settings.feedbackStyle) {
    context += `- **${t(locale, 'Feedback style', 'Feedbackstil')}**: ${settings.feedbackStyle}\n`;
  }
  const notes = truncate(settings.additionalNotes);
  if (notes) {
    context += `- **${t(locale, 'Additional notes', 'Övriga anteckningar')}**: ${notes}\n`;
  }

  return context;
}

export function buildCoachNotesContext(notes: CoachNoteData[], locale: SportContextLocale = 'en'): string {
  if (notes.length === 0) return '';

  let context = `\n### ${t(locale, 'Previous notes', 'Tidigare anteckningar')}\n`;

  for (const note of notes.slice(0, 5)) {
    const date = new Date(note.createdAt).toLocaleDateString(dateLocale(locale));
    const truncated = note.content.length > 150 ? note.content.slice(0, 150) + '...' : note.content;
    context += `- (${date}) ${truncated}\n`;
  }

  return context;
}
