/**
 * Drill Image Analysis API
 *
 * POST - Upload a clipboard/whiteboard photo and get structured drill data
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { analyzeClipboardPhoto } from '@/lib/drills/analyze-clipboard'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await req.json()
    const { imageBase64, mimeType } = body

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 })
    }

    // Get business context for API key resolution
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    const result = await analyzeClipboardPhoto(
      imageBase64,
      mimeType,
      user.id,
      membership?.businessId,
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('Drill analysis error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
