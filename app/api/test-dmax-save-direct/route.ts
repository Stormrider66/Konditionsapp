// Direct test of saving D-max to database
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // Find a client
    const demoClient = await prisma.client.findFirst({
      where: { gender: 'MALE' }
    })

    if (!demoClient) {
      return NextResponse.json({
        success: false,
        error: 'No client found',
      }, { status: 404 })
    }

    // Create a test
    const demoTest = await prisma.test.create({
      data: {
        clientId: demoClient.id,
        userId: demoClient.userId,
        testDate: new Date(),
        testType: 'RUNNING',
      }
    })

    // Directly create ThresholdCalculation
    const thresholdCalc = await prisma.thresholdCalculation.create({
      data: {
        testId: demoTest.id,
        method: 'DMAX',
        confidence: 'HIGH',
        r2: 0.9998,
        dmaxIntensity: 13.6,
        dmaxLactate: 2.78,
        dmaxHr: 159,
        polynomialCoeffs: { a: 0.0306, b: -0.9857, c: 10.8480, d: -39.2786 },
        lt1Intensity: 11.0,
        lt1Lactate: 1.5,
        lt1Hr: 140,
        lt1Method: 'BASELINE_PLUS_0.5',
        lt2Intensity: 13.6,
        lt2Lactate: 2.78,
        lt2Hr: 159,
        testDate: new Date()
      }
    })

    // Retrieve it
    const retrieved = await prisma.thresholdCalculation.findUnique({
      where: { id: thresholdCalc.id }
    })

    // Clean up
    await prisma.test.delete({ where: { id: demoTest.id } })

    return NextResponse.json({
      success: true,
      message: 'Direct database save test passed!',
      created: thresholdCalc,
      retrieved
    })

  } catch (error) {
    logger.error('Direct save test error', {}, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
