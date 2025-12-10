/**
 * Knowledge Context Builder API
 *
 * POST /api/knowledge/context
 * Builds context from selected documents for AI conversations.
 * Retrieves relevant chunks based on the query and selected document IDs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { searchSimilarChunks, getUserOpenAIKey } from '@/lib/ai/embeddings';
import { prisma } from '@/lib/prisma';

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

    // Get user's OpenAI API key
    const apiKey = await getUserOpenAIKey(user.id);
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          code: 'API_KEY_MISSING',
        },
        { status: 400 }
      );
    }

    // Perform semantic search across selected documents
    const chunks = await searchSimilarChunks(query, user.id, apiKey, {
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
    console.error('Context building error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Failed to build context',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
