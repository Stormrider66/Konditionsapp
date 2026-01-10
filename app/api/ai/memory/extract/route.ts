/**
 * Memory Extraction API
 *
 * POST /api/ai/memory/extract
 * Extracts memorable facts from a conversation and stores them.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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

    // Verify user has access to this client (either as coach or as the athlete)
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [
          { userId: user.id }, // Coach owns this client
          {
            athleteAccount: {
              userId: user.id, // Athlete is this client
            },
          },
        ],
      },
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

    // Get API key from coach settings
    const apiKeys = await getDecryptedUserApiKeys(client.userId)
    const apiKey = apiKeys.anthropicKey
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No AI API key configured' },
        { status: 400 }
      )
    }

    // Extract memories from conversation
    const extractedMemories = await extractMemoriesFromConversation(
      messages,
      apiKey
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
