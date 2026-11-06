INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-reports', 'proposal-reports', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, public = EXCLUDED.public;
