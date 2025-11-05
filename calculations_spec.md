# Beräkningsspecifikation

## Grundläggande beräkningar

### BMI (Body Mass Index)
```typescript
// lib/calculations/basic.ts

export function calculateBMI(weight: number, height: number): number {
  // weight i kg, height i cm
  const heightInMeters = height / 100
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1))
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Undervikt'
  if (bmi < 25) return 'Normalvikt'
  if (bmi < 30) return 'Övervikt'
  return 'Fetma'
}
```

### Ålder från födelsedatum
```typescript
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}
```

## Laktattrösklar

### Aerob tröskel (≈2 mmol/L)
```typescript
// lib/calculations/thresholds.ts

export function calculateAerobicThreshold(stages: TestStage[]): Threshold | null {
  const targetLactate = 2.0
  
  // Hitta steg precis under och över 2 mmol/L
  let below: TestStage | null = null
  let above: TestStage | null = null
  
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].lactate <= targetLactate) {
      below = stages[i]
    } else if (!above && stages[i].lactate > targetLactate) {
      above = stages[i]
      break
    }
  }
  
  if (!below || !above) {
    // Estimera baserat på tillgänglig data
    return estimateThreshold(stages, targetLactate)
  }
  
  // Linjär interpolering
  const interpolated = linearInterpolation(
    below,
    above,
    targetLactate,
    'lactate'
  )
  
  return {
    heartRate: Math.round(interpolated.heartRate),
    value: Number(interpolated.value.toFixed(1)),
    unit: below.speed !== undefined ? 'km/h' : 'watt',
    lactate: targetLactate,
    percentOfMax: 0 // Beräknas senare när maxHR är känd
  }
}
```

### Anaerob tröskel (≈4 mmol/L)
```typescript
export function calculateAnaerobicThreshold(stages: TestStage[]): Threshold | null {
  const targetLactate = 4.0
  
  // Specialhantering för "andra gången över 4"
  let firstCrossing = -1
  let secondCrossingBelow: TestStage | null = null
  let secondCrossingAbove: TestStage | null = null
  
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].lactate >= targetLactate) {
      if (firstCrossing === -1) {
        firstCrossing = i
      } else if (i > firstCrossing + 1) {
        // Hittade andra övergången
        if (i > 0 && stages[i - 1].lactate < targetLactate) {
          secondCrossingBelow = stages[i - 1]
          secondCrossingAbove = stages[i]
          break
        }
      }
    }
  }
  
  // Använd andra övergången om den finns, annars första
  let below: TestStage | null = secondCrossingBelow
  let above: TestStage | null = secondCrossingAbove
  
  if (!below || !above) {
    // Fallback till första övergången
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].lactate <= targetLactate) {
        below = stages[i]
      } else if (!above && stages[i].lactate > targetLactate) {
        above = stages[i]
        break
      }
    }
  }
  
  if (!below || !above) {
    return estimateThreshold(stages, targetLactate)
  }
  
  const interpolated = linearInterpolation(
    below,
    above,
    targetLactate,
    'lactate'
  )
  
  return {
    heartRate: Math.round(interpolated.heartRate),
    value: Number(interpolated.value.toFixed(1)),
    unit: below.speed !== undefined ? 'km/h' : 'watt',
    lactate: targetLactate,
    percentOfMax: 0
  }
}
```

### Linjär interpolering
```typescript
function linearInterpolation(
  below: TestStage,
  above: TestStage,
  targetValue: number,
  targetField: keyof TestStage
): { heartRate: number; value: number } {
  const belowValue = below[targetField] as number
  const aboveValue = above[targetField] as number
  
  // Beräkna interpolationsfaktor
  const factor = (targetValue - belowValue) / (aboveValue - belowValue)
  
  // Interpolera puls
  const heartRate = below.heartRate + 
    factor * (above.heartRate - below.heartRate)
  
  // Interpolera hastighet/watt
  let value: number
  if (below.speed !== undefined && above.speed !== undefined) {
    value = below.speed + factor * (above.speed - below.speed)
  } else if (below.power !== undefined && above.power !== undefined) {
    value = below.power + factor * (above.power - below.power)
  } else {
    throw new Error('Kunde inte interpolera värde')
  }
  
  return { heartRate, value }
}
```

## Träningszoner (Garmin 5-zons modell)

```typescript
// lib/calculations/zones.ts

export function calculateTrainingZones(
  maxHR: number,
  threshold: Threshold,
  testType: 'RUNNING' | 'CYCLING'
): TrainingZone[] {
  const zones: TrainingZone[] = [
    {
      zone: 1,
      name: 'Mycket lätt',
      intensity: 'Återhämtning',
      percentMin: 50,
      percentMax: 60,
      hrMin: Math.round(maxHR * 0.50),
      hrMax: Math.round(maxHR * 0.60),
      effect: 'Återhämtning, uppvärmning'
    },
    {
      zone: 2,
      name: 'Lätt',
      intensity: 'Grundkondition',
      percentMin: 60,
      percentMax: 70,
      hrMin: Math.round(maxHR * 0.60),
      hrMax: Math.round(maxHR * 0.70),
      effect: 'Grundkondition, fettförbränning'
    },
    {
      zone: 3,
      name: 'Måttlig',
      intensity: 'Aerob kapacitet',
      percentMin: 70,
      percentMax: 80,
      hrMin: Math.round(maxHR * 0.70),
      hrMax: Math.round(maxHR * 0.80),
      effect: 'Aerob kapacitet'
    },
    {
      zone: 4,
      name: 'Hård',
      intensity: 'Anaerob tröskel',
      percentMin: 80,
      percentMax: 90,
      hrMin: Math.round(maxHR * 0.80),
      hrMax: Math.round(maxHR * 0.90),
      effect: 'Anaerob tröskel'
    },
    {
      zone: 5,
      name: 'Maximal',
      intensity: 'VO₂max',
      percentMin: 90,
      percentMax: 100,
      hrMin: Math.round(maxHR * 0.90),
      hrMax: maxHR,
      effect: 'VO₂max, maximal kapacitet'
    }
  ]
  
  // Lägg till hastighet/watt-intervall baserat på tröskel
  if (testType === 'RUNNING' && threshold.unit === 'km/h') {
    zones.forEach(zone => {
      const factor = zone.percentMin / threshold.percentOfMax
      zone.speedMin = Number((threshold.value * factor).toFixed(1))
      zone.speedMax = Number((threshold.value * (zone.percentMax / threshold.percentOfMax)).toFixed(1))
    })
  } else if (testType === 'CYCLING' && threshold.unit === 'watt') {
    zones.forEach(zone => {
      const factor = zone.percentMin / threshold.percentOfMax
      zone.powerMin = Math.round(threshold.value * factor)
      zone.powerMax = Math.round(threshold.value * (zone.percentMax / threshold.percentOfMax))
    })
  }
  
  return zones
}
```

## Löpekonomi

```typescript
// lib/calculations/economy.ts

export function calculateRunningEconomy(
  vo2: number, // ml/kg/min
  speed: number // km/h
): number {
  // O₂-kostnad i ml/kg/km
  return Number(((vo2 * 60) / speed).toFixed(0))
}

export function evaluateRunningEconomy(
  economy: number,
  gender: 'MALE' | 'FEMALE'
): string {
  // Baserat på kön och värde
  if (gender === 'MALE') {
    if (economy < 200) return 'Utmärkt'
    if (economy < 210) return 'Mycket god'
    if (economy < 220) return 'God'
    if (economy < 240) return 'Acceptabel'
    return 'Behöver förbättring'
  } else {
    if (economy < 210) return 'Utmärkt'
    if (economy < 220) return 'Mycket god'
    if (economy < 240) return 'God'
    if (economy < 260) return 'Acceptabel'
    return 'Behöver förbättring'
  }
}

export function calculateAllEconomy(
  stages: TestStage[],
  gender: 'MALE' | 'FEMALE'
): EconomyData[] {
  return stages
    .filter(stage => stage.vo2 && stage.speed)
    .map(stage => {
      const economy = calculateRunningEconomy(stage.vo2!, stage.speed!)
      return {
        speed: stage.speed,
        vo2: stage.vo2!,
        economy,
        efficiency: evaluateRunningEconomy(economy, gender)
      }
    })
}
```

## Cykel-specifika beräkningar

```typescript
// lib/calculations/cycling.ts

export function calculateWattsPerKg(
  power: number, // watt
  weight: number // kg
): number {
  return Number((power / weight).toFixed(2))
}

export function evaluateCyclingPower(
  wattsPerKg: number,
  age: number,
  gender: 'MALE' | 'FEMALE'
): string {
  // Ålderskorrigerad bedömning
  const ageAdjustment = Math.max(0, (age - 30) * 0.01) // 1% minskning per år efter 30
  const adjustedValue = wattsPerKg * (1 + ageAdjustment)
  
  if (gender === 'MALE') {
    if (adjustedValue > 5.0) return 'Elitnivå'
    if (adjustedValue > 4.0) return 'Mycket god'
    if (adjustedValue > 3.0) return 'God'
    if (adjustedValue > 2.0) return 'Acceptabel'
    return 'Nybörjarnivå'
  } else {
    if (adjustedValue > 4.5) return 'Elitnivå'
    if (adjustedValue > 3.5) return 'Mycket god'
    if (adjustedValue > 2.5) return 'God'
    if (adjustedValue > 1.5) return 'Acceptabel'
    return 'Nybörjarnivå'
  }
}

export function calculatePowerZones(
  ftp: number // Functional Threshold Power
): PowerZone[] {
  return [
    {
      zone: 1,
      name: 'Active Recovery',
      percentMin: 0,
      percentMax: 55,
      powerMin: 0,
      powerMax: Math.round(ftp * 0.55)
    },
    {
      zone: 2,
      name: 'Endurance',
      percentMin: 56,
      percentMax: 75,
      powerMin: Math.round(ftp * 0.56),
      powerMax: Math.round(ftp * 0.75)
    },
    {
      zone: 3,
      name: 'Tempo',
      percentMin: 76,
      percentMax: 90,
      powerMin: Math.round(ftp * 0.76),
      powerMax: Math.round(ftp * 0.90)
    },
    {
      zone: 4,
      name: 'Lactate Threshold',
      percentMin: 91,
      percentMax: 105,
      powerMin: Math.round(ftp * 0.91),
      powerMax: Math.round(ftp * 1.05)
    },
    {
      zone: 5,
      name: 'VO2 Max',
      percentMin: 106,
      percentMax: 120,
      powerMin: Math.round(ftp * 1.06),
      powerMax: Math.round(ftp * 1.20)
    }
  ]
}
```

## VO₂max identifiering

```typescript
// lib/calculations/vo2max.ts

export function identifyVO2max(stages: TestStage[]): number | null {
  // Hitta högsta VO2-värdet
  let maxVO2 = 0
  
  for (const stage of stages) {
    if (stage.vo2 && stage.vo2 > maxVO2) {
      maxVO2 = stage.vo2
    }
  }
  
  return maxVO2 > 0 ? maxVO2 : null
}

export function evaluateVO2max(
  vo2max: number,
  age: number,
  gender: 'MALE' | 'FEMALE'
): string {
  // Åldersbaserade referensvärden
  const categories = getVO2maxCategories(age, gender)
  
  if (vo2max >= categories.superior) return 'Överlägsen'
  if (vo2max >= categories.excellent) return 'Utmärkt'
  if (vo2max >= categories.good) return 'God'
  if (vo2max >= categories.fair) return 'Acceptabel'
  if (vo2max >= categories.poor) return 'Under genomsnitt'
  return 'Dålig'
}

function getVO2maxCategories(age: number, gender: 'MALE' | 'FEMALE') {
  // Referensvärden baserat på ålder och kön
  const maleCategories = {
    20: { superior: 60, excellent: 52, good: 47, fair: 42, poor: 37 },
    30: { superior: 57, excellent: 49, good: 44, fair: 40, poor: 35 },
    40: { superior: 53, excellent: 45, good: 41, fair: 37, poor: 33 },
    50: { superior: 49, excellent: 42, good: 38, fair: 35, poor: 31 },
    60: { superior: 45, excellent: 38, good: 35, fair: 32, poor: 28 }
  }
  
  const femaleCategories = {
    20: { superior: 56, excellent: 47, good: 42, fair: 38, poor: 33 },
    30: { superior: 52, excellent: 44, good: 39, fair: 35, poor: 31 },
    40: { superior: 48, excellent: 41, good: 36, fair: 33, poor: 29 },
    50: { superior: 44, excellent: 37, good: 33, fair: 30, poor: 26 },
    60: { superior: 40, excellent: 34, good: 30, fair: 27, poor: 23 }
  }
  
  // Hitta närmaste åldersgrupp
  const ageGroup = Math.round(age / 10) * 10
  const categories = gender === 'MALE' ? maleCategories : femaleCategories
  
  return categories[Math.min(60, Math.max(20, ageGroup))]
}
```

## Sammanställning av alla beräkningar

```typescript
// lib/calculations/index.ts

export async function performAllCalculations(
  test: Test,
  client: Client
): Promise<TestCalculations> {
  const stages = test.testStages.sort((a, b) => a.sequence - b.sequence)
  const age = calculateAge(client.birthDate)
  
  // Grundläggande
  const bmi = calculateBMI(client.weight, client.height)
  
  // Max-värden
  const maxHR = Math.max(...stages.map(s => s.heartRate))
  const maxLactate = Math.max(...stages.map(s => s.lactate))
  const vo2max = identifyVO2max(stages) || 0
  
  // Trösklar
  const aerobicThreshold = calculateAerobicThreshold(stages)
  const anaerobicThreshold = calculateAnaerobicThreshold(stages)
  
  // Uppdatera procent av max
  if (aerobicThreshold) {
    aerobicThreshold.percentOfMax = Math.round((aerobicThreshold.heartRate / maxHR) * 100)
  }
  if (anaerobicThreshold) {
    anaerobicThreshold.percentOfMax = Math.round((anaerobicThreshold.heartRate / maxHR) * 100)
  }
  
  // Träningszoner
  const trainingZones = calculateTrainingZones(
    maxHR,
    anaerobicThreshold || aerobicThreshold!,
    test.testType
  )
  
  // Ekonomi (endast för löpning)
  let economyData: EconomyData[] | undefined
  if (test.testType === 'RUNNING') {
    economyData = calculateAllEconomy(stages, client.gender)
  }
  
  return {
    bmi,
    aerobicThreshold: aerobicThreshold!,
    anaerobicThreshold: anaerobicThreshold!,
    trainingZones,
    vo2max,
    maxHR,
    maxLactate,
    economyData
  }
}
```