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
import {
  getRelevantMemories,
  getRecentSummary,
  formatMemoriesForPrompt,
} from '@/lib/ai/memory-extractor'

interface RouteParams {
  params: Promise<{ clientId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [
          { userId: user.id },
          {
            athleteAccount: {
              userId: user.id,
            },
          },
        ],
      },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
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
        memoryContext: formatMemoriesForPrompt(memories),
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
      { error: 'Failed to retrieve memories' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get memory ID from query params
    const url = new URL(request.url)
    const memoryId = url.searchParams.get('memoryId')

    if (!memoryId) {
      return NextResponse.json(
        { error: 'memoryId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this client (only coach can delete)
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id, // Only coach can delete memories
      },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
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
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    )
  }
}
