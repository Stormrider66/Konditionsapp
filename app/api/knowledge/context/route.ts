/**
 * Knowledge Context Builder API
 *
 * POST /api/knowledge/context
 * Builds context from selected documents for AI conversations.
 * Retrieves relevant chunks based on the query and selected document IDs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { searchSimilarChunks, getUserEmbeddingKeys, hasEmbeddingKeys } from '@/lib/ai/embeddings';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

interface ContextRequest {
  query: string;
  documentIds: string[];
  maxChunks?: number;
  matchThreshold?: number;
  includeMetadata?: boolean;
}

interface ContextChunk {
  documentName: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown> | null;
}

interface ContextResponse {
  success: boolean;
  context: string;
  chunks: ContextChunk[];
  documentsUsed: string[];
  totalTokensEstimate: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const body: ContextRequest = await request.json();
    const {
      query,
      documentIds,
      maxChunks = 10,
      matchThreshold = 0.75,
      includeMetadata = false,
    } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required for context building' },
        { status: 400 }
      );
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one document ID must be provided' },
        { status: 400 }
      );
    }

    // Verify documents belong to this coach
    const documents = await prisma.coachDocument.findMany({
      where: {
        id: { in: documentIds },
        coachId: user.id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (documents.length !== documentIds.length) {
      return NextResponse.json(
        { error: 'One or more documents not found or not accessible' },
        { status: 404 }
      );
    }

    const documentMap = new Map(documents.map((d) => [d.id, d.name]));

    // Get user's embedding API keys (Google preferred, OpenAI fallback)
    const embeddingKeys = await getUserEmbeddingKeys(user.id);
    if (!hasEmbeddingKeys(embeddingKeys)) {
      return NextResponse.json(
        {
          error: 'AI API key not configured',
          code: 'API_KEY_MISSING',
          message: 'Please configure a Google or OpenAI API key in Settings to use document search.',
        },
        { status: 400 }
      );
    }

    // Perform semantic search across selected documents
    const chunks = await searchSimilarChunks(query, user.id, embeddingKeys, {
      matchThreshold,
      matchCount: maxChunks,
      documentIds,
    });

    // Build context chunks with document names
    const contextChunks: ContextChunk[] = chunks.map((chunk) => ({
      documentName: documentMap.get(chunk.documentId) || 'Unknown',
      content: chunk.content,
      similarity: chunk.similarity,
      ...(includeMetadata ? { metadata: chunk.metadata } : {}),
    }));

    // Build formatted context string for AI
    const contextParts = contextChunks.map((chunk, index) => {
      return `[Source ${index + 1}: ${chunk.documentName}]\n${chunk.content}`;
    });

    const context = contextParts.join('\n\n---\n\n');

    // Estimate tokens (rough: ~4 chars per token)
    const totalTokensEstimate = Math.ceil(context.length / 4);

    const response: ContextResponse = {
      success: true,
      context,
      chunks: contextChunks,
      documentsUsed: documents.map((d) => d.name),
      totalTokensEstimate,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Context building error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Failed to build context',
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
