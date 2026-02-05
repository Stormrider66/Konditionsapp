-- pgvector setup for RAG embeddings
-- This is managed OUTSIDE of Prisma migrations because Prisma doesn't support the vector type.
-- Run this manually via Supabase SQL editor or: npx prisma db execute --schema prisma/schema.prisma --stdin < prisma/pgvector_setup.sql

-- Enable pgvector extension (must also be enabled in Supabase Dashboard > Database > Extensions)
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding columns (1536 dims for OpenAI text-embedding-ada-002)
ALTER TABLE "KnowledgeChunk" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
ALTER TABLE "KnowledgeSkill" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- IVFFlat index for fast similarity search (create after >100 rows exist)
-- CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding
-- ON "KnowledgeChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similarity search function
CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  query_embedding vector(1536),
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
    1 - (kc.embedding <=> query_embedding) as similarity
  FROM "KnowledgeChunk" kc
  WHERE kc."coachId"::uuid = coach_id_filter
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
