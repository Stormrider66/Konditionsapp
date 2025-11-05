// lib/calculations/thresholds.ts
import { TestStage, Threshold } from '@/types'

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
  const heartRate = below.heartRate + factor * (above.heartRate - below.heartRate)

  // Interpolera hastighet/watt/pace
  let value: number
  if (below.speed !== undefined && below.speed !== null && above.speed !== undefined && above.speed !== null) {
    value = below.speed + factor * (above.speed - below.speed)
    console.log('linearInterpolation - using speed:', value, 'from below.speed:', below.speed, 'above.speed:', above.speed)
  } else if (below.power !== undefined && below.power !== null && above.power !== undefined && above.power !== null) {
    value = below.power + factor * (above.power - below.power)
    console.log('linearInterpolation - using power:', value, 'from below.power:', below.power, 'above.power:', above.power, 'factor:', factor)
  } else if (below.pace !== undefined && below.pace !== null && above.pace !== undefined && above.pace !== null) {
    value = below.pace + factor * (above.pace - below.pace)
    console.log('linearInterpolation - using pace:', value, 'from below.pace:', below.pace, 'above.pace:', above.pace)
  } else {
    console.error('linearInterpolation - no valid value field found. below:', below, 'above:', above)
    throw new Error('Kunde inte interpolera värde')
  }

  console.log('linearInterpolation returning - heartRate:', heartRate, 'value:', value)
  return { heartRate, value }
}

function estimateThreshold(stages: TestStage[], targetLactate: number): Threshold | null {
  if (stages.length === 0) return null

  // Hitta närmaste värde
  let closest = stages[0]
  let minDiff = Math.abs(stages[0].lactate - targetLactate)

  for (const stage of stages) {
    const diff = Math.abs(stage.lactate - targetLactate)
    if (diff < minDiff) {
      minDiff = diff
      closest = stage
    }
  }

  // Determine unit based on which value is actually present and is a number
  let unit: 'km/h' | 'watt' | 'min/km'
  if (closest.speed !== undefined && closest.speed !== null && !isNaN(closest.speed)) {
    unit = 'km/h'
  } else if (closest.power !== undefined && closest.power !== null && !isNaN(closest.power)) {
    unit = 'watt'
  } else if (closest.pace !== undefined && closest.pace !== null && !isNaN(closest.pace)) {
    unit = 'min/km'
  } else {
    unit = 'km/h' // fallback
  }

  return {
    heartRate: Math.round(closest.heartRate),
    value: Number((closest.speed || closest.power || closest.pace || 0).toFixed(1)),
    unit,
    lactate: closest.lactate,
    percentOfMax: 0,
  }
}

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
  const interpolated = linearInterpolation(below, above, targetLactate, 'lactate')

  // Determine unit based on which value is actually present and is a number
  let unit: 'km/h' | 'watt' | 'min/km'
  if (below.speed !== undefined && below.speed !== null && !isNaN(below.speed)) {
    unit = 'km/h'
  } else if (below.power !== undefined && below.power !== null && !isNaN(below.power)) {
    unit = 'watt'
  } else if (below.pace !== undefined && below.pace !== null && !isNaN(below.pace)) {
    unit = 'min/km'
  } else {
    unit = 'km/h' // fallback
  }

  return {
    heartRate: Math.round(interpolated.heartRate),
    value: Number(interpolated.value.toFixed(1)),
    unit,
    lactate: targetLactate,
    percentOfMax: 0, // Beräknas senare när maxHR är känd
  }
}

export function calculateAnaerobicThreshold(stages: TestStage[]): Threshold | null {
  const targetLactate = 4.0

  console.log('calculateAnaerobicThreshold called with stages:', stages)

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
    console.log('No interpolation possible, using estimation')
    return estimateThreshold(stages, targetLactate)
  }

  console.log('Interpolating between below and above:', { below, above })
  const interpolated = linearInterpolation(below, above, targetLactate, 'lactate')
  console.log('Interpolated result:', interpolated)

  // Determine unit based on which value is actually present and is a number
  let unit: 'km/h' | 'watt' | 'min/km'
  if (below.speed !== undefined && below.speed !== null && !isNaN(below.speed)) {
    unit = 'km/h'
  } else if (below.power !== undefined && below.power !== null && !isNaN(below.power)) {
    unit = 'watt'
  } else if (below.pace !== undefined && below.pace !== null && !isNaN(below.pace)) {
    unit = 'min/km'
  } else {
    unit = 'km/h' // fallback
  }

  console.log('Determined unit:', unit)

  const threshold = {
    heartRate: Math.round(interpolated.heartRate),
    value: Number(interpolated.value.toFixed(1)),
    unit,
    lactate: targetLactate,
    percentOfMax: 0,
  }

  console.log('Final anaerobic threshold:', threshold)

  return threshold
}
