-- ============================================
-- Migration: Ensure response turn_number is unique per conversation
-- Date: 2025-12-15
--
-- Purpose:
--   Enable idempotent inserts for time-sliced sensemaking by upserting
--   on (conversation_id, turn_number).
-- ============================================

begin;

-- Allow multiple NULLs, but prevent duplicates when turn_number is set.
create unique index if not exists idx_unique_anthology_responses_conversation_turn
  on anthology_responses(conversation_id, turn_number)
  where turn_number is not null;

commit;

