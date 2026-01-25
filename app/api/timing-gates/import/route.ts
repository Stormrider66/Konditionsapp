// app/api/timing-gates/import/route.ts
// API route for importing timing gate CSV files

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { TimingGateSource, SportTestProtocol } from '@prisma/client'

interface ParsedResult {
  athleteName?: string
  athleteId?: string
  testProtocol?: SportTestProtocol
  attemptNumber: number
  splitTimes: number[]
  totalTime: number
  valid: boolean
  notes?: string
}

interface ParsedData {
  sessionName?: string
  sessionDate: string
  gateCount: number
  intervalDistances: number[]
  results: ParsedResult[]
  format: string
}

// POST /api/timing-gates/import - Import CSV file
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a coach
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only coaches can import timing data' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const format = formData.get('format') as string || 'auto'
    const locationId = formData.get('locationId') as string | null
    const previewOnly = formData.get('preview') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()

    // Parse CSV based on format
    let parsedData: ParsedData

    try {
      if (format === 'brower' || (format === 'auto' && detectBrowerFormat(text))) {
        parsedData = parseBrowerCSV(text)
      } else if (format === 'freelap' || (format === 'auto' && detectFreelapFormat(text))) {
        parsedData = parseFreelapCSV(text)
      } else {
        parsedData = parseGenericCSV(text)
      }
    } catch (parseError) {
      console.error('CSV parsing error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse CSV file', details: (parseError as Error).message },
        { status: 400 }
      )
    }

    // If preview only, return parsed data without saving
    if (previewOnly) {
      return NextResponse.json({
        preview: true,
        format: parsedData.format,
        sessionDate: parsedData.sessionDate,
        sessionName: parsedData.sessionName,
        gateCount: parsedData.gateCount,
        intervalDistances: parsedData.intervalDistances,
        resultCount: parsedData.results.length,
        results: parsedData.results
      })
    }

    // Get coach's athletes for matching
    const athletes = await prisma.client.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, email: true }
    })

    // Create session
    const session = await prisma.timingGateSession.create({
      data: {
        coachId: user.id,
        sessionDate: new Date(parsedData.sessionDate),
        sessionName: parsedData.sessionName || `Import ${new Date().toISOString().slice(0, 10)}`,
        importSource: getImportSource(parsedData.format),
        importedAt: new Date(),
        gateCount: parsedData.gateCount,
        intervalDistances: parsedData.intervalDistances,
        locationId: locationId || undefined
      }
    })

    // Create results with athlete matching
    const results = await Promise.all(
      parsedData.results.map(async (result) => {
        // Try to match athlete by name
        const matchedAthlete = result.athleteName
          ? athletes.find(a =>
              a.name.toLowerCase() === result.athleteName?.toLowerCase() ||
              a.name.toLowerCase().includes(result.athleteName?.toLowerCase() || '')
            )
          : null

        return prisma.timingGateResult.create({
          data: {
            sessionId: session.id,
            athleteId: matchedAthlete?.id || null,
            unmatchedAthleteName: matchedAthlete ? null : result.athleteName,
            unmatchedAthleteId: result.athleteId,
            testProtocol: result.testProtocol,
            attemptNumber: result.attemptNumber,
            splitTimes: result.splitTimes,
            totalTime: result.totalTime,
            valid: result.valid,
            notes: result.notes
          }
        })
      })
    )

    // Count matched vs unmatched
    const matchedCount = results.filter(r => r.athleteId).length
    const unmatchedCount = results.length - matchedCount

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      totalResults: results.length,
      matchedAthletes: matchedCount,
      unmatchedAthletes: unmatchedCount,
      session: {
        ...session,
        _count: { results: results.length }
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error importing timing gate data:', error)
    return NextResponse.json(
      { error: 'Failed to import timing gate data' },
      { status: 500 }
    )
  }
}

// Format detection functions
function detectBrowerFormat(text: string): boolean {
  return text.toLowerCase().includes('brower') ||
         text.includes('Split 1') ||
         text.includes('Total Time')
}

function detectFreelapFormat(text: string): boolean {
  return text.toLowerCase().includes('freelap') ||
         text.includes('Lap Time')
}

// Brower timing system CSV parser
function parseBrowerCSV(text: string): ParsedData {
  const lines = text.split('\n').filter(line => line.trim())
  const results: ParsedResult[] = []

  // Find header row
  const headerIndex = lines.findIndex(line =>
    line.includes('Name') || line.includes('Athlete')
  )

  if (headerIndex === -1) {
    throw new Error('Could not find header row in Brower CSV')
  }

  const headers = lines[headerIndex].split(',').map(h => h.trim())
  const nameIndex = headers.findIndex(h => h === 'Name' || h === 'Athlete')
  const timeIndices = headers
    .map((h, i) => ({ header: h, index: i }))
    .filter(({ header }) => header.includes('Split') || header === 'Total Time' || header === 'Time')

  // Count split columns to determine gate count
  const splitCount = timeIndices.filter(t => t.header.includes('Split')).length
  const gateCount = splitCount + 1

  // Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length < 2) continue

    const athleteName = nameIndex >= 0 ? values[nameIndex] : undefined
    const splitTimes: number[] = []
    let totalTime = 0

    for (const { header, index } of timeIndices) {
      const value = parseFloat(values[index])
      if (!isNaN(value)) {
        if (header.includes('Split')) {
          splitTimes.push(value)
        } else {
          totalTime = value
        }
      }
    }

    if (totalTime === 0 && splitTimes.length > 0) {
      totalTime = splitTimes[splitTimes.length - 1]
    }

    if (totalTime > 0) {
      results.push({
        athleteName,
        attemptNumber: 1,
        splitTimes,
        totalTime,
        valid: true
      })
    }
  }

  return {
    format: 'brower',
    sessionDate: new Date().toISOString().slice(0, 10),
    gateCount,
    intervalDistances: [],
    results
  }
}

// Freelap timing system CSV parser
function parseFreelapCSV(text: string): ParsedData {
  const lines = text.split('\n').filter(line => line.trim())
  const results: ParsedResult[] = []

  const headerIndex = lines.findIndex(line =>
    line.includes('Athlete') || line.includes('Name')
  )

  if (headerIndex === -1) {
    throw new Error('Could not find header row in Freelap CSV')
  }

  const headers = lines[headerIndex].split(',').map(h => h.trim())
  const nameIndex = headers.findIndex(h => h === 'Athlete' || h === 'Name')
  const lapTimeIndex = headers.findIndex(h => h.includes('Lap') || h.includes('Time'))

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length < 2) continue

    const athleteName = nameIndex >= 0 ? values[nameIndex] : undefined
    const totalTime = lapTimeIndex >= 0 ? parseFloat(values[lapTimeIndex]) : NaN

    if (!isNaN(totalTime) && totalTime > 0) {
      results.push({
        athleteName,
        attemptNumber: 1,
        splitTimes: [totalTime],
        totalTime,
        valid: true
      })
    }
  }

  return {
    format: 'freelap',
    sessionDate: new Date().toISOString().slice(0, 10),
    gateCount: 2,
    intervalDistances: [],
    results
  }
}

// Generic CSV parser
function parseGenericCSV(text: string): ParsedData {
  const lines = text.split('\n').filter(line => line.trim())
  const results: ParsedResult[] = []

  // Try to find header
  const headerIndex = lines.findIndex(line => {
    const lower = line.toLowerCase()
    return lower.includes('name') || lower.includes('athlete') || lower.includes('time')
  })

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0
  const headers = headerIndex >= 0
    ? lines[headerIndex].split(',').map(h => h.trim().toLowerCase())
    : []

  const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('athlete'))
  const timeIndex = headers.findIndex(h => h.includes('time') || h.includes('total'))

  for (let i = startIndex; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length < 1) continue

    // If we have identified columns, use them
    let athleteName: string | undefined
    let totalTime: number

    if (nameIndex >= 0 && timeIndex >= 0) {
      athleteName = values[nameIndex]
      totalTime = parseFloat(values[timeIndex])
    } else {
      // Try to guess: first non-numeric is name, first numeric is time
      const numericIndex = values.findIndex(v => !isNaN(parseFloat(v)) && v !== '')
      if (numericIndex === 0) {
        totalTime = parseFloat(values[0])
        athleteName = values[1] || undefined
      } else if (numericIndex > 0) {
        athleteName = values.slice(0, numericIndex).join(' ')
        totalTime = parseFloat(values[numericIndex])
      } else {
        continue
      }
    }

    if (!isNaN(totalTime) && totalTime > 0) {
      results.push({
        athleteName,
        attemptNumber: 1,
        splitTimes: [totalTime],
        totalTime,
        valid: true
      })
    }
  }

  return {
    format: 'generic',
    sessionDate: new Date().toISOString().slice(0, 10),
    gateCount: 2,
    intervalDistances: [],
    results
  }
}

function getImportSource(format: string): TimingGateSource {
  switch (format) {
    case 'brower':
      return 'BROWER'
    case 'freelap':
      return 'FREELAP'
    default:
      return 'CSV_IMPORT'
  }
}
