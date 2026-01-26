-- ============================================
-- Migration: Add Embeddings to Responses
-- ============================================
-- Adds a vector column for storing OpenAI text embeddings
-- Used for semantic-based node positioning (UMAP projection)
-- ============================================

-- Enable pgvector extension (if not already enabled)
-- Note: This may require superuser privileges in Supabase
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to responses table
-- Using 1536 dimensions for OpenAI text-embedding-3-small
ALTER TABLE anthology_responses
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity searches
-- Using ivfflat index for approximate nearest neighbor search
-- (Only create if table has rows, otherwise defer)
CREATE INDEX IF NOT EXISTS idx_anthology_responses_embedding
ON anthology_responses
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment
COMMENT ON COLUMN anthology_responses.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions) for semantic positioning';
