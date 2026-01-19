import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

// GET /api/admin/monitoring/metrics - Get historical metrics
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('metricName')
    const range = parseInt(searchParams.get('range') || '24') // Hours
    const granularity = searchParams.get('granularity') || 'hour' // hour, day

    const since = new Date(Date.now() - range * 60 * 60 * 1000)

    const where: Record<string, unknown> = {
      timestamp: { gte: since },
    }

    if (metricName) {
      where.metricName = metricName
    }

    const metrics = await prisma.systemMetric.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    })

    // Group by metric name for charting
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.metricName]) {
        acc[metric.metricName] = []
      }
      acc[metric.metricName].push({
        timestamp: metric.timestamp,
        value: metric.value,
        unit: metric.unit,
      })
      return acc
    }, {} as Record<string, Array<{ timestamp: Date; value: number; unit: string | null }>>)

    // Calculate summary stats
    const summary: Record<string, { avg: number; min: number; max: number; latest: number }> = {}
    for (const [name, values] of Object.entries(grouped)) {
      if (values.length > 0) {
        const nums = values.map((v) => v.value)
        summary[name] = {
          avg: nums.reduce((a, b) => a + b, 0) / nums.length,
          min: Math.min(...nums),
          max: Math.max(...nums),
          latest: nums[nums.length - 1],
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        range: `${range}h`,
        granularity,
        metrics: grouped,
        summary,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/monitoring/metrics')
  }
}

// POST /api/admin/monitoring/metrics - Record a metric (internal use)
export async function POST(request: NextRequest) {
  try {
    // This endpoint is for internal metric recording
    // No admin check - could be called by server-side code
    const body = await request.json()
    const { metricName, value, unit, dimensions } = body

    if (!metricName || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'metricName and value are required' },
        { status: 400 }
      )
    }

    const metric = await prisma.systemMetric.create({
      data: {
        metricName,
        value,
        unit: unit || null,
        dimensions: dimensions || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: metric,
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/monitoring/metrics')
  }
}
