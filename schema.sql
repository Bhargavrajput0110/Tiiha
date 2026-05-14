-- ============================================================
-- TIIHA — Complete Database Schema
-- Run this ENTIRE script in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  slug      text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. COLLECTIONS
CREATE TABLE IF NOT EXISTS collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  image       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  category    text,
  price       numeric NOT NULL,
  stock       integer DEFAULT 10,
  sizes       text DEFAULT 'S,M,L',
  image       text,
  "hoverImage" text,
  desc        text,
  detail      text,
  gallery     text,
  video       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 4. ORDERS
CREATE TABLE IF NOT EXISTS "ORDERS" (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  shipping_address text,
  total_amount     numeric,
  items            text,
  status           text DEFAULT 'pending',
  awb_code         text,
  courier_name     text,
  shipment_id      text,
  created_at       timestamptz DEFAULT now()
);

-- 5. SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      text,
  created_at timestamptz DEFAULT now()
);

-- 6. CONTENT BLOCKS
CREATE TABLE IF NOT EXISTS content_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  title      text,
  body       text,
  image      text,
  cta_text   text,
  cta_link   text,
  sort_order integer DEFAULT 0,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. NAVIGATION ITEMS
CREATE TABLE IF NOT EXISTS navigation_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  link        text,
  sort_order  integer DEFAULT 0,
  is_external boolean DEFAULT false,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 8. MEDIA FILES
CREATE TABLE IF NOT EXISTS media_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  url         text NOT NULL,
  mime_type   text,
  size_bytes  integer,
  width       integer,
  height      integer,
  alt_text    text,
  caption     text,
  tags        text[],
  created_at  timestamptz DEFAULT now()
);

-- 9. PRODUCT GALLERIES
CREATE TABLE IF NOT EXISTS product_galleries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text REFERENCES products(id) ON DELETE CASCADE,
  image_url   text NOT NULL,
  alt_text    text,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- Enable Row Level Security (RLS) — public read, admin write
-- ============================================================
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ORDERS"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_galleries ENABLE ROW LEVEL SECURITY;

-- Public can read products, categories, collections
CREATE POLICY "Public read products"    ON products         FOR SELECT USING (true);
CREATE POLICY "Public read categories"  ON categories       FOR SELECT USING (true);
CREATE POLICY "Public read collections" ON collections      FOR SELECT USING (true);
CREATE POLICY "Public read settings"    ON site_settings    FOR SELECT USING (true);
CREATE POLICY "Public read content"     ON content_blocks   FOR SELECT USING (true);
CREATE POLICY "Public read nav"         ON navigation_items FOR SELECT USING (true);
CREATE POLICY "Public read media"       ON media_files      FOR SELECT USING (true);
CREATE POLICY "Public read galleries"   ON product_galleries FOR SELECT USING (true);

-- Anyone can INSERT orders (customers placing orders)
CREATE POLICY "Public insert orders"    ON "ORDERS"  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read orders"      ON "ORDERS"  FOR SELECT USING (true);

-- Anyone can INSERT/UPDATE products (via seed or admin)
CREATE POLICY "Public write products"   ON products    FOR ALL USING (true);
CREATE POLICY "Public write categories" ON categories  FOR ALL USING (true);
CREATE POLICY "Public write collections" ON collections FOR ALL USING (true);
CREATE POLICY "Public write settings"   ON site_settings FOR ALL USING (true);
CREATE POLICY "Public write content"    ON content_blocks FOR ALL USING (true);
CREATE POLICY "Public write nav"        ON navigation_items FOR ALL USING (true);
CREATE POLICY "Public write media"      ON media_files FOR ALL USING (true);
CREATE POLICY "Public write galleries"  ON product_galleries FOR ALL USING (true);

-- ============================================================
-- Done! Now go to seed.html and run the seeder.
-- ============================================================
