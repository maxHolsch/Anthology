-- Migration: Add medium and synchronicity fields to anthology_responses
-- Date: 2026-01-11
-- Description: Adds two new fields to response nodes:
--   - medium: specifies if the response is "audio" or "text"
--   - synchronicity: specifies if the response is "sync" or "asynchronous"

-- Add medium column with constraint
ALTER TABLE anthology_responses
ADD COLUMN medium TEXT CHECK (medium IN ('audio', 'text'));

-- Add synchronicity column with constraint
ALTER TABLE anthology_responses
ADD COLUMN synchronicity TEXT CHECK (synchronicity IN ('sync', 'asynchronous'));

-- Add comments for documentation
COMMENT ON COLUMN anthology_responses.medium IS 'Type of response medium: "audio" or "text"';
COMMENT ON COLUMN anthology_responses.synchronicity IS 'Synchronicity of the response: "sync" or "asynchronous"';
