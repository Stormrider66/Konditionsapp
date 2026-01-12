/**
 * Live HR Session Stream API (SSE)
 *
 * GET - Server-Sent Events stream for real-time HR updates
 */

import { NextRequest } from 'next/server'
import { getSessionStreamData } from '@/lib/live-hr/reading-service'
import { getSession } from '@/lib/live-hr/session-service'
import { createClient } from '@/lib/supabase/server'
import { STREAM_POLL_INTERVAL_MS } from '@/lib/live-hr/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params

  // Verify authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Verify session exists and user has access
  const session = await getSession(id)
  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  if (session.coachId !== user.id) {
    return new Response('Forbidden', { status: 403 })
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendData = async () => {
        try {
          const data = await getSessionStreamData(id)
          if (!data) {
            controller.enqueue(encoder.encode('event: error\ndata: Session not found\n\n'))
            controller.close()
            return false
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

          // Close stream if session ended
          if (data.status === 'ENDED') {
            controller.enqueue(encoder.encode('event: ended\ndata: Session ended\n\n'))
            return false
          }

          return true
        } catch (error) {
          console.error('SSE stream error:', error)
          controller.enqueue(encoder.encode('event: error\ndata: Stream error\n\n'))
          return false
        }
      }

      // Send initial data
      const shouldContinue = await sendData()
      if (!shouldContinue) {
        controller.close()
        return
      }

      // Poll every 2 seconds
      const interval = setInterval(async () => {
        const shouldContinue = await sendData()
        if (!shouldContinue) {
          clearInterval(interval)
          controller.close()
        }
      }, STREAM_POLL_INTERVAL_MS)

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

// Disable static generation for this route
export const dynamic = 'force-dynamic'
