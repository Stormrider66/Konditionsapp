/**
 * Document Embedding API
 *
 * POST /api/documents/[id]/embed - Process document and generate embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'
import {
  chunkText,
  storeChunkEmbeddings,
  getUserOpenAIKey,
} from '@/lib/ai/embeddings';
import {
  processDocument,
  isProcessingError,
} from '@/lib/ai/document-processor';

// Embedding generation can be slow on larger documents
export const maxDuration = 300

// POST - Generate embeddings for document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    // Get user's OpenAI API key
    const apiKey = await getUserOpenAIKey(user.id);
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          code: 'API_KEY_MISSING',
          message:
            'Please configure your OpenAI API key in Settings to generate embeddings.',
        },
        { status: 400 }
      );
    }

    const rateLimited = await rateLimitJsonResponse('documents:embed', user.id, {
      limit: 3,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get document
    const document = await prisma.coachDocument.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (document.processingStatus === 'COMPLETED' && document.chunkCount > 0) {
      return NextResponse.json(
        {
          error: 'Document already processed',
          message:
            'Use force=true to reprocess, which will delete existing chunks.',
        },
        { status: 400 }
      );
    }

    // Check for force reprocess
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    if (force && document.chunkCount > 0) {
      // Delete existing chunks
      await prisma.knowledgeChunk.deleteMany({
        where: { documentId: id },
      });
    }

    // Update status to processing
    await prisma.coachDocument.update({
      where: { id },
      data: { processingStatus: 'PROCESSING' },
    });

    // Get document content
    let content: string | null = null;

    // Check for raw content in metadata first (for text/markdown uploaded directly)
    const metadata = document.metadata as Record<string, unknown> | null;
    if (metadata?.rawContent && typeof metadata.rawContent === 'string') {
      content = metadata.rawContent;
    }

    // If no raw content, use document processor for PDF/Excel/etc.
    if (!content) {
      const result = await processDocument(
        document.fileUrl,
        document.fileType as 'PDF' | 'EXCEL' | 'TEXT' | 'MARKDOWN' | 'VIDEO',
        metadata?.rawContent && typeof metadata.rawContent === 'string' ? metadata.rawContent : undefined
      );

      if (isProcessingError(result)) {
        await prisma.coachDocument.update({
          where: { id },
          data: {
            processingStatus: 'FAILED',
            processingError: result.error,
          },
        });

        return NextResponse.json(
          {
            error: result.error,
            code: result.code,
            details: result.details,
          },
          { status: result.code === 'NOT_IMPLEMENTED' ? 501 : 400 }
        );
      }

      content = result.content;

      // If still no content, return error
      if (!content) {
        return NextResponse.json(
          {
            error: 'No content found for document',
            message: 'Could not extract content from the document.',
          },
          { status: 400 }
        );
      }
    }

    // Guardrails to prevent runaway cost / time on huge documents
    const MAX_EMBED_CHARS = 200_000
    const MAX_CHUNKS = 250
    const originalLength = content.length
    let wasTruncated = false

    if (content.length > MAX_EMBED_CHARS) {
      content = content.slice(0, MAX_EMBED_CHARS)
      wasTruncated = true
    }

    // Chunk the content
    let chunks = chunkText(content, {
      documentId: document.id,
      documentName: document.name,
      fileType: document.fileType,
    });

    if (chunks.length > MAX_CHUNKS) {
      chunks = chunks.slice(0, MAX_CHUNKS)
      wasTruncated = true
    }

    if (chunks.length === 0) {
      await prisma.coachDocument.update({
        where: { id },
        data: {
          processingStatus: 'FAILED',
          processingError: 'No content to chunk',
        },
      });

      return NextResponse.json(
        { error: 'Document has no content to process' },
        { status: 400 }
      );
    }

    // Store embeddings
    const result = await storeChunkEmbeddings(
      document.id,
      user.id,
      chunks,
      apiKey
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to generate embeddings',
          message: result.error,
        },
        { status: 500 }
      );
    }

    // Get updated document
    const updatedDocument = await prisma.coachDocument.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      chunksCreated: result.chunksStored,
      truncated: wasTruncated ? { originalChars: originalLength, maxChars: MAX_EMBED_CHARS, maxChunks: MAX_CHUNKS } : undefined,
      message: `Successfully processed document into ${result.chunksStored} chunks with embeddings.`,
    });
  } catch (error) {
    logger.error('Document embed error', {}, error)

    // Try to update status to failed
    const { id } = await params;
    try {
      await prisma.coachDocument.update({
        where: { id },
        data: {
          processingStatus: 'FAILED',
          processingError:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (updateError) {
      logger.error('Document embed: failed to update status', { documentId: id }, updateError)
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isProd = process.env.NODE_ENV === 'production'
    return NextResponse.json(
      {
        error: 'Failed to process document',
        message: isProd ? 'Internal server error' : (error instanceof Error ? error.message : 'Unknown error'),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
