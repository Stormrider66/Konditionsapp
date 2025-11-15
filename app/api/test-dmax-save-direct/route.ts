// Direct test of saving D-max to database
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        thresholdType: 'LT2',
        method: 'DMAX',
        thresholdIntensity: 13.6,
        thresholdLactate: 2.78,
        thresholdHR: 159,
        confidence: 'HIGH',
        r2: 0.9998,
        dmaxDistance: 1.3848,
        polynomialA: 0.0306,
        polynomialB: -0.9857,
        polynomialC: 10.8480,
        polynomialD: -39.2786
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
    console.error('Direct save test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
