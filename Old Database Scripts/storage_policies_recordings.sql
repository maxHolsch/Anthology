-- Storage policies for the "Recordings" bucket
--
-- Symptom this fixes:
--   StorageApiError: new row violates row-level security policy
--   when uploading from the frontend using the anon key.
--
-- Run this in Supabase Dashboard -> SQL Editor.

-- Allow anyone (anon + authenticated) to read objects from the Recordings bucket
drop policy if exists "Public read access to Recordings" on storage.objects;
create policy "Public read access to Recordings"
on storage.objects
for select
to public
using (bucket_id = 'Recordings');

-- Allow anyone (anon + authenticated) to upload objects into the Recordings bucket
drop policy if exists "Public upload access to Recordings" on storage.objects;
create policy "Public upload access to Recordings"
on storage.objects
for insert
to public
with check (bucket_id = 'Recordings');

-- Optional: if you want users to be able to overwrite (upsert) existing files, you also need update.
-- We do NOT upsert from the app today, so this is commented out.
--
-- drop policy if exists "Public update access to Recordings" on storage.objects;
-- create policy "Public update access to Recordings"
-- on storage.objects
-- for update
-- to public
-- using (bucket_id = 'Recordings')
-- with check (bucket_id = 'Recordings');
