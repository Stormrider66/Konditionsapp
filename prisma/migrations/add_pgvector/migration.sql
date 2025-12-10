-- Enable pgvector extension (requires Supabase project settings to enable)
-- This must be enabled in Supabase dashboard first: Database > Extensions > vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to KnowledgeChunk table
-- Using 1536 dimensions for OpenAI text-embedding-ada-002
-- Can also use 3072 for text-embedding-3-large
ALTER TABLE "KnowledgeChunk"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Create IVFFlat index for fast similarity search
-- ivfflat is good for datasets with 1K-1M vectors
-- Use HNSW for larger datasets
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding
ON "KnowledgeChunk"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: HNSW index (better for larger datasets, ~10x faster queries)
-- CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding_hnsw
-- ON "KnowledgeChunk"
-- USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- Function to search for similar chunks
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

-- Grant permissions (adjust role as needed for your Supabase setup)
-- GRANT EXECUTE ON FUNCTION search_knowledge_chunks TO authenticated;
-- GRANT EXECUTE ON FUNCTION search_knowledge_chunks TO service_role;
