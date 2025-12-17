// app/api/body-composition/route.ts
// CRUD endpoints for body composition / bioimpedance measurements

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  calculateBMI,
  calculateBMR,
  calculateBMRKatchMcArdle,
  categorizeBodyFat,
} from '@/lib/ai/nutrition-calculator'

/**
 * POST /api/body-composition
 * Create new body composition measurement
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const {
      clientId,
      measurementDate,
      weightKg,
      bodyFatPercent,
      muscleMassKg,
      visceralFat,
      boneMassKg,
      waterPercent,
      intracellularWaterPercent,
      extracellularWaterPercent,
      bmrKcal,
      metabolicAge,
      deviceBrand,
      measurementTime,
      notes,
    } = body

    // Validate required fields
    if (!clientId || !measurementDate) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, measurementDate' },
        { status: 400 }
      )
    }

    // Get client data for calculations
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Calculate BMI if weight is provided
    let bmi: number | null = null
    if (weightKg && client.height) {
      const bmiResult = calculateBMI(weightKg, client.height)
      bmi = bmiResult.bmi
    }

    // Calculate FFMI (Fat-Free Mass Index) if we have body fat %
    let ffmi: number | null = null
    if (weightKg && bodyFatPercent && client.height) {
      const leanMass = weightKg * (1 - bodyFatPercent / 100)
      const heightM = client.height / 100
      ffmi = Math.round((leanMass / (heightM * heightM)) * 10) / 10
    }

    // Calculate BMR if not provided but we have the data
    let calculatedBmr = bmrKcal
    if (!calculatedBmr && weightKg && client.height && client.birthDate && client.gender) {
      const age = Math.floor(
        (new Date().getTime() - new Date(client.birthDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
      )

      // Use Katch-McArdle if we have lean body mass
      if (bodyFatPercent) {
        const leanMass = weightKg * (1 - bodyFatPercent / 100)
        calculatedBmr = calculateBMRKatchMcArdle(leanMass)
      } else {
        // Fall back to Mifflin-St Jeor
        calculatedBmr = calculateBMR({
          weightKg,
          heightCm: client.height,
          ageYears: age,
          gender: client.gender as 'MALE' | 'FEMALE',
        })
      }
    }

    // Create body composition measurement
    const measurement = await prisma.bodyComposition.create({
      data: {
        clientId,
        measurementDate: new Date(measurementDate),
        weightKg,
        bodyFatPercent,
        muscleMassKg,
        visceralFat,
        boneMassKg,
        waterPercent,
        intracellularWaterPercent,
        extracellularWaterPercent,
        bmrKcal: calculatedBmr,
        metabolicAge,
        bmi,
        ffmi,
        deviceBrand,
        measurementTime,
        notes,
      },
      include: {
        client: {
          select: {
            name: true,
            gender: true,
            birthDate: true,
            height: true,
          },
        },
      },
    })

    // Calculate additional analysis
    const analysis = analyzeBodyComposition(measurement, client)

    return NextResponse.json({ measurement, analysis }, { status: 201 })
  } catch (error) {
    logger.error('Error creating body composition', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/body-composition?clientId=xxx
 * List all body composition measurements for a client
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeAnalysis = searchParams.get('analysis') === 'true'

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    // Get client for analysis
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const measurements = await prisma.bodyComposition.findMany({
      where: { clientId },
      orderBy: { measurementDate: 'desc' },
      take: limit,
    })

    // Calculate changes from previous measurements
    const measurementsWithChanges = measurements.map((m, i) => {
      const previous = measurements[i + 1]
      const changes = previous ? {
        weightChange: m.weightKg && previous.weightKg
          ? Math.round((m.weightKg - previous.weightKg) * 10) / 10
          : null,
        bodyFatChange: m.bodyFatPercent && previous.bodyFatPercent
          ? Math.round((m.bodyFatPercent - previous.bodyFatPercent) * 10) / 10
          : null,
        muscleMassChange: m.muscleMassKg && previous.muscleMassKg
          ? Math.round((m.muscleMassKg - previous.muscleMassKg) * 10) / 10
          : null,
        daysSincePrevious: Math.floor(
          (new Date(m.measurementDate).getTime() - new Date(previous.measurementDate).getTime()) /
          (1000 * 60 * 60 * 24)
        ),
      } : null

      return {
        ...m,
        changes,
        analysis: includeAnalysis ? analyzeBodyComposition(m, client) : undefined,
      }
    })

    // Calculate overall trends if we have enough data
    let trends = null
    if (measurements.length >= 2) {
      const oldest = measurements[measurements.length - 1]
      const newest = measurements[0]
      const daysBetween = Math.floor(
        (new Date(newest.measurementDate).getTime() - new Date(oldest.measurementDate).getTime()) /
        (1000 * 60 * 60 * 24)
      )

      trends = {
        totalWeightChange: newest.weightKg && oldest.weightKg
          ? Math.round((newest.weightKg - oldest.weightKg) * 10) / 10
          : null,
        totalBodyFatChange: newest.bodyFatPercent && oldest.bodyFatPercent
          ? Math.round((newest.bodyFatPercent - oldest.bodyFatPercent) * 10) / 10
          : null,
        totalMuscleMassChange: newest.muscleMassKg && oldest.muscleMassKg
          ? Math.round((newest.muscleMassKg - oldest.muscleMassKg) * 10) / 10
          : null,
        periodDays: daysBetween,
        measurementCount: measurements.length,
        weeklyWeightChange: newest.weightKg && oldest.weightKg && daysBetween > 0
          ? Math.round(((newest.weightKg - oldest.weightKg) / daysBetween * 7) * 100) / 100
          : null,
      }
    }

    return NextResponse.json({
      measurements: measurementsWithChanges,
      trends,
      client: {
        name: client.name,
        gender: client.gender,
        height: client.height,
      },
    })
  } catch (error) {
    logger.error('Error fetching body composition', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Analyze a body composition measurement
 */
function analyzeBodyComposition(
  measurement: {
    weightKg: number | null
    bodyFatPercent: number | null
    muscleMassKg: number | null
    visceralFat: number | null
    bmi: number | null
    ffmi: number | null
  },
  client: {
    gender: string | null
    birthDate: Date | null
    height: number | null
  }
) {
  const analysis: {
    bmiCategory?: string
    bodyFatCategory?: string
    visceralFatCategory?: string
    ffmiCategory?: string
    recommendations: string[]
  } = {
    recommendations: [],
  }

  // BMI category
  if (measurement.bmi) {
    if (measurement.bmi < 18.5) {
      analysis.bmiCategory = 'Undervikt'
    } else if (measurement.bmi < 25) {
      analysis.bmiCategory = 'Normalvikt'
    } else if (measurement.bmi < 30) {
      analysis.bmiCategory = 'Övervikt'
    } else if (measurement.bmi < 35) {
      analysis.bmiCategory = 'Fetma grad I'
    } else if (measurement.bmi < 40) {
      analysis.bmiCategory = 'Fetma grad II'
    } else {
      analysis.bmiCategory = 'Fetma grad III'
    }
  }

  // Body fat category
  if (measurement.bodyFatPercent && client.gender && client.birthDate) {
    const age = Math.floor(
      (new Date().getTime() - new Date(client.birthDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
    )
    analysis.bodyFatCategory = categorizeBodyFat(
      measurement.bodyFatPercent,
      client.gender as 'MALE' | 'FEMALE',
      age
    )
  }

  // Visceral fat category
  if (measurement.visceralFat !== null) {
    if (measurement.visceralFat <= 9) {
      analysis.visceralFatCategory = 'Normal'
    } else if (measurement.visceralFat <= 14) {
      analysis.visceralFatCategory = 'Förhöjd'
    } else {
      analysis.visceralFatCategory = 'Hög'
    }
  }

  // FFMI category (Fat-Free Mass Index)
  if (measurement.ffmi && client.gender) {
    if (client.gender === 'MALE') {
      if (measurement.ffmi < 18) {
        analysis.ffmiCategory = 'Under medel'
      } else if (measurement.ffmi < 20) {
        analysis.ffmiCategory = 'Medel'
      } else if (measurement.ffmi < 22) {
        analysis.ffmiCategory = 'Över medel'
      } else if (measurement.ffmi < 25) {
        analysis.ffmiCategory = 'Utmärkt'
      } else {
        analysis.ffmiCategory = 'Exceptionell'
      }
    } else {
      if (measurement.ffmi < 15) {
        analysis.ffmiCategory = 'Under medel'
      } else if (measurement.ffmi < 17) {
        analysis.ffmiCategory = 'Medel'
      } else if (measurement.ffmi < 19) {
        analysis.ffmiCategory = 'Över medel'
      } else if (measurement.ffmi < 21) {
        analysis.ffmiCategory = 'Utmärkt'
      } else {
        analysis.ffmiCategory = 'Exceptionell'
      }
    }
  }

  // Generate recommendations
  if (measurement.visceralFat !== null && measurement.visceralFat > 12) {
    analysis.recommendations.push('Visceralt fett är förhöjt. Fokusera på regelbunden aerob träning och minska raffinerade kolhydrater.')
  }

  if (measurement.bodyFatPercent && client.gender) {
    const highThreshold = client.gender === 'MALE' ? 25 : 32
    if (measurement.bodyFatPercent > highThreshold) {
      analysis.recommendations.push('Överväg ett måttligt kaloriunderskott (250-500 kcal/dag) tillsammans med styrketräning för att bevara muskelmassa.')
    }
  }

  if (measurement.bmi && measurement.bmi < 18.5) {
    analysis.recommendations.push('Fokusera på näringstät kost med tillräckligt protein för att bygga muskelmassa.')
  }

  return analysis
}
