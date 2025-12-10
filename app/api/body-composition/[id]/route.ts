// app/api/body-composition/[id]/route.ts
// Single body composition measurement CRUD

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  calculateBMI,
  calculateBMR,
  calculateBMRKatchMcArdle,
} from '@/lib/ai/nutrition-calculator'

/**
 * GET /api/body-composition/[id]
 * Get single body composition measurement
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const measurement = await prisma.bodyComposition.findUnique({
      where: { id },
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

    if (!measurement) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    return NextResponse.json(measurement)
  } catch (error) {
    logger.error('Error fetching body composition', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/body-composition/[id]
 * Update body composition measurement
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Check if measurement exists
    const existing = await prisma.bodyComposition.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            height: true,
            gender: true,
            birthDate: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    const {
      measurementDate,
      weightKg,
      bodyFatPercent,
      muscleMassKg,
      visceralFat,
      boneMassKg,
      waterPercent,
      bmrKcal,
      metabolicAge,
      deviceBrand,
      measurementTime,
      notes,
    } = body

    // Recalculate BMI if weight changed
    let bmi = existing.bmi
    const newWeight = weightKg ?? existing.weightKg
    if (newWeight && existing.client.height) {
      const bmiResult = calculateBMI(newWeight, existing.client.height)
      bmi = bmiResult.bmi
    }

    // Recalculate FFMI if body fat or weight changed
    let ffmi = existing.ffmi
    const newBodyFat = bodyFatPercent ?? existing.bodyFatPercent
    if (newWeight && newBodyFat && existing.client.height) {
      const leanMass = newWeight * (1 - newBodyFat / 100)
      const heightM = existing.client.height / 100
      ffmi = Math.round((leanMass / (heightM * heightM)) * 10) / 10
    }

    // Recalculate BMR if needed
    let calculatedBmr = bmrKcal ?? existing.bmrKcal
    if (!bmrKcal && newWeight && existing.client.height && existing.client.birthDate && existing.client.gender) {
      const age = Math.floor(
        (new Date().getTime() - new Date(existing.client.birthDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
      )

      if (newBodyFat) {
        const leanMass = newWeight * (1 - newBodyFat / 100)
        calculatedBmr = calculateBMRKatchMcArdle(leanMass)
      } else {
        calculatedBmr = calculateBMR({
          weightKg: newWeight,
          heightCm: existing.client.height,
          ageYears: age,
          gender: existing.client.gender as 'MALE' | 'FEMALE',
        })
      }
    }

    const measurement = await prisma.bodyComposition.update({
      where: { id },
      data: {
        measurementDate: measurementDate ? new Date(measurementDate) : undefined,
        weightKg,
        bodyFatPercent,
        muscleMassKg,
        visceralFat,
        boneMassKg,
        waterPercent,
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

    return NextResponse.json(measurement)
  } catch (error) {
    logger.error('Error updating body composition', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/body-composition/[id]
 * Delete body composition measurement
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if measurement exists
    const existing = await prisma.bodyComposition.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Measurement not found' }, { status: 404 })
    }

    await prisma.bodyComposition.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting body composition', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
