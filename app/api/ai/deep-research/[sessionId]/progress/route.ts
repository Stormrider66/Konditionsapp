/**
 * Deep Research Progress SSE Endpoint
 *
 * GET /api/ai/deep-research/[sessionId]/progress
 *
 * Server-Sent Events stream for real-time progress updates.
 * Polls the database for progress updates and streams them to the client.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'

// ============================================
// Types
// ============================================

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'ping'
  sessionId: string
  status?: string
  progressPercent?: number
  progressMessage?: string
  currentStep?: string
  report?: string
  sources?: Array<{ url: string; title: string }>
  error?: string
  timestamp: string
}

// ============================================
// GET - SSE Progress Stream
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  // Authenticate
  let userId: string
  try {
    const user = await requireCoach()
    userId = user.id
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  // Verify session ownership
  const session = await prisma.deepResearchSession.findFirst({
    where: {
      id: sessionId,
      coachId: userId,
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  // If session is already complete or failed, return immediately
  if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(session.status)) {
    const finalSession = await prisma.deepResearchSession.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
        report: true,
        sources: true,
        errorMessage: true,
        progressPercent: true,
        progressMessage: true,
      },
    })

    const eventType = finalSession?.status === 'COMPLETED' ? 'complete' : 'error'
    const event: ProgressEvent = {
      type: eventType,
      sessionId,
      status: finalSession?.status,
      progressPercent: finalSession?.progressPercent || (eventType === 'complete' ? 100 : 0),
      progressMessage: finalSession?.progressMessage || undefined,
      report: finalSession?.report || undefined,
      sources: finalSession?.sources as ProgressEvent['sources'],
      error: finalSession?.errorMessage || undefined,
      timestamp: new Date().toISOString(),
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

  // Create SSE stream for ongoing research
  const encoder = new TextEncoder()
  let lastProgressId: string | null = null
  let isStreamClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      const initialEvent: ProgressEvent = {
        type: 'ping',
        sessionId,
        status: session.status,
        timestamp: new Date().toISOString(),
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`))

      // Poll for updates
      const pollInterval = setInterval(async () => {
        if (isStreamClosed) {
          clearInterval(pollInterval)
          return
        }

        try {
          // Fetch current session status
          const currentSession = await prisma.deepResearchSession.findUnique({
            where: { id: sessionId },
            select: {
              status: true,
              progressPercent: true,
              progressMessage: true,
              currentStep: true,
              report: true,
              sources: true,
              errorMessage: true,
            },
          })

          if (!currentSession) {
            clearInterval(pollInterval)
            const errorEvent: ProgressEvent = {
              type: 'error',
              sessionId,
              error: 'Session not found',
              timestamp: new Date().toISOString(),
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
            controller.close()
            return
          }

          // Check for new progress updates
          const latestProgress = await prisma.deepResearchProgress.findFirst({
            where: {
              sessionId,
              ...(lastProgressId ? { id: { not: lastProgressId } } : {}),
            },
            orderBy: { timestamp: 'desc' },
          })

          // Send progress update if there's new progress
          if (latestProgress && latestProgress.id !== lastProgressId) {
            lastProgressId = latestProgress.id

            const progressEvent: ProgressEvent = {
              type: 'progress',
              sessionId,
              status: currentSession.status,
              progressPercent: latestProgress.percent || currentSession.progressPercent || 0,
              progressMessage: latestProgress.message || currentSession.progressMessage || undefined,
              currentStep: latestProgress.step || currentSession.currentStep || undefined,
              timestamp: latestProgress.timestamp.toISOString(),
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`))
          }

          // Check if research is complete
          if (currentSession.status === 'COMPLETED') {
            clearInterval(pollInterval)

            const completeEvent: ProgressEvent = {
              type: 'complete',
              sessionId,
              status: 'COMPLETED',
              progressPercent: 100,
              progressMessage: 'Research complete',
              report: currentSession.report || undefined,
              sources: currentSession.sources as ProgressEvent['sources'],
              timestamp: new Date().toISOString(),
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`))
            controller.close()
            return
          }

          // Check if research failed
          if (['FAILED', 'CANCELLED', 'TIMEOUT'].includes(currentSession.status)) {
            clearInterval(pollInterval)

            const errorEvent: ProgressEvent = {
              type: 'error',
              sessionId,
              status: currentSession.status,
              error: currentSession.errorMessage || `Research ${currentSession.status.toLowerCase()}`,
              timestamp: new Date().toISOString(),
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
            controller.close()
            return
          }

          // Send periodic ping to keep connection alive
          const pingEvent: ProgressEvent = {
            type: 'ping',
            sessionId,
            status: currentSession.status,
            progressPercent: currentSession.progressPercent || 0,
            timestamp: new Date().toISOString(),
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(pingEvent)}\n\n`))
        } catch (error) {
          console.error('Error polling progress:', error)
          // Don't close stream on transient errors, just log
        }
      }, 5000) // Poll every 5 seconds

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isStreamClosed = true
        clearInterval(pollInterval)
        controller.close()
      })
    },

    cancel() {
      isStreamClosed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

// Route config - long-running SSE connection
export const maxDuration = 300 // 5 minutes max
export const dynamic = 'force-dynamic'
