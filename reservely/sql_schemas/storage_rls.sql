ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert new files
CREATE POLICY "Allow insert for authenticated users"
ON storage.objects
FOR INSERT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to select (read) files
CREATE POLICY "Allow select for authenticated users"
ON storage.objects
FOR SELECT
USING (auth.role() = 'authenticated');

-- If you want to allow overwriting files (upsert: true), also add:
CREATE POLICY "Allow update for authenticated users"
ON storage.objects
FOR UPDATE
USING (auth.role() = 'authenticated');