import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateEnv } from '@/lib/env'

const startedAt = new Date().toISOString()

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {}

  // Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok' }
  } catch (err) {
    checks.database = {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown database error',
    }
  }

  // Environment variables
  const envResult = validateEnv()
  if (envResult.valid) {
    checks.env = { status: 'ok' }
  } else {
    checks.env = {
      status: 'error',
      message: `Missing: ${envResult.missing.join(', ')}`,
    }
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok')

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      startedAt,
      checks,
    },
    {
      status: allHealthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
