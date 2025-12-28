// lib/calculations/interpretations.ts
// Interpretation engine for generating narrative text from test data

import { TestCalculations, TestStage, EconomyData, Threshold, Gender, Client, TestType } from '@/types'
import { evaluateVO2max } from './vo2max'
import { evaluateRunningEconomy } from './economy'

// ==================== TYPES ====================

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
  gender: Gender
): VO2maxInterpretation | null {
  if (!vo2max || vo2max <= 0) {
    return null
  }

  const classification = evaluateVO2max(vo2max, age, gender)

  // Determine percentile based on classification
  const percentileMap: Record<string, string> = {
    'Överlägsen': 'topp 5%',
    'Utmärkt': 'topp 10%',
    'God': 'topp 25%',
    'Acceptabel': 'genomsnittlig',
    'Under genomsnitt': 'under genomsnitt',
    'Dålig': 'nedre 25%'
  }

  const percentile = percentileMap[classification] || 'genomsnittlig'
  const genderText = gender === 'MALE' ? 'man' : 'kvinna'

  // Generate description based on classification
  let description = ''
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

  return { classification, percentile, description }
}

// ==================== LACTATE CURVE INTERPRETATION ====================

export function generateLactateCurveInterpretation(
  stages: TestStage[],
  maxLactate: number
): LactateCurveInterpretation {
  if (stages.length < 3) {
    return {
      curveType: 'MODERATE',
      description: 'Otillräckligt antal mätpunkter för kurveanalys.',
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
    description = 'Din laktatkurva är relativt platt, vilket är typiskt för vältränade uthållighetsidrottare. Laktatet stiger gradvis och kontrollerat genom testet.'
    implication = 'Detta indikerar god aerob kapacitet och effektiv laktatclearance. Du kan sannolikt upprätthålla höga intensiteter längre.'
  } else if (risePerStage > 1.5 || (lastLactate - baselineAvg > 8)) {
    curveType = 'STEEP'
    description = 'Din laktatkurva stiger brant vid högre intensiteter, vilket indikerar en kraftig anaerob respons.'
    implication = 'Detta kan tyda på stark anaerob kapacitet men även utvecklingspotential i den aeroba basen. Fokus på lågintensiv volymträning kan jämna ut kurvan.'
  } else {
    curveType = 'MODERATE'
    description = 'Din laktatkurva visar en normal stegring med ökande intensitet.'
    implication = 'Detta är ett balanserat mönster som ger goda förutsättningar för både uthållighet och högintensiv träning.'
  }

  // Add note about exceptional max lactate
  if (maxLactate > 15) {
    description += ` Det exceptionellt höga maximala laktatvärdet (${maxLactate.toFixed(1)} mmol/L) visar på utomordentlig anaerob kapacitet och buffertförmåga.`
  } else if (maxLactate > 12) {
    description += ` Det höga maximala laktatvärdet (${maxLactate.toFixed(1)} mmol/L) indikerar god anaerob kapacitet.`
  }

  return { curveType, description, implication }
}

// ==================== THRESHOLD INTERPRETATION ====================

export function generateThresholdInterpretation(
  aerobicThreshold: Threshold | null,
  anaerobicThreshold: Threshold | null,
  maxHR: number,
  maxLactate: number
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

    aerobicDescription = `Din aeroba tröskel ligger vid ${aerobicThreshold.heartRate} slag/min (${aerobicPercent}% av max) och ${aerobicThreshold.value} ${unitLabel}.`

    if (aerobicPercent < 70) {
      aerobicDescription += ' Detta är relativt lågt och indikerar potential för förbättring av den aeroba basen.'
    } else if (aerobicPercent > 80) {
      aerobicDescription += ' Detta är högt, vilket tyder på god aerob kapacitet.'
    }
  }

  // Anaerobic threshold interpretation
  if (anaerobicThreshold) {
    const anaerobicPercent = anaerobicThreshold.percentOfMax
    const unitLabel = anaerobicThreshold.unit === 'km/h' ? 'km/h' :
                      anaerobicThreshold.unit === 'watt' ? 'watt' : 'min/km'

    anaerobicDescription = `Din anaeroba tröskel ligger vid ${anaerobicThreshold.heartRate} slag/min (${anaerobicPercent}% av max) och ${anaerobicThreshold.value} ${unitLabel}.`

    if (anaerobicPercent > 90) {
      anaerobicDescription += ' Den höga tröskelpositioneringen indikerar mycket god uthållighetskapacitet.'
    } else if (anaerobicPercent > 85) {
      anaerobicDescription += ' Detta är en god tröskelposition för uthållighetsträning.'
    } else if (anaerobicPercent < 80) {
      anaerobicDescription += ' Det finns potential att höja tröskeln genom strukturerad tröskelträning.'
    }

    // Check for individual threshold (not standard 4 mmol/L)
    if (anaerobicThreshold.lactate && Math.abs(anaerobicThreshold.lactate - 4.0) > 1.0) {
      individualThresholdNote = `Din individuella anaeroba tröskel ligger vid ${anaerobicThreshold.lactate?.toFixed(1)} mmol/L, vilket avviker från standardvärdet 4 mmol/L. `
      if (anaerobicThreshold.lactate > 5) {
        individualThresholdNote += 'Detta indikerar hög laktattolerans och god buffertkapacitet.'
      } else {
        individualThresholdNote += 'Detta kan tyda på en mer konservativ tröskel, vilket kan vara fördelaktigt för längre distanser.'
      }
    }
  }

  // Threshold spread analysis
  if (aerobicThreshold && anaerobicThreshold) {
    const spreadHR = anaerobicThreshold.heartRate - aerobicThreshold.heartRate
    const spreadPercent = anaerobicThreshold.percentOfMax - aerobicThreshold.percentOfMax

    if (spreadPercent > 15) {
      thresholdSpread = `Zonen mellan dina trösklar (${spreadHR} slag/min, ${spreadPercent.toFixed(0)} procentenheter) är bred, vilket ger ett stort träningsfönster för effektiv uthållighetsträning.`
    } else if (spreadPercent < 10) {
      thresholdSpread = `Zonen mellan dina trösklar (${spreadHR} slag/min, ${spreadPercent.toFixed(0)} procentenheter) är smal. Fokus bör ligga på att bredda denna zon genom varierad intensitetsträning.`
    } else {
      thresholdSpread = `Zonen mellan dina trösklar (${spreadHR} slag/min, ${spreadPercent.toFixed(0)} procentenheter) är normal och ger goda förutsättningar för progressiv träning.`
    }
  }

  return { aerobicDescription, anaerobicDescription, thresholdSpread, individualThresholdNote }
}

// ==================== ECONOMY INTERPRETATION ====================

export function generateEconomyInterpretation(
  economyData: EconomyData[] | undefined,
  gender: Gender
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
    description = `Din löpekonomi förbättras vid högre hastigheter, med bäst effektivitet vid ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km). Detta är positivt för prestationen och tyder på god anpassning till snabbare tempo.`
  } else if (difference > 10) {
    trend = 'DEGRADES'
    description = `Din löpekonomi försämras något vid högre hastigheter. Bäst effektivitet noteras vid ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km). Teknisk löpträning vid högre fart kan förbättra detta.`
  } else {
    trend = 'STABLE'
    description = `Din löpekonomi är relativt stabil över olika hastigheter, med bäst effektivitet vid ${bestEntry.speed} km/h (${bestEntry.economy} ml/kg/km).`
  }

  // Add evaluation context
  const evaluation = evaluateRunningEconomy(bestEntry.economy, gender)
  description += ` Din bästa ekonomi klassificeras som "${evaluation}".`

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
  testType: TestType = 'RUNNING'
): string[] {
  const strengths: string[] = []
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // VO2max check
  if (calculations.vo2max && calculations.vo2max > 0) {
    const vo2eval = evaluateVO2max(calculations.vo2max, age, client.gender)
    if (['Överlägsen', 'Utmärkt', 'God'].includes(vo2eval)) {
      strengths.push(`${vo2eval} syreupptagningsförmåga (VO₂max ${calculations.vo2max} ml/kg/min)`)
    }
  }

  // Max lactate check (anaerobic capacity)
  if (calculations.maxLactate > 15) {
    strengths.push(`Exceptionell anaerob kapacitet (maxlaktat ${calculations.maxLactate.toFixed(1)} mmol/L)`)
  } else if (calculations.maxLactate > 12) {
    strengths.push(`Hög anaerob kapacitet (maxlaktat ${calculations.maxLactate.toFixed(1)} mmol/L)`)
  }

  // Threshold position check
  if (calculations.anaerobicThreshold) {
    if (calculations.anaerobicThreshold.percentOfMax > 88) {
      strengths.push(`Mycket hög tröskelposition (${calculations.anaerobicThreshold.percentOfMax}% av maxpuls)`)
    } else if (calculations.anaerobicThreshold.percentOfMax > 85) {
      strengths.push(`Hög tröskelposition (${calculations.anaerobicThreshold.percentOfMax}% av maxpuls)`)
    }
  }

  // Running economy check
  if (testType === 'RUNNING' && calculations.economyData && calculations.economyData.length > 0) {
    const bestEconomy = Math.min(...calculations.economyData.map(e => e.economy))
    const eval_ = evaluateRunningEconomy(bestEconomy, client.gender)
    if (['Utmärkt', 'Mycket god'].includes(eval_)) {
      strengths.push(`${eval_} löpekonomi (${bestEconomy} ml/kg/km)`)
    }

    // Check if economy improves at speed
    const sorted = [...calculations.economyData].filter(e => e.speed).sort((a, b) => (a.speed || 0) - (b.speed || 0))
    if (sorted.length >= 3) {
      const lastEconomy = sorted[sorted.length - 1].economy
      const firstEconomy = sorted[0].economy
      if (lastEconomy < firstEconomy - 5) {
        strengths.push('Löpekonomin förbättras vid högre hastigheter')
      }
    }
  }

  // Cycling specific
  if (testType === 'CYCLING' && calculations.cyclingData) {
    if (calculations.cyclingData.wattsPerKg > 4.0) {
      strengths.push(`Utmärkt effekt/vikt-förhållande (${calculations.cyclingData.wattsPerKg} W/kg)`)
    } else if (calculations.cyclingData.wattsPerKg > 3.5) {
      strengths.push(`God effekt/vikt-förhållande (${calculations.cyclingData.wattsPerKg} W/kg)`)
    }
  }

  // Limit to top 4 strengths
  return strengths.slice(0, 4)
}

// ==================== WEAKNESSES DETECTION ====================

export function detectWeaknesses(
  calculations: TestCalculations,
  client: Client,
  testType: TestType = 'RUNNING'
): string[] {
  const weaknesses: string[] = []
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // VO2max check
  if (calculations.vo2max && calculations.vo2max > 0) {
    const vo2eval = evaluateVO2max(calculations.vo2max, age, client.gender)
    if (['Under genomsnitt', 'Dålig'].includes(vo2eval)) {
      weaknesses.push('VO₂max har utvecklingspotential')
    }
  }

  // Threshold position check
  if (calculations.anaerobicThreshold) {
    if (calculations.anaerobicThreshold.percentOfMax < 80) {
      weaknesses.push('Anaeroba tröskeln kan höjas genom strukturerad träning')
    }
  }

  // Running economy check
  if (testType === 'RUNNING' && calculations.economyData && calculations.economyData.length > 0) {
    const avgEconomy = calculations.economyData.reduce((sum, e) => sum + e.economy, 0) / calculations.economyData.length
    if (avgEconomy > 220) {
      weaknesses.push('Löpekonomin kan förbättras med teknikträning')
    }

    // Check if economy degrades at speed
    const sorted = [...calculations.economyData].filter(e => e.speed).sort((a, b) => (a.speed || 0) - (b.speed || 0))
    if (sorted.length >= 3) {
      const lastEconomy = sorted[sorted.length - 1].economy
      const firstEconomy = sorted[0].economy
      if (lastEconomy > firstEconomy + 15) {
        weaknesses.push('Löpekonomin försämras vid högre hastigheter')
      }
    }
  }

  // Threshold spread check
  if (calculations.aerobicThreshold && calculations.anaerobicThreshold) {
    const spreadPercent = calculations.anaerobicThreshold.percentOfMax - calculations.aerobicThreshold.percentOfMax
    if (spreadPercent < 10) {
      weaknesses.push('Smal zon mellan trösklarna - kan bredgas med varierad träning')
    }
  }

  // Low max lactate (may indicate limited anaerobic development)
  if (calculations.maxLactate < 8 && calculations.maxLactate > 0) {
    weaknesses.push('Anaerob kapacitet kan utvecklas')
  }

  // Limit to top 3 weaknesses
  return weaknesses.slice(0, 3)
}

// ==================== TRAINING FOCUS ====================

export function generateTrainingFocus(
  calculations: TestCalculations,
  client: Client,
  testType: TestType = 'RUNNING'
): TrainingFocus {
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  let primaryFocus = ''
  let primaryRationale = ''
  let secondaryFocus = ''
  let secondaryRationale = ''
  let followUpWeeks = 10

  // Determine primary focus based on test results
  const vo2eval = calculations.vo2max ? evaluateVO2max(calculations.vo2max, age, client.gender) : null
  const thresholdPercent = calculations.anaerobicThreshold?.percentOfMax || 0
  const hasGoodEconomy = calculations.economyData &&
    Math.min(...calculations.economyData.map(e => e.economy)) < 210

  // Priority logic
  if (vo2eval && ['Under genomsnitt', 'Dålig'].includes(vo2eval)) {
    primaryFocus = 'VO₂max-utveckling'
    primaryRationale = 'För att bygga en starkare aerob grund'
    secondaryFocus = 'Aerob basträning'
    secondaryRationale = 'För att stödja syreupptagningsförmågan'
    followUpWeeks = 12
  } else if (thresholdPercent < 80) {
    primaryFocus = 'Tröskelträning'
    primaryRationale = 'För att höja din anaeroba tröskel'
    secondaryFocus = 'Aerob basträning'
    secondaryRationale = 'För snabbare återhämtning mellan hårda pass'
    followUpWeeks = 10
  } else if (!hasGoodEconomy && testType === 'RUNNING') {
    primaryFocus = 'Löpteknik och ekonomi'
    primaryRationale = 'För att förbättra effektiviteten vid löpning'
    secondaryFocus = 'Styrketräning'
    secondaryRationale = 'För bättre löpstabilitet och kraftutveckling'
    followUpWeeks = 8
  } else if (calculations.maxLactate < 10) {
    primaryFocus = 'Intensiv intervallträning'
    primaryRationale = 'För att utveckla anaerob kapacitet'
    secondaryFocus = 'Tröskelträning'
    secondaryRationale = 'För att bibehålla och höja tröskeln'
    followUpWeeks = 8
  } else {
    // Already well-developed - maintain and fine-tune
    primaryFocus = 'Bibehållande träning'
    primaryRationale = 'För att upprätthålla din goda fysiska form'
    secondaryFocus = 'Periodiserad variation'
    secondaryRationale = 'För fortsatt utveckling och skadeprevention'
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
  stages: TestStage[]
): AthleteTypeClassification {
  // Analyze lactate curve
  const curveInfo = generateLactateCurveInterpretation(stages, calculations.maxLactate)

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
    typeName = 'Uthållighetstyp'
    description = 'Din profil tyder på god uthållighetskapacitet med effektiv aerob energiomsättning. Du är väl lämpad för längre distanser där uthållighet är avgörande.'
    suitableDistances = ['10 km', 'Halvmaraton', 'Maraton', 'Ultralopp']
  } else if (speedScore >= enduranceScore + 2) {
    type = 'SNABBHET'
    typeName = 'Snabbhetstyp'
    description = 'Din profil visar stark anaerob kapacitet och god laktattolerans. Du har naturliga förutsättningar för kortare, mer intensiva distanser.'
    suitableDistances = ['800 m', '1500 m', '3000 m', '5 km']
  } else {
    type = 'ALLROUND'
    typeName = 'Allroundtyp'
    description = 'Din profil visar en balanserad mix av aeroba och anaeroba egenskaper. Du har goda förutsättningar för ett brett spektrum av distanser.'
    suitableDistances = ['5 km', '10 km', 'Halvmaraton']
  }

  return { type, typeName, description, suitableDistances }
}

// ==================== PACE ZONES ====================

export function generatePaceZones(
  calculations: TestCalculations,
  testType: TestType
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
    name: 'Lättlöpning',
    description: 'Bekvämt samtalstempo för återhämtning och grundträning',
    paceMin: speedToPace(easyMaxSpeed),
    paceMax: speedToPace(easyMinSpeed),
    zone: 'Zon 1-2'
  })

  // Zone 2-3: Long run (around LT1)
  const longMaxSpeed = lt1Speed * 1.05
  const longMinSpeed = lt1Speed * 0.90
  zones.push({
    name: 'Långpass',
    description: 'Måttlig intensitet för längre distanser',
    paceMin: speedToPace(longMaxSpeed),
    paceMax: speedToPace(longMinSpeed),
    zone: 'Zon 2-3'
  })

  // Zone 4: Threshold (at LT2)
  const thresholdPace = speedToPace(lt2Speed)
  zones.push({
    name: 'Tröskeltempo',
    description: 'Vid anaeroba tröskeln, "komfortabelt obekvämt"',
    paceMin: thresholdPace,
    paceMax: thresholdPace,
    zone: 'Zon 4 (LT2)'
  })

  // Zone 5: VO2max intervals (above LT2)
  const intervalSpeed = lt2Speed * 1.08
  const intervalMinSpeed = lt2Speed * 1.05
  zones.push({
    name: 'Intervaller',
    description: 'Hög intensitet för VO₂max-utveckling',
    paceMin: speedToPace(intervalSpeed),
    paceMax: speedToPace(intervalMinSpeed),
    zone: 'Zon 5'
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
  testType: TestType = 'RUNNING'
): FullReportInterpretation {
  const age = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  return {
    vo2max: generateVO2maxInterpretation(calculations.vo2max, age, client.gender),
    lactateCurve: generateLactateCurveInterpretation(stages, calculations.maxLactate),
    thresholds: generateThresholdInterpretation(
      calculations.aerobicThreshold,
      calculations.anaerobicThreshold,
      calculations.maxHR,
      calculations.maxLactate
    ),
    economy: generateEconomyInterpretation(calculations.economyData, client.gender),
    athleteType: classifyAthleteType(calculations, stages),
    strengths: detectStrengths(calculations, client, testType),
    weaknesses: detectWeaknesses(calculations, client, testType),
    trainingFocus: generateTrainingFocus(calculations, client, testType),
    paceZones: generatePaceZones(calculations, testType)
  }
}
