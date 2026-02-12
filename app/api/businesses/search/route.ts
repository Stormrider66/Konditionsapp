/**
 * Public Business Search API
 *
 * GET /api/businesses/search?q=term - Search active businesses (GYM/CLUB only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimited = await rateLimitJsonResponse('business-search', ip, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ businesses: [] })
    }

    const businesses = await prisma.business.findMany({
      where: {
        isActive: true,
        type: { in: ['GYM', 'CLUB'] },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        city: true,
        type: true,
      },
      take: 10,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ businesses })
  } catch (error) {
    logger.error('Business search error', {}, error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
