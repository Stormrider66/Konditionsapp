-- Setup pgvector for document embeddings
-- Run this in Supabase SQL Editor

-- 1. Enable the vector extension (if not already)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Make vector type accessible from public schema
-- This is needed because Supabase may install extensions in a separate schema
DO $$
BEGIN
    -- Check if the type alias already exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        -- Create a domain or use SET search_path approach
        -- The simplest solution is to ensure search_path includes extensions
        EXECUTE 'ALTER DATABASE postgres SET search_path TO public, extensions';
    END IF;
END
$$;

-- 3. Add the embedding column to KnowledgeChunk if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'KnowledgeChunk' AND column_name = 'embedding'
    ) THEN
        ALTER TABLE "KnowledgeChunk" ADD COLUMN embedding extensions.vector(1536);
    END IF;
END
$$;

-- 4. Create an index for faster similarity search (if not exists)
CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_idx
ON "KnowledgeChunk"
USING ivfflat (embedding extensions.vector_cosine_ops)
WITH (lists = 100);

-- Verify setup
SELECT
    EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as vector_extension_exists,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'KnowledgeChunk' AND column_name = 'embedding') as embedding_column_exists;
