-- ============================================================
-- TIIHA — Migration: Orders table improvements + Newsletter
-- Run this in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Add missing columns to ORDERS table (safe — adds only if not exists)
DO $$
BEGIN
  -- Address fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='city') THEN
    ALTER TABLE "ORDERS" ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='state') THEN
    ALTER TABLE "ORDERS" ADD COLUMN state text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='country') THEN
    ALTER TABLE "ORDERS" ADD COLUMN country text DEFAULT 'India';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='pincode') THEN
    ALTER TABLE "ORDERS" ADD COLUMN pincode text;
  END IF;
  -- Payment fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='payment_method') THEN
    ALTER TABLE "ORDERS" ADD COLUMN payment_method text DEFAULT 'razorpay';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='payment_status') THEN
    ALTER TABLE "ORDERS" ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='payment_id') THEN
    ALTER TABLE "ORDERS" ADD COLUMN payment_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='razorpay_order_id') THEN
    ALTER TABLE "ORDERS" ADD COLUMN razorpay_order_id text;
  END IF;
  -- Amount breakdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='shipping_amount') THEN
    ALTER TABLE "ORDERS" ADD COLUMN shipping_amount numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='discount_amount') THEN
    ALTER TABLE "ORDERS" ADD COLUMN discount_amount numeric DEFAULT 0;
  END IF;
  -- Notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ORDERS' AND column_name='notes') THEN
    ALTER TABLE "ORDERS" ADD COLUMN notes text;
  END IF;
END $$;

-- 2. Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  source        text DEFAULT 'website',
  subscribed_at timestamptz DEFAULT now(),
  active        boolean DEFAULT true
);

-- 3. Enable RLS on newsletter_subscribers
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Anyone can INSERT (subscribe), only service role can read
CREATE POLICY IF NOT EXISTS "Public can subscribe"
  ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- Only Supabase service role (backend) can read newsletter emails
-- Frontend cannot read subscriber list
CREATE POLICY IF NOT EXISTS "Service role reads subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================
-- Done! newsletter_subscribers table is ready.
-- ============================================================
