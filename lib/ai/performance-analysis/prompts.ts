/**
 * AI Prompts for Deep Performance Analysis
 *
 * Localized prompts for generating insightful performance analysis.
 */

import {
  TestDataForAnalysis,
  TrainingContextForAnalysis,
  AthleteProfileForAnalysis,
} from './types'
import { buildConstitutionPreamble } from '@/lib/ai/constitution'

export type PerformanceAnalysisLocale = 'en' | 'sv'

/**
 * System prompt for all performance analysis
 */
export function getPerformanceAnalysisSystemPrompt(
  locale: PerformanceAnalysisLocale = 'en'
): string {
  if (locale === 'sv') {
    return `${buildConstitutionPreamble('analysis')}Du är en expert på prestationsanalys inom uthållighetsidrott med djup kunskap om:
- Fysiologiska testningar (VO2max, laktattröskel, löpekonomi)
- Träningsteori och periodisering
- Prestation-träningskorrelationer
- Individualiserad coachning

Din uppgift är att analysera testdata och ge insiktsfulla, handlingsbara analyser på svenska.

Riktlinjer:
- Var specifik och undvik generaliseringar
- Fokusera på praktiska implikationer
- Ge konkreta rekommendationer baserade på data
- Använd professionellt men tillgängligt språk
- Anpassa komplexiteten till målgruppen (tränare och avancerade atleter)
- Inkludera både styrkor och utvecklingsområden
- Basera prediktioner på etablerade fysiologiska modeller

Viktiga fysiologiska koncept:
- LT1 (aerob tröskel): Första laktatuppgången, typiskt 1.5-2.0 mmol/L
- LT2 (anaerob tröskel): Ofta definierad som 4 mmol/L eller MLSS
- VO2max: Maximal syreupptagningsförmåga
- Löpekonomi: ml O2/kg/km - lägre är bättre
- FTP: Funktionell tröskeleffekt för cykling`
  }

  return `${buildConstitutionPreamble('analysis')}You are an expert in endurance performance analysis with deep knowledge of:
- Physiological testing (VO2max, lactate threshold, running economy)
- Training theory and periodization
- Performance-training correlations
- Individualized coaching

Your task is to analyze test data and provide insightful, actionable analysis in English.

Guidelines:
- Be specific and avoid generic statements
- Focus on practical implications
- Give concrete recommendations based on the data
- Use professional but accessible language
- Adapt complexity for coaches and advanced athletes
- Include both strengths and development areas
- Base predictions on established physiological models

Important physiological concepts:
- LT1 (aerobic threshold): First lactate rise, typically 1.5-2.0 mmol/L
- LT2 (anaerobic threshold): Often defined as 4 mmol/L or MLSS
- VO2max: Maximal oxygen uptake
- Running economy: ml O2/kg/km - lower is better
- FTP: Functional threshold power for cycling

Output language requirement: write every user-facing JSON string value in English. If source data contains Swedish labels or names, use them only as input context and translate the meaning.`
}

export const PERFORMANCE_ANALYSIS_SYSTEM_PROMPT = getPerformanceAnalysisSystemPrompt('en')

/**
 * Generate prompt for single test analysis
 */
export function generateTestAnalysisPrompt(
  test: TestDataForAnalysis,
  previousTests: TestDataForAnalysis[],
  trainingContext: TrainingContextForAnalysis | null,
  athlete: AthleteProfileForAnalysis,
  locale: PerformanceAnalysisLocale = 'en'
): string {
  const testTypeLabel = getTestTypeLabel(test.testType, locale)
  const hasTrainingData = trainingContext !== null
  const isSv = locale === 'sv'

  return `
## ${isSv ? 'Analysera' : 'Analyze'} ${testTypeLabel} ${isSv ? 'för' : 'for'} ${athlete.name}

${getOutputLanguageInstruction(locale)}

### ${isSv ? 'Atletprofil' : 'Athlete profile'}
- ${isSv ? 'Ålder' : 'Age'}: ${athlete.age} ${isSv ? 'år' : 'years'}
- ${isSv ? 'Kön' : 'Gender'}: ${athlete.gender === 'MALE' ? (isSv ? 'Man' : 'Male') : (isSv ? 'Kvinna' : 'Female')}
- Sport: ${athlete.sport}
- ${isSv ? 'Erfarenhet' : 'Experience'}: ${athlete.experienceYears} ${isSv ? 'år' : 'years'}
- ${isSv ? 'Träningstimmar/vecka' : 'Training hours/week'}: ${athlete.weeklyTrainingHours}
${athlete.primaryGoal ? `- ${isSv ? 'Mål' : 'Goal'}: ${athlete.primaryGoal}` : ''}

### ${isSv ? 'Testresultat' : 'Test results'} (${formatDate(test.date, locale)})
${formatTestData(test, locale)}

${previousTests.length > 0 ? `
### ${isSv ? 'Tidigare tester (för kontext)' : 'Previous tests (for context)'}
${previousTests.map((t, i) => `
**Test ${i + 1} (${formatDate(t.date, locale)}):**
- VO2max: ${t.vo2max ?? (isSv ? 'Ej mätt' : 'Not measured')} ml/kg/min
- ${isSv ? 'Aerob tröskel HR' : 'Aerobic threshold HR'}: ${t.aerobicThreshold?.hr ?? 'N/A'} bpm
- ${isSv ? 'Anaerob tröskel HR' : 'Anaerobic threshold HR'}: ${t.anaerobicThreshold?.hr ?? 'N/A'} bpm
`).join('')}
` : ''}

${hasTrainingData ? `
### ${isSv ? 'Träningskontext' : 'Training context'} (${trainingContext!.weekCount} ${isSv ? 'veckor före test' : 'weeks before test'})
${formatTrainingContext(trainingContext!, locale)}
` : ''}

### ${isSv ? 'Instruktioner för analys' : 'Analysis instructions'}

${isSv ? `Ge en djupgående analys som inkluderar:

1. **Sammanfattning** (2-3 meningar)
   - Övergripande bedömning av testresultatet

2. **Nyckelfynd** (3-5 punkter)
   - Identifiera de viktigaste insikterna från testet
   - Kategorisera varje fynd (FÖRBÄTTRING, FÖRSÄMRING, STYRKA, SVAGHET, INSIKT, VARNING)

3. **Styrkor**
   - Lista 2-3 tydliga styrkor baserat på testdata

4. **Utvecklingsområden**
   - Lista 2-3 områden med förbättringspotential

5. **Prediktioner**
   - Potentiella tävlingstider baserat på VO2max/trösklarna
   - Prognostiserad utveckling vid fortsatt träning
   - Uppskattad tid till nästa prestandanivå

6. **Träningsrekommendationer** (3-5 prioriterade)
   - Konkreta åtgärder för att optimera träningen
   - Inkludera kategori (VOLYM, INTENSITET, ÅTERHÄMTNING, TEKNIK, STYRKA, KOST)
   - Förklara varför och hur varje rekommendation ska implementeras`
    : `Provide an in-depth analysis that includes:

1. **Summary** (2-3 sentences)
   - Overall assessment of the test result

2. **Key findings** (3-5 bullets)
   - Identify the most important insights from the test
   - Categorize each finding (IMPROVEMENT, DECLINE, STRENGTH, WEAKNESS, INSIGHT, WARNING)

3. **Strengths**
   - List 2-3 clear strengths based on the test data

4. **Development areas**
   - List 2-3 areas with improvement potential

5. **Predictions**
   - Potential race times based on VO2max/thresholds
   - Forecasted development with continued training
   - Estimated time to the next performance level

6. **Training recommendations** (3-5 prioritized)
   - Concrete actions to optimize training
   - Include category (VOLUME, INTENSITY, RECOVERY, TECHNIQUE, STRENGTH, NUTRITION)
   - Explain why and how each recommendation should be implemented`}

${isSv ? 'Svara i JSON-format enligt denna struktur:' : 'Respond in JSON using this structure:'}
\`\`\`json
{
  "narrative": "${isSv ? 'Huvudanalystext...' : 'Main analysis text...'}",
  "executiveSummary": "${isSv ? 'Kort sammanfattning...' : 'Brief summary...'}",
  "keyFindings": [
    {
      "category": "IMPROVEMENT|DECLINE|STRENGTH|WEAKNESS|INSIGHT|WARNING",
      "title": "${isSv ? 'Kort titel' : 'Short title'}",
      "description": "${isSv ? 'Detaljerad beskrivning' : 'Detailed description'}",
      "metric": "VO2max|LT1|LT2|etc",
      "significance": "HIGH|MEDIUM|LOW"
    }
  ],
  "strengths": ["${isSv ? 'Styrka 1' : 'Strength 1'}", "${isSv ? 'Styrka 2' : 'Strength 2'}"],
  "developmentAreas": ["${isSv ? 'Område 1' : 'Area 1'}", "${isSv ? 'Område 2' : 'Area 2'}"],
  "predictions": [
    {
      "type": "RACE_TIME|THRESHOLD|VO2MAX|FITNESS_PEAK",
      "title": "${isSv ? 'Prediktionstitel' : 'Prediction title'}",
      "prediction": "${isSv ? 'Konkret prediktion' : 'Concrete prediction'}",
      "confidence": 0.8,
      "basis": "${isSv ? 'Vad prediktionen baseras på' : 'What the prediction is based on'}",
      "timeframe": "${isSv ? 'När detta kan uppnås' : 'When this can be achieved'}"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "category": "VOLUME|INTENSITY|RECOVERY|TECHNIQUE|STRENGTH|NUTRITION",
      "title": "${isSv ? 'Rekommendationstitel' : 'Recommendation title'}",
      "description": "${isSv ? 'Beskrivning' : 'Description'}",
      "rationale": "${isSv ? 'Varför denna rekommendation' : 'Why this recommendation matters'}",
      "implementation": "${isSv ? 'Hur implementera' : 'How to implement'}",
      "expectedOutcome": "${isSv ? 'Förväntad effekt' : 'Expected outcome'}"
    }
  ]
}
\`\`\`

${getOutputLanguageInstruction(locale)}
`
}

/**
 * Generate prompt for test comparison
 */
export function generateTestComparisonPrompt(
  current: TestDataForAnalysis,
  previous: TestDataForAnalysis,
  trainingBetween: TrainingContextForAnalysis | null,
  athlete: AthleteProfileForAnalysis,
  locale: PerformanceAnalysisLocale = 'en'
): string {
  const testTypeLabel = getTestTypeLabel(current.testType, locale)
  const isSv = locale === 'sv'
  const daysBetween = Math.floor(
    (new Date(current.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24)
  )

  return `
## ${isSv ? 'Jämför' : 'Compare'} ${testTypeLabel} ${isSv ? 'för' : 'for'} ${athlete.name}

${getOutputLanguageInstruction(locale)}

### ${isSv ? 'Atletprofil' : 'Athlete profile'}
- ${isSv ? 'Ålder' : 'Age'}: ${athlete.age} ${isSv ? 'år' : 'years'}
- Sport: ${athlete.sport}
- ${isSv ? 'Erfarenhet' : 'Experience'}: ${athlete.experienceYears} ${isSv ? 'år' : 'years'}

### ${isSv ? 'Tidigare test' : 'Previous test'} (${formatDate(previous.date, locale)})
${formatTestData(previous, locale)}

### ${isSv ? 'Aktuellt test' : 'Current test'} (${formatDate(current.date, locale)})
${formatTestData(current, locale)}

### ${isSv ? 'Tidsperiod mellan tester' : 'Time between tests'}
- ${isSv ? 'Dagar' : 'Days'}: ${daysBetween}
- ${isSv ? 'Veckor' : 'Weeks'}: ${Math.round(daysBetween / 7)}

${trainingBetween ? `
### ${isSv ? 'Träning mellan testerna' : 'Training between tests'}
${formatTrainingContext(trainingBetween, locale)}
` : ''}

### ${isSv ? 'Instruktioner för jämförelseanalys' : 'Comparison analysis instructions'}

${isSv ? `Analysera förändringarna mellan testerna och identifiera:

1. **Sammanfattning** (2-3 meningar)
   - Övergripande bedömning av utvecklingen

2. **Nyckelfynd** (3-5 punkter)
   - Vilka parametrar har förbättrats/försämrats mest
   - Statistisk och praktisk signifikans av förändringarna

3. **Deltaanalys**
   - Beräkna absoluta och procentuella förändringar för varje parameter
   - Klassificera trend: IMPROVED, DECLINED, STABLE

4. **Korrelationsanalys** (om träningsdata finns)
   - Vilka träningsfaktorer har troligen bidragit till förändringarna
   - Identifiera oförklarad variation

5. **Rekommendationer**
   - Baserat på utvecklingen, vad bör prioriteras härnäst`
    : `Analyze changes between the tests and identify:

1. **Summary** (2-3 sentences)
   - Overall assessment of development

2. **Key findings** (3-5 bullets)
   - Which parameters improved/declined the most
   - Statistical and practical significance of the changes

3. **Delta analysis**
   - Calculate absolute and percentage changes for each parameter
   - Classify trend: IMPROVED, DECLINED, STABLE

4. **Correlation analysis** (if training data exists)
   - Which training factors likely contributed to the changes
   - Identify unexplained variation

5. **Recommendations**
   - Based on the development, what should be prioritized next`}

${isSv ? 'Svara i JSON-format enligt denna struktur:' : 'Respond in JSON using this structure:'}
\`\`\`json
{
  "narrative": "${isSv ? 'Jämförelseanalystext...' : 'Comparison analysis text...'}",
  "executiveSummary": "${isSv ? 'Kort sammanfattning...' : 'Brief summary...'}",
  "keyFindings": [...],
  "strengths": [...],
  "developmentAreas": [...],
  "comparison": {
    "testDates": {
      "previous": "${previous.date}",
      "current": "${current.date}",
      "daysBetween": ${daysBetween}
    },
    "deltas": {
      "vo2max": { "previous": X, "current": Y, "absoluteChange": Z, "percentChange": W, "trend": "IMPROVED|DECLINED|STABLE" },
      ...
    },
    "trainingBetweenTests": {
      "weeks": X,
      "totalSessions": X,
      "avgWeeklyVolume": "${isSv ? 'X km/vecka' : 'X km/week'}",
      "dominantTrainingType": "...",
      "zoneDistributionSummary": "${isSv ? '80/20 polariserad etc.' : '80/20 polarized, etc.'}"
    }
  },
  "correlationAnalysis": {
    "likelyContributors": [
      {
        "factor": "${isSv ? 'Ökad Z2-volym' : 'Increased Z2 volume'}",
        "impact": "POSITIVE|NEGATIVE|NEUTRAL",
        "confidence": 0.8,
        "explanation": "..."
      }
    ],
    "unexplainedVariance": "${isSv ? 'Om något inte kan förklaras' : 'Anything that cannot be explained'}"
  },
  "predictions": [...],
  "recommendations": [...]
}
\`\`\`

${getOutputLanguageInstruction(locale)}
`
}

/**
 * Generate prompt for trend analysis
 */
export function generateTrendAnalysisPrompt(
  tests: TestDataForAnalysis[],
  athlete: AthleteProfileForAnalysis,
  overallTraining: TrainingContextForAnalysis | null,
  locale: PerformanceAnalysisLocale = 'en'
): string {
  const isSv = locale === 'sv'
  const months = tests.length > 1
    ? Math.ceil(
        (new Date(tests[tests.length - 1].date).getTime() - new Date(tests[0].date).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
      )
    : 1

  return `
## ${isSv ? 'Trendanalys för' : 'Trend analysis for'} ${athlete.name}

${getOutputLanguageInstruction(locale)}

### ${isSv ? 'Atletprofil' : 'Athlete profile'}
- ${isSv ? 'Ålder' : 'Age'}: ${athlete.age} ${isSv ? 'år' : 'years'}
- Sport: ${athlete.sport}
- ${isSv ? 'Erfarenhet' : 'Experience'}: ${athlete.experienceYears} ${isSv ? 'år' : 'years'}
- ${isSv ? 'Antal tester' : 'Number of tests'}: ${tests.length} ${isSv ? 'över' : 'over'} ${months} ${isSv ? 'månader' : 'months'}

### ${isSv ? 'Testhistorik' : 'Test history'}
${tests.map((t, i) => `
**Test ${i + 1} (${formatDate(t.date, locale)}):**
- VO2max: ${t.vo2max ?? 'N/A'} ml/kg/min
- ${isSv ? 'Aerob tröskel' : 'Aerobic threshold'}: HR ${t.aerobicThreshold?.hr ?? 'N/A'}, ${isSv ? 'Intensitet' : 'Intensity'} ${t.aerobicThreshold?.intensity ?? 'N/A'}
- ${isSv ? 'Anaerob tröskel' : 'Anaerobic threshold'}: HR ${t.anaerobicThreshold?.hr ?? 'N/A'}, ${isSv ? 'Intensitet' : 'Intensity'} ${t.anaerobicThreshold?.intensity ?? 'N/A'}
- MaxHR: ${t.maxHR}
${t.economyData.length > 0 ? `- ${isSv ? 'Ekonomi' : 'Economy'}: ${t.economyData[0].economy.toFixed(1)} ml/kg/km` : ''}
`).join('')}

${overallTraining ? `
### ${isSv ? 'Övergripande träningsdata' : 'Overall training data'}
${formatTrainingContext(overallTraining, locale)}
` : ''}

### ${isSv ? 'Instruktioner för trendanalys' : 'Trend analysis instructions'}

${isSv ? `Analysera den långsiktiga utvecklingen och identifiera:

1. **Sammanfattning** (2-3 meningar)
   - Övergripande bild av atletens utveckling

2. **Trendstatistik för varje parameter**
   - Första och senaste värde
   - Min, max, medelvärde
   - Standardavvikelse
   - Förändringshastighet per månad
   - Trend: IMPROVING, STABLE, DECLINING
   - R² (hur linjär trenden är)

3. **Nyckelfynd** (3-5 punkter)
   - Viktigaste observationerna i utvecklingen
   - Eventuella platåer eller genombrott

4. **Projektioner**
   - Baserat på nuvarande trend, var kommer atleten vara om 3/6/12 månader
   - Konfidensnivå för varje projektion

5. **Rekommendationer**
   - Strategiska råd för långsiktig utveckling`
    : `Analyze the long-term development and identify:

1. **Summary** (2-3 sentences)
   - Overall picture of the athlete's development

2. **Trend statistics for each parameter**
   - First and latest value
   - Min, max, average
   - Standard deviation
   - Rate of change per month
   - Trend: IMPROVING, STABLE, DECLINING
   - R² (how linear the trend is)

3. **Key findings** (3-5 bullets)
   - Most important observations in the development
   - Any plateaus or breakthroughs

4. **Projections**
   - Based on current trend, where the athlete may be in 3/6/12 months
   - Confidence level for each projection

5. **Recommendations**
   - Strategic advice for long-term development`}

${isSv ? 'Svara i JSON-format enligt denna struktur:' : 'Respond in JSON using this structure:'}
\`\`\`json
{
  "narrative": "${isSv ? 'Trendanalystext...' : 'Trend analysis text...'}",
  "executiveSummary": "${isSv ? 'Kort sammanfattning...' : 'Brief summary...'}",
  "keyFindings": [...],
  "strengths": [...],
  "developmentAreas": [...],
  "trends": {
    "vo2max": [{ "date": "...", "value": X, "testId": "..." }, ...],
    "aerobicThreshold": [...],
    "anaerobicThreshold": [...],
    "economy": [...]
  },
  "statistics": {
    "vo2max": {
      "dataPoints": X,
      "firstValue": X,
      "lastValue": X,
      "minValue": X,
      "maxValue": X,
      "averageValue": X,
      "standardDeviation": X,
      "rateOfChange": X,
      "trend": "IMPROVING|STABLE|DECLINING",
      "r2": X
    },
    ...
  },
  "projections": [
    {
      "metric": "VO2max",
      "currentValue": X,
      "projectedValue": Y,
      "projectionDate": "2024-06-01",
      "confidence": 0.7,
      "methodology": "${isSv ? 'Linjär extrapolering baserad på X datapunkter' : 'Linear extrapolation based on X data points'}"
    }
  ],
  "predictions": [...],
  "recommendations": [...]
}
\`\`\`

${getOutputLanguageInstruction(locale)}
`
}

/**
 * Generate prompt for training correlation analysis
 */
export function generateTrainingCorrelationPrompt(
  tests: TestDataForAnalysis[],
  trainingPeriods: TrainingContextForAnalysis[],
  athlete: AthleteProfileForAnalysis,
  locale: PerformanceAnalysisLocale = 'en'
): string {
  const isSv = locale === 'sv'
  return `
## ${isSv ? 'Träning-Prestationskorrelation för' : 'Training-performance correlation for'} ${athlete.name}

${getOutputLanguageInstruction(locale)}

### ${isSv ? 'Atletprofil' : 'Athlete profile'}
- Sport: ${athlete.sport}
- ${isSv ? 'Erfarenhet' : 'Experience'}: ${athlete.experienceYears} ${isSv ? 'år' : 'years'}

### ${isSv ? 'Data för analys' : 'Data for analysis'}
- ${isSv ? 'Antal tester' : 'Number of tests'}: ${tests.length}
- ${isSv ? 'Träningsperioder' : 'Training periods'}: ${trainingPeriods.length}

### ${isSv ? 'Testresultat' : 'Test results'}
${tests.map((t, i) => `Test ${i + 1} (${formatDate(t.date, locale)}): VO2max ${t.vo2max ?? 'N/A'}, LT2 HR ${t.anaerobicThreshold?.hr ?? 'N/A'}`).join('\n')}

### ${isSv ? 'Träningsperioder' : 'Training periods'}
${trainingPeriods.map((tp, i) => `
Period ${i + 1} (${tp.weekCount} ${isSv ? 'veckor' : 'weeks'}):
- ${isSv ? 'Sessioner' : 'Sessions'}: ${tp.totalSessions}
- ${isSv ? 'Volym' : 'Volume'}: ${tp.totalDistanceKm.toFixed(0)} km
- ${isSv ? 'TSS/vecka' : 'TSS/week'}: ${tp.avgWeeklyTSS.toFixed(0)}
- ${isSv ? 'Styrkepass' : 'Strength sessions'}: ${tp.strengthSessions}
`).join('')}

### ${isSv ? 'Instruktioner för korrelationsanalys' : 'Correlation analysis instructions'}

${isSv ? `Analysera sambandet mellan träning och prestation:

1. **Korrelationer**
   - Identifiera starka (>0.7), måttliga (0.3-0.7) och svaga (<0.3) samband
   - Träningsfaktorer: Z2-volym, intervallfrekvens, styrketräning, vila, etc.
   - Prestationsparametrar: VO2max, trösklar, ekonomi

2. **Effektivitetsinsikter**
   - Vilken träning ger bäst resultat för denna atlet
   - Vilken träning verkar inte ge önskad effekt
   - Rekommenderad zonfördelning

3. **Rekommendationer**
   - Optimera träningssammansättningen baserat på korrelationerna`
    : `Analyze the relationship between training and performance:

1. **Correlations**
   - Identify strong (>0.7), moderate (0.3-0.7), and weak (<0.3) relationships
   - Training factors: Z2 volume, interval frequency, strength training, rest, etc.
   - Performance parameters: VO2max, thresholds, economy

2. **Effectiveness insights**
   - Which training gives the best results for this athlete
   - Which training does not appear to produce the desired effect
   - Recommended zone distribution

3. **Recommendations**
   - Optimize training composition based on the correlations`}

${isSv ? 'Svara i JSON-format:' : 'Respond in JSON:'}
\`\`\`json
{
  "narrative": "...",
  "executiveSummary": "...",
  "keyFindings": [...],
  "correlations": [
    {
      "trainingFactor": "${isSv ? 'Zon 2-volym' : 'Zone 2 volume'}",
      "performanceMetric": "VO2max",
      "correlationStrength": 0.75,
      "significance": "SIGNIFICANT|MODERATE|WEAK|NONE",
      "direction": "POSITIVE|NEGATIVE",
      "interpretation": "..."
    }
  ],
  "effectivenessInsights": {
    "mostEffectiveTraining": ["..."],
    "leastEffectiveTraining": ["..."],
    "recommendedDistribution": {
      "zone1": 10,
      "zone2": 70,
      "zone3": 5,
      "zone4": 10,
      "zone5": 5
    },
    "methodology": "${isSv ? 'Baserat på X tester över Y månader' : 'Based on X tests over Y months'}"
  },
  "recommendations": [...]
}
\`\`\`

${getOutputLanguageInstruction(locale)}
`
}

// Helper functions

function getOutputLanguageInstruction(locale: PerformanceAnalysisLocale): string {
  return locale === 'sv'
    ? 'VIKTIGT SPRÅK: Skriv alla användarsynliga JSON-strängar på svenska.'
    : 'OUTPUT LANGUAGE: Write every user-facing JSON string in English, including narratives, titles, findings, recommendations, predictions, explanations, and methodology text.'
}

function getTestTypeLabel(testType: string, locale: PerformanceAnalysisLocale): string {
  const labels: Record<string, { en: string; sv: string }> = {
    RUNNING: { en: 'running test', sv: 'löptest' },
    CYCLING: { en: 'cycling test', sv: 'cykeltest' },
    SKIING: { en: 'skiing test', sv: 'skitest' },
  }
  return labels[testType]?.[locale] ?? (locale === 'sv' ? 'konditionstest' : 'fitness test')
}

function formatDate(dateStr: string, locale: PerformanceAnalysisLocale = 'en'): string {
  return new Date(dateStr).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
}

function formatTestData(test: TestDataForAnalysis, locale: PerformanceAnalysisLocale): string {
  const lines: string[] = []

  if (test.vo2max) lines.push(`- VO2max: ${test.vo2max} ml/kg/min`)
  lines.push(`- ${locale === 'sv' ? 'Max-puls' : 'Max heart rate'}: ${test.maxHR} bpm`)
  lines.push(`- ${locale === 'sv' ? 'Max-laktat' : 'Max lactate'}: ${test.maxLactate} mmol/L`)

  if (test.aerobicThreshold) {
    lines.push(`- ${locale === 'sv' ? 'Aerob tröskel' : 'Aerobic threshold'} (LT1):`)
    lines.push(`  - ${locale === 'sv' ? 'Puls' : 'Heart rate'}: ${test.aerobicThreshold.hr} bpm (${test.aerobicThreshold.percentOfMax.toFixed(0)}% ${locale === 'sv' ? 'av max' : 'of max'})`)
    lines.push(`  - ${locale === 'sv' ? 'Intensitet' : 'Intensity'}: ${formatIntensity(test.aerobicThreshold.intensity, test.testType)}`)
    lines.push(`  - ${locale === 'sv' ? 'Laktat' : 'Lactate'}: ${test.aerobicThreshold.lactate} mmol/L`)
  }

  if (test.anaerobicThreshold) {
    lines.push(`- ${locale === 'sv' ? 'Anaerob tröskel' : 'Anaerobic threshold'} (LT2):`)
    lines.push(`  - ${locale === 'sv' ? 'Puls' : 'Heart rate'}: ${test.anaerobicThreshold.hr} bpm (${test.anaerobicThreshold.percentOfMax.toFixed(0)}% ${locale === 'sv' ? 'av max' : 'of max'})`)
    lines.push(`  - ${locale === 'sv' ? 'Intensitet' : 'Intensity'}: ${formatIntensity(test.anaerobicThreshold.intensity, test.testType)}`)
    lines.push(`  - ${locale === 'sv' ? 'Laktat' : 'Lactate'}: ${test.anaerobicThreshold.lactate} mmol/L`)
  }

  if (test.economyData.length > 0) {
    const avgEconomy = test.economyData.reduce((sum, e) => sum + e.economy, 0) / test.economyData.length
    lines.push(`- ${locale === 'sv' ? 'Löpekonomi' : 'Running economy'}: ${avgEconomy.toFixed(1)} ml/kg/km (${locale === 'sv' ? 'medel' : 'average'})`)
  }

  if (test.cyclingData) {
    lines.push(`- FTP: ${test.cyclingData.ftp} W`)
    lines.push(`- W/kg: ${test.cyclingData.wattsPerKg.toFixed(2)}`)
  }

  if (test.lactateCurveType) {
    const curveLabels: Record<string, { en: string; sv: string }> = {
      FLAT: { en: 'Flat (strong base endurance)', sv: 'Platt (god grunduthållighet)' },
      MODERATE: { en: 'Moderate (balanced)', sv: 'Måttlig (balanserad)' },
      STEEP: { en: 'Steep (rapid lactate rise)', sv: 'Brant (snabb laktatstegring)' },
    }
    lines.push(`- ${locale === 'sv' ? 'Laktatkurva' : 'Lactate curve'}: ${curveLabels[test.lactateCurveType]?.[locale] ?? test.lactateCurveType}`)
  }

  if (test.athleteType) {
    const typeLabels: Record<string, { en: string; sv: string }> = {
      UTHALLIGHET: { en: 'Endurance type', sv: 'Uthållighetstyp' },
      SNABBHET: { en: 'Speed type', sv: 'Snabbhetstyp' },
      ALLROUND: { en: 'All-round type', sv: 'Allroundtyp' },
    }
    lines.push(`- ${locale === 'sv' ? 'Atlettyp' : 'Athlete type'}: ${typeLabels[test.athleteType]?.[locale] ?? test.athleteType}`)
  }

  return lines.join('\n')
}

function formatIntensity(value: number, testType: string): string {
  if (testType === 'RUNNING') return `${value.toFixed(1)} km/h`
  if (testType === 'CYCLING') return `${value.toFixed(0)} W`
  if (testType === 'SKIING') return `${value.toFixed(1)} min/km`
  return `${value}`
}

function formatTrainingContext(ctx: TrainingContextForAnalysis, locale: PerformanceAnalysisLocale): string {
  const lines: string[] = []

  lines.push(`- ${locale === 'sv' ? 'Period' : 'Period'}: ${ctx.weekCount} ${locale === 'sv' ? 'veckor' : 'weeks'}`)
  lines.push(`- ${locale === 'sv' ? 'Totala pass' : 'Total sessions'}: ${ctx.totalSessions}`)
  lines.push(`- ${locale === 'sv' ? 'Total distans' : 'Total distance'}: ${ctx.totalDistanceKm.toFixed(0)} km`)
  lines.push(`- ${locale === 'sv' ? 'Total tid' : 'Total time'}: ${ctx.totalDurationHours.toFixed(0)} ${locale === 'sv' ? 'timmar' : 'hours'}`)
  lines.push(`- ${locale === 'sv' ? 'Snitt TSS/vecka' : 'Average TSS/week'}: ${ctx.avgWeeklyTSS.toFixed(0)}`)
  lines.push(`- ${locale === 'sv' ? 'Snitt distans/vecka' : 'Average distance/week'}: ${ctx.avgWeeklyDistance.toFixed(0)} km`)

  lines.push(`- ${locale === 'sv' ? 'Styrkepass' : 'Strength sessions'}: ${ctx.strengthSessions}`)

  lines.push(`- ${locale === 'sv' ? 'Genomsnittlig readiness' : 'Average readiness'}: ${ctx.avgReadiness.toFixed(1)}/10`)
  lines.push(`- ${locale === 'sv' ? 'Snitt sömn' : 'Average sleep'}: ${ctx.avgSleepHours.toFixed(1)} h`)

  lines.push(`- ${locale === 'sv' ? 'ACWR snitt' : 'Average ACWR'}: ${ctx.avgACWR.toFixed(2)}`)
  lines.push(`- ${locale === 'sv' ? 'ACWR max' : 'Peak ACWR'}: ${ctx.peakACWR.toFixed(2)}`)
  lines.push(`- ${locale === 'sv' ? 'Dagar i riskzon (ACWR>1.5)' : 'Days in risk zone (ACWR>1.5)'}: ${ctx.daysInDangerZone}`)

  lines.push(`- ${locale === 'sv' ? 'Genomföringsgrad' : 'Completion rate'}: ${ctx.completionRate.toFixed(0)}%`)
  lines.push(`- ${locale === 'sv' ? 'Längsta träningsstreak' : 'Longest training streak'}: ${ctx.longestStreak} ${locale === 'sv' ? 'dagar' : 'days'}`)

  // Training type distribution
  const types = ctx.trainingTypeDistribution
  const total = types.easyRuns + types.longRuns + types.tempoRuns + types.intervals + types.recovery
  if (total > 0) {
    lines.push(`- ${locale === 'sv' ? 'Passfördelning' : 'Session distribution'}:`)
    if (types.easyRuns) lines.push(`  - ${locale === 'sv' ? 'Lugna pass' : 'Easy sessions'}: ${types.easyRuns} (${((types.easyRuns/total)*100).toFixed(0)}%)`)
    if (types.longRuns) lines.push(`  - ${locale === 'sv' ? 'Långpass' : 'Long runs'}: ${types.longRuns} (${((types.longRuns/total)*100).toFixed(0)}%)`)
    if (types.tempoRuns) lines.push(`  - ${locale === 'sv' ? 'Tempopass' : 'Tempo sessions'}: ${types.tempoRuns} (${((types.tempoRuns/total)*100).toFixed(0)}%)`)
    if (types.intervals) lines.push(`  - ${locale === 'sv' ? 'Intervaller' : 'Intervals'}: ${types.intervals} (${((types.intervals/total)*100).toFixed(0)}%)`)
  }

  return lines.join('\n')
}
