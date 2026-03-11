-- pgvector setup for RAG embeddings
-- This is managed OUTSIDE of Prisma migrations because Prisma doesn't support the vector type.
-- Run this manually via Supabase SQL editor or: npx prisma db execute --schema prisma/schema.prisma --stdin < prisma/pgvector_setup.sql

-- Enable pgvector extension (must also be enabled in Supabase Dashboard > Database > Extensions)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Legacy columns (1536 dims, OpenAI text-embedding-ada-002) ──────────────
-- These are left intact for rollback. New code does NOT read/write these.
-- After migration is complete, drop with: ALTER TABLE "X" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "KnowledgeChunk" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
ALTER TABLE "KnowledgeSkill" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- ─── New columns (768 dims, Gemini Embedding / OpenAI text-embedding-3-small) ─
ALTER TABLE "KnowledgeChunk" ADD COLUMN IF NOT EXISTS "embedding_v2" vector(768);
ALTER TABLE "KnowledgeSkill" ADD COLUMN IF NOT EXISTS "embedding_v2" vector(768);

-- ─── Indexes ────────────────────────────────────────────────────────────────
-- IVFFlat index for fast similarity search on new columns (create after >100 rows)
-- CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding_v2
-- ON "KnowledgeChunk" USING ivfflat (embedding_v2 vector_cosine_ops) WITH (lists = 100);

-- ─── Search function (uses embedding_v2 column) ────────────────────────────
CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  query_embedding vector(768),
  coach_id_filter uuid,
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc."documentId"::uuid,
    kc.content,
    kc.metadata,
    1 - (kc.embedding_v2 <=> query_embedding) as similarity
  FROM "KnowledgeChunk" kc
  WHERE kc."coachId"::uuid = coach_id_filter
    AND kc.embedding_v2 IS NOT NULL
    AND 1 - (kc.embedding_v2 <=> query_embedding) > match_threshold
  ORDER BY kc.embedding_v2 <=> query_embedding
  LIMIT match_count;
END;
$$;
