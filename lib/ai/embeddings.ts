/**
 * Embedding Generation Utilities
 *
 * Uses OpenAI's text-embedding-ada-002 model for generating embeddings.
 * Embeddings are 1536-dimensional vectors used for semantic search.
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

// Default embedding model
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const EMBEDDING_DIMENSIONS = 1536;

// Chunking configuration
const MAX_CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters overlap between chunks

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface ChunkResult {
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
}

/**
 * Create OpenAI client with user's API key
 */
function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const openai = createOpenAIClient(apiKey);

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens,
    model: EMBEDDING_MODEL,
  };
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<EmbeddingResult[]> {
  const openai = createOpenAIClient(apiKey);

  // OpenAI allows up to 2048 inputs per request
  const batchSize = 100;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    for (const item of response.data) {
      results.push({
        embedding: item.embedding,
        tokens: Math.round(response.usage.total_tokens / batch.length),
        model: EMBEDDING_MODEL,
      });
    }
  }

  return results;
}

/**
 * Split text into chunks for embedding
 */
export function chunkText(
  text: string,
  metadata?: Record<string, unknown>
): ChunkResult[] {
  const chunks: ChunkResult[] = [];

  // Clean up text
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Try to split on paragraph boundaries first
  const paragraphs = cleanText.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size
    if (currentChunk.length + paragraph.length > MAX_CHUNK_SIZE) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          metadata: { ...metadata, chunkType: 'paragraph' },
        });
      }

      // If paragraph itself is too long, split it
      if (paragraph.length > MAX_CHUNK_SIZE) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let sentenceChunk = '';

        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > MAX_CHUNK_SIZE) {
            if (sentenceChunk.trim()) {
              chunks.push({
                content: sentenceChunk.trim(),
                index: chunkIndex++,
                metadata: { ...metadata, chunkType: 'sentence' },
              });
            }
            sentenceChunk = sentence;
          } else {
            sentenceChunk += sentence;
          }
        }

        currentChunk = sentenceChunk;
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      metadata: { ...metadata, chunkType: 'paragraph' },
    });
  }

  return chunks;
}

/**
 * Get user's OpenAI API key from database
 */
export async function getUserOpenAIKey(userId: string): Promise<string | null> {
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId },
    select: { openaiKeyEncrypted: true, openaiKeyValid: true },
  });

  if (!apiKeys?.openaiKeyEncrypted || !apiKeys.openaiKeyValid) {
    return null;
  }

  // In production, decrypt the key
  // For now, we're storing it directly (should be encrypted)
  return apiKeys.openaiKeyEncrypted;
}

/**
 * Store embeddings for a document's chunks
 */
export async function storeChunkEmbeddings(
  documentId: string,
  coachId: string,
  chunks: ChunkResult[],
  apiKey: string
): Promise<{ success: boolean; chunksStored: number; error?: string }> {
  try {
    // Generate embeddings for all chunks
    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents, apiKey);

    // Store chunks with embeddings using raw SQL (for pgvector)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      // Create the chunk record
      const knowledgeChunk = await prisma.knowledgeChunk.create({
        data: {
          documentId,
          coachId,
          content: chunk.content,
          chunkIndex: chunk.index,
          embeddingModel: embedding.model,
          tokenCount: embedding.tokens,
          metadata: chunk.metadata as object,
        },
      });

      // Update embedding using raw SQL (pgvector)
      const embeddingArray = `[${embedding.embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
        embeddingArray,
        knowledgeChunk.id
      );
    }

    // Update document chunk count
    await prisma.coachDocument.update({
      where: { id: documentId },
      data: {
        chunkCount: chunks.length,
        processingStatus: 'COMPLETED',
      },
    });

    return { success: true, chunksStored: chunks.length };
  } catch (error) {
    console.error('Error storing chunk embeddings:', error);

    await prisma.coachDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: 'FAILED',
        processingError:
          error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      success: false,
      chunksStored: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
  query: string,
  coachId: string,
  apiKey: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    documentIds?: string[];
  } = {}
): Promise<
  {
    id: string;
    documentId: string;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
  }[]
> {
  const { matchThreshold = 0.78, matchCount = 10, documentIds } = options;

  // Generate embedding for query
  const { embedding } = await generateEmbedding(query, apiKey);
  const embeddingArray = `[${embedding.join(',')}]`;

  // Search using pgvector
  let results;

  if (documentIds && documentIds.length > 0) {
    // Filter by specific documents
    results = await prisma.$queryRawUnsafe<
      {
        id: string;
        document_id: string;
        content: string;
        metadata: Record<string, unknown> | null;
        similarity: number;
      }[]
    >(
      `
      SELECT
        id,
        "documentId" as document_id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM "KnowledgeChunk"
      WHERE "coachId" = $2
        AND "documentId" = ANY($3)
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) > $4
      ORDER BY embedding <=> $1::vector
      LIMIT $5
    `,
      embeddingArray,
      coachId,
      documentIds,
      matchThreshold,
      matchCount
    );
  } else {
    // Search all coach documents
    results = await prisma.$queryRawUnsafe<
      {
        id: string;
        document_id: string;
        content: string;
        metadata: Record<string, unknown> | null;
        similarity: number;
      }[]
    >(
      `
      SELECT
        id,
        "documentId" as document_id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM "KnowledgeChunk"
      WHERE "coachId" = $2
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) > $3
      ORDER BY embedding <=> $1::vector
      LIMIT $4
    `,
      embeddingArray,
      coachId,
      matchThreshold,
      matchCount
    );
  }

  return results.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    content: r.content,
    metadata: r.metadata,
    similarity: r.similarity,
  }));
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
