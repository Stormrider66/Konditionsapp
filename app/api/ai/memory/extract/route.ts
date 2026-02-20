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
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'

interface ExtractRequest {
  clientId: string
  messages: {
    role: 'user' | 'assistant'
    content: string
  }[]
  sourceMessageId?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ExtractRequest = await request.json()
    const { clientId, messages, sourceMessageId } = body

    if (!clientId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'clientId and messages are required' },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        userId: true, // Coach's user ID
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      )
    }

    // Get API keys from coach settings
    const apiKeys = await getDecryptedUserApiKeys(client.userId)
    if (!apiKeys.anthropicKey && !apiKeys.googleKey && !apiKeys.openaiKey) {
      return NextResponse.json(
        { error: 'No AI API key configured' },
        { status: 400 }
      )
    }

    // Extract memories from conversation
    const extractedMemories = await extractMemoriesFromConversation(
      messages,
      apiKeys
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
      { error: 'Failed to extract memories' },
      { status: 500 }
    )
  }
}
