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

export function buildHyroxContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.hyroxSettings as HyroxSettings | null;

  let context = `\n## HYROX-SPECIFIK DATA\n`;

  if (settings?.targetCategory) {
    context += `- **Tävlingskategori**: ${settings.targetCategory}\n`;
  }
  if (settings?.targetTime) {
    context += `- **Måltid**: ${settings.targetTime}\n`;
  }

  // Station times
  if (settings?.stationTimes) {
    const st = settings.stationTimes;
    context += `\n### Stationstider\n`;
    context += `| Station | Tid | Benchmark* |\n`;
    context += `|---------|-----|------------|\n`;
    if (st.skiErg) context += `| SkiErg (1000m) | ${formatTime(st.skiErg)} | ~4:00 |\n`;
    if (st.sledPush) context += `| Sled Push (50m) | ${formatTime(st.sledPush)} | ~1:30 |\n`;
    if (st.sledPull) context += `| Sled Pull (50m) | ${formatTime(st.sledPull)} | ~1:30 |\n`;
    if (st.burpeeBroadJump) context += `| Burpee Broad Jump (80m) | ${formatTime(st.burpeeBroadJump)} | ~3:00 |\n`;
    if (st.rowing) context += `| Rowing (1000m) | ${formatTime(st.rowing)} | ~4:00 |\n`;
    if (st.farmersCarry) context += `| Farmers Carry (200m) | ${formatTime(st.farmersCarry)} | ~2:00 |\n`;
    if (st.lunges) context += `| Lunges (100m) | ${formatTime(st.lunges)} | ~3:30 |\n`;
    if (st.wallBalls) context += `| Wall Balls (100 reps) | ${formatTime(st.wallBalls)} | ~5:00 |\n`;
    context += `*Benchmark = Pro-nivå\n`;

    // Calculate total station time
    const totalStation = Object.values(st).reduce((sum, t) => sum + (t || 0), 0);
    context += `\n**Total stationstid**: ${formatTime(totalStation)}\n`;
  }

  // Run splits
  if (settings?.runSplits && settings.runSplits.length > 0) {
    const avgSplit = settings.runSplits.reduce((a, b) => a + b, 0) / settings.runSplits.length;
    context += `\n### Löpsplits (8 x 1km)\n`;
    context += `- **Snitt**: ${formatTime(avgSplit)}/km\n`;
    context += `- **Total löptid**: ${formatTime(avgSplit * 8)}\n`;
  }

  // Strength PRs
  if (settings?.strengthPRs) {
    const prs = settings.strengthPRs;
    context += `\n### Styrke-PRs\n`;
    if (prs.deadlift) context += `- **Marklyft**: ${prs.deadlift} kg\n`;
    if (prs.squat) context += `- **Knäböj**: ${prs.squat} kg\n`;
    if (prs.benchPress) context += `- **Bänkpress**: ${prs.benchPress} kg\n`;
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
      context += `\n### Identifierade förbättringsområden\n`;
      context += limiters.map(l => `- ${formatStationName(l)}`).join('\n');
      context += '\n';
    }
  }

  return context;
}


export function buildGeneralFitnessContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.generalFitnessSettings as GeneralFitnessSettings | null;

  let context = `\n## ALLMÄN FITNESS DATA\n`;

  if (settings?.goals && settings.goals.length > 0) {
    context += `### Mål\n`;
    for (const goal of settings.goals) {
      context += `- ${goal}\n`;
    }
  }

  if (settings?.activityTypes && settings.activityTypes.length > 0) {
    context += `\n### Prefererade aktiviteter\n`;
    context += settings.activityTypes.join(', ') + '\n';
  }

  if (settings?.limitations && settings.limitations.length > 0) {
    context += `\n### Begränsningar/Hänsyn\n`;
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

    const { bmi, category: bmiCategory } = calculateBMI(measuredWeight, athlete.height);
    const idealWeight = calculateIdealWeightRange(athlete.height, gender);

    context += `\n### Metabolism & Energibehov\n`;
    context += `- **BMR (Basalmetabolism)**: ${bmr} kcal/dag${bodyComp?.bmrKcal ? ' (mätt)' : ' (beräknat)'}\n`;
    context += `- **TDEE (Totalt dagligt energibehov)**: ${tdee} kcal/dag\n`;
    context += `- **Aktivitetsnivå**: ${translateActivityLevel(activityLevel)}\n`;

    context += `\n### Kroppssammansättning\n`;
    context += `- **Vikt**: ${measuredWeight} kg${bodyComp?.weightKg ? ' (senast mätt)' : ''}\n`;
    context += `- **Längd**: ${athlete.height} cm\n`;
    context += `- **BMI**: ${bmi} (${bmiCategory})\n`;
    context += `- **Idealvikt**: ${idealWeight.min}-${idealWeight.max} kg\n`;

    // Use bioimpedance data if available
    if (bodyComp) {
      if (bodyComp.bodyFatPercent) {
        const fatCategory = categorizeBodyFat(bodyComp.bodyFatPercent, gender, age);
        const fatMass = Math.round((measuredWeight * bodyComp.bodyFatPercent / 100) * 10) / 10;
        context += `- **Kroppsfett**: ${bodyComp.bodyFatPercent}% (${fatCategory}) - mätt\n`;
        context += `- **Fettmassa**: ${fatMass} kg\n`;
      }
      if (bodyComp.muscleMassKg) {
        context += `- **Muskelmassa**: ${bodyComp.muscleMassKg} kg - mätt\n`;
      }
      if (bodyComp.waterPercent) {
        context += `- **Vätska**: ${bodyComp.waterPercent}%\n`;
      }
      if (bodyComp.visceralFat) {
        context += `- **Visceralt fett**: ${bodyComp.visceralFat}\n`;
      }
      if (bodyComp.metabolicAge) {
        context += `- **Metabolisk ålder**: ${bodyComp.metabolicAge} år\n`;
      }
    } else if (measuredBodyFat) {
      // Fall back to settings body fat if no bioimpedance data
      const fatCategory = categorizeBodyFat(measuredBodyFat, gender, age);
      const fatMass = Math.round((measuredWeight * measuredBodyFat / 100) * 10) / 10;
      const leanMass = Math.round((measuredWeight - fatMass) * 10) / 10;

      context += `- **Kroppsfett**: ${measuredBodyFat}% (${fatCategory})\n`;
      context += `- **Fettmassa**: ${fatMass} kg\n`;
      context += `- **Fettfri massa**: ${leanMass} kg\n`;
    }

    // Weight goal calculations
    if (settings?.targetWeight && measuredWeight) {
      const weightDiff = measuredWeight - settings.targetWeight;
      const isLoss = weightDiff > 0;

      context += `\n### Viktmål\n`;
      context += `- **Målvikt**: ${settings.targetWeight} kg\n`;
      context += `- **Förändring**: ${isLoss ? '-' : '+'}${Math.abs(weightDiff).toFixed(1)} kg\n`;

      // Calculate timeline
      const timeline = calculateWeightTimeline(
        measuredWeight,
        settings.targetWeight,
        isLoss ? 0.5 : 0.25 // 0.5 kg/week loss, 0.25 kg/week gain
      );

      context += `- **Uppskattad tid**: ${timeline.weeks} veckor\n`;
      context += `- **Dagligt kaloribehov**: ${tdee + timeline.dailyDeficit} kcal\n`;

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
        profile
      );

      context += `\n### Näringsrekommendation\n`;
      context += `- **Målkalorier**: ${plan.targetCalories} kcal/dag\n`;
      context += `- **Protein**: ${plan.macros.protein.grams}g (${plan.macros.protein.percentage}%)\n`;
      context += `- **Kolhydrater**: ${plan.macros.carbs.grams}g (${plan.macros.carbs.percentage}%)\n`;
      context += `- **Fett**: ${plan.macros.fat.grams}g (${plan.macros.fat.percentage}%)\n`;

      if (plan.recommendations.length > 0) {
        context += `\n### Kostråd\n`;
        for (const rec of plan.recommendations.slice(0, 4)) {
          context += `- ${rec}\n`;
        }
      }

      if (plan.warnings.length > 0) {
        context += `\n### Varningar\n`;
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
    context += `\n### Proteinbehov\n`;
    context += `- **Rekommenderat**: ${proteinReq.recommended}g/dag\n`;
    context += `- **Intervall**: ${proteinReq.min}-${proteinReq.max}g/dag\n`;

    // Hydration
    const hydration = calculateHydration(measuredWeight, activityLevel);
    context += `\n### Vätskeintag\n`;
    context += `- **Dagligt behov**: ${Math.round(hydration.withActivityML / 100) / 10} liter\n`;

  } else {
    // Fallback simple context if missing data
    if (settings?.targetWeight || settings?.currentBodyFat) {
      context += `\n### Kroppssammansättning\n`;
      if (athlete.weight) context += `- **Nuvarande vikt**: ${athlete.weight} kg\n`;
      if (settings?.targetWeight) context += `- **Målvikt**: ${settings.targetWeight} kg\n`;
      if (settings?.currentBodyFat) context += `- **Fettprocent**: ${settings.currentBodyFat}%\n`;
    }

    if (athlete.weight && athlete.height) {
      const { bmi, category } = calculateBMI(athlete.weight, athlete.height);
      context += `- **BMI**: ${bmi} (${category})\n`;
    }
  }

  return context;
}


export function buildFunctionalFitnessContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.functionalFitnessSettings as FunctionalFitnessSettings | null;

  let context = `\n## FUNKTIONELL FITNESS DATA\n`;

  // Experience and focus
  if (settings?.experienceLevel) {
    const experienceLabels: Record<string, string> = {
      beginner: 'Nybörjare (<1 år)',
      intermediate: 'Medel (1-3 år)',
      advanced: 'Avancerad (3+ år)',
      competitor: 'Tävlande',
    };
    context += `- **Erfarenhetsnivå**: ${experienceLabels[settings.experienceLevel] || settings.experienceLevel}\n`;
  }

  if (settings?.yearsTraining) {
    context += `- **År av träning**: ${settings.yearsTraining} år\n`;
  }

  if (settings?.primaryFocus) {
    const focusLabels: Record<string, string> = {
      general: 'Allmän fitness',
      strength: 'Styrka',
      endurance: 'Uthållighet',
      gymnastics: 'Gymnastik',
      competition: 'Tävling',
    };
    context += `- **Primärt fokus**: ${focusLabels[settings.primaryFocus] || settings.primaryFocus}\n`;
  }

  if (settings?.weeklyTrainingDays) {
    context += `- **Träningsdagar/vecka**: ${settings.weeklyTrainingDays}\n`;
  }

  if (settings?.preferredWODDuration) {
    context += `- **Föredragen WOD-längd**: ~${settings.preferredWODDuration} min\n`;
  }

  if (settings?.competitionInterest) {
    context += `- **Tävlingsintresse**: Ja\n`;
  }

  // Benchmark workouts
  if (settings?.benchmarks) {
    const bm = settings.benchmarks;
    const hasBenchmarks = bm.fran || bm.grace || bm.diane || bm.helen || bm.murph;

    if (hasBenchmarks) {
      context += `\n### Benchmark Workouts\n`;
      context += `| Workout | Tid | Beskrivning |\n`;
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
      context += `\n### Styrka (1RM)\n`;
      context += `| Lyft | Vikt (kg) |\n`;
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
      context += `\n### Gymnastik (max reps)\n`;
      if (bm.maxPullUps) context += `- **Pull-ups**: ${bm.maxPullUps}\n`;
      if (bm.maxMuscleUps) context += `- **Muscle-ups**: ${bm.maxMuscleUps}\n`;
      if (bm.maxHSPU) context += `- **HSPU**: ${bm.maxHSPU}\n`;
      if (bm.maxDoubleUnders) context += `- **Double-unders (unbroken)**: ${bm.maxDoubleUnders}\n`;
    }
  }

  // Gymnastics skills
  if (settings?.gymnasticsSkills) {
    const skills = settings.gymnasticsSkills;
    context += `\n### Gymnastik-skills nivå\n`;

    const skillLabels: Record<string, Record<string, string>> = {
      pullUps: {
        none: 'Inga', banded: 'Band', strict: 'Strikta',
        kipping: 'Kipping', butterfly: 'Butterfly', muscle_up: 'Muscle-ups'
      },
      handstandPushUps: {
        none: 'Inga', pike: 'Pike', box: 'Box',
        wall: 'Wall', strict: 'Strikta', kipping: 'Kipping', freestanding: 'Fristående'
      },
      toeToBar: {
        none: 'Inga', hanging_knee: 'Hanging knee', kipping: 'Kipping', strict: 'Strikta'
      },
      doubleUnders: {
        none: 'Inga', learning: 'Lär sig', consistent: 'Konsekvent', unbroken_50: '50+ unbroken'
      },
      ropeClimbs: {
        none: 'Inga', with_legs: 'Med bengrep', legless: 'Legless'
      }
    };

    if (skills.pullUps) context += `- **Pull-ups**: ${skillLabels.pullUps[skills.pullUps] || skills.pullUps}\n`;
    if (skills.handstandPushUps) context += `- **HSPU**: ${skillLabels.handstandPushUps[skills.handstandPushUps] || skills.handstandPushUps}\n`;
    if (skills.toeToBar) context += `- **Toes to Bar**: ${skillLabels.toeToBar[skills.toeToBar] || skills.toeToBar}\n`;
    if (skills.doubleUnders) context += `- **Double-unders**: ${skillLabels.doubleUnders[skills.doubleUnders] || skills.doubleUnders}\n`;
    if (skills.ropeClimbs) context += `- **Rope Climbs**: ${skillLabels.ropeClimbs[skills.ropeClimbs] || skills.ropeClimbs}\n`;
  }

  // Olympic lifting level
  if (settings?.olympicLiftingLevel) {
    const olympicLabels: Record<string, string> = {
      none: 'Ingen erfarenhet',
      learning: 'Lär sig',
      competent: 'Kompetent',
      proficient: 'Mycket duktig',
    };
    context += `\n### Olympiska lyft\n`;
    context += `- **Nivå**: ${olympicLabels[settings.olympicLiftingLevel] || settings.olympicLiftingLevel}\n`;
  }

  // Gym and equipment
  if (settings?.gymType) {
    const gymLabels: Record<string, string> = {
      commercial: 'Vanligt gym',
      functional_box: 'Funktionell box',
      home: 'Hemmagym',
      garage: 'Garage gym',
    };
    context += `\n### Träningsmiljö\n`;
    context += `- **Gymtyp**: ${gymLabels[settings.gymType] || settings.gymType}\n`;
  }

  if (settings?.equipmentAvailable && settings.equipmentAvailable.length > 0) {
    context += `- **Tillgänglig utrustning**: ${settings.equipmentAvailable.join(', ')}\n`;
  }

  return context;
}


