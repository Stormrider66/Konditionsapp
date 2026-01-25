// app/api/timing-gates/[sessionId]/route.ts
// API routes for individual timing gate session operations

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

// GET /api/timing-gates/[sessionId] - Get session details with results
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      include: {
        coach: {
          select: { id: true, name: true }
        },
        location: {
          select: { id: true, name: true, city: true }
        },
        results: {
          orderBy: [
            { totalTime: 'asc' }
          ],
          include: {
            athlete: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check access
    if (session.coachId !== user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Calculate statistics
    const validResults = session.results.filter(r => r.valid)
    const stats = {
      totalResults: session.results.length,
      validResults: validResults.length,
      matchedAthletes: session.results.filter(r => r.athleteId).length,
      unmatchedAthletes: session.results.filter(r => !r.athleteId).length,
      bestTime: validResults.length > 0 ? Math.min(...validResults.map(r => r.totalTime)) : null,
      averageTime: validResults.length > 0
        ? validResults.reduce((sum, r) => sum + r.totalTime, 0) / validResults.length
        : null
    }

    return NextResponse.json({
      ...session,
      stats
    })
  } catch (error) {
    console.error('Error fetching timing gate session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timing gate session' },
      { status: 500 }
    )
  }
}

// DELETE /api/timing-gates/[sessionId] - Delete session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const session = await prisma.timingGateSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.coachId !== user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'You can only delete your own sessions' }, { status: 403 })
      }
    }

    await prisma.timingGateSession.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting timing gate session:', error)
    return NextResponse.json(
      { error: 'Failed to delete timing gate session' },
      { status: 500 }
    )
  }
}
