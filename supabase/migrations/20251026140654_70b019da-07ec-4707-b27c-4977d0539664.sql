-- Create buckets if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'billing-pdfs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('billing-pdfs', 'billing-pdfs', false);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'signatures'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);
  END IF;
END $$;

-- POLICIES FOR SIGNATURES BUCKET
DO $$ BEGIN
  CREATE POLICY "signatures_insert_student"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signatures_update_student"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signatures_select_student"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signatures_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signatures' AND has_role(auth.uid(), 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- POLICIES FOR BILLING-PDFS BUCKET
DO $$ BEGIN
  CREATE POLICY "billing_pdfs_insert_student"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'billing-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "billing_pdfs_update_student"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'billing-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'billing-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "billing_pdfs_select_student"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'billing-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "billing_pdfs_all_admin"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'billing-pdfs' AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'billing-pdfs' AND has_role(auth.uid(), 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;