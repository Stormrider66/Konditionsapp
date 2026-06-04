/**
 * Memory Retrieval API
 *
 * GET /api/ai/memory/[clientId]
 * Retrieves stored memories for a client.
 *
 * DELETE /api/ai/memory/[clientId]?memoryId=xxx
 * Deletes a specific memory.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import {
  getRelevantMemories,
  getRecentSummary,
  formatMemoriesForPrompt,
} from '@/lib/ai/memory-extractor'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ clientId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: Request, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { clientId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { language: true },
    })
    locale = resolveRequestLocale(request, dbUser?.language)

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') },
        { status: 404 }
      )
    }

    // Get URL params
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const format = url.searchParams.get('format') || 'json' // 'json' or 'prompt'

    // Get memories
    const memories = await getRelevantMemories(clientId, limit)
    const summary = await getRecentSummary(clientId)

    if (format === 'prompt') {
      // Return formatted for AI system prompt
      return NextResponse.json({
        memoryContext: formatMemoriesForPrompt(memories, locale),
        summary: summary?.summary || null,
      })
    }

    // Return as JSON
    return NextResponse.json({
      memories,
      summary,
      count: memories.length,
    })
  } catch (error) {
    console.error('Memory retrieval error:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to retrieve memories', 'Kunde inte hämta minnen') },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { clientId } = await params
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    // Get memory ID from query params
    const url = new URL(request.url)
    const memoryId = url.searchParams.get('memoryId')

    if (!memoryId) {
      return NextResponse.json(
        { error: t(locale, 'memoryId is required', 'memoryId är obligatoriskt') },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') },
        { status: 404 }
      )
    }

    // Delete the memory
    await prisma.conversationMemory.delete({
      where: {
        id: memoryId,
        clientId, // Ensure memory belongs to this client
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory deletion error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to delete memory', 'Kunde inte radera minnet') },
      { status: 500 }
    )
  }
}
