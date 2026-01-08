// app/api/sport-performance/route.ts
// API for sport-specific performance results (Cycling, Swimming, Triathlon, HYROX, Skiing)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { SportType } from '@prisma/client'
import { logError } from '@/lib/logger-console'

// Validation schema for creating sport performance
const createSportPerformanceSchema = z.object({
  clientId: z.string().uuid(),
  sport: z.nativeEnum(SportType),
  eventType: z.string().min(1),
  eventName: z.string().optional(),
  eventDate: z.string(),

  // Time-based
  timeSeconds: z.number().optional(),
  timeFormatted: z.string().optional(),
  distanceMeters: z.number().optional(),

  // Power (Cycling)
  powerWatts: z.number().optional(),
  powerMax: z.number().optional(),
  ftp: z.number().optional(),
  wattsPerKg: z.number().optional(),
  normalizedPower: z.number().optional(),

  // Pace (Swimming)
  pacePerHundred: z.number().optional(),
  css: z.number().optional(),
  strokeRate: z.number().optional(),
  strokeType: z.string().optional(),
  poolLength: z.number().optional(),

  // HYROX
  hyroxDivision: z.string().optional(),
  hyroxStations: z.any().optional(),
  hyroxRunSplits: z.any().optional(),
  hyroxTotalTime: z.number().optional(),

  // Triathlon
  swimTime: z.number().optional(),
  bikeTime: z.number().optional(),
  runTime: z.number().optional(),
  t1Time: z.number().optional(),
  t2Time: z.number().optional(),
  triathlonDistance: z.string().optional(),

  // Skiing
  skiingTechnique: z.string().optional(),
  skiingTerrain: z.string().optional(),
  snowConditions: z.string().optional(),

  // Common
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  altitude: z.number().optional(),
  conditions: z.string().optional(),
  athleteNotes: z.string().optional(),
  coachNotes: z.string().optional(),
  isPR: z.boolean().optional(),
  usedForZones: z.boolean().optional(),
})

// GET /api/sport-performance - Get sport performances for a client
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const sport = searchParams.get('sport') as SportType | null

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    // Verify access to this client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === user.id
    const isAthlete = client.athleteAccount?.userId === user.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const performances = await prisma.sportPerformance.findMany({
      where: {
        clientId,
        ...(sport && { sport }),
      },
      orderBy: { eventDate: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, data: performances })
  } catch (error) {
    logError('Error fetching sport performances:', error)
    return NextResponse.json({ error: 'Failed to fetch performances' }, { status: 500 })
  }
}

// POST /api/sport-performance - Create new sport performance
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createSportPerformanceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const data = validation.data

    // Verify access to this client
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === user.id
    const isAthlete = client.athleteAccount?.userId === user.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Create the performance record
    const performance = await prisma.sportPerformance.create({
      data: {
        clientId: data.clientId,
        sport: data.sport,
        eventType: data.eventType,
        eventName: data.eventName,
        eventDate: new Date(data.eventDate),
        timeSeconds: data.timeSeconds,
        timeFormatted: data.timeFormatted,
        distanceMeters: data.distanceMeters,
        powerWatts: data.powerWatts,
        powerMax: data.powerMax,
        ftp: data.ftp,
        wattsPerKg: data.wattsPerKg,
        normalizedPower: data.normalizedPower,
        pacePerHundred: data.pacePerHundred,
        css: data.css,
        strokeRate: data.strokeRate,
        strokeType: data.strokeType,
        poolLength: data.poolLength,
        hyroxDivision: data.hyroxDivision,
        hyroxStations: data.hyroxStations,
        hyroxRunSplits: data.hyroxRunSplits,
        hyroxTotalTime: data.hyroxTotalTime,
        swimTime: data.swimTime,
        bikeTime: data.bikeTime,
        runTime: data.runTime,
        t1Time: data.t1Time,
        t2Time: data.t2Time,
        triathlonDistance: data.triathlonDistance,
        skiingTechnique: data.skiingTechnique,
        skiingTerrain: data.skiingTerrain,
        snowConditions: data.snowConditions,
        avgHeartRate: data.avgHeartRate,
        maxHeartRate: data.maxHeartRate,
        temperature: data.temperature,
        humidity: data.humidity,
        altitude: data.altitude,
        conditions: data.conditions,
        athleteNotes: data.athleteNotes,
        coachNotes: data.coachNotes,
        isPR: data.isPR ?? false,
        usedForZones: data.usedForZones ?? false,
      },
    })

    return NextResponse.json({ success: true, data: performance })
  } catch (error) {
    logError('Error creating sport performance:', error)
    return NextResponse.json({ error: 'Failed to create performance' }, { status: 500 })
  }
}
