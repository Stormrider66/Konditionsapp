/**
 * Memory Extraction API
 *
 * POST /api/ai/memory/extract
 * Extracts memorable facts from a conversation and stores them.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/auth-utils'
import {
  extractMemoriesFromConversation,
  saveMemories,
} from '@/lib/ai/memory-extractor'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { withAiContext } from '@/lib/ai/usage-logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface ExtractRequest {
  clientId: string
  messages: {
    role: 'user' | 'assistant'
    content: string
  }[]
  sourceMessageId?: string
}

export async function POST(request: Request) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const body: ExtractRequest = await request.json()
    const { clientId, messages, sourceMessageId } = body

    if (!clientId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: t(locale, 'clientId and messages are required', 'clientId och messages är obligatoriska') },
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

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        userId: true, // Coach's user ID
        user: {
          select: {
            language: true,
          },
        },
        athleteAccount: {
          select: {
            user: {
              select: {
                language: true,
              },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Klienten hittades inte eller åtkomst nekades') },
        { status: 404 }
      )
    }
    locale = resolveRequestLocale(request, client.athleteAccount?.user?.language ?? client.user?.language)

    // Get API keys from coach settings
    const apiKeys = await getResolvedAiKeys(client.userId)
    if (!apiKeys.anthropicKey && !apiKeys.googleKey && !apiKeys.openaiKey) {
      return NextResponse.json(
        { error: t(locale, 'No AI API key configured', 'Ingen AI API-nyckel är konfigurerad') },
        { status: 400 }
      )
    }

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

    // Extract memories from conversation
    const extractedMemories = await withAiContext(
      { userId: user.id, clientId, category: 'athlete_memory_extraction' },
      () => extractMemoriesFromConversation(
        messages,
        apiKeys,
        locale
      )
    )

    // Save memories to database
    const savedCount = await saveMemories(
      clientId,
      extractedMemories,
      sourceMessageId
    )

    return NextResponse.json({
      success: true,
      extracted: extractedMemories.length,
      saved: savedCount,
      memories: extractedMemories,
    })
  } catch (error) {
    console.error('Memory extraction error:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to extract memories', 'Kunde inte extrahera minnen') },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
