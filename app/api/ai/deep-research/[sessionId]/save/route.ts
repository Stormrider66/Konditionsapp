/**
 * Save Deep Research to Document API
 *
 * POST /api/ai/deep-research/[sessionId]/save
 *
 * Saves the research report as a CoachDocument for RAG integration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'
import { storeChunkEmbeddings, chunkText } from '@/lib/ai/embeddings'

// ============================================
// Validation Schema
// ============================================

const SaveResearchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  embedForRAG: z.boolean().default(true),
})

// ============================================
// POST - Save Research as Document
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Authenticate
    const user = await requireCoach()

    // Rate limit: 10 saves per minute
    const rateLimited = await rateLimitJsonResponse('ai:deep-research:save', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse and validate request
    const body = await request.json()
    const validation = SaveResearchSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, embedForRAG } = validation.data

    // Fetch session with ownership check
    const session = await prisma.deepResearchSession.findFirst({
      where: {
        id: sessionId,
        coachId: user.id,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      )
    }

    // Check if session is completed
    if (session.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Cannot save session with status: ${session.status}. Only completed sessions can be saved.` },
        { status: 400 }
      )
    }

    // Check if report exists
    if (!session.report) {
      return NextResponse.json(
        { error: 'No report available to save' },
        { status: 400 }
      )
    }

    // Check if already saved
    if (session.savedDocumentId) {
      return NextResponse.json(
        { error: 'Research has already been saved as a document', documentId: session.savedDocumentId },
        { status: 409 }
      )
    }

    // Generate document name if not provided
    const documentName = name || `Research: ${session.query.substring(0, 50)}${session.query.length > 50 ? '...' : ''}`

    // Create the document as a data URL (markdown content)
    const markdownContent = buildMarkdownDocument(session)
    const dataUrl = `data:text/markdown;base64,${Buffer.from(markdownContent).toString('base64')}`

    // Create CoachDocument
    const document = await prisma.coachDocument.create({
      data: {
        coachId: user.id,
        name: documentName,
        description: description || `Deep research report generated on ${new Date().toLocaleDateString()}`,
        fileType: 'RESEARCH_REPORT',
        fileUrl: dataUrl,
        fileSize: markdownContent.length,
        mimeType: 'text/markdown',
        processingStatus: embedForRAG ? 'PENDING' : 'COMPLETED',
        metadata: {
          sourceType: 'deep_research',
          researchSessionId: sessionId,
          provider: session.provider,
          query: session.query,
          sourcesCount: session.sources ? (session.sources as unknown[]).length : 0,
          generatedAt: session.completedAt?.toISOString(),
        },
      },
    })

    // Link document to research session
    await prisma.deepResearchSession.update({
      where: { id: sessionId },
      data: { savedDocumentId: document.id },
    })

    // Embed for RAG if requested
    let chunkCount = 0

    if (embedForRAG) {
      const decryptedKeys = await getDecryptedUserApiKeys(user.id)

      if (decryptedKeys.openaiKey) {
        try {
          // Update status to processing
          await prisma.coachDocument.update({
            where: { id: document.id },
            data: { processingStatus: 'PROCESSING' },
          })

          // Chunk the content
          const chunks = chunkText(markdownContent, {
            documentId: document.id,
            documentName: documentName,
            fileType: 'RESEARCH_REPORT',
          })

          // Generate and store embeddings
          await storeChunkEmbeddings(
            document.id,
            user.id,
            chunks,
            decryptedKeys.openaiKey
          )

          // Update document with chunk count
          const updatedDoc = await prisma.coachDocument.update({
            where: { id: document.id },
            data: {
              processingStatus: 'COMPLETED',
              chunkCount: chunks.length,
            },
          })

          chunkCount = updatedDoc.chunkCount
        } catch (error) {
          console.error('Error embedding document:', error)

          // Update status to failed
          await prisma.coachDocument.update({
            where: { id: document.id },
            data: {
              processingStatus: 'FAILED',
              processingError: error instanceof Error ? error.message : 'Unknown error',
            },
          })

          // Still return success for document creation, just note embedding failed
          return NextResponse.json({
            documentId: document.id,
            name: documentName,
            embeddingStatus: 'FAILED',
            embeddingError: error instanceof Error ? error.message : 'Unknown error',
            message: 'Document saved but embedding failed. You can retry embedding later.',
          })
        }
      } else {
        // No OpenAI key, skip embedding
        await prisma.coachDocument.update({
          where: { id: document.id },
          data: {
            processingStatus: 'COMPLETED',
            processingError: 'OpenAI API key not configured for embeddings',
          },
        })

        return NextResponse.json({
          documentId: document.id,
          name: documentName,
          embeddingStatus: 'SKIPPED',
          message: 'Document saved but embedding skipped - no OpenAI API key configured.',
        })
      }
    }

    return NextResponse.json({
      documentId: document.id,
      name: documentName,
      chunkCount,
      embeddingStatus: embedForRAG ? 'COMPLETED' : 'SKIPPED',
      message: 'Research saved to documents successfully',
    })
  } catch (error) {
    console.error('Error saving deep research:', error)
    return NextResponse.json(
      { error: 'Failed to save research', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ============================================
// Helper: Build Markdown Document
// ============================================

function buildMarkdownDocument(session: {
  query: string
  report: string | null
  sources: unknown
  provider: string
  completedAt: Date | null
  tokensUsed: number | null
  estimatedCost: number | null
}): string {
  const lines: string[] = []

  // Header
  lines.push(`# Research Report`)
  lines.push('')
  lines.push(`**Query:** ${session.query}`)
  lines.push('')
  lines.push(`**Generated:** ${session.completedAt?.toLocaleDateString() || 'Unknown'}`)
  lines.push(`**Provider:** ${session.provider}`)
  if (session.tokensUsed) {
    lines.push(`**Tokens Used:** ${session.tokensUsed.toLocaleString()}`)
  }
  if (session.estimatedCost) {
    lines.push(`**Estimated Cost:** $${session.estimatedCost.toFixed(4)}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Report content
  if (session.report) {
    lines.push(session.report)
  }

  // Sources section (if not already in report)
  if (session.sources && Array.isArray(session.sources) && session.sources.length > 0) {
    const sources = session.sources as Array<{ url: string; title: string; excerpt?: string }>

    // Check if report already has a sources section
    const reportLower = session.report?.toLowerCase() || ''
    if (!reportLower.includes('## sources') && !reportLower.includes('## references')) {
      lines.push('')
      lines.push('---')
      lines.push('')
      lines.push('## Sources')
      lines.push('')

      sources.forEach((source, i) => {
        lines.push(`${i + 1}. [${source.title}](${source.url})`)
        if (source.excerpt) {
          lines.push(`   > ${source.excerpt}`)
        }
      })
    }
  }

  // Footer
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*Generated by AI Deep Research*')

  return lines.join('\n')
}
