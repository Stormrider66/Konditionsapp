/**
 * Embedding Generation Utilities
 *
 * Uses OpenAI's text-embedding-ada-002 model for generating embeddings.
 * Embeddings are 1536-dimensional vectors used for semantic search.
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys';

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
  const keys = await getDecryptedUserApiKeys(userId)
  return keys.openaiKey
}

// Track if we've initialized the vector column
let vectorColumnInitialized = false;

/**
 * Ensure the embedding column exists with the correct type
 */
async function ensureVectorColumn(): Promise<void> {
  if (vectorColumnInitialized) return;

  try {
    // Check if the column exists
    const columnCheck = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'KnowledgeChunk' AND column_name = 'embedding'
      ) as exists
    `;

    if (!columnCheck[0]?.exists) {
      console.log('[Embeddings] Creating embedding column...');
      // Try to add the column with extensions schema (Supabase default)
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "KnowledgeChunk"
          ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536)
        `);
      } catch {
        // Fallback to unqualified vector type
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "KnowledgeChunk"
          ADD COLUMN IF NOT EXISTS embedding vector(1536)
        `);
      }
      console.log('[Embeddings] Embedding column created');
    }

    vectorColumnInitialized = true;
  } catch (error) {
    console.error('[Embeddings] Failed to ensure vector column:', error);
    throw error;
  }
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
    // Ensure the embedding column exists
    await ensureVectorColumn();

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
      // Use schema-qualified type for Supabase compatibility (extensions.vector)
      const embeddingArray = `[${embedding.embedding.join(',')}]`;
      try {
        // Try with extensions schema first (Supabase default)
        await prisma.$executeRawUnsafe(
          `UPDATE "KnowledgeChunk" SET embedding = $1::extensions.vector WHERE id = $2`,
          embeddingArray,
          knowledgeChunk.id
        );
      } catch {
        // Fallback to public schema if extensions doesn't work
        console.log('[Embeddings] extensions.vector failed, trying public.vector...');
        await prisma.$executeRawUnsafe(
          `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
          embeddingArray,
          knowledgeChunk.id
        );
      }
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
  // Try extensions.vector first (Supabase), fallback to unqualified
  let results;

  const searchQuery = (vectorType: string, withDocs: boolean) => withDocs
    ? `
      SELECT
        id,
        "documentId" as document_id,
        content,
        metadata,
        1 - (embedding <=> $1::${vectorType}) as similarity
      FROM "KnowledgeChunk"
      WHERE "coachId" = $2
        AND "documentId" = ANY($3)
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> $1::${vectorType}) > $4
      ORDER BY embedding <=> $1::${vectorType}
      LIMIT $5
    `
    : `
      SELECT
        id,
        "documentId" as document_id,
        content,
        metadata,
        1 - (embedding <=> $1::${vectorType}) as similarity
      FROM "KnowledgeChunk"
      WHERE "coachId" = $2
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> $1::${vectorType}) > $3
      ORDER BY embedding <=> $1::${vectorType}
      LIMIT $4
    `;

  try {
    if (documentIds && documentIds.length > 0) {
      results = await prisma.$queryRawUnsafe<
        {
          id: string;
          document_id: string;
          content: string;
          metadata: Record<string, unknown> | null;
          similarity: number;
        }[]
      >(
        searchQuery('extensions.vector', true),
        embeddingArray,
        coachId,
        documentIds,
        matchThreshold,
        matchCount
      );
    } else {
      results = await prisma.$queryRawUnsafe<
        {
          id: string;
          document_id: string;
          content: string;
          metadata: Record<string, unknown> | null;
          similarity: number;
        }[]
      >(
        searchQuery('extensions.vector', false),
        embeddingArray,
        coachId,
        matchThreshold,
        matchCount
      );
    }
  } catch {
    // Fallback to unqualified vector type
    console.log('[Embeddings] Search fallback to unqualified vector type');
    if (documentIds && documentIds.length > 0) {
      results = await prisma.$queryRawUnsafe<
        {
          id: string;
          document_id: string;
          content: string;
          metadata: Record<string, unknown> | null;
          similarity: number;
        }[]
      >(
        searchQuery('vector', true),
        embeddingArray,
        coachId,
        documentIds,
        matchThreshold,
        matchCount
      );
    } else {
      results = await prisma.$queryRawUnsafe<
        {
          id: string;
          document_id: string;
          content: string;
          metadata: Record<string, unknown> | null;
          similarity: number;
        }[]
      >(
        searchQuery('vector', false),
        embeddingArray,
        coachId,
        matchThreshold,
        matchCount
      );
    }
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
