-- ============================================
-- ANTHOLOGY SUPABASE SCHEMA
-- ============================================
-- Supports individual recordings per node
-- Designed for scalability and flexibility
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Recordings: Audio files that can be linked to conversations or individual nodes
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- File information
    file_path TEXT NOT NULL, -- e.g., "recordings/6798.mp3" or Supabase Storage URL
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT DEFAULT 'audio/mpeg',

    -- Audio metadata
    duration_ms INTEGER NOT NULL, -- Duration in milliseconds
    sample_rate INTEGER,
    bit_rate INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}', -- Flexible storage for additional data

    CONSTRAINT positive_duration CHECK (duration_ms > 0)
);

-- Conversations: Discussion sessions that group questions and responses
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identifiers
    legacy_id TEXT UNIQUE, -- e.g., "conv_ca766496" from JSON

    -- Basic info
    title TEXT NOT NULL,
    date DATE,
    location TEXT,
    facilitator TEXT,

    -- Visual
    color TEXT DEFAULT '#4A90E2', -- Hex color for visualization

    -- Metadata
    topics TEXT[], -- Array of topic strings
    participants TEXT[], -- Array of participant names
    source_transcript TEXT, -- Path to original transcript
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Conversation Recordings: Link conversations to their primary/related recordings
CREATE TABLE conversation_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

    -- Relationship type
    is_primary BOOLEAN DEFAULT FALSE, -- Main recording for the conversation
    recording_order INTEGER, -- For multiple recordings in sequence

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(conversation_id, recording_id)
);

-- Speakers: Participants with color assignments
CREATE TABLE speakers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    name TEXT NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

    -- Visual colors (from Design.md color system)
    circle_color TEXT NOT NULL,
    faded_circle_color TEXT NOT NULL,
    quote_rectangle_color TEXT NOT NULL,
    faded_quote_rectangle_color TEXT NOT NULL,
    quote_text_color TEXT NOT NULL,
    faded_quote_text_color TEXT NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(name, conversation_id)
);

-- Questions: Question nodes in the visualization
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identifiers
    legacy_id TEXT UNIQUE, -- e.g., "q_001" from JSON
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Content
    question_text TEXT NOT NULL,
    facilitator TEXT,

    -- Optional audio (questions can now have their own recordings)
    recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,
    audio_start_ms INTEGER,
    audio_end_ms INTEGER,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_audio_range CHECK (
        (recording_id IS NULL AND audio_start_ms IS NULL AND audio_end_ms IS NULL) OR
        (recording_id IS NOT NULL AND audio_start_ms IS NOT NULL AND audio_end_ms IS NOT NULL AND audio_start_ms < audio_end_ms)
    )
);

-- Responses: Response nodes in the visualization
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identifiers
    legacy_id TEXT UNIQUE, -- e.g., "r_002" from JSON
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Relationships
    responds_to_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    responds_to_response_id UUID REFERENCES responses(id) ON DELETE SET NULL,

    -- Speaker
    speaker_id UUID REFERENCES speakers(id) ON DELETE SET NULL,
    speaker_name TEXT NOT NULL, -- Denormalized for performance

    -- Content
    speaker_text TEXT NOT NULL,
    pull_quote TEXT, -- Optional featured excerpt for rectangle visualization

    -- Audio (NOW EACH RESPONSE CAN HAVE ITS OWN RECORDING)
    recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,
    audio_start_ms INTEGER,
    audio_end_ms INTEGER,

    -- Metadata
    turn_number INTEGER, -- Order in conversation
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT responds_to_one CHECK (
        (responds_to_question_id IS NOT NULL AND responds_to_response_id IS NULL) OR
        (responds_to_question_id IS NULL AND responds_to_response_id IS NOT NULL)
    ),
    CONSTRAINT valid_audio_range CHECK (
        (recording_id IS NULL AND audio_start_ms IS NULL AND audio_end_ms IS NULL) OR
        (recording_id IS NOT NULL AND audio_start_ms IS NOT NULL AND audio_end_ms IS NOT NULL AND audio_start_ms < audio_end_ms)
    )
);

-- Word Timestamps: For karaoke-style highlighting (Design.md line 158)
CREATE TABLE word_timestamps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Parent relationship (can belong to question or response)
    response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,

    -- Word data
    text TEXT NOT NULL,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    speaker TEXT,

    -- Position in sequence
    word_order INTEGER NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT belongs_to_one CHECK (
        (response_id IS NOT NULL AND question_id IS NULL) OR
        (response_id IS NULL AND question_id IS NOT NULL)
    ),
    CONSTRAINT valid_time_range CHECK (start_ms < end_ms)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Recordings
CREATE INDEX idx_recordings_file_path ON recordings(file_path);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);

-- Conversations
CREATE INDEX idx_conversations_legacy_id ON conversations(legacy_id);
CREATE INDEX idx_conversations_date ON conversations(date DESC);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Conversation Recordings
CREATE INDEX idx_conversation_recordings_conversation ON conversation_recordings(conversation_id);
CREATE INDEX idx_conversation_recordings_recording ON conversation_recordings(recording_id);
CREATE INDEX idx_conversation_recordings_primary ON conversation_recordings(conversation_id) WHERE is_primary = TRUE;

-- Speakers
CREATE INDEX idx_speakers_conversation ON speakers(conversation_id);
CREATE INDEX idx_speakers_name ON speakers(name);

-- Questions
CREATE INDEX idx_questions_legacy_id ON questions(legacy_id);
CREATE INDEX idx_questions_conversation ON questions(conversation_id);
CREATE INDEX idx_questions_recording ON questions(recording_id);

-- Responses
CREATE INDEX idx_responses_legacy_id ON responses(legacy_id);
CREATE INDEX idx_responses_conversation ON responses(conversation_id);
CREATE INDEX idx_responses_question ON responses(responds_to_question_id);
CREATE INDEX idx_responses_response ON responses(responds_to_response_id);
CREATE INDEX idx_responses_speaker ON responses(speaker_id);
CREATE INDEX idx_responses_recording ON responses(recording_id);
CREATE INDEX idx_responses_turn_number ON responses(conversation_id, turn_number);

-- Word Timestamps
CREATE INDEX idx_word_timestamps_response ON word_timestamps(response_id);
CREATE INDEX idx_word_timestamps_question ON word_timestamps(question_id);
CREATE INDEX idx_word_timestamps_order ON word_timestamps(response_id, word_order) WHERE response_id IS NOT NULL;
CREATE INDEX idx_word_timestamps_question_order ON word_timestamps(question_id, word_order) WHERE question_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_timestamps ENABLE ROW LEVEL SECURITY;

-- Public read access (adjust based on your needs)
CREATE POLICY "Public read access" ON recordings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON conversations FOR SELECT USING (true);
CREATE POLICY "Public read access" ON conversation_recordings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON speakers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON questions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON responses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON word_timestamps FOR SELECT USING (true);

-- Authenticated write access (adjust based on your needs)
-- Example: Allow authenticated users to insert/update
-- CREATE POLICY "Authenticated write access" ON recordings
--   FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON recordings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON speakers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Complete response view with all related data
CREATE VIEW response_details AS
SELECT
    r.id,
    r.legacy_id,
    r.speaker_text,
    r.pull_quote,
    r.audio_start_ms,
    r.audio_end_ms,
    r.turn_number,

    -- Speaker info
    s.name AS speaker_name,
    s.circle_color,
    s.quote_text_color,

    -- Question info
    q.question_text,
    q.legacy_id AS question_legacy_id,

    -- Recording info
    rec.file_path AS recording_path,
    rec.duration_ms AS recording_duration,

    -- Conversation info
    c.title AS conversation_title,
    c.color AS conversation_color,

    r.created_at,
    r.updated_at
FROM responses r
LEFT JOIN speakers s ON r.speaker_id = s.id
LEFT JOIN questions q ON r.responds_to_question_id = q.id
LEFT JOIN recordings rec ON r.recording_id = rec.id
LEFT JOIN conversations c ON r.conversation_id = c.id;

-- Question summary with response counts
CREATE VIEW question_summary AS
SELECT
    q.id,
    q.legacy_id,
    q.question_text,
    q.facilitator,
    c.title AS conversation_title,
    COUNT(r.id) AS response_count,
    q.created_at
FROM questions q
LEFT JOIN responses r ON r.responds_to_question_id = q.id
LEFT JOIN conversations c ON q.conversation_id = c.id
GROUP BY q.id, q.legacy_id, q.question_text, q.facilitator, c.title, q.created_at;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE recordings IS 'Audio files that can be linked to conversations or individual nodes';
COMMENT ON TABLE conversations IS 'Discussion sessions containing questions and responses';
COMMENT ON TABLE conversation_recordings IS 'Many-to-many relationship between conversations and recordings';
COMMENT ON TABLE speakers IS 'Participants with visual color assignments per conversation';
COMMENT ON TABLE questions IS 'Question nodes in the visualization graph';
COMMENT ON TABLE responses IS 'Response nodes in the visualization graph';
COMMENT ON TABLE word_timestamps IS 'Word-level timestamps for karaoke-style audio playback highlighting';

COMMENT ON COLUMN responses.recording_id IS 'Individual recording for this response (allows per-node audio)';
COMMENT ON COLUMN responses.responds_to_response_id IS 'For responses that respond to other responses instead of questions';
COMMENT ON COLUMN word_timestamps.word_order IS 'Sequential order of words within the parent node';
