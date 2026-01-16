-- Storage policies for the "Conversations" bucket
--
-- Symptom this fixes:
--   StorageApiError: new row violates row-level security policy
--   when uploading from the frontend using the anon key.
--
-- Run this in Supabase Dashboard -> SQL Editor.

-- Allow anyone (anon + authenticated) to read objects from the Conversations bucket
drop policy if exists "Public read access to Conversations" on storage.objects;
create policy "Public read access to Conversations"
on storage.objects
for select
to public
using (bucket_id = 'Conversations');

-- Allow anyone (anon + authenticated) to upload objects into the Conversations bucket
drop policy if exists "Public upload access to Conversations" on storage.objects;
create policy "Public upload access to Conversations"
on storage.objects
for insert
to public
with check (bucket_id = 'Conversations');

