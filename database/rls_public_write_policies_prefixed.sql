-- Public write policies for prefixed Anthology tables
--
-- Symptom this fixes (when using the anon key from the browser):
--   401 Unauthorized
--   code: 42501
--   message: new row violates row-level security policy for table "anthology_*"
--
-- Run this in Supabase Dashboard -> SQL Editor.

-- Recordings: allow anyone to create a row after uploading to Storage
drop policy if exists "Public insert access" on anthology_recordings;
create policy "Public insert access"
on anthology_recordings
for insert
to public
with check (true);

-- Speakers: allow auto-creating a speaker row for new respondent names
drop policy if exists "Public insert access" on anthology_speakers;
create policy "Public insert access"
on anthology_speakers
for insert
to public
with check (true);

-- Responses: allow posting new response nodes
drop policy if exists "Public insert access" on anthology_responses;
create policy "Public insert access"
on anthology_responses
for insert
to public
with check (true);

-- Optional: if you later support editing/deleting, add UPDATE/DELETE policies as needed.
