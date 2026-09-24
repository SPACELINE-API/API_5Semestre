-- Create Supabase Storage buckets used by the application.
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('quotes-documents', 'quotes-documents', true),
    ('service-order-files', 'service-order-files', true)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    public = EXCLUDED.public;
