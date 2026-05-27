import type { AthleteData, FunctionalFitnessSettings, GeneralFitnessSettings, HyroxSettings } from '../types'
import {
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  generateNutritionPlan,
  calculateWeightTimeline,
  getProteinRequirements,
  calculateHydration,
  categorizeBodyFat,
  calculateIdealWeightRange,
  type ActivityLevel,
  type CaloricGoal,
} from '../../nutrition-calculator'
import { formatSecondsToTime, formatStationName, formatTime, translateActivityLevel } from '../formatters'

type SportContextLocale = 'en' | 'sv'

function t(locale: SportContextLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function buildHyroxContext(athlete: AthleteData, locale: SportContextLocale = 'en'): string {
  const sp = athlete.sportProfile;
  const settings = sp?.hyroxSettings as HyroxSettings | null;

  let context = `\n## ${t(locale, 'HYROX-SPECIFIC DATA', 'HYROX-SPECIFIK DATA')}\n`;

  if (settings?.targetCategory) {
    context += `- **${t(locale, 'Race category', 'Tävlingskategori')}**: ${settings.targetCategory}\n`;
  }
  if (settings?.targetTime) {
    context += `- **${t(locale, 'Target time', 'Måltid')}**: ${settings.targetTime}\n`;
  }

  // Station times
  if (settings?.stationTimes) {
    const st = settings.stationTimes;
    context += `\n### ${t(locale, 'Station times', 'Stationstider')}\n`;
    context += `| Station | ${t(locale, 'Time', 'Tid')} | Benchmark* |\n`;
    context += `|---------|-----|------------|\n`;
    if (st.skiErg) context += `| SkiErg (1000m) | ${formatTime(st.skiErg)} | ~4:00 |\n`;
    if (st.sledPush) context += `| Sled Push (50m) | ${formatTime(st.sledPush)} | ~1:30 |\n`;
    if (st.sledPull) context += `| Sled Pull (50m) | ${formatTime(st.sledPull)} | ~1:30 |\n`;
    if (st.burpeeBroadJump) context += `| Burpee Broad Jump (80m) | ${formatTime(st.burpeeBroadJump)} | ~3:00 |\n`;
    if (st.rowing) context += `| Rowing (1000m) | ${formatTime(st.rowing)} | ~4:00 |\n`;
    if (st.farmersCarry) context += `| Farmers Carry (200m) | ${formatTime(st.farmersCarry)} | ~2:00 |\n`;
    if (st.lunges) context += `| Lunges (100m) | ${formatTime(st.lunges)} | ~3:30 |\n`;
    if (st.wallBalls) context += `| Wall Balls (100 reps) | ${formatTime(st.wallBalls)} | ~5:00 |\n`;
    context += `*${t(locale, 'Benchmark = Pro level', 'Benchmark = Pro-nivå')}\n`;

    // Calculate total station time
    const totalStation = Object.values(st).reduce((sum, t) => sum + (t || 0), 0);
    context += `\n**${t(locale, 'Total station time', 'Total stationstid')}**: ${formatTime(totalStation)}\n`;
  }

  // Run splits
  if (settings?.runSplits && settings.runSplits.length > 0) {
    const avgSplit = settings.runSplits.reduce((a, b) => a + b, 0) / settings.runSplits.length;
    context += `\n### ${t(locale, 'Run splits (8 x 1km)', 'Löpsplits (8 x 1km)')}\n`;
    context += `- **${t(locale, 'Average', 'Snitt')}**: ${formatTime(avgSplit)}/km\n`;
    context += `- **${t(locale, 'Total run time', 'Total löptid')}**: ${formatTime(avgSplit * 8)}\n`;
  }

  // Strength PRs
  if (settings?.strengthPRs) {
    const prs = settings.strengthPRs;
    context += `\n### ${t(locale, 'Strength PRs', 'Styrke-PRs')}\n`;
    if (prs.deadlift) context += `- **${t(locale, 'Deadlift', 'Marklyft')}**: ${prs.deadlift} kg\n`;
    if (prs.squat) context += `- **${t(locale, 'Squat', 'Knäböj')}**: ${prs.squat} kg\n`;
    if (prs.benchPress) context += `- **${t(locale, 'Bench press', 'Bänkpress')}**: ${prs.benchPress} kg\n`;
  }

  // Identify limiters
  if (settings?.stationTimes) {
    const st = settings.stationTimes;
    const benchmarks = {
      skiErg: 240, sledPush: 90, sledPull: 90, burpeeBroadJump: 180,
      rowing: 240, farmersCarry: 120, lunges: 210, wallBalls: 300
    };

    const limiters: string[] = [];
    for (const [station, time] of Object.entries(st)) {
      if (time && benchmarks[station as keyof typeof benchmarks]) {
        const benchmark = benchmarks[station as keyof typeof benchmarks];
        if (time > benchmark * 1.3) {
          limiters.push(station);
        }
      }
    }

    if (limiters.length > 0) {
      context += `\n### ${t(locale, 'Identified improvement areas', 'Identifierade förbättringsområden')}\n`;
      context += limiters.map(l => `- ${formatStationName(l)}`).join('\n');
      context += '\n';
    }
  }

  return context;
}


export function buildGeneralFitnessContext(athlete: AthleteData, locale: SportContextLocale = 'en'): string {
  const sp = athlete.sportProfile;
  const settings = sp?.generalFitnessSettings as GeneralFitnessSettings | null;

  let context = `\n## ${t(locale, 'GENERAL FITNESS DATA', 'ALLMÄN FITNESS DATA')}\n`;

  if (settings?.goals && settings.goals.length > 0) {
    context += `### ${t(locale, 'Goals', 'Mål')}\n`;
    for (const goal of settings.goals) {
      context += `- ${goal}\n`;
    }
  }

  if (settings?.activityTypes && settings.activityTypes.length > 0) {
    context += `\n### ${t(locale, 'Preferred activities', 'Prefererade aktiviteter')}\n`;
    context += settings.activityTypes.join(', ') + '\n';
  }

  if (settings?.limitations && settings.limitations.length > 0) {
    context += `\n### ${t(locale, 'Limitations/considerations', 'Begränsningar/Hänsyn')}\n`;
    for (const limitation of settings.limitations) {
      context += `- ${limitation}\n`;
    }
  }

  // Calculate age
  const age = athlete.birthDate
    ? Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Check for measured body composition data
  const bodyComp = athlete.bodyCompositions?.[0];
  const measuredWeight = bodyComp?.weightKg || athlete.weight;
  const measuredBodyFat = bodyComp?.bodyFatPercent || settings?.currentBodyFat;

  // Full nutrition calculations if we have required data
  if (measuredWeight && athlete.height && age && athlete.gender) {
    const gender = athlete.gender as 'MALE' | 'FEMALE';

    // Determine activity level based on settings
    let activityLevel: ActivityLevel = 'MODERATE';
    if (settings?.activityTypes && settings.activityTypes.length > 3) {
      activityLevel = 'ACTIVE';
    } else if (!settings?.activityTypes || settings.activityTypes.length === 0) {
      activityLevel = 'LIGHT';
    }

    // Use measured BMR if available, otherwise calculate
    const bmr = bodyComp?.bmrKcal || calculateBMR({
      weightKg: measuredWeight,
      heightCm: athlete.height,
      ageYears: age,
      gender,
    });

    const tdee = calculateTDEE({
      weightKg: measuredWeight,
      heightCm: athlete.height,
      ageYears: age,
      gender,
      activityLevel,
    });

    const { bmi, category: bmiCategory } = calculateBMI(measuredWeight, athlete.height, locale);
    const idealWeight = calculateIdealWeightRange(athlete.height, gender);

    context += `\n### ${t(locale, 'Metabolism & Energy Needs', 'Metabolism & Energibehov')}\n`;
    context += `- **${t(locale, 'BMR (basal metabolic rate)', 'BMR (Basalmetabolism)')}**: ${bmr} ${t(locale, 'kcal/day', 'kcal/dag')}${bodyComp?.bmrKcal ? ` (${t(locale, 'measured', 'mätt')})` : ` (${t(locale, 'calculated', 'beräknat')})`}\n`;
    context += `- **${t(locale, 'TDEE (total daily energy expenditure)', 'TDEE (Totalt dagligt energibehov)')}**: ${tdee} ${t(locale, 'kcal/day', 'kcal/dag')}\n`;
    context += `- **${t(locale, 'Activity level', 'Aktivitetsnivå')}**: ${translateActivityLevel(activityLevel, locale)}\n`;

    context += `\n### ${t(locale, 'Body composition', 'Kroppssammansättning')}\n`;
    context += `- **${t(locale, 'Weight', 'Vikt')}**: ${measuredWeight} kg${bodyComp?.weightKg ? ` (${t(locale, 'latest measured', 'senast mätt')})` : ''}\n`;
    context += `- **${t(locale, 'Height', 'Längd')}**: ${athlete.height} cm\n`;
    context += `- **BMI**: ${bmi} (${bmiCategory})\n`;
    context += `- **${t(locale, 'Ideal weight', 'Idealvikt')}**: ${idealWeight.min}-${idealWeight.max} kg\n`;

    // Use bioimpedance data if available
    if (bodyComp) {
      if (bodyComp.bodyFatPercent) {
        const fatCategory = categorizeBodyFat(bodyComp.bodyFatPercent, gender, age, locale);
        const fatMass = Math.round((measuredWeight * bodyComp.bodyFatPercent / 100) * 10) / 10;
        context += `- **${t(locale, 'Body fat', 'Kroppsfett')}**: ${bodyComp.bodyFatPercent}% (${fatCategory}) - ${t(locale, 'measured', 'mätt')}\n`;
        context += `- **${t(locale, 'Fat mass', 'Fettmassa')}**: ${fatMass} kg\n`;
      }
      if (bodyComp.muscleMassKg) {
        context += `- **${t(locale, 'Muscle mass', 'Muskelmassa')}**: ${bodyComp.muscleMassKg} kg - ${t(locale, 'measured', 'mätt')}\n`;
      }
      if (bodyComp.waterPercent) {
        context += `- **${t(locale, 'Water', 'Vätska')}**: ${bodyComp.waterPercent}%\n`;
      }
      if (bodyComp.visceralFat) {
        context += `- **${t(locale, 'Visceral fat', 'Visceralt fett')}**: ${bodyComp.visceralFat}\n`;
      }
      if (bodyComp.metabolicAge) {
        context += `- **${t(locale, 'Metabolic age', 'Metabolisk ålder')}**: ${bodyComp.metabolicAge} ${t(locale, 'years', 'år')}\n`;
      }
    } else if (measuredBodyFat) {
      // Fall back to settings body fat if no bioimpedance data
      const fatCategory = categorizeBodyFat(measuredBodyFat, gender, age, locale);
      const fatMass = Math.round((measuredWeight * measuredBodyFat / 100) * 10) / 10;
      const leanMass = Math.round((measuredWeight - fatMass) * 10) / 10;

      context += `- **${t(locale, 'Body fat', 'Kroppsfett')}**: ${measuredBodyFat}% (${fatCategory})\n`;
      context += `- **${t(locale, 'Fat mass', 'Fettmassa')}**: ${fatMass} kg\n`;
      context += `- **${t(locale, 'Lean mass', 'Fettfri massa')}**: ${leanMass} kg\n`;
    }

    // Weight goal calculations
    if (settings?.targetWeight && measuredWeight) {
      const weightDiff = measuredWeight - settings.targetWeight;
      const isLoss = weightDiff > 0;

      context += `\n### ${t(locale, 'Weight goal', 'Viktmål')}\n`;
      context += `- **${t(locale, 'Target weight', 'Målvikt')}**: ${settings.targetWeight} kg\n`;
      context += `- **${t(locale, 'Change', 'Förändring')}**: ${isLoss ? '-' : '+'}${Math.abs(weightDiff).toFixed(1)} kg\n`;

      // Calculate timeline
      const timeline = calculateWeightTimeline(
        measuredWeight,
        settings.targetWeight,
        isLoss ? 0.5 : 0.25 // 0.5 kg/week loss, 0.25 kg/week gain
      );

      context += `- **${t(locale, 'Estimated time', 'Uppskattad tid')}**: ${timeline.weeks} ${t(locale, 'weeks', 'veckor')}\n`;
      context += `- **${t(locale, 'Daily calorie target', 'Dagligt kaloribehov')}**: ${tdee + timeline.dailyDeficit} kcal\n`;

      // Generate nutrition plan
      const goal: CaloricGoal = isLoss ? 'MODERATE_LOSS' : 'MILD_GAIN';
      const profile = isLoss ? 'HIGH_PROTEIN' : 'BALANCED';
      const plan = generateNutritionPlan(
        {
          weightKg: measuredWeight,
          heightCm: athlete.height,
          ageYears: age,
          gender,
          activityLevel,
        },
        goal,
        profile,
        undefined,
        locale
      );

      context += `\n### ${t(locale, 'Nutrition recommendation', 'Näringsrekommendation')}\n`;
      context += `- **${t(locale, 'Target calories', 'Målkalorier')}**: ${plan.targetCalories} ${t(locale, 'kcal/day', 'kcal/dag')}\n`;
      context += `- **${t(locale, 'Protein', 'Protein')}**: ${plan.macros.protein.grams}g (${plan.macros.protein.percentage}%)\n`;
      context += `- **${t(locale, 'Carbohydrates', 'Kolhydrater')}**: ${plan.macros.carbs.grams}g (${plan.macros.carbs.percentage}%)\n`;
      context += `- **${t(locale, 'Fat', 'Fett')}**: ${plan.macros.fat.grams}g (${plan.macros.fat.percentage}%)\n`;

      if (plan.recommendations.length > 0) {
        context += `\n### ${t(locale, 'Nutrition advice', 'Kostråd')}\n`;
        for (const rec of plan.recommendations.slice(0, 4)) {
          context += `- ${rec}\n`;
        }
      }

      if (plan.warnings.length > 0) {
        context += `\n### ${t(locale, 'Warnings', 'Varningar')}\n`;
        for (const warning of plan.warnings) {
          context += `⚠️ ${warning}\n`;
        }
      }
    }

    // Protein requirements
    const proteinGoal = settings?.goals?.some(g =>
      g.toLowerCase().includes('muskel') || g.toLowerCase().includes('styrka')
    ) ? 'MUSCLE_GAIN' : (settings?.targetWeight && settings.targetWeight < measuredWeight ? 'WEIGHT_LOSS' : 'SEDENTARY');

    const proteinReq = getProteinRequirements(
      measuredWeight,
      proteinGoal as 'SEDENTARY' | 'WEIGHT_LOSS' | 'MUSCLE_GAIN'
    );
    context += `\n### ${t(locale, 'Protein needs', 'Proteinbehov')}\n`;
    context += `- **${t(locale, 'Recommended', 'Rekommenderat')}**: ${proteinReq.recommended}${t(locale, 'g/day', 'g/dag')}\n`;
    context += `- **${t(locale, 'Range', 'Intervall')}**: ${proteinReq.min}-${proteinReq.max}${t(locale, 'g/day', 'g/dag')}\n`;

    // Hydration
    const hydration = calculateHydration(measuredWeight, activityLevel);
    context += `\n### ${t(locale, 'Fluid intake', 'Vätskeintag')}\n`;
    context += `- **${t(locale, 'Daily need', 'Dagligt behov')}**: ${Math.round(hydration.withActivityML / 100) / 10} ${t(locale, 'liters', 'liter')}\n`;

  } else {
    // Fallback simple context if missing data
    if (settings?.targetWeight || settings?.currentBodyFat) {
      context += `\n### ${t(locale, 'Body composition', 'Kroppssammansättning')}\n`;
      if (athlete.weight) context += `- **${t(locale, 'Current weight', 'Nuvarande vikt')}**: ${athlete.weight} kg\n`;
      if (settings?.targetWeight) context += `- **${t(locale, 'Target weight', 'Målvikt')}**: ${settings.targetWeight} kg\n`;
      if (settings?.currentBodyFat) context += `- **${t(locale, 'Body fat percentage', 'Fettprocent')}**: ${settings.currentBodyFat}%\n`;
    }

    if (athlete.weight && athlete.height) {
      const { bmi, category } = calculateBMI(athlete.weight, athlete.height, locale);
      context += `- **BMI**: ${bmi} (${category})\n`;
    }
  }

  return context;
}


export function buildFunctionalFitnessContext(athlete: AthleteData, locale: SportContextLocale = 'en'): string {
  const sp = athlete.sportProfile;
  const settings = sp?.functionalFitnessSettings as FunctionalFitnessSettings | null;

  let context = `\n## ${t(locale, 'FUNCTIONAL FITNESS DATA', 'FUNKTIONELL FITNESS DATA')}\n`;

  // Experience and focus
  if (settings?.experienceLevel) {
    const experienceLabels: Record<string, { en: string; sv: string }> = {
      beginner: { en: 'Beginner (<1 year)', sv: 'Nybörjare (<1 år)' },
      intermediate: { en: 'Intermediate (1-3 years)', sv: 'Medel (1-3 år)' },
      advanced: { en: 'Advanced (3+ years)', sv: 'Avancerad (3+ år)' },
      competitor: { en: 'Competitor', sv: 'Tävlande' },
    };
    context += `- **${t(locale, 'Experience level', 'Erfarenhetsnivå')}**: ${experienceLabels[settings.experienceLevel]?.[locale] || settings.experienceLevel}\n`;
  }

  if (settings?.yearsTraining) {
    context += `- **${t(locale, 'Years of training', 'År av träning')}**: ${settings.yearsTraining} ${t(locale, 'years', 'år')}\n`;
  }

  if (settings?.primaryFocus) {
    const focusLabels: Record<string, { en: string; sv: string }> = {
      general: { en: 'General fitness', sv: 'Allmän fitness' },
      strength: { en: 'Strength', sv: 'Styrka' },
      endurance: { en: 'Endurance', sv: 'Uthållighet' },
      gymnastics: { en: 'Gymnastics', sv: 'Gymnastik' },
      competition: { en: 'Competition', sv: 'Tävling' },
    };
    context += `- **${t(locale, 'Primary focus', 'Primärt fokus')}**: ${focusLabels[settings.primaryFocus]?.[locale] || settings.primaryFocus}\n`;
  }

  if (settings?.weeklyTrainingDays) {
    context += `- **${t(locale, 'Training days/week', 'Träningsdagar/vecka')}**: ${settings.weeklyTrainingDays}\n`;
  }

  if (settings?.preferredWODDuration) {
    context += `- **${t(locale, 'Preferred WOD duration', 'Föredragen WOD-längd')}**: ~${settings.preferredWODDuration} min\n`;
  }

  if (settings?.competitionInterest) {
    context += `- **${t(locale, 'Competition interest', 'Tävlingsintresse')}**: ${t(locale, 'Yes', 'Ja')}\n`;
  }

  // Benchmark workouts
  if (settings?.benchmarks) {
    const bm = settings.benchmarks;
    const hasBenchmarks = bm.fran || bm.grace || bm.diane || bm.helen || bm.murph;

    if (hasBenchmarks) {
      context += `\n### Benchmark Workouts\n`;
      context += `| Workout | ${t(locale, 'Time', 'Tid')} | ${t(locale, 'Description', 'Beskrivning')} |\n`;
      context += `|---------|-----|-------------|\n`;
      if (bm.fran) context += `| Fran | ${formatSecondsToTime(bm.fran)} | 21-15-9 Thrusters + Pull-ups |\n`;
      if (bm.grace) context += `| Grace | ${formatSecondsToTime(bm.grace)} | 30 Clean & Jerks |\n`;
      if (bm.diane) context += `| Diane | ${formatSecondsToTime(bm.diane)} | 21-15-9 Deadlifts + HSPU |\n`;
      if (bm.helen) context += `| Helen | ${formatSecondsToTime(bm.helen)} | 3R: 400m + KB + Pull-ups |\n`;
      if (bm.murph) context += `| Murph | ${formatSecondsToTime(bm.murph)} | 1mi + 100/200/300 + 1mi |\n`;
    }

    // Strength PRs
    const hasStrength = bm.backSquat1RM || bm.frontSquat1RM || bm.deadlift1RM ||
                        bm.strictPress1RM || bm.cleanAndJerk1RM || bm.snatch1RM;

    if (hasStrength) {
      context += `\n### ${t(locale, 'Strength (1RM)', 'Styrka (1RM)')}\n`;
      context += `| ${t(locale, 'Lift', 'Lyft')} | ${t(locale, 'Weight (kg)', 'Vikt (kg)')} |\n`;
      context += `|------|----------|\n`;
      if (bm.backSquat1RM) context += `| Back Squat | ${bm.backSquat1RM} |\n`;
      if (bm.frontSquat1RM) context += `| Front Squat | ${bm.frontSquat1RM} |\n`;
      if (bm.deadlift1RM) context += `| Deadlift | ${bm.deadlift1RM} |\n`;
      if (bm.strictPress1RM) context += `| Strict Press | ${bm.strictPress1RM} |\n`;
      if (bm.cleanAndJerk1RM) context += `| Clean & Jerk | ${bm.cleanAndJerk1RM} |\n`;
      if (bm.snatch1RM) context += `| Snatch | ${bm.snatch1RM} |\n`;
    }

    // Gymnastics maxes
    const hasGymnastics = bm.maxPullUps || bm.maxMuscleUps || bm.maxHSPU || bm.maxDoubleUnders;
    if (hasGymnastics) {
      context += `\n### ${t(locale, 'Gymnastics (max reps)', 'Gymnastik (max reps)')}\n`;
      if (bm.maxPullUps) context += `- **Pull-ups**: ${bm.maxPullUps}\n`;
      if (bm.maxMuscleUps) context += `- **Muscle-ups**: ${bm.maxMuscleUps}\n`;
      if (bm.maxHSPU) context += `- **HSPU**: ${bm.maxHSPU}\n`;
      if (bm.maxDoubleUnders) context += `- **Double-unders (unbroken)**: ${bm.maxDoubleUnders}\n`;
    }
  }

  // Gymnastics skills
  if (settings?.gymnasticsSkills) {
    const skills = settings.gymnasticsSkills;
    context += `\n### ${t(locale, 'Gymnastics skill level', 'Gymnastik-skills nivå')}\n`;

    const skillLabels: Record<string, Record<string, { en: string; sv: string }>> = {
      pullUps: {
        none: { en: 'None', sv: 'Inga' }, banded: { en: 'Banded', sv: 'Band' }, strict: { en: 'Strict', sv: 'Strikta' },
        kipping: { en: 'Kipping', sv: 'Kipping' }, butterfly: { en: 'Butterfly', sv: 'Butterfly' }, muscle_up: { en: 'Muscle-ups', sv: 'Muscle-ups' }
      },
      handstandPushUps: {
        none: { en: 'None', sv: 'Inga' }, pike: { en: 'Pike', sv: 'Pike' }, box: { en: 'Box', sv: 'Box' },
        wall: { en: 'Wall', sv: 'Wall' }, strict: { en: 'Strict', sv: 'Strikta' }, kipping: { en: 'Kipping', sv: 'Kipping' }, freestanding: { en: 'Freestanding', sv: 'Fristående' }
      },
      toeToBar: {
        none: { en: 'None', sv: 'Inga' }, hanging_knee: { en: 'Hanging knee', sv: 'Hanging knee' }, kipping: { en: 'Kipping', sv: 'Kipping' }, strict: { en: 'Strict', sv: 'Strikta' }
      },
      doubleUnders: {
        none: { en: 'None', sv: 'Inga' }, learning: { en: 'Learning', sv: 'Lär sig' }, consistent: { en: 'Consistent', sv: 'Konsekvent' }, unbroken_50: { en: '50+ unbroken', sv: '50+ unbroken' }
      },
      ropeClimbs: {
        none: { en: 'None', sv: 'Inga' }, with_legs: { en: 'With legs', sv: 'Med bengrep' }, legless: { en: 'Legless', sv: 'Legless' }
      }
    };

    if (skills.pullUps) context += `- **Pull-ups**: ${skillLabels.pullUps[skills.pullUps]?.[locale] || skills.pullUps}\n`;
    if (skills.handstandPushUps) context += `- **HSPU**: ${skillLabels.handstandPushUps[skills.handstandPushUps]?.[locale] || skills.handstandPushUps}\n`;
    if (skills.toeToBar) context += `- **Toes to Bar**: ${skillLabels.toeToBar[skills.toeToBar]?.[locale] || skills.toeToBar}\n`;
    if (skills.doubleUnders) context += `- **Double-unders**: ${skillLabels.doubleUnders[skills.doubleUnders]?.[locale] || skills.doubleUnders}\n`;
    if (skills.ropeClimbs) context += `- **Rope Climbs**: ${skillLabels.ropeClimbs[skills.ropeClimbs]?.[locale] || skills.ropeClimbs}\n`;
  }

  // Olympic lifting level
  if (settings?.olympicLiftingLevel) {
    const olympicLabels: Record<string, { en: string; sv: string }> = {
      none: { en: 'No experience', sv: 'Ingen erfarenhet' },
      learning: { en: 'Learning', sv: 'Lär sig' },
      competent: { en: 'Competent', sv: 'Kompetent' },
      proficient: { en: 'Proficient', sv: 'Mycket duktig' },
    };
    context += `\n### ${t(locale, 'Olympic lifting', 'Olympiska lyft')}\n`;
    context += `- **${t(locale, 'Level', 'Nivå')}**: ${olympicLabels[settings.olympicLiftingLevel]?.[locale] || settings.olympicLiftingLevel}\n`;
  }

  // Gym and equipment
  if (settings?.gymType) {
    const gymLabels: Record<string, { en: string; sv: string }> = {
      commercial: { en: 'Commercial gym', sv: 'Vanligt gym' },
      functional_box: { en: 'Functional box', sv: 'Funktionell box' },
      home: { en: 'Home gym', sv: 'Hemmagym' },
      garage: { en: 'Garage gym', sv: 'Garage gym' },
    };
    context += `\n### ${t(locale, 'Training environment', 'Träningsmiljö')}\n`;
    context += `- **${t(locale, 'Gym type', 'Gymtyp')}**: ${gymLabels[settings.gymType]?.[locale] || settings.gymType}\n`;
  }

  if (settings?.equipmentAvailable && settings.equipmentAvailable.length > 0) {
    context += `- **${t(locale, 'Available equipment', 'Tillgänglig utrustning')}**: ${settings.equipmentAvailable.join(', ')}\n`;
  }

  return context;
}

