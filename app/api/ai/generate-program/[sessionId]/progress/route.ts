/**
 * Program Generation Progress SSE Endpoint
 *
 * GET /api/ai/generate-program/[sessionId]/progress
 *
 * Server-Sent Events stream for real-time progress updates.
 * Polls the database for progress updates and streams them to the client.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach, resolveAthleteClientId } from '@/lib/auth-utils'
import type { ProgressEvent } from '@/lib/ai/program-generator'

// ============================================
// GET - SSE Progress Stream
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  // Dual auth: try coach first, then athlete
  let sessionWhereFilter: { id: string; coachId?: string; athleteId?: string }
  try {
    const user = await requireCoach()
    sessionWhereFilter = { id: sessionId, coachId: user.id }
  } catch {
    // Fallback: try athlete auth
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return new Response('Unauthorized', { status: 401 })
    }
    sessionWhereFilter = { id: sessionId, athleteId: resolved.clientId }
  }

  // Verify session ownership (coach via coachId or athlete via athleteId)
  const session = await prisma.programGenerationSession.findFirst({
    where: sessionWhereFilter,
    select: {
      id: true,
      status: true,
    },
  })

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  // If session is already complete or failed, return immediately
  if (['COMPLETED', 'FAILED'].includes(session.status)) {
    const finalSession = await prisma.programGenerationSession.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
        totalPhases: true,
        currentPhase: true,
        progressPercent: true,
        progressMessage: true,
        mergedProgram: true,
        errorMessage: true,
      },
    })

    const eventType = finalSession?.status === 'COMPLETED' ? 'complete' : 'error'
    const event: ProgressEvent = {
      type: eventType,
      sessionId,
      status: finalSession?.status as ProgressEvent['status'],
      currentPhase: finalSession?.currentPhase || 0,
      totalPhases: finalSession?.totalPhases || 1,
      progressPercent: finalSession?.progressPercent || (eventType === 'complete' ? 100 : 0),
      progressMessage: finalSession?.progressMessage || '',
      timestamp: new Date().toISOString(),
      ...(eventType === 'complete' && finalSession?.mergedProgram
        ? { program: finalSession.mergedProgram as unknown as ProgressEvent['program'] }
        : {}),
      ...(eventType === 'error' && finalSession?.errorMessage
        ? { error: finalSession.errorMessage }
        : {}),
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // Create SSE stream for ongoing generation
  const encoder = new TextEncoder()
  let lastProgressId: string | null = null
  let isStreamClosed = false
  let pollInterval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      const initialEvent: ProgressEvent = {
        type: 'ping',
        sessionId,
        status: session.status as ProgressEvent['status'],
        currentPhase: 0,
        totalPhases: 1,
        progressPercent: 0,
        progressMessage: 'Ansluten...',
        timestamp: new Date().toISOString(),
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`))

      // Poll for updates every 2 seconds
      pollInterval = setInterval(async () => {
        if (isStreamClosed) {
          if (pollInterval) clearInterval(pollInterval)
          return
        }

        try {
          // Fetch current session status
          const currentSession = await prisma.programGenerationSession.findUnique({
            where: { id: sessionId },
            select: {
              status: true,
              currentPhase: true,
              totalPhases: true,
              progressPercent: true,
              progressMessage: true,
              programOutline: true,
              mergedProgram: true,
              errorMessage: true,
            },
          })

          if (!currentSession) {
            if (pollInterval) clearInterval(pollInterval)
            const errorEvent: ProgressEvent = {
              type: 'error',
              sessionId,
              status: 'FAILED',
              currentPhase: 0,
              totalPhases: 0,
              progressPercent: 0,
              progressMessage: '',
              error: 'Session not found',
              timestamp: new Date().toISOString(),
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
            controller.close()
            return
          }

          // Check for new progress updates
          const latestProgress = await prisma.programGenerationProgress.findFirst({
            where: {
              sessionId,
              ...(lastProgressId ? { id: { not: lastProgressId } } : {}),
            },
            orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          })

          // Determine event type
          let eventType: ProgressEvent['type'] = 'ping'
          if (currentSession.status === 'COMPLETED') {
            eventType = 'complete'
          } else if (currentSession.status === 'FAILED') {
            eventType = 'error'
          } else if (currentSession.status === 'GENERATING_OUTLINE') {
            eventType = 'outline'
          } else if (currentSession.status === 'GENERATING_PHASE') {
            eventType = 'phase'
          } else if (currentSession.status === 'MERGING') {
            eventType = 'merge'
          }

          // Build event
          const progressEvent: ProgressEvent = {
            type: eventType,
            sessionId,
            status: currentSession.status as ProgressEvent['status'],
            currentPhase: currentSession.currentPhase,
            totalPhases: currentSession.totalPhases,
            progressPercent: currentSession.progressPercent || 0,
            progressMessage: currentSession.progressMessage || latestProgress?.message || '',
            timestamp: new Date().toISOString(),
          }

          // Add outline if available
          if (currentSession.programOutline && eventType === 'outline') {
            progressEvent.outline = currentSession.programOutline as unknown as ProgressEvent['outline']
          }

          // Add program if complete
          if (currentSession.mergedProgram && eventType === 'complete') {
            progressEvent.program = currentSession.mergedProgram as unknown as ProgressEvent['program']
          }

          // Add error if failed
          if (currentSession.errorMessage && eventType === 'error') {
            progressEvent.error = currentSession.errorMessage
          }

          // Update last progress ID
          if (latestProgress) {
            lastProgressId = latestProgress.id
          }

          // Send event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`))

          // Close stream if complete or failed
          if (['COMPLETED', 'FAILED'].includes(currentSession.status)) {
            if (pollInterval) clearInterval(pollInterval)
            controller.close()
            return
          }
        } catch (error) {
          console.error('Error polling progress:', error)
          // Don't close stream on transient errors
        }
      }, 2000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isStreamClosed = true
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        controller.close()
      })
    },

    cancel() {
      isStreamClosed = true
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// Route config
export const maxDuration = 300 // 5 minutes max
export const dynamic = 'force-dynamic'
