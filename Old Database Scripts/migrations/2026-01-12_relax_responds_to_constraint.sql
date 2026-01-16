-- Relax the responds_to constraints in anthology_responses
-- This allows responses to be "orphans" (not responding to anything), which
-- will place them freely on the map.

-- Drop both the old XOR constraint, any intermediate constraints, and our new constraint if they exist
ALTER TABLE anthology_responses DROP CONSTRAINT IF EXISTS responds_to_one;
ALTER TABLE anthology_responses DROP CONSTRAINT IF EXISTS responds_to_something;
ALTER TABLE anthology_responses DROP CONSTRAINT IF EXISTS responds_to_max_one;

-- Ensure that AT MOST one of responds_to_question_id or responds_to_response_id is set.
-- (Removing the requirement that EXACTLY one must be set)
ALTER TABLE anthology_responses ADD CONSTRAINT responds_to_max_one CHECK (
    (responds_to_question_id IS NULL OR responds_to_response_id IS NULL)
);
