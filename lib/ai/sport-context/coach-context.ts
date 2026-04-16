import type {
  AthleteProfileData,
  CoachNoteData,
  SportProfile,
  StrengthSessionData,
  TrainingLoadData,
} from './types'

// ==================== NEW CONTEXT BUILDERS ====================

export function buildTrainingLoadContextForCoach(load: TrainingLoadData): string {
  let context = `\n### Träningsbelastning (ACWR)\n`;

  if (load.acuteLoad !== null) {
    context += `- **Akut belastning (7d)**: ${load.acuteLoad.toFixed(0)}\n`;
  }
  if (load.chronicLoad !== null) {
    context += `- **Kronisk belastning (28d)**: ${load.chronicLoad.toFixed(0)}\n`;
  }
  if (load.acwr !== null) {
    context += `- **ACWR-kvot**: ${load.acwr.toFixed(2)}\n`;

    // Add guidance
    if (load.acwr < 0.8) {
      context += `- **Status**: Undertränad/återhämtning\n`;
    } else if (load.acwr <= 1.3) {
      context += `- **Status**: Optimal belastning\n`;
    } else if (load.acwr <= 1.5) {
      context += `- **Status**: Förhöjd risk - var försiktig\n`;
    } else {
      context += `- **Status**: Kritiskt hög - rekommendera vila\n`;
    }
  }
  if (load.acwrZone) {
    const zoneMap: Record<string, string> = {
      DETRAINING: 'Avträning',
      OPTIMAL: 'Optimal',
      CAUTION: 'Varning',
      DANGER: 'Fara',
      CRITICAL: 'Kritisk',
    };
    context += `- **Belastningszon**: ${zoneMap[load.acwrZone] || load.acwrZone}\n`;
  }
  if (load.injuryRisk) {
    const riskMap: Record<string, string> = {
      LOW: 'Låg',
      MODERATE: 'Måttlig',
      HIGH: 'Hög',
      VERY_HIGH: 'Mycket hög',
    };
    context += `- **Skaderisk**: ${riskMap[load.injuryRisk] || load.injuryRisk}\n`;
  }

  return context;
}

export function buildComplianceContextForCoach(rate: number): string {
  let context = `\n### Träningsefterlevnad (30 dagar)\n`;
  context += `- **Efterlevnadsgrad**: ${rate.toFixed(0)}%\n`;

  if (rate >= 90) {
    context += `- **Bedömning**: Utmärkt - följer programmet mycket väl\n`;
  } else if (rate >= 70) {
    context += `- **Bedömning**: Bra - följer programmet i stort\n`;
  } else if (rate >= 50) {
    context += `- **Bedömning**: Måttlig - missar en del pass, överväg anpassning\n`;
  } else {
    context += `- **Bedömning**: Låg - svårt att följa programmet, diskutera med atleten\n`;
  }

  return context;
}

export function buildStrengthContextForCoach(sessions: StrengthSessionData[]): string {
  let context = `\n### Styrketräning (senaste)\n`;

  const phaseMap: Record<string, string> = {
    ANATOMICAL_ADAPTATION: 'Anatomisk anpassning',
    MAX_STRENGTH: 'Maxstyrka',
    POWER: 'Power',
    STRENGTH_ENDURANCE: 'Styrkeuthållighet',
    MAINTENANCE: 'Underhåll',
  };

  for (const session of sessions.slice(0, 3)) {
    const date = new Date(session.assignedDate).toLocaleDateString('sv-SE');
    const phase = phaseMap[session.phase] || session.phase;
    context += `- **${session.name}** (${date}) - ${phase}\n`;

    if (session.exercises && Array.isArray(session.exercises)) {
      const exerciseNames = session.exercises
        .slice(0, 4)
        .map(e => e.exerciseName || 'Övning')
        .join(', ');
      context += `  Övningar: ${exerciseNames}${session.exercises.length > 4 ? '...' : ''}\n`;
    }
  }

  return context;
}

export function buildAthleteProfileContextForCoach(
  profile: AthleteProfileData,
  sportProfile?: { runningSettings: unknown; equipment?: unknown; preferredSessionLength?: number | null } | null,
): string {
  const fields = [
    { key: 'trainingBackground' as const, label: 'Träningsbakgrund' },
    { key: 'longTermAmbitions' as const, label: 'Långsiktiga mål' },
    { key: 'seasonalFocus' as const, label: 'Säsongsfokus' },
    { key: 'personalMotivations' as const, label: 'Motivation' },
    { key: 'trainingPreferences' as const, label: 'Preferenser' },
    { key: 'constraints' as const, label: 'Begränsningar' },
    { key: 'dietaryNotes' as const, label: 'Kost' },
  ];

  const filledFields = fields.filter(f => profile[f.key]);

  const settings = (sportProfile?.runningSettings ?? {}) as Record<string, unknown>;
  const equipmentObj = sportProfile?.equipment as Record<string, boolean> | null;

  if (filledFields.length === 0 && !settings) {
    return '';
  }

  let context = `\n### Atletens egna reflektioner\n`;

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
    context += `- **Föredragna passtyper**: ${workoutTypes.join(', ')}\n`;
  }
  const favExercises = truncate(settings.favoriteExercises);
  if (favExercises) {
    context += `- **Favoritövningar**: ${favExercises}\n`;
  }
  if (equipmentObj) {
    const available = Object.entries(equipmentObj).filter(([, v]) => v).map(([k]) => k);
    if (available.length > 0) {
      context += `- **Utrustning**: ${available.join(', ')}\n`;
    }
  }
  const weak = truncate(settings.weakPoints);
  if (weak) {
    context += `- **Svagheter**: ${weak}\n`;
  }
  const strong = truncate(settings.strongPoints);
  if (strong) {
    context += `- **Styrkor**: ${strong}\n`;
  }
  const injuries = truncate(settings.injuriesLimitations);
  if (injuries) {
    context += `- **Skador/begränsningar**: ${injuries}\n`;
  }
  const avoid = truncate(settings.areasToAvoid);
  if (avoid) {
    context += `- **Undvik**: ${avoid}\n`;
  }
  if (settings.workoutVarietyPreference) {
    context += `- **Variationspreferens**: ${settings.workoutVarietyPreference}\n`;
  }
  if (settings.feedbackStyle) {
    context += `- **Feedbackstil**: ${settings.feedbackStyle}\n`;
  }
  const notes = truncate(settings.additionalNotes);
  if (notes) {
    context += `- **Övriga anteckningar**: ${notes}\n`;
  }

  return context;
}

export function buildCoachNotesContext(notes: CoachNoteData[]): string {
  if (notes.length === 0) return '';

  let context = `\n### Tidigare anteckningar\n`;

  for (const note of notes.slice(0, 5)) {
    const date = new Date(note.createdAt).toLocaleDateString('sv-SE');
    const truncated = note.content.length > 150 ? note.content.slice(0, 150) + '...' : note.content;
    context += `- (${date}) ${truncated}\n`;
  }

  return context;
}
