/**
 * AI Prompts for Deep Performance Analysis
 *
 * Swedish-language prompts for generating insightful performance analysis.
 */

import {
  TestDataForAnalysis,
  TrainingContextForAnalysis,
  AthleteProfileForAnalysis,
} from './types'
import { buildConstitutionPreamble } from '@/lib/ai/constitution'

/**
 * System prompt for all performance analysis
 */
export const PERFORMANCE_ANALYSIS_SYSTEM_PROMPT = `${buildConstitutionPreamble('analysis')}Du är en expert på prestationsanalys inom uthållighetsidrott med djup kunskap om:
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

/**
 * Generate prompt for single test analysis
 */
export function generateTestAnalysisPrompt(
  test: TestDataForAnalysis,
  previousTests: TestDataForAnalysis[],
  trainingContext: TrainingContextForAnalysis | null,
  athlete: AthleteProfileForAnalysis
): string {
  const testTypeLabel = getTestTypeLabel(test.testType)
  const hasTrainingData = trainingContext !== null

  return `
## Analysera ${testTypeLabel} för ${athlete.name}

### Atletprofil
- Ålder: ${athlete.age} år
- Kön: ${athlete.gender === 'MALE' ? 'Man' : 'Kvinna'}
- Sport: ${athlete.sport}
- Erfarenhet: ${athlete.experienceYears} år
- Träningstimmar/vecka: ${athlete.weeklyTrainingHours}
${athlete.primaryGoal ? `- Mål: ${athlete.primaryGoal}` : ''}

### Testresultat (${formatDate(test.date)})
${formatTestData(test)}

${previousTests.length > 0 ? `
### Tidigare tester (för kontext)
${previousTests.map((t, i) => `
**Test ${i + 1} (${formatDate(t.date)}):**
- VO2max: ${t.vo2max ?? 'Ej mätt'} ml/kg/min
- Aerob tröskel HR: ${t.aerobicThreshold?.hr ?? 'N/A'} bpm
- Anaerob tröskel HR: ${t.anaerobicThreshold?.hr ?? 'N/A'} bpm
`).join('')}
` : ''}

${hasTrainingData ? `
### Träningskontext (${trainingContext!.weekCount} veckor före test)
${formatTrainingContext(trainingContext!)}
` : ''}

### Instruktioner för analys

Ge en djupgående analys som inkluderar:

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
   - Förklara varför och hur varje rekommendation ska implementeras

Svara i JSON-format enligt denna struktur:
\`\`\`json
{
  "narrative": "Huvudanalystext...",
  "executiveSummary": "Kort sammanfattning...",
  "keyFindings": [
    {
      "category": "IMPROVEMENT|DECLINE|STRENGTH|WEAKNESS|INSIGHT|WARNING",
      "title": "Kort titel",
      "description": "Detaljerad beskrivning",
      "metric": "VO2max|LT1|LT2|etc",
      "significance": "HIGH|MEDIUM|LOW"
    }
  ],
  "strengths": ["Styrka 1", "Styrka 2"],
  "developmentAreas": ["Område 1", "Område 2"],
  "predictions": [
    {
      "type": "RACE_TIME|THRESHOLD|VO2MAX|FITNESS_PEAK",
      "title": "Prediktionstitel",
      "prediction": "Konkret prediktion",
      "confidence": 0.8,
      "basis": "Vad prediktionen baseras på",
      "timeframe": "När detta kan uppnås"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "category": "VOLUME|INTENSITY|RECOVERY|TECHNIQUE|STRENGTH|NUTRITION",
      "title": "Rekommendationstitel",
      "description": "Beskrivning",
      "rationale": "Varför denna rekommendation",
      "implementation": "Hur implementera",
      "expectedOutcome": "Förväntad effekt"
    }
  ]
}
\`\`\`
`
}

/**
 * Generate prompt for test comparison
 */
export function generateTestComparisonPrompt(
  current: TestDataForAnalysis,
  previous: TestDataForAnalysis,
  trainingBetween: TrainingContextForAnalysis | null,
  athlete: AthleteProfileForAnalysis
): string {
  const testTypeLabel = getTestTypeLabel(current.testType)
  const daysBetween = Math.floor(
    (new Date(current.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24)
  )

  return `
## Jämför ${testTypeLabel} för ${athlete.name}

### Atletprofil
- Ålder: ${athlete.age} år
- Sport: ${athlete.sport}
- Erfarenhet: ${athlete.experienceYears} år

### Tidigare test (${formatDate(previous.date)})
${formatTestData(previous)}

### Aktuellt test (${formatDate(current.date)})
${formatTestData(current)}

### Tidsperiod mellan tester
- Dagar: ${daysBetween}
- Veckor: ${Math.round(daysBetween / 7)}

${trainingBetween ? `
### Träning mellan testerna
${formatTrainingContext(trainingBetween)}
` : ''}

### Instruktioner för jämförelseanalys

Analysera förändringarna mellan testerna och identifiera:

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
   - Baserat på utvecklingen, vad bör prioriteras härnäst

Svara i JSON-format enligt denna struktur:
\`\`\`json
{
  "narrative": "Jämförelseanalystext...",
  "executiveSummary": "Kort sammanfattning...",
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
      "avgWeeklyVolume": "X km/vecka",
      "dominantTrainingType": "...",
      "zoneDistributionSummary": "80/20 polariserad etc."
    }
  },
  "correlationAnalysis": {
    "likelyContributors": [
      {
        "factor": "Ökad Z2-volym",
        "impact": "POSITIVE|NEGATIVE|NEUTRAL",
        "confidence": 0.8,
        "explanation": "..."
      }
    ],
    "unexplainedVariance": "Om något inte kan förklaras"
  },
  "predictions": [...],
  "recommendations": [...]
}
\`\`\`
`
}

/**
 * Generate prompt for trend analysis
 */
export function generateTrendAnalysisPrompt(
  tests: TestDataForAnalysis[],
  athlete: AthleteProfileForAnalysis,
  overallTraining: TrainingContextForAnalysis | null
): string {
  const months = tests.length > 1
    ? Math.ceil(
        (new Date(tests[tests.length - 1].date).getTime() - new Date(tests[0].date).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
      )
    : 1

  return `
## Trendanalys för ${athlete.name}

### Atletprofil
- Ålder: ${athlete.age} år
- Sport: ${athlete.sport}
- Erfarenhet: ${athlete.experienceYears} år
- Antal tester: ${tests.length} över ${months} månader

### Testhistorik
${tests.map((t, i) => `
**Test ${i + 1} (${formatDate(t.date)}):**
- VO2max: ${t.vo2max ?? 'N/A'} ml/kg/min
- Aerob tröskel: HR ${t.aerobicThreshold?.hr ?? 'N/A'}, Intensitet ${t.aerobicThreshold?.intensity ?? 'N/A'}
- Anaerob tröskel: HR ${t.anaerobicThreshold?.hr ?? 'N/A'}, Intensitet ${t.anaerobicThreshold?.intensity ?? 'N/A'}
- MaxHR: ${t.maxHR}
${t.economyData.length > 0 ? `- Ekonomi: ${t.economyData[0].economy.toFixed(1)} ml/kg/km` : ''}
`).join('')}

${overallTraining ? `
### Övergripande träningsdata
${formatTrainingContext(overallTraining)}
` : ''}

### Instruktioner för trendanalys

Analysera den långsiktiga utvecklingen och identifiera:

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
   - Strategiska råd för långsiktig utveckling

Svara i JSON-format enligt denna struktur:
\`\`\`json
{
  "narrative": "Trendanalystext...",
  "executiveSummary": "Kort sammanfattning...",
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
      "methodology": "Linjär extrapolering baserad på X datapunkter"
    }
  ],
  "predictions": [...],
  "recommendations": [...]
}
\`\`\`
`
}

/**
 * Generate prompt for training correlation analysis
 */
export function generateTrainingCorrelationPrompt(
  tests: TestDataForAnalysis[],
  trainingPeriods: TrainingContextForAnalysis[],
  athlete: AthleteProfileForAnalysis
): string {
  return `
## Träning-Prestationskorrelation för ${athlete.name}

### Atletprofil
- Sport: ${athlete.sport}
- Erfarenhet: ${athlete.experienceYears} år

### Data för analys
- Antal tester: ${tests.length}
- Träningsperioder: ${trainingPeriods.length}

### Testresultat
${tests.map((t, i) => `Test ${i + 1} (${formatDate(t.date)}): VO2max ${t.vo2max ?? 'N/A'}, LT2 HR ${t.anaerobicThreshold?.hr ?? 'N/A'}`).join('\n')}

### Träningsperioder
${trainingPeriods.map((tp, i) => `
Period ${i + 1} (${tp.weekCount} veckor):
- Sessioner: ${tp.totalSessions}
- Volym: ${tp.totalDistanceKm.toFixed(0)} km
- TSS/vecka: ${tp.avgWeeklyTSS.toFixed(0)}
- Styrkepass: ${tp.strengthSessions}
`).join('')}

### Instruktioner för korrelationsanalys

Analysera sambandet mellan träning och prestation:

1. **Korrelationer**
   - Identifiera starka (>0.7), måttliga (0.3-0.7) och svaga (<0.3) samband
   - Träningsfaktorer: Z2-volym, intervallfrekvens, styrketräning, vila, etc.
   - Prestationsparametrar: VO2max, trösklar, ekonomi

2. **Effektivitetsinsikter**
   - Vilken träning ger bäst resultat för denna atlet
   - Vilken träning verkar inte ge önskad effekt
   - Rekommenderad zonfördelning

3. **Rekommendationer**
   - Optimera träningssammansättningen baserat på korrelationerna

Svara i JSON-format:
\`\`\`json
{
  "narrative": "...",
  "executiveSummary": "...",
  "keyFindings": [...],
  "correlations": [
    {
      "trainingFactor": "Zon 2-volym",
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
    "methodology": "Baserat på X tester över Y månader"
  },
  "recommendations": [...]
}
\`\`\`
`
}

// Helper functions

function getTestTypeLabel(testType: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'löptest',
    CYCLING: 'cykeltest',
    SKIING: 'skitest',
  }
  return labels[testType] ?? 'konditionstest'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sv-SE')
}

function formatTestData(test: TestDataForAnalysis): string {
  const lines: string[] = []

  if (test.vo2max) lines.push(`- VO2max: ${test.vo2max} ml/kg/min`)
  lines.push(`- Max-puls: ${test.maxHR} bpm`)
  lines.push(`- Max-laktat: ${test.maxLactate} mmol/L`)

  if (test.aerobicThreshold) {
    lines.push(`- Aerob tröskel (LT1):`)
    lines.push(`  - Puls: ${test.aerobicThreshold.hr} bpm (${test.aerobicThreshold.percentOfMax.toFixed(0)}% av max)`)
    lines.push(`  - Intensitet: ${formatIntensity(test.aerobicThreshold.intensity, test.testType)}`)
    lines.push(`  - Laktat: ${test.aerobicThreshold.lactate} mmol/L`)
  }

  if (test.anaerobicThreshold) {
    lines.push(`- Anaerob tröskel (LT2):`)
    lines.push(`  - Puls: ${test.anaerobicThreshold.hr} bpm (${test.anaerobicThreshold.percentOfMax.toFixed(0)}% av max)`)
    lines.push(`  - Intensitet: ${formatIntensity(test.anaerobicThreshold.intensity, test.testType)}`)
    lines.push(`  - Laktat: ${test.anaerobicThreshold.lactate} mmol/L`)
  }

  if (test.economyData.length > 0) {
    const avgEconomy = test.economyData.reduce((sum, e) => sum + e.economy, 0) / test.economyData.length
    lines.push(`- Löpekonomi: ${avgEconomy.toFixed(1)} ml/kg/km (medel)`)
  }

  if (test.cyclingData) {
    lines.push(`- FTP: ${test.cyclingData.ftp} W`)
    lines.push(`- W/kg: ${test.cyclingData.wattsPerKg.toFixed(2)}`)
  }

  if (test.lactateCurveType) {
    const curveLabels: Record<string, string> = {
      FLAT: 'Platt (god grunduthållighet)',
      MODERATE: 'Måttlig (balanserad)',
      STEEP: 'Brant (snabb laktatstegring)',
    }
    lines.push(`- Laktatkurva: ${curveLabels[test.lactateCurveType]}`)
  }

  if (test.athleteType) {
    const typeLabels: Record<string, string> = {
      UTHALLIGHET: 'Uthållighetstyp',
      SNABBHET: 'Snabbhetstyp',
      ALLROUND: 'Allroundtyp',
    }
    lines.push(`- Atlettyp: ${typeLabels[test.athleteType]}`)
  }

  return lines.join('\n')
}

function formatIntensity(value: number, testType: string): string {
  if (testType === 'RUNNING') return `${value.toFixed(1)} km/h`
  if (testType === 'CYCLING') return `${value.toFixed(0)} W`
  if (testType === 'SKIING') return `${value.toFixed(1)} min/km`
  return `${value}`
}

function formatTrainingContext(ctx: TrainingContextForAnalysis): string {
  const lines: string[] = []

  lines.push(`- Period: ${ctx.weekCount} veckor`)
  lines.push(`- Totala pass: ${ctx.totalSessions}`)
  lines.push(`- Total distans: ${ctx.totalDistanceKm.toFixed(0)} km`)
  lines.push(`- Total tid: ${ctx.totalDurationHours.toFixed(0)} timmar`)
  lines.push(`- Snitt TSS/vecka: ${ctx.avgWeeklyTSS.toFixed(0)}`)
  lines.push(`- Snitt distans/vecka: ${ctx.avgWeeklyDistance.toFixed(0)} km`)

  lines.push(`- Styrkepass: ${ctx.strengthSessions}`)

  lines.push(`- Genomsnittlig readiness: ${ctx.avgReadiness.toFixed(1)}/10`)
  lines.push(`- Snitt sömn: ${ctx.avgSleepHours.toFixed(1)} h`)

  lines.push(`- ACWR snitt: ${ctx.avgACWR.toFixed(2)}`)
  lines.push(`- ACWR max: ${ctx.peakACWR.toFixed(2)}`)
  lines.push(`- Dagar i riskzon (ACWR>1.5): ${ctx.daysInDangerZone}`)

  lines.push(`- Genomföringsgrad: ${ctx.completionRate.toFixed(0)}%`)
  lines.push(`- Längsta träningsstreak: ${ctx.longestStreak} dagar`)

  // Training type distribution
  const types = ctx.trainingTypeDistribution
  const total = types.easyRuns + types.longRuns + types.tempoRuns + types.intervals + types.recovery
  if (total > 0) {
    lines.push(`- Passfördelning:`)
    if (types.easyRuns) lines.push(`  - Lugna pass: ${types.easyRuns} (${((types.easyRuns/total)*100).toFixed(0)}%)`)
    if (types.longRuns) lines.push(`  - Långpass: ${types.longRuns} (${((types.longRuns/total)*100).toFixed(0)}%)`)
    if (types.tempoRuns) lines.push(`  - Tempopass: ${types.tempoRuns} (${((types.tempoRuns/total)*100).toFixed(0)}%)`)
    if (types.intervals) lines.push(`  - Intervaller: ${types.intervals} (${((types.intervals/total)*100).toFixed(0)}%)`)
  }

  return lines.join('\n')
}
