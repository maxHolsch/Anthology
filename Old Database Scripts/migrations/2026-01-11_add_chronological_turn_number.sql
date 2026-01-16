-- Migration: Add chronological_turn_number field
-- This field represents the temporal order of sensemaking responses based on audio_start_ms
-- Only populated for responses created by the sensemaking job (metadata->>'source' = 'sensemaking')
-- User-added responses will have NULL chronological_turn_number

-- Add the new column
ALTER TABLE anthology_responses 
ADD COLUMN chronological_turn_number INTEGER;

-- Add a partial index for efficient querying of sensemaking responses by chronological order
CREATE INDEX idx_anthology_responses_chronological 
ON anthology_responses(conversation_id, chronological_turn_number)
WHERE chronological_turn_number IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN anthology_responses.chronological_turn_number IS 
'Temporal order (1, 2, 3...) for sensemaking responses only. NULL for user-added responses. Based on audio_start_ms.';
