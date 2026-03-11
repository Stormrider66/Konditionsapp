/**
 * Embedding Generation Utilities
 *
 * Provider-agnostic embedding system. Prefers Gemini Embedding (Google) for
 * better multilingual quality and Matryoshka dimensions, falls back to
 * OpenAI text-embedding-3-small.
 *
 * New embeddings are stored in the `embedding_v2` column (vector(768)).
 * The legacy `embedding` column (vector(1536), ada-002) is left intact
 * until a migration script re-embeds old data.
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getResolvedAiKeys } from '@/lib/user-api-keys';
import { logger } from '@/lib/logger';
import {
  createGoogleGenAIClient,
  embedContent as geminiEmbedContent,
  batchEmbedContent as geminiBatchEmbedContent,
} from '@/lib/ai/google-genai-client';
import { GEMINI_MODELS } from '@/lib/ai/gemini-config';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Primary embedding model (Google Gemini) */
const GOOGLE_EMBEDDING_MODEL = GEMINI_MODELS.EMBEDDING;
/** Fallback embedding model (OpenAI) */
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

/** Embedding dimensions — both providers support Matryoshka at 768 */
const EMBEDDING_DIMENSIONS = 768;

/** Column name for new 768-dim embeddings */
export const EMBEDDING_COLUMN = 'embedding_v2';

/** Exported model name (resolves to the primary provider) */
const EMBEDDING_MODEL = GOOGLE_EMBEDDING_MODEL;

// Chunking configuration
const MAX_CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters overlap between chunks

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Keys available for embedding generation.
 * Pass the full DecryptedUserApiKeys — extra fields are ignored.
 */
export interface EmbeddingKeys {
  googleKey?: string | null;
  openaiKey?: string | null;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
  provider: 'google' | 'openai';
}

export interface ChunkResult {
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
}

// ─── Provider Resolution ────────────────────────────────────────────────────

/**
 * Resolve the best available embedding provider from user keys.
 * Prefers Google (Gemini) for better multilingual/Swedish quality.
 */
function resolveEmbeddingProvider(keys: EmbeddingKeys): {
  provider: 'google' | 'openai';
  key: string;
} {
  if (keys.googleKey) {
    return { provider: 'google', key: keys.googleKey };
  }
  if (keys.openaiKey) {
    return { provider: 'openai', key: keys.openaiKey };
  }
  throw new Error(
    'No API key available for embeddings. Configure a Google or OpenAI API key.',
  );
}

/**
 * Check whether the keys contain at least one usable embedding key.
 */
export function hasEmbeddingKeys(keys: EmbeddingKeys): boolean {
  return !!(keys.googleKey || keys.openaiKey);
}

// ─── Embedding Generation ───────────────────────────────────────────────────

/**
 * Generate embedding for a single text.
 *
 * @param taskType – Hint for asymmetric search:
 *   `RETRIEVAL_QUERY` when embedding a search query (default),
 *   `RETRIEVAL_DOCUMENT` when embedding a document for storage.
 */
export async function generateEmbedding(
  text: string,
  keys: EmbeddingKeys,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' = 'RETRIEVAL_QUERY',
): Promise<EmbeddingResult> {
  const { provider, key } = resolveEmbeddingProvider(keys);

  if (provider === 'google') {
    const client = createGoogleGenAIClient(key);
    const result = await geminiEmbedContent(client, GOOGLE_EMBEDDING_MODEL, text, {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    });
    return {
      embedding: result.values,
      tokens: Math.ceil(text.length / 4), // Estimate — Gemini API doesn't return token count
      model: GOOGLE_EMBEDDING_MODEL,
      provider: 'google',
    };
  }

  // OpenAI fallback — text-embedding-3-small supports Matryoshka dimensions
  const openai = new OpenAI({ apiKey: key });
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens,
    model: OPENAI_EMBEDDING_MODEL,
    provider: 'openai',
  };
}

/**
 * Generate embeddings for multiple texts in batch.
 *
 * @param taskType – `RETRIEVAL_DOCUMENT` when embedding passages for storage (default),
 *   `RETRIEVAL_QUERY` when embedding search queries.
 */
export async function generateEmbeddings(
  texts: string[],
  keys: EmbeddingKeys,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' = 'RETRIEVAL_DOCUMENT',
): Promise<EmbeddingResult[]> {
  const { provider, key } = resolveEmbeddingProvider(keys);

  if (provider === 'google') {
    const client = createGoogleGenAIClient(key);
    const results = await geminiBatchEmbedContent(
      client,
      GOOGLE_EMBEDDING_MODEL,
      texts,
      { outputDimensionality: EMBEDDING_DIMENSIONS, taskType },
    );
    return results.map((r, i) => ({
      embedding: r.values,
      tokens: Math.ceil(texts[i].length / 4),
      model: GOOGLE_EMBEDDING_MODEL,
      provider: 'google',
    }));
  }

  // OpenAI fallback with batching
  const openai = new OpenAI({ apiKey: key });
  const batchSize = 100;
  const allResults: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    for (const item of response.data) {
      allResults.push({
        embedding: item.embedding,
        tokens: Math.round(response.usage.total_tokens / batch.length),
        model: OPENAI_EMBEDDING_MODEL,
        provider: 'openai',
      });
    }
  }

  return allResults;
}

// ─── Text Chunking ──────────────────────────────────────────────────────────

/**
 * Split text into chunks for embedding
 */
export function chunkText(
  text: string,
  metadata?: Record<string, unknown>,
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

// ─── Key Helpers ────────────────────────────────────────────────────────────

/**
 * Get embedding keys for a user (Google + OpenAI).
 * Prefers Google key for Gemini Embedding, falls back to OpenAI.
 */
export async function getUserEmbeddingKeys(userId: string): Promise<EmbeddingKeys> {
  const keys = await getResolvedAiKeys(userId);
  return { googleKey: keys.googleKey, openaiKey: keys.openaiKey };
}

/**
 * @deprecated Use `getUserEmbeddingKeys` + `hasEmbeddingKeys` instead.
 */
export async function getUserOpenAIKey(userId: string): Promise<string | null> {
  const keys = await getResolvedAiKeys(userId);
  return keys.openaiKey;
}

// ─── Vector Column Management ───────────────────────────────────────────────

// Track if we've initialized vector columns per table.column
const vectorColumnsInitialized: Record<string, boolean> = {};

// Cache the working vector type to avoid repeated errors
// Supabase typically uses 'extensions.vector', local/other setups use 'vector'
let resolvedVectorType: 'extensions.vector' | 'vector' | null = null;

export async function getVectorType(): Promise<'extensions.vector' | 'vector'> {
  if (resolvedVectorType) return resolvedVectorType;

  try {
    await prisma.$queryRawUnsafe(`SELECT NULL::extensions.vector`);
    resolvedVectorType = 'extensions.vector';
  } catch {
    resolvedVectorType = 'vector';
  }

  logger.debug(`Resolved pgvector type: ${resolvedVectorType}`);
  return resolvedVectorType;
}

/**
 * Ensure the embedding column exists on a table with the correct vector type.
 *
 * @param tableName - Database table (default: 'KnowledgeChunk')
 * @param columnName - Embedding column name (default: EMBEDDING_COLUMN = 'embedding_v2')
 * @param dimensions - Vector dimensions (default: 768)
 */
export async function ensureVectorColumn(
  tableName: string = 'KnowledgeChunk',
  columnName: string = EMBEDDING_COLUMN,
  dimensions: number = EMBEDDING_DIMENSIONS,
): Promise<void> {
  const cacheKey = `${tableName}.${columnName}`;
  if (vectorColumnsInitialized[cacheKey]) return;

  try {
    const columnCheck = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      ) as exists`,
      tableName,
      columnName,
    );

    if (!columnCheck[0]?.exists) {
      logger.debug(`Creating ${columnName} column on ${tableName} (vector(${dimensions}))`);
      const vtype = await getVectorType();
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${tableName}"
        ADD COLUMN IF NOT EXISTS "${columnName}" ${vtype}(${dimensions})
      `);
      logger.debug(`Column ${columnName} created on ${tableName}`);
    }

    vectorColumnsInitialized[cacheKey] = true;
  } catch (error) {
    logger.error(`Failed to ensure vector column ${columnName} on ${tableName}`, undefined, error);
    throw error;
  }
}

// ─── Store Embeddings ───────────────────────────────────────────────────────

/**
 * Store embeddings for a document's chunks
 */
export async function storeChunkEmbeddings(
  documentId: string,
  coachId: string,
  chunks: ChunkResult[],
  keys: EmbeddingKeys,
): Promise<{ success: boolean; chunksStored: number; error?: string }> {
  try {
    // Ensure the embedding_v2 column exists
    await ensureVectorColumn();

    // Generate embeddings for all chunks (RETRIEVAL_DOCUMENT for storage)
    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents, keys, 'RETRIEVAL_DOCUMENT');

    // Store chunks with embeddings using raw SQL (for pgvector)
    const col = EMBEDDING_COLUMN;

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
      // SECURITY: Validate all embedding values are finite numbers to prevent SQL injection
      const validatedEmbedding = embedding.embedding.map((val, idx) => {
        const num = Number(val);
        if (!Number.isFinite(num)) {
          throw new Error(`Invalid embedding value at index ${idx}: ${val}`);
        }
        return num;
      });
      const embeddingArray = `[${validatedEmbedding.join(',')}]`;
      const vtype = await getVectorType();
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeChunk" SET "${col}" = $1::${vtype} WHERE id = $2`,
        embeddingArray,
        knowledgeChunk.id,
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
    logger.error('Error storing chunk embeddings', { documentId }, error);

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

// ─── Search ─────────────────────────────────────────────────────────────────

/**
 * Search for similar chunks using vector similarity.
 * Uses the embedding_v2 column (768 dims). Rows without embedding_v2 are skipped
 * until re-embedded via the migration script.
 */
export async function searchSimilarChunks(
  query: string,
  coachId: string,
  keys: EmbeddingKeys,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    documentIds?: string[];
  } = {},
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
  const col = EMBEDDING_COLUMN;

  // Generate embedding for query (RETRIEVAL_QUERY for search)
  const { embedding } = await generateEmbedding(query, keys, 'RETRIEVAL_QUERY');
  // SECURITY: Validate all embedding values are finite numbers
  const validatedEmbedding = embedding.map((val, idx) => {
    const num = Number(val);
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid query embedding value at index ${idx}: ${val}`);
    }
    return num;
  });
  const embeddingArray = `[${validatedEmbedding.join(',')}]`;

  // Search using pgvector with cached vector type
  const vtype = await getVectorType();

  const searchQuery = (withDocs: boolean) =>
    withDocs
      ? `
      SELECT
        id,
        "documentId" as document_id,
        content,
        metadata,
        1 - ("${col}" <=> $1::${vtype}) as similarity
      FROM "KnowledgeChunk"
      WHERE "coachId" = $2
        AND "documentId" = ANY($3)
        AND "${col}" IS NOT NULL
        AND 1 - ("${col}" <=> $1::${vtype}) > $4
      ORDER BY "${col}" <=> $1::${vtype}
      LIMIT $5
    `
      : `
      SELECT
        id,
        "documentId" as document_id,
        content,
        metadata,
        1 - ("${col}" <=> $1::${vtype}) as similarity
      FROM "KnowledgeChunk"
      WHERE "coachId" = $2
        AND "${col}" IS NOT NULL
        AND 1 - ("${col}" <=> $1::${vtype}) > $3
      ORDER BY "${col}" <=> $1::${vtype}
      LIMIT $4
    `;

  type SearchResult = {
    id: string;
    document_id: string;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
  };

  let results: SearchResult[];

  if (documentIds && documentIds.length > 0) {
    results = await prisma.$queryRawUnsafe<SearchResult[]>(
      searchQuery(true),
      embeddingArray,
      coachId,
      documentIds,
      matchThreshold,
      matchCount,
    );
  } else {
    results = await prisma.$queryRawUnsafe<SearchResult[]>(
      searchQuery(false),
      embeddingArray,
      coachId,
      matchThreshold,
      matchCount,
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

/**
 * Search system document chunks for knowledge skills auto-retrieval.
 * Looks up the system user (system@trainomics.app) and searches their documents.
 */
let cachedSystemUserId: string | null = null;

async function getSystemUserId(): Promise<string | null> {
  if (cachedSystemUserId) return cachedSystemUserId;
  const user = await prisma.user.findFirst({
    where: { email: 'system@trainomics.app' },
    select: { id: true },
  });
  if (user) cachedSystemUserId = user.id;
  return cachedSystemUserId;
}

export async function searchSystemChunks(
  query: string,
  keys: EmbeddingKeys,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    documentIds?: string[];
  } = {},
): Promise<
  {
    id: string;
    documentId: string;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
  }[]
> {
  const systemUserId = await getSystemUserId();
  if (!systemUserId) {
    logger.warn('No system user found for knowledge search');
    return [];
  }
  return searchSimilarChunks(query, systemUserId, keys, options);
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
