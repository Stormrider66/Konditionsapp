/**
 * Knowledge Search API
 *
 * POST /api/knowledge/search
 * Performs semantic search across coach's document library using pgvector.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { searchSimilarChunks, getUserOpenAIKey } from '@/lib/ai/embeddings';
import { prisma } from '@/lib/prisma';

interface SearchRequest {
  query: string;
  matchThreshold?: number;
  matchCount?: number;
  documentIds?: string[];
}

interface SearchResult {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const body: SearchRequest = await request.json();
    const { query, matchThreshold = 0.78, matchCount = 10, documentIds } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Get user's OpenAI API key for embeddings
    const apiKey = await getUserOpenAIKey(user.id);
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          code: 'API_KEY_MISSING',
          message:
            'Please configure your OpenAI API key in Settings to use knowledge search.',
        },
        { status: 400 }
      );
    }

    // Perform semantic search
    const chunks = await searchSimilarChunks(query, user.id, apiKey, {
      matchThreshold,
      matchCount,
      documentIds,
    });

    // Get document names for the results
    const documentIdSet = new Set(chunks.map((c) => c.documentId));
    const documents = await prisma.coachDocument.findMany({
      where: {
        id: { in: Array.from(documentIdSet) },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const documentMap = new Map(documents.map((d) => [d.id, d.name]));

    // Build response with document names
    const results: SearchResult[] = chunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      documentName: documentMap.get(chunk.documentId) || 'Unknown Document',
      content: chunk.content,
      metadata: chunk.metadata,
      similarity: chunk.similarity,
    }));

    return NextResponse.json({
      success: true,
      query,
      results,
      totalResults: results.length,
    });
  } catch (error) {
    console.error('Knowledge search error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Failed to perform knowledge search',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
