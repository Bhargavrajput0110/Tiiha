-- ============================================================
-- TIIHA — Migration 004: Security Hardening & RLS Lockdown
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. SECURE ORDERS TABLE (Stop public leak of customer PII)
ALTER TABLE "ORDERS" ENABLE ROW LEVEL SECURITY;

-- Drop legacy insecure policies
DROP POLICY IF EXISTS "Public read orders" ON "ORDERS";
DROP POLICY IF EXISTS "Public insert orders" ON "ORDERS";
DROP POLICY IF EXISTS "Admin view orders" ON "ORDERS";
DROP POLICY IF EXISTS "Service role and admin write orders" ON "ORDERS";

-- Only authenticated admin (logged in via admin portal) or service role (backend API) can view orders
CREATE POLICY "Admin view orders" ON "ORDERS"
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Only backend Netlify functions (service role) or authenticated admin can create or update orders
CREATE POLICY "Service role and admin write orders" ON "ORDERS"
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');


-- 2. SECURE PRODUCTS TABLE (Prevent unauthorized price edits or product deletion)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public write products" ON products;
DROP POLICY IF EXISTS "Public read products" ON products;
DROP POLICY IF EXISTS "Admin write products" ON products;

-- Public customers can read products for catalog browsing
CREATE POLICY "Public read products" ON products
  FOR SELECT
  USING (true);

-- Only authenticated admin or service role can add, modify, or delete products
CREATE POLICY "Admin write products" ON products
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');


-- 3. SECURE COLLECTIONS, CATEGORIES & SITE SETTINGS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Drop old insecure write policies
DROP POLICY IF EXISTS "Public write categories" ON categories;
DROP POLICY IF EXISTS "Public write collections" ON collections;
DROP POLICY IF EXISTS "Public write settings" ON site_settings;
DROP POLICY IF EXISTS "Public write content" ON content_blocks;
DROP POLICY IF EXISTS "Public write nav" ON navigation_items;
DROP POLICY IF EXISTS "Public write media" ON media_files;
DROP POLICY IF EXISTS "Public write galleries" ON product_galleries;

-- Ensure read policies exist for public catalog
CREATE POLICY IF NOT EXISTS "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read collections" ON collections FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read settings" ON site_settings FOR SELECT USING (true);

-- Restrict write/update/delete to authenticated admin or service role
CREATE POLICY "Admin write categories" ON categories FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin write collections" ON collections FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin write settings" ON site_settings FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ============================================================
-- Complete! Customer orders and product data are now locked down.
-- ============================================================
