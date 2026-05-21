// lib/calculations/interpretations.ts
// Interpretation engine for generating narrative text from test data

import { TestCalculations, TestStage, EconomyData, Threshold, Gender, Client, TestType } from '@/types'
import { evaluateVO2max } from './vo2max'
import { evaluateRunningEconomy } from './economy'

// ==================== TYPES ====================

type AppLocale = 'en' | 'sv'

function isSv(locale: AppLocale): boolean {
  return locale === 'sv'
}

export interface VO2maxInterpretation {
  classification: string
  percentile: string
  description: string
}

export interface LactateCurveInterpretation {
  curveType: 'FLAT' | 'MODERATE' | 'STEEP'
  description: string
  implication: string
}

export interface ThresholdInterpretation {
  aerobicDescription: string
  anaerobicDescription: string
  thresholdSpread: string
  individualThresholdNote?: string
}

export interface EconomyInterpretation {
  trend: 'IMPROVES' | 'STABLE' | 'DEGRADES'
  bestSpeed: number
  bestEconomy: number
  description: string
}

export interface TrainingFocus {
  primaryFocus: string
  primaryRationale: string
  secondaryFocus: string
  secondaryRationale: string
  followUpWeeks: number
}

export interface AthleteTypeClassification {
  type: 'UTHALLIGHET' | 'SNABBHET' | 'ALLROUND'
  typeName: string
  description: string
  suitableDistances: string[]
}

export interface PaceZone {
  name: string
  description: string
  paceMin: string  // "5:30"
  paceMax: string  // "6:00"
  zone?: string    // "Zon 1-2"
}

// ==================== VO2MAX INTERPRETATION ====================

export function generateVO2maxInterpretation(
  vo2max: number | null,
  age: number,
  gender: Gender,
  locale: AppLocale = 'en'
): VO2maxInterpretation | null {
  if (!vo2max || vo2max <= 0) {
    return null
  }

  const classification = evaluateVO2max(vo2max, age, gender, locale)

  // Determine percentile based on classification
  const percentileMap: Record<string, string> = isSv(locale)
    ? {
        'Överlägsen': 'topp 5%',
        'Utmärkt': 'topp 10%',
        'God': 'topp 25%',
        'Acceptabel': 'genomsnittlig',
        'Under genomsnitt': 'under genomsnitt',
        'Dålig': 'nedre 25%',
      }
    : {
        Superior: 'top 5%',
        Excellent: 'top 10%',
        Good: 'top 25%',
        Fair: 'average',
        'Below average': 'below average',
        Poor: 'bottom 25%',
      }

  const percentile = percentileMap[classification] || (isSv(locale) ? 'genomsnittlig' : 'average')
  const genderText = isSv(locale)
    ? gender === 'MALE' ? 'man' : 'kvinna'
    : gender === 'MALE' ? 'male' : 'female'

  // Generate description based on classification
  let description = ''
  if (isSv(locale)) {
    switch (classification) {
      case 'Överlägsen':
        description = `Ditt VO₂max på ${vo2max} ml/kg/min är exceptionellt högt för en ${genderText} i din åldersgrupp (${age} år). Detta placerar dig bland de ${percentile} av befolkningen och indikerar en mycket välutvecklad aerob kapacitet på elitnivå.`
        break
      case 'Utmärkt':
        description = `Ditt VO₂max på ${vo2max} ml/kg/min är utmärkt för en ${genderText} i din åldersgrupp (${age} år). Du tillhör ${percentile} av befolkningen, vilket visar på en stark aerob grund.`
        break
      case 'God':
        description = `Ditt VO₂max på ${vo2max} ml/kg/min är gott för en ${genderText} i din åldersgrupp (${age} år). Du ligger inom ${percentile}, vilket är en solid grund för uthållighetsträning.`
        break
      case 'Acceptabel':
        description = `Ditt VO₂max på ${vo2max} ml/kg/min är acceptabelt för en ${genderText} i din åldersgrupp (${age} år). Det finns potential för förbättring genom strukturerad konditionsträning.`
        break
      case 'Under genomsnitt':
        description = `Ditt VO₂max på ${vo2max} ml/kg/min ligger under genomsnittet för en ${genderText} i din åldersgrupp (${age} år). Med rätt träning kan du göra betydande framsteg.`
        break
      default:
        description = `Ditt VO₂max på ${vo2max} ml/kg/min indikerar utvecklingspotential. Fokuserad aerob träning kan ge stora förbättringar.`
    }
  } else {
    switch (classification) {
      case 'Superior':
        description = `Your VO₂max of ${vo2max} ml/kg/min is exceptionally high for a ${genderText} in your age group (${age} years). This places you in the ${percentile} of the population and indicates elite-level aerobic capacity.`
        break
      case 'Excellent':
        description = `Your VO₂max of ${vo2max} ml/kg/min is excellent for a ${genderText} in your age group (${age} years). You are in the ${percentile} of the population, showing a strong aerobic foundation.`
        break
      case 'Good':
        description = `Your VO₂max of ${vo2max} ml/kg/min is good for a ${genderText} in your age group (${age} years). This is a solid foundation for endurance training.`
        break
      case 'Fair':
        description = `Your VO₂max of ${vo2max} ml/kg/min is fair for a ${genderText} in your age group (${age} years). Structured endurance training can improve it.`
        break
      case 'Below average':
        description = `Your VO₂max of ${vo2max} ml/kg/min is below average for a ${genderText} in your age group (${age} years). With the right training, you can make meaningful progress.`
        break
      default:
        description = `Your VO₂max of ${vo2max} ml/kg/min indicates development potential. Focused aerobic training can drive meaningful improvements.`
    }
  }

  return { classification, percentile, description }
}

// ==================== LACTATE CURVE INTERPRETATION ====================

export function generateLactateCurveInterpretation(
  stages: TestStage[],
  maxLactate: number,
  locale: AppLocale = 'en'
): LactateCurveInterpretation {
  if (stages.length < 3) {
    return {
      curveType: 'MODERATE',
      description: isSv(locale)
        ? 'Otillräckligt antal mätpunkter för kurveanalys.'
        : 'Not enough data points for curve analysis.',
      implication: ''
    }
  }

  // Sort stages by sequence
  const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence)

  // Calculate lactate rise rate (mmol/L per stage)
  const firstLactate = sortedStages[0].lactate
  const lastLactate = sortedStages[sortedStages.length - 1].lactate
  const lactateRange = lastLactate - firstLactate
  const stageCount = sortedStages.length - 1

  // Calculate baseline (first 2-3 stages average)
  const baselineStages = sortedStages.slice(0, Math.min(3, sortedStages.length))
  const baselineAvg = baselineStages.reduce((sum, s) => sum + s.lactate, 0) / baselineStages.length

  // Determine curve type based on rise pattern
  const risePerStage = lactateRange / stageCount

  let curveType: 'FLAT' | 'MODERATE' | 'STEEP'
  let description: string
  let implication: string

  if (baselineAvg < 2.0 && risePerStage < 0.8) {
    curveType = 'FLAT'
    description = isSv(locale)
      ? 'Din laktatkurva är relativt platt, vilket är typiskt för vältränade uthållighetsidrottare. Laktatet stiger gradvis och kontrollerat genom testet.'
      : 'Your lactate curve is relatively flat, which is typical for well-trained endurance athletes. Lactate rises gradually and in a controlled way through the test.'
    implication = isSv(locale)
      ? 'Detta indikerar god aerob kapacitet och effektiv laktatclearance. Du kan sannolikt upprätthålla höga intensiteter längre.'
      : 'This indicates good aerobic capacity and efficient lactate clearance. You can likely sustain higher intensities for longer.'
  } else if (risePerStage > 1.5 || (lastLactate - baselineAvg > 8)) {
    curveType = 'STEEP'
    description = isSv(locale)
      ? 'Din laktatkurva stiger brant vid högre intensiteter, vilket indikerar en kraftig anaerob respons.'
      : 'Your lactate curve rises steeply at higher intensities, indicating a strong anaerobic response.'
    implication = isSv(locale)
      ? 'Detta kan tyda på stark anaerob kapacitet men även utvecklingspotential i den aeroba basen. Fokus på lågintensiv volymträning kan jämna ut kurvan.'
      : 'This may indicate strong anaerobic capacity, but also development potential in the aerobic base. Low-intensity volume can help smooth the curve.'
  } else {
    curveType = 'MODERATE'
    description = isSv(locale)
      ? 'Din laktatkurva visar en normal stegring med ökande intensitet.'
      : 'Your lactate curve shows a normal rise as intensity increases.'
    implication = isSv(locale)
      ? 'Detta är ett balanserat mönster som ger goda förutsättningar för både uthållighet och högintensiv träning.'
      : 'This balanced pattern supports both endurance work and high-intensity training.'
  }

  // Add note about exceptional max lactate
  if (maxLactate > 15) {
    description += isSv(locale)
      ? ` Det exceptionellt höga maximala laktatvärdet (${maxLactate.toFixed(1)} mmol/L) visar på utomordentlig anaerob kapacitet och buffertförmåga.`
      : ` The exceptionally high maximum lactate value (${maxLactate.toFixed(1)} mmol/L) shows outstanding anaerobic capacity and buffering ability.`
  } else if (maxLactate > 12) {
    description += isSv(locale)
      ? ` Det höga maximala laktatvärdet (${maxLactate.toFixed(1)} mmol/L) indikerar god anaerob kapacitet.`
      : ` The high maximum lactate value (${maxLactate.toFixed(1)} mmol/L) indicates good anaerobic capacity.`
  }

  return { curveType, description, implication }
}

// ==================== THRESHOLD INTERPRETATION ====================

export function generateThresholdInterpretation(
  aerobicThreshold: Threshold | null,
  anaerobicThreshold: Threshold | null,
  maxHR: number,
  maxLactate: number,
  locale: AppLocale = 'en'
): ThresholdInterpretation {
  let aerobicDescription = ''
  let anaerobicDescription = ''
  let thresholdSpread = ''
  let individualThresholdNote: string | undefined

  // Aerobic threshold interpretation
  if (aerobicThreshold) {
    const aerobicPercent = aerobicThreshold.percentOfMax
    const unitLabel = aerobicThreshold.unit === 'km/h' ? 'km/h' :
                      aerobicThreshold.unit === 'watt' ? 'watt' : 'min/km'

    aerobicDescription = isSv(locale)
      ? `Din aeroba tröskel ligger vid ${aerobicThreshold.heartRate} slag/min (${aerobicPercent}% av max) och ${aerobicThreshold.value} ${unitLabel}.`
      : `Your aerobic threshold is at ${aerobicThreshold.heartRate} bpm (${aerobicPercent}% of max) and ${aerobicThreshold.value} ${unitLabel}.`

    if (aerobicPercent < 70) {
      aerobicDescription += isSv(locale)
        ? ' Detta är relativt lågt och indikerar potential för förbättring av den aeroba basen.'
        : ' This is relatively low and indicates room to improve the aerobic base.'
    } else if (aerobicPercent > 80) {
      aerobicDescription += isSv(locale)
        ? ' Detta är högt, vilket tyder på god aerob kapacitet.'
        : ' This is high and suggests good aerobic capacity.'
    }
  }

  // Anaerobic threshold interpretation
  if (anaerobicThreshold) {
    const anaerobicPercent = anaerobicThreshold.percentOfMax
    const unitLabel = anaerobicThreshold.unit === 'km/h' ? 'km/h' :
                      anaerobicThreshold.unit === 'watt' ? 'watt' : 'min/km'

    anaerobicDescription = isSv(locale)
      ? `Din anaeroba tröskel ligger vid ${anaerobicThreshold.heartRate} slag/min (${anaerobicPercent}% av max) och ${anaerobicThreshold.value} ${unitLabel}.`
      : `Your anaerobic threshold is at ${anaerobicThreshold.heartRate} bpm (${anaerobicPercent}% of max) and ${anaerobicThreshold.value} ${unitLabel}.`

    if (anaerobicPercent > 90) {
      anaerobicDescription += isSv(locale)
        ? ' Den höga tröskelpositioneringen indikerar mycket god uthållighetskapacitet.'
        : ' The high threshold position indicates very good endurance capacity.'
    } else if (anaerobicPercent > 85) {
      anaerobicDescription += isSv(locale)
        ? ' Detta är en god tröskelposition för uthållighetsträning.'
        : ' This is a good threshold position for endurance training.'
    } else if (anaerobicPercent < 80) {
      anaerobicDescription += isSv(locale)
        ? ' Det finns potential att höja tröskeln genom strukturerad tröskelträning.'
        : ' There is potential to raise the threshold through structured threshold training.'
    }

    // Check for individual threshold (not standard 4 mmol/L)
    if (anaerobicThreshold.lactate && Math.abs(anaerobicThreshold.lactate - 4.0) > 1.0) {
      individualThresholdNote = isSv(locale)
        ? `Din individuella anaeroba tröskel ligger vid ${anaerobicThreshold.lactate?.toFixed(1)} mmol/L, vilket avviker från standardvärdet 4 mmol/L. `
        : `Your individual anaerobic threshold is at ${anaerobicThreshold.lactate?.toFixed(1)} mmol/L, which differs from the standard 4 mmol/L value. `
      if (anaerobicThreshold.lactate > 5) {
        individualThresholdNote += isSv(locale)
          ? 'Detta indikerar hög laktattolerans och god buffertkapacitet.'
          : 'This indicates high lactate tolerance and good buffering capacity.'
      } else {
        individualThresholdNote += isSv(locale)
          ? 'Detta kan tyda på en mer konservativ tröskel, vilket kan vara fördelaktigt för längre distanser.'
          : 'This may indicate a more conservative threshold, which can be beneficial for longer distances.'
      }
    }
  }

  // Threshold spread analysis
  if (aerobicThreshold && anaerobicThreshold) {
    const spreadHR = anaerobicThreshold.heartRate - aerobicThreshold.heartRate
    const spreadPercent = anaerobicThreshold.percentOfMax - aerobicThreshold.percentOfMax

    if (spreadPercent > 15) {
      thresholdSpread = isSv(locale)
        ? `Zonen mellan dina trösklar (${spreadHR} slag/min, ${spreadPercent.toFixed(0)} procentenheter) är bred, vilket ger ett stort träningsfönster för effektiv uthållighetsträning.`
        : `The zone between your thresholds (${spreadHR} bpm, ${spreadPercent.toFixed(0)} percentage points) is wide, giving you a large training window for effective endurance work.`
    } else if (spreadPercent < 10) {
      thresholdSpread = isSv(locale)
        ? `Zonen mellan dina trösklar (${spreadHR} slag/min, ${spreadPercent.toFixed(0)} procentenheter) är smal. Fokus bör ligga på att bredda denna zon genom varierad intensitetsträning.`
        : `The zone between your thresholds (${spreadHR} bpm, ${spreadPercent.toFixed(0)} percentage points) is narrow. Focus should be on widening this zone through varied intensity training.`
    } else {
      thresholdSpread = isSv(locale)
        ? `Zonen mellan dina trösklar (${spreadHR} slag/min, ${spreadPercent.toFixed(0)} procentenheter) är normal och ger goda förutsättningar för progressiv träning.`
        : `The zone between your thresholds (${spreadHR} bpm, ${spreadPercent.toFixed(0)} percentage points) is normal and provides good conditions for progressive training.`
    }
  }

  return { aerobicDescription, anaerobicDescription, thresholdSpread, individualThresholdNote }
}

// ==================== ECONOMY INTERPRETATION ====================

export function generateEconomyInterpretation(
  economyData: EconomyData[] | undefined,
  gender: Gender,
  locale: AppLocale = 'en'
): EconomyInterpretation | null {
  if (!economyData || economyData.length < 2) {
    return null
  }

  // Sort by speed
  const sorted = [...economyData].filter(e => e.speed).sort((a, b) => (a.speed || 0) - (b.speed || 0))

  if (sorted.length < 2) return null

  // Find best economy
  const bestEntry = sorted.reduce((best, current) =>
    current.economy < best.economy ? current : best, sorted[0])

  // Analyze trend: does economy improve or degrade with speed?
  const firstHalfAvg = sorted.slice(0, Math.ceil(sorted.length / 2))
    .reduce((sum, e) => sum + e.economy, 0) / Math.ceil(sorted.length / 2)
  const secondHalfAvg = sorted.slice(Math.floor(sorted.length / 2))
    .reduce((sum, e) => sum + e.economy, 0) / (sorted.length - Math.floor(sorted.length / 2))

  const difference = secondHalfAvg - firstHalfAvg

  let trend: 'IMPROVES' | 'STABLE' | 'DEGRADES'
  let description: string

  if (difference < -5) {
    trend = 'IMPROVES'
    description = isSv(locale)
      ? `Din löpekonomi förbättras vid högre hastigheter, med bäst effektivitet vid ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km). Detta är positivt för prestationen och tyder på god anpassning till snabbare tempo.`
      : `Your running economy improves at higher speeds, with best efficiency at ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km). This is positive for performance and suggests good adaptation to faster paces.`
  } else if (difference > 10) {
    trend = 'DEGRADES'
    description = isSv(locale)
      ? `Din löpekonomi försämras något vid högre hastigheter. Bäst effektivitet noteras vid ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km). Teknisk löpträning vid högre fart kan förbättra detta.`
      : `Your running economy worsens slightly at higher speeds. Best efficiency is seen at ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km). Technical running work at faster paces may improve this.`
  } else {
    trend = 'STABLE'
    description = isSv(locale)
      ? `Din löpekonomi är relativt stabil över olika hastigheter, med bäst effektivitet vid ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km).`
      : `Your running economy is relatively stable across speeds, with best efficiency at ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km).`
  }

  // Add evaluation context
  const evaluation = evaluateRunningEconomy(bestEntry.economy, gender, locale)
  description += isSv(locale)
    ? ` Din bästa ekonomi klassificeras som "${evaluation}".`
    : ` Your best economy is classified as "${evaluation}".`

  return {
    trend,
    bestSpeed: bestEntry.speed || 0,
    bestEconomy: bestEntry.economy,
    description
  }
}

// ==================== STRENGTHS DETECTION ====================

export function detectStrengths(
  calculations: TestCalculations,
  client: Client,
  testType: TestType = 'RUNNING',
  locale: AppLocale = 'en'
): string[] {
  const strengths: string[] = []
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // VO2max check
  if (calculations.vo2max && calculations.vo2max > 0) {
    const vo2eval = evaluateVO2max(calculations.vo2max, age, client.gender, locale)
    const strongLabels = isSv(locale) ? ['Överlägsen', 'Utmärkt', 'God'] : ['Superior', 'Excellent', 'Good']
    if (strongLabels.includes(vo2eval)) {
      strengths.push(isSv(locale)
        ? `${vo2eval} syreupptagningsförmåga (VO₂max ${calculations.vo2max} ml/kg/min)`
        : `${vo2eval} oxygen uptake capacity (VO₂max ${calculations.vo2max} ml/kg/min)`)
    }
  }

  // Max lactate check (anaerobic capacity)
  if (calculations.maxLactate > 15) {
    strengths.push(isSv(locale)
      ? `Exceptionell anaerob kapacitet (maxlaktat ${calculations.maxLactate.toFixed(1)} mmol/L)`
      : `Exceptional anaerobic capacity (max lactate ${calculations.maxLactate.toFixed(1)} mmol/L)`)
  } else if (calculations.maxLactate > 12) {
    strengths.push(isSv(locale)
      ? `Hög anaerob kapacitet (maxlaktat ${calculations.maxLactate.toFixed(1)} mmol/L)`
      : `High anaerobic capacity (max lactate ${calculations.maxLactate.toFixed(1)} mmol/L)`)
  }

  // Threshold position check
  if (calculations.anaerobicThreshold) {
    if (calculations.anaerobicThreshold.percentOfMax > 88) {
      strengths.push(isSv(locale)
        ? `Mycket hög tröskelposition (${calculations.anaerobicThreshold.percentOfMax}% av maxpuls)`
        : `Very high threshold position (${calculations.anaerobicThreshold.percentOfMax}% of max HR)`)
    } else if (calculations.anaerobicThreshold.percentOfMax > 85) {
      strengths.push(isSv(locale)
        ? `Hög tröskelposition (${calculations.anaerobicThreshold.percentOfMax}% av maxpuls)`
        : `High threshold position (${calculations.anaerobicThreshold.percentOfMax}% of max HR)`)
    }
  }

  // Running economy check
  if (testType === 'RUNNING' && calculations.economyData && calculations.economyData.length > 0) {
    const bestEconomy = Math.min(...calculations.economyData.map(e => e.economy))
    const eval_ = evaluateRunningEconomy(bestEconomy, client.gender, locale)
    const strongEconomyLabels = isSv(locale) ? ['Utmärkt', 'Mycket god'] : ['Excellent', 'Very good']
    if (strongEconomyLabels.includes(eval_)) {
      strengths.push(isSv(locale)
        ? `${eval_} löpekonomi (${bestEconomy} ml/kg/km)`
        : `${eval_} running economy (${bestEconomy} ml/kg/km)`)
    }

    // Check if economy improves at speed
    const sorted = [...calculations.economyData].filter(e => e.speed).sort((a, b) => (a.speed || 0) - (b.speed || 0))
    if (sorted.length >= 3) {
      const lastEconomy = sorted[sorted.length - 1].economy
      const firstEconomy = sorted[0].economy
      if (lastEconomy < firstEconomy - 5) {
        strengths.push(isSv(locale)
          ? 'Löpekonomin förbättras vid högre hastigheter'
          : 'Running economy improves at higher speeds')
      }
    }
  }

  // Cycling specific
  if (testType === 'CYCLING' && calculations.cyclingData) {
    if (calculations.cyclingData.wattsPerKg > 4.0) {
      strengths.push(isSv(locale)
        ? `Utmärkt effekt/vikt-förhållande (${calculations.cyclingData.wattsPerKg} W/kg)`
        : `Excellent power-to-weight ratio (${calculations.cyclingData.wattsPerKg} W/kg)`)
    } else if (calculations.cyclingData.wattsPerKg > 3.5) {
      strengths.push(isSv(locale)
        ? `God effekt/vikt-förhållande (${calculations.cyclingData.wattsPerKg} W/kg)`
        : `Good power-to-weight ratio (${calculations.cyclingData.wattsPerKg} W/kg)`)
    }
  }

  // Limit to top 4 strengths
  return strengths.slice(0, 4)
}

// ==================== WEAKNESSES DETECTION ====================

export function detectWeaknesses(
  calculations: TestCalculations,
  client: Client,
  testType: TestType = 'RUNNING',
  locale: AppLocale = 'en'
): string[] {
  const weaknesses: string[] = []
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // VO2max check
  if (calculations.vo2max && calculations.vo2max > 0) {
    const vo2eval = evaluateVO2max(calculations.vo2max, age, client.gender, locale)
    const weakLabels = isSv(locale) ? ['Under genomsnitt', 'Dålig'] : ['Below average', 'Poor']
    if (weakLabels.includes(vo2eval)) {
      weaknesses.push(isSv(locale) ? 'VO₂max har utvecklingspotential' : 'VO₂max has development potential')
    }
  }

  // Threshold position check
  if (calculations.anaerobicThreshold) {
    if (calculations.anaerobicThreshold.percentOfMax < 80) {
      weaknesses.push(isSv(locale)
        ? 'Anaeroba tröskeln kan höjas genom strukturerad träning'
        : 'The anaerobic threshold can be raised through structured training')
    }
  }

  // Running economy check
  if (testType === 'RUNNING' && calculations.economyData && calculations.economyData.length > 0) {
    const avgEconomy = calculations.economyData.reduce((sum, e) => sum + e.economy, 0) / calculations.economyData.length
    if (avgEconomy > 220) {
      weaknesses.push(isSv(locale)
        ? 'Löpekonomin kan förbättras med teknikträning'
        : 'Running economy can improve with technique work')
    }

    // Check if economy degrades at speed
    const sorted = [...calculations.economyData].filter(e => e.speed).sort((a, b) => (a.speed || 0) - (b.speed || 0))
    if (sorted.length >= 3) {
      const lastEconomy = sorted[sorted.length - 1].economy
      const firstEconomy = sorted[0].economy
      if (lastEconomy > firstEconomy + 15) {
        weaknesses.push(isSv(locale)
          ? 'Löpekonomin försämras vid högre hastigheter'
          : 'Running economy worsens at higher speeds')
      }
    }
  }

  // Threshold spread check
  if (calculations.aerobicThreshold && calculations.anaerobicThreshold) {
    const spreadPercent = calculations.anaerobicThreshold.percentOfMax - calculations.aerobicThreshold.percentOfMax
    if (spreadPercent < 10) {
      weaknesses.push(isSv(locale)
        ? 'Smal zon mellan trösklarna - kan bredgas med varierad träning'
        : 'Narrow zone between thresholds - can be widened with varied training')
    }
  }

  // Low max lactate (may indicate limited anaerobic development)
  if (calculations.maxLactate < 8 && calculations.maxLactate > 0) {
    weaknesses.push(isSv(locale) ? 'Anaerob kapacitet kan utvecklas' : 'Anaerobic capacity can be developed')
  }

  // Limit to top 3 weaknesses
  return weaknesses.slice(0, 3)
}

// ==================== TRAINING FOCUS ====================

export function generateTrainingFocus(
  calculations: TestCalculations,
  client: Client,
  testType: TestType = 'RUNNING',
  locale: AppLocale = 'en'
): TrainingFocus {
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  let primaryFocus = ''
  let primaryRationale = ''
  let secondaryFocus = ''
  let secondaryRationale = ''
  let followUpWeeks = 10

  // Determine primary focus based on test results
  const vo2eval = calculations.vo2max ? evaluateVO2max(calculations.vo2max, age, client.gender, locale) : null
  const thresholdPercent = calculations.anaerobicThreshold?.percentOfMax || 0
  const hasGoodEconomy = calculations.economyData &&
    Math.min(...calculations.economyData.map(e => e.economy)) < 210

  // Priority logic
  if (vo2eval && (isSv(locale) ? ['Under genomsnitt', 'Dålig'] : ['Below average', 'Poor']).includes(vo2eval)) {
    primaryFocus = isSv(locale) ? 'VO₂max-utveckling' : 'VO₂max development'
    primaryRationale = isSv(locale) ? 'För att bygga en starkare aerob grund' : 'To build a stronger aerobic foundation'
    secondaryFocus = isSv(locale) ? 'Aerob basträning' : 'Aerobic base training'
    secondaryRationale = isSv(locale) ? 'För att stödja syreupptagningsförmågan' : 'To support oxygen uptake capacity'
    followUpWeeks = 12
  } else if (thresholdPercent < 80) {
    primaryFocus = isSv(locale) ? 'Tröskelträning' : 'Threshold training'
    primaryRationale = isSv(locale) ? 'För att höja din anaeroba tröskel' : 'To raise your anaerobic threshold'
    secondaryFocus = isSv(locale) ? 'Aerob basträning' : 'Aerobic base training'
    secondaryRationale = isSv(locale) ? 'För snabbare återhämtning mellan hårda pass' : 'For faster recovery between hard sessions'
    followUpWeeks = 10
  } else if (!hasGoodEconomy && testType === 'RUNNING') {
    primaryFocus = isSv(locale) ? 'Löpteknik och ekonomi' : 'Running technique and economy'
    primaryRationale = isSv(locale) ? 'För att förbättra effektiviteten vid löpning' : 'To improve running efficiency'
    secondaryFocus = isSv(locale) ? 'Styrketräning' : 'Strength training'
    secondaryRationale = isSv(locale) ? 'För bättre löpstabilitet och kraftutveckling' : 'For better running stability and power development'
    followUpWeeks = 8
  } else if (calculations.maxLactate < 10) {
    primaryFocus = isSv(locale) ? 'Intensiv intervallträning' : 'High-intensity interval training'
    primaryRationale = isSv(locale) ? 'För att utveckla anaerob kapacitet' : 'To develop anaerobic capacity'
    secondaryFocus = isSv(locale) ? 'Tröskelträning' : 'Threshold training'
    secondaryRationale = isSv(locale) ? 'För att bibehålla och höja tröskeln' : 'To maintain and raise the threshold'
    followUpWeeks = 8
  } else {
    // Already well-developed - maintain and fine-tune
    primaryFocus = isSv(locale) ? 'Bibehållande träning' : 'Maintenance training'
    primaryRationale = isSv(locale) ? 'För att upprätthålla din goda fysiska form' : 'To maintain your current fitness'
    secondaryFocus = isSv(locale) ? 'Periodiserad variation' : 'Periodized variation'
    secondaryRationale = isSv(locale) ? 'För fortsatt utveckling och skadeprevention' : 'For continued development and injury prevention'
    followUpWeeks = 12
  }

  return {
    primaryFocus,
    primaryRationale,
    secondaryFocus,
    secondaryRationale,
    followUpWeeks
  }
}

// ==================== ATHLETE TYPE CLASSIFICATION ====================

export function classifyAthleteType(
  calculations: TestCalculations,
  stages: TestStage[],
  locale: AppLocale = 'en'
): AthleteTypeClassification {
  // Analyze lactate curve
  const curveInfo = generateLactateCurveInterpretation(stages, calculations.maxLactate, locale)

  // Scoring system
  let enduranceScore = 0
  let speedScore = 0

  // VO2max contribution
  if (calculations.vo2max) {
    if (calculations.vo2max >= 55) enduranceScore += 2
    else if (calculations.vo2max >= 50) enduranceScore += 1
  }

  // Lactate curve contribution
  if (curveInfo.curveType === 'FLAT') {
    enduranceScore += 2
  } else if (curveInfo.curveType === 'STEEP') {
    speedScore += 2
  }

  // Max lactate contribution
  if (calculations.maxLactate > 15) {
    speedScore += 2
  } else if (calculations.maxLactate > 12) {
    speedScore += 1
  } else if (calculations.maxLactate < 8) {
    enduranceScore += 1
  }

  // Threshold position contribution
  if (calculations.anaerobicThreshold) {
    if (calculations.anaerobicThreshold.percentOfMax > 88) {
      enduranceScore += 2
    } else if (calculations.anaerobicThreshold.percentOfMax > 85) {
      enduranceScore += 1
    } else if (calculations.anaerobicThreshold.percentOfMax < 80) {
      speedScore += 1
    }
  }

  // Determine type
  let type: 'UTHALLIGHET' | 'SNABBHET' | 'ALLROUND'
  let typeName: string
  let description: string
  let suitableDistances: string[]

  if (enduranceScore >= speedScore + 2) {
    type = 'UTHALLIGHET'
    typeName = isSv(locale) ? 'Uthållighetstyp' : 'Endurance type'
    description = isSv(locale)
      ? 'Din profil tyder på god uthållighetskapacitet med effektiv aerob energiomsättning. Du är väl lämpad för längre distanser där uthållighet är avgörande.'
      : 'Your profile suggests good endurance capacity with efficient aerobic energy use. You are well suited to longer distances where endurance is decisive.'
    suitableDistances = isSv(locale) ? ['10 km', 'Halvmaraton', 'Maraton', 'Ultralopp'] : ['10K', 'Half marathon', 'Marathon', 'Ultra']
  } else if (speedScore >= enduranceScore + 2) {
    type = 'SNABBHET'
    typeName = isSv(locale) ? 'Snabbhetstyp' : 'Speed type'
    description = isSv(locale)
      ? 'Din profil visar stark anaerob kapacitet och god laktattolerans. Du har naturliga förutsättningar för kortare, mer intensiva distanser.'
      : 'Your profile shows strong anaerobic capacity and good lactate tolerance. You have natural strengths for shorter, more intense distances.'
    suitableDistances = ['800 m', '1500 m', '3000 m', '5 km']
  } else {
    type = 'ALLROUND'
    typeName = isSv(locale) ? 'Allroundtyp' : 'All-round type'
    description = isSv(locale)
      ? 'Din profil visar en balanserad mix av aeroba och anaeroba egenskaper. Du har goda förutsättningar för ett brett spektrum av distanser.'
      : 'Your profile shows a balanced mix of aerobic and anaerobic qualities. You have good prerequisites for a wide range of distances.'
    suitableDistances = isSv(locale) ? ['5 km', '10 km', 'Halvmaraton'] : ['5K', '10K', 'Half marathon']
  }

  return { type, typeName, description, suitableDistances }
}

// ==================== PACE ZONES ====================

export function generatePaceZones(
  calculations: TestCalculations,
  testType: TestType,
  locale: AppLocale = 'en'
): PaceZone[] {
  if (testType !== 'RUNNING') return []

  const zones: PaceZone[] = []

  // Need threshold data
  if (!calculations.anaerobicThreshold || !calculations.aerobicThreshold) {
    return []
  }

  const lt2Speed = calculations.anaerobicThreshold.value
  const lt1Speed = calculations.aerobicThreshold.value

  // Helper to convert km/h to min/km pace string
  const speedToPace = (speed: number): string => {
    if (speed <= 0) return '-'
    const minPerKm = 60 / speed
    const minutes = Math.floor(minPerKm)
    const seconds = Math.round((minPerKm - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Zone 1-2: Easy (below LT1)
  const easyMaxSpeed = lt1Speed * 0.95
  const easyMinSpeed = lt1Speed * 0.75
  zones.push({
    name: isSv(locale) ? 'Lättlöpning' : 'Easy running',
    description: isSv(locale)
      ? 'Bekvämt samtalstempo för återhämtning och grundträning'
      : 'Comfortable conversational pace for recovery and base training',
    paceMin: speedToPace(easyMaxSpeed),
    paceMax: speedToPace(easyMinSpeed),
    zone: isSv(locale) ? 'Zon 1-2' : 'Zone 1-2'
  })

  // Zone 2-3: Long run (around LT1)
  const longMaxSpeed = lt1Speed * 1.05
  const longMinSpeed = lt1Speed * 0.90
  zones.push({
    name: isSv(locale) ? 'Långpass' : 'Long run',
    description: isSv(locale)
      ? 'Måttlig intensitet för längre distanser'
      : 'Moderate intensity for longer distances',
    paceMin: speedToPace(longMaxSpeed),
    paceMax: speedToPace(longMinSpeed),
    zone: isSv(locale) ? 'Zon 2-3' : 'Zone 2-3'
  })

  // Zone 4: Threshold (at LT2)
  const thresholdPace = speedToPace(lt2Speed)
  zones.push({
    name: isSv(locale) ? 'Tröskeltempo' : 'Threshold pace',
    description: isSv(locale)
      ? 'Vid anaeroba tröskeln, "komfortabelt obekvämt"'
      : 'At the anaerobic threshold, "comfortably uncomfortable"',
    paceMin: thresholdPace,
    paceMax: thresholdPace,
    zone: isSv(locale) ? 'Zon 4 (LT2)' : 'Zone 4 (LT2)'
  })

  // Zone 5: VO2max intervals (above LT2)
  const intervalSpeed = lt2Speed * 1.08
  const intervalMinSpeed = lt2Speed * 1.05
  zones.push({
    name: isSv(locale) ? 'Intervaller' : 'Intervals',
    description: isSv(locale)
      ? 'Hög intensitet för VO₂max-utveckling'
      : 'High intensity for VO₂max development',
    paceMin: speedToPace(intervalSpeed),
    paceMax: speedToPace(intervalMinSpeed),
    zone: isSv(locale) ? 'Zon 5' : 'Zone 5'
  })

  return zones
}

// ==================== FULL REPORT INTERPRETATION ====================

export interface FullReportInterpretation {
  vo2max: VO2maxInterpretation | null
  lactateCurve: LactateCurveInterpretation
  thresholds: ThresholdInterpretation
  economy: EconomyInterpretation | null
  athleteType: AthleteTypeClassification
  strengths: string[]
  weaknesses: string[]
  trainingFocus: TrainingFocus
  paceZones: PaceZone[]
}

export function generateFullInterpretation(
  calculations: TestCalculations,
  client: Client,
  stages: TestStage[],
  testType: TestType = 'RUNNING',
  locale: AppLocale = 'en'
): FullReportInterpretation {
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  return {
    vo2max: generateVO2maxInterpretation(calculations.vo2max, age, client.gender, locale),
    lactateCurve: generateLactateCurveInterpretation(stages, calculations.maxLactate, locale),
    thresholds: generateThresholdInterpretation(
      calculations.aerobicThreshold,
      calculations.anaerobicThreshold,
      calculations.maxHR,
      calculations.maxLactate,
      locale
    ),
    economy: generateEconomyInterpretation(calculations.economyData, client.gender, locale),
    athleteType: classifyAthleteType(calculations, stages, locale),
    strengths: detectStrengths(calculations, client, testType, locale),
    weaknesses: detectWeaknesses(calculations, client, testType, locale),
    trainingFocus: generateTrainingFocus(calculations, client, testType, locale),
    paceZones: generatePaceZones(calculations, testType, locale)
  }
}
