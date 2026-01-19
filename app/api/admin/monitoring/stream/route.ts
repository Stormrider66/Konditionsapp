import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'

// Collect real-time metrics
async function getRealtimeMetrics() {
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const [
    recentErrors,
    unresolvedErrors,
    activeUsers,
    totalUsers,
    recentActivities,
  ] = await Promise.all([
    // Recent errors (last 5 minutes)
    prisma.systemError.count({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
    }),
    // Unresolved errors
    prisma.systemError.count({
      where: {
        isResolved: false,
      },
    }),
    // Active users (logged in within last hour, approximated by recent activity)
    prisma.workoutLog.groupBy({
      by: ['athleteId'],
      where: {
        createdAt: { gte: oneHourAgo },
      },
    }).then((r) => r.length),
    // Total users
    prisma.user.count(),
    // Recent workout logs
    prisma.workoutLog.count({
      where: {
        createdAt: { gte: oneHourAgo },
      },
    }),
  ])

  // Get latest errors for feed
  const latestErrors = await prisma.systemError.findMany({
    where: {
      isResolved: false,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      level: true,
      message: true,
      route: true,
      createdAt: true,
      sentryEventId: true,
    },
  })

  return {
    timestamp: now.toISOString(),
    metrics: {
      recentErrors,
      unresolvedErrors,
      activeUsers,
      totalUsers,
      recentActivities,
      errorRate: recentErrors > 0 && recentActivities > 0
        ? ((recentErrors / recentActivities) * 100).toFixed(2)
        : '0',
    },
    latestErrors,
  }
}

// GET /api/admin/monitoring/stream - SSE endpoint for real-time metrics
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial data immediately
        try {
          const initialMetrics = await getRealtimeMetrics()
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMetrics)}\n\n`))
        } catch (error) {
          console.error('Error fetching initial metrics:', error)
        }

        // Set up interval to send metrics every 5 seconds
        const interval = setInterval(async () => {
          try {
            const metrics = await getRealtimeMetrics()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(metrics)}\n\n`))
          } catch (error) {
            console.error('Error fetching metrics:', error)
            // Send error event
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch metrics' })}\n\n`)
            )
          }
        }, 5000)

        // Clean up on abort
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('SSE auth error:', error)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
