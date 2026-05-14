# Tiiha CMS Architecture & Design Document

> Comprehensive Content Management System for Tiiha — a premium female e-commerce fashion brand.

---

## Table of Contents

1. [Database Schema](#a-complete-database-schema)
2. [API Endpoint Specification](#b-api-endpoint-specification)
3. [Admin Panel Architecture](#c-admin-panel-architecture)
4. [Media System Design](#d-media-system-design)
5. [Content Model Details](#e-content-model-details)
6. [Implementation Roadmap](#f-implementation-roadmap)
7. [Security Considerations](#g-security-considerations)

---

## A. Complete Database Schema

### ER Diagram

```mermaid
erDiagram
    PRODUCTS ||--o{ PRODUCT_IMAGES : "has"
    PRODUCTS ||--o{ PRODUCT_VIDEOS : "has"
    PRODUCTS ||--o{ PRODUCT_SEO : "has"
    PRODUCTS }o--|| CATEGORIES : "belongs to"
    PRODUCTS ||--o{ VARIANTS : "has"
    PRODUCTS }o--|| COLLECTIONS : "can belong to"
    PRODUCTS ||--o{ PRODUCT_TAGS : "tagged with"
    CONTENT_BLOCKS }o--|| CONTENT_PLACEMENT : "placed on"
    CONTENT_BLOCKS }o--|| PAGES : "belongs to"
    CONTENT_BLOCKS }o--|| MEDIA : "references"
    PAGES }o--|| PAGE_TEMPLATES : "uses"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ ORDER_STATUS_HISTORY : "tracks"
    ACTIVITY_LOG ||--o{ USERS : "performed by"

    PRODUCTS {
        string id PK "TII-NNNN"
        string name, slug
        text description, rich_description
        decimal price, compare_at_price
        integer stock
        boolean featured, is_active
        integer sort_order
        string category_id FK, collection_id FK
        string video_url, video_type nullable
        jsonb metadata
        timestamp created_at, updated_at
    }

    PRODUCT_IMAGES {
        uuid id PK
        string product_id FK
        string storage_path, url
        string thumbnail_url, medium_url, large_url
        string alt_text, caption nullable
        integer sort_order
        boolean is_primary
        jsonb metadata
        timestamp created_at
    }

    PRODUCT_VIDEOS {
        uuid id PK
        string product_id FK
        string url
        ENUM('youtube','vimeo','mp4') type
        string thumbnail_url nullable
        integer sort_order
        boolean is_active
        jsonb metadata
        timestamp created_at
    }

    PRODUCT_SEO {
        string product_id PK FK
        string meta_title, meta_description, meta_keywords
        string og_image, canonical_url
        jsonb structured_data
    }

    CATEGORIES {
        string id PK "CAT-NNNN"
        string name, slug, description nullable
        string parent_id FK nullable
        string image_url nullable
        integer sort_order, boolean is_active
        jsonb metadata
        timestamp created_at, updated_at
    }

    COLLECTIONS {
        string id PK "COL-NNNN"
        string name, slug, description nullable
        string image_url nullable
        integer sort_order, boolean is_active
        jsonb metadata
        timestamp created_at, updated_at
    }

    PRODUCT_COLLECTIONS {
        string product_id FK, collection_id FK
        integer sort_order
        PK(product_id, collection_id)
    }

    TAGS {
        string id PK "TAG-NNNN"
        string name, slug
        timestamp created_at
    }

    PRODUCT_TAGS {
        string product_id FK, tag_id FK
        PK(product_id, tag_id)
    }

    VARIANTS {
        uuid id PK
        string product_id FK
        string name, sku
        jsonb options, metadata
        decimal price, integer stock
        boolean is_active
        timestamp created_at, updated_at
    }

    CONTENT_BLOCKS {
        uuid id PK
        ENUM('hero','announcement','featured_products','editorial','newsletter','image_gallery','video_banner','custom_html','lookbook') type
        string title nullable
        jsonb content, settings
        ENUM('homepage','product_page','collection_page','all_pages','custom') placement
        uuid page_id FK nullable
        integer sort_order, boolean is_active
        string cta_text, cta_link nullable
        timestamp published_at, scheduled_at nullable
        timestamp created_at, updated_at
    }

    PAGES {
        uuid id PK
        string template_id FK nullable
        string slug, title, subtitle nullable
        jsonb seo
        ENUM('draft','published','scheduled','archived') status
        timestamp published_at, scheduled_at nullable
        timestamp created_at, updated_at
    }

    PAGE_TEMPLATES {
        string id PK "TMPL-NNNN"
        string name, description
        jsonb layout_config
        boolean is_active
        timestamp created_at
    }

    MEDIA {
        uuid id PK
        string storage_path, original_url
        string thumbnail_url, medium_url, large_url
        integer file_size, width nullable, height nullable
        string mime_type, alt_text, caption nullable
        uuid uploaded_by FK nullable
        jsonb metadata
        timestamp created_at
    }

    SITE_SETTINGS {
        string key PK
        string value, type ENUM('string','boolean','integer','json','image')
        string label, description nullable, category
        integer sort_order
        timestamp updated_at
    }

    NAVIGATION_MENU {
        uuid id PK
        string label, url, icon nullable
        uuid parent_id FK nullable
        integer sort_order
        boolean is_active, is_external
        timestamp created_at, updated_at
    }

    ORDERS {
        string id PK "ORD-NNNNNN"
        string customer_name, customer_email, customer_phone
        text shipping_address
        string city, state, country, pincode
        jsonb items
        decimal total_amount, shipping_amount, discount_amount
        ENUM('prepaid','cod','razorpay') payment_method
        ENUM('pending','paid','failed','refunded') payment_status
        ENUM('pending','confirmed','processing','shipped','delivered','cancelled','returned') status
        string shipment_id, tracking_url nullable
        text notes nullable
        timestamp created_at, updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        string order_id FK
        string product_id FK nullable
        string name, sku nullable
        integer quantity
        decimal unit_price, total_price
        jsonb variant_options nullable
        order_status status
        timestamp created_at
    }

    ORDER_STATUS_HISTORY {
        uuid id PK
        string order_id FK
        order_status status
        string notes nullable
        uuid changed_by FK nullable
        timestamp created_at
    }

    USERS {
        uuid id PK references auth.users
        string email, role ENUM('admin','editor','viewer')
        string full_name, avatar_url nullable
        boolean is_active
        jsonb preferences nullable
        timestamp last_login_at nullable
        timestamp created_at, updated_at
    }

    ACTIVITY_LOG {
        uuid id PK
        uuid user_id FK
        string action, entity_type, entity_id
        jsonb old_values, new_values nullable
        INET ip_address, text user_agent nullable
        timestamp created_at
    }
```

### SQL DDL Statements

```sql
-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE content_block_type AS ENUM (
    'hero', 'announcement', 'featured_products',
    'editorial', 'newsletter', 'image_gallery',
    'video_banner', 'custom_html', 'lookbook'
);

CREATE TYPE content_placement AS ENUM (
    'homepage', 'product_page',
    'collection_page', 'all_pages', 'custom'
);

CREATE TYPE page_status AS ENUM (
    'draft', 'published', 'scheduled', 'archived'
);

CREATE TYPE video_type AS ENUM ('youtube', 'vimeo', 'mp4');

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TYPE setting_type AS ENUM ('string', 'boolean', 'integer', 'json', 'image');

CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'processing',
    'shipped', 'delivered', 'cancelled', 'returned'
);

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ============================================
-- CATEGORIES
-- ============================================
CREATE SEQUENCE category_seq START 1;

CREATE TABLE categories (
    id              VARCHAR(50) PRIMARY KEY DEFAULT 'CAT-' || LPAD(nextval('category_seq')::TEXT, 4, '0'),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(120) UNIQUE NOT NULL,
    description     TEXT,
    parent_id       VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
    image_url       TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_categories_sort ON categories(sort_order);
CREATE INDEX idx_categories_parent_sort ON categories(parent_id, sort_order);

-- ============================================
-- COLLECTIONS
-- ============================================
CREATE SEQUENCE collection_seq START 1;

CREATE TABLE collections (
    id              VARCHAR(50) PRIMARY KEY DEFAULT 'COL-' || LPAD(nextval('collection_seq')::TEXT, 4, '0'),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(120) UNIQUE NOT NULL,
    description     TEXT,
    image_url       TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_active ON collections(is_active);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE SEQUENCE product_seq START 100;

CREATE TABLE products (
    id                  VARCHAR(50) PRIMARY KEY DEFAULT 'TII-' || LPAD(nextval('product_seq')::TEXT, 4, '0'),
    name                VARCHAR(200) NOT NULL,
    slug                VARCHAR(250) UNIQUE NOT NULL,
    description         TEXT NOT NULL,
    rich_description    TEXT,
    price               DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price    DECIMAL(10,2) CHECK (compare_at_price >= 0),
    stock               INTEGER DEFAULT 0 CHECK (stock >= 0),
    featured            BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    sort_order          INTEGER DEFAULT 0,
    category_id         VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
    collection_id       VARCHAR(50) REFERENCES collections(id) ON DELETE SET NULL,
    video_url           TEXT,
    video_type          video_type,
    metadata            JSONB DEFAULT '{}',
    search_vector       TSVECTOR,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_collection ON products(collection_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = TRUE;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_sort ON products(sort_order);
CREATE INDEX idx_products_search ON products USING gin(search_vector);

-- Full-text search trigger function
CREATE OR REPLACE FUNCTION products_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.rich_description, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_trigger();

-- ============================================
-- PRODUCT IMAGES (Multi-image gallery support)
-- ============================================
CREATE TABLE product_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storage_path    TEXT NOT NULL,
    url             TEXT NOT NULL,
    thumbnail_url   TEXT,
    medium_url      TEXT,
    large_url       TEXT,
    alt_text        VARCHAR(200),
    caption         TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_primary      BOOLEAN DEFAULT FALSE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_product_images_sort ON product_images(product_id, sort_order);

-- Ensure exactly one primary image per product via partial unique index
-- (enforced at application level for flexibility)

-- ============================================
-- PRODUCT VIDEOS
-- ============================================
CREATE TABLE product_videos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    type            video_type NOT NULL DEFAULT 'mp4',
    thumbnail_url   TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_videos_product ON product_videos(product_id);

-- ============================================
-- PRODUCT SEO
-- ============================================
CREATE TABLE product_seo (
    product_id          VARCHAR(50) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    meta_title          VARCHAR(160),
    meta_description    VARCHAR(320),
    meta_keywords       TEXT,
    og_image            TEXT,
    canonical_url       TEXT,
    structured_data     JSONB DEFAULT '{}'
);

-- ============================================
-- PRODUCT COLLECTIONS (junction table)
-- ============================================
CREATE TABLE product_collections (
    product_id      VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    collection_id   VARCHAR(50) REFERENCES collections(id) ON DELETE CASCADE,
    sort_order      INTEGER DEFAULT 0,
    PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX idx_prod_collections_coll ON product_collections(collection_id);

-- ============================================
-- TAGS
-- ============================================
CREATE SEQUENCE tag_seq START 1;

CREATE TABLE tags (
    id          VARCHAR(50) PRIMARY KEY DEFAULT 'TAG-' || LPAD(nextval('tag_seq')::TEXT, 4, '0'),
    name        VARCHAR(50) NOT NULL UNIQUE,
    slug        VARCHAR(60) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);

-- ============================================
-- PRODUCT TAGS (junction table)
-- ============================================
CREATE TABLE product_tags (
    product_id  VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    tag_id      VARCHAR(50) REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- ============================================
-- VARIANTS (size/color — future scope)
-- ============================================
CREATE TABLE variants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    sku             VARCHAR(100) UNIQUE,
    options         JSONB NOT NULL DEFAULT '{}',
    price           DECIMAL(10,2) CHECK (price >= 0),
    stock           INTEGER DEFAULT 0 CHECK (stock >= 0),
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON variants(product_id);
CREATE INDEX idx_variants_sku ON variants(sku);

-- ============================================
-- PAGE TEMPLATES
-- ============================================
CREATE SEQUENCE template_seq START 5;

CREATE TABLE page_templates (
    id              VARCHAR(50) PRIMARY KEY DEFAULT 'TMPL-' || LPAD(nextval('template_seq')::TEXT, 4, '0'),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    layout_config   JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default templates
INSERT INTO page_templates (id, name, description, layout_config) VALUES
('TMPL-0001', 'Default Page', 'Standard full-width page layout',
 '{"layout":"full-width","sections":["header","content","footer"]}'),
('TMPL-0002', 'Landing Page', 'Full-screen hero with dynamic content sections',
 '{"layout":"sections","sections":["hero","content-blocks","featured","cta","footer"]}'),
('TMPL-0003', 'About Page', 'Brand story editorial layout',
 '{"layout":"editorial","sections":["hero","story","team","values"]}'),
('TMPL-0004', 'FAQ Page', 'Accordion-style Q&A layout',
 '{"layout":"accordion","sections":["header","faq-items"]}');

-- ============================================
-- PAGES
-- ============================================
CREATE TABLE pages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id     VARCHAR(50) REFERENCES page_templates(id) ON DELETE SET NULL,
    slug            VARCHAR(200) UNIQUE NOT NULL,
    title           VARCHAR(200) NOT NULL,
    subtitle        VARCHAR(300),
    seo             JSONB DEFAULT '{}',
    status          page_status DEFAULT 'draft',
    published_at    TIMESTAMPTZ,
    scheduled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_published ON pages(published_at) WHERE status = 'published';

-- ============================================
-- CONTENT BLOCKS
-- ============================================
CREATE TABLE content_blocks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            content_block_type NOT NULL,
    title           VARCHAR(200),
    content         JSONB NOT NULL DEFAULT '{}',
    placement       content_placement NOT NULL DEFAULT 'homepage',
    page_id         UUID REFERENCES pages(id) ON DELETE CASCADE,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    settings        JSONB DEFAULT '{}',
    cta_text        VARCHAR(100),
    cta_link        TEXT,
    published_at    TIMESTAMPTZ,
    scheduled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_blocks_placement ON content_blocks(placement);
CREATE INDEX idx_content_blocks_page ON content_blocks(page_id);
CREATE INDEX idx_content_blocks_sort ON content_blocks(sort_order);
CREATE INDEX idx_content_blocks_active ON content_blocks(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_content_blocks_published ON content_blocks(published_at) WHERE is_active = TRUE;

-- ============================================
-- MEDIA LIBRARY
-- ============================================
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_path    TEXT NOT NULL,
    original_url    TEXT NOT NULL,
    thumbnail_url   TEXT,
    medium_url      TEXT,
    large_url       TEXT,
    file_size       INTEGER,
    mime_type       VARCHAR(100) NOT NULL,
    width           INTEGER,
    height          INTEGER,
    alt_text        VARCHAR(200),
    caption         TEXT,
    uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_mime_type ON media(mime_type);
CREATE INDEX idx_media_created ON media(created_at DESC);
CREATE INDEX idx_media_search ON media USING gin(to_tsvector('english', COALESCE(alt_text, '') || ' ' || COALESCE(caption, '')));

-- ============================================
-- SITE SETTINGS (key-value store)
-- ============================================
CREATE TABLE site_settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           TEXT NOT NULL DEFAULT '',
    type            setting_type NOT NULL DEFAULT 'string',
    label           VARCHAR(100),
    description     TEXT,
    category        VARCHAR(50) DEFAULT 'general',
    sort_order      INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO site_settings (key, value, type, label, description, category, sort_order) VALUES
('site_name', 'Tiiha', 'string', 'Site Name', 'Brand name displayed across site', 'general', 1),
('site_tagline', 'Architectural Fashion', 'string', 'Tagline', 'Short brand descriptor for header/SEO', 'general', 2),
('announcement_bar', '', 'string', 'Announcement Bar', 'Site-wide banner message (HTML allowed)', 'general', 3),
('maintenance_mode', 'false', 'boolean', 'Maintenance Mode', 'Takes site offline when enabled', 'general', 4),
('default_currency', 'INR', 'string', 'Currency', 'Default display currency code', 'general', 5),
('free_shipping_threshold', '2000', 'integer', 'Free Shipping Above', 'Order amount for free shipping', 'general', 6),
('instagram_url', '', 'string', 'Instagram URL', 'Social link', 'social', 1),
('facebook_url', '', 'string', 'Facebook URL', 'Social link', 'social', 2),
('twitter_url', '', 'string', 'Twitter URL', 'Social link', 'social', 3),
('pinterest_url', '', 'string', 'Pinterest URL', 'Social link', 'social', 4),
('youtube_url', '', 'string', 'YouTube URL', 'Social link', 'social', 5),
('contact_email', '', 'string', 'Contact Email', 'Primary contact email address', 'contact', 1),
('contact_phone', '', 'string', 'Contact Phone', 'Primary contact phone number', 'contact', 2),
('contact_whatsapp', '', 'string', 'WhatsApp Number', 'WhatsApp contact link', 'contact', 3),
('shipping_info', 'Free shipping on orders above ₹2,000', 'string', 'Shipping Info', 'Brief shipping policy shown at checkout', 'policies', 1),
('return_policy', '7-day return policy on all items', 'string', 'Return Policy', 'Brief return policy text', 'policies', 2),
('favicon_url', '', 'image', 'Favicon URL', 'Site favicon image path', 'general', 10),
('og_image_url', '', 'image', 'OG Image URL', 'Default OpenGraph/social share image', 'general', 11),
('seo_default_title', 'Tiiha — Architectural Fashion', 'string', 'Default SEO Title', 'Fallback meta title for all pages', 'seo', 1),
('seo_default_description', 'Premium architectural fashion by Tiiha. Handcrafted pieces that redefine modern elegance.', 'string', 'Default SEO Description', 'Fallback meta description', 'seo', 2);

-- ============================================
-- NAVIGATION MENU
-- ============================================
CREATE TABLE navigation_menu (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label           VARCHAR(100) NOT NULL,
    url             TEXT NOT NULL,
    parent_id       UUID REFERENCES navigation_menu(id) ON DELETE CASCADE,
    icon            TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    is_external     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nav_parent ON navigation_menu(parent_id);
CREATE INDEX idx_nav_sort ON navigation_menu(sort_order);
CREATE INDEX idx_nav_active ON navigation_menu(is_active) WHERE is_active = TRUE;

-- Seed default navigation items
INSERT INTO navigation_menu (id, label, url, icon, sort_order, is_active, is_external) VALUES
(uuid_generate_v4(), 'Home', '/', NULL, 1, TRUE, FALSE),
(uuid_generate_v4(), 'Shop', '/shop', NULL, 2, TRUE, FALSE),
(uuid_generate_v4(), 'New Arrivals', '/shop?sort=newest', NULL, 3, TRUE, FALSE),
(uuid_generate_v4(), 'About', '/about', NULL, 4, TRUE, FALSE),
(uuid_generate_v4(), 'Shipping & Returns', '/shipping', NULL, 5, TRUE, FALSE),
(uuid_generate_v4(), 'Contact', '/contact', NULL, 6, TRUE, FALSE);

-- ============================================
-- ORDERS
-- ============================================
CREATE SEQUENCE order_seq START 10000;

CREATE TABLE orders (
    id                  VARCHAR(50) PRIMARY KEY DEFAULT 'ORD-' || LPAD(nextval('order_seq')::TEXT, 6, '0'),
    customer_name       VARCHAR(200) NOT NULL,
    customer_email      VARCHAR(200) NOT NULL,
    customer_phone      VARCHAR(20) NOT NULL,
    shipping_address    TEXT NOT NULL,
    city                VARCHAR(100) NOT NULL,
    state               VARCHAR(100) NOT NULL,
    country             VARCHAR(100) DEFAULT 'India',
    pincode             VARCHAR(20) NOT NULL,
    items               JSONB NOT NULL DEFAULT '[]',
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_amount     DECIMAL(10,2) DEFAULT 0,
    discount_amount     DECIMAL(10,2) DEFAULT 0,
    payment_method      VARCHAR(50),
    payment_status      payment_status DEFAULT 'pending',
    status              order_status DEFAULT 'pending',
    shipment_id         VARCHAR(200),
    tracking_url        TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_orders_date_range ON orders(created_at) WHERE created_at > NOW() - INTERVAL '90 days';

-- ============================================
-- ORDER ITEMS (normalized supplement to JSON items)
-- ============================================
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    sku             VARCHAR(100),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(10,2) NOT NULL,
    total_price     DECIMAL(10,2) NOT NULL,
    variant_options JSONB DEFAULT '{}',
    status          order_status DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================
-- ORDER STATUS HISTORY (audit trail)
-- ============================================
CREATE TABLE order_status_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status          order_status NOT NULL,
    notes           TEXT,
    changed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_history_created ON order_status_history(created_at);

-- ============================================
-- USERS (extends Supabase auth)
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    role            user_role DEFAULT 'viewer',
    full_name       VARCHAR(200),
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    preferences     JSONB DEFAULT '{}',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Auto-populate from existing auth users
INSERT INTO users (id, email, role, full_name, is_active)
SELECT id, email, 'admin', raw_user_meta_data->>'full_name', true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- ============================================
-- ACTIVITY LOG (audit trail)
-- ============================================
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(100) NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER (universal)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sitesettings_updated BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_navigation_updated BEFORE UPDATE ON navigation_menu FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_pages_updated BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_content_blocks_updated BEFORE UPDATE ON content_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read active products" ON products FOR SELECT TO anon USING (is_active = TRUE);

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read active categories" ON categories FOR SELECT TO anon USING (is_active = TRUE);

-- Collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full collections" ON collections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read active collections" ON collections FOR SELECT TO anon USING (is_active = TRUE);

-- Product Images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full images" ON product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read images" ON product_images FOR SELECT TO anon USING (true);

-- Product Videos
ALTER TABLE product_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full videos" ON product_videos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read videos" ON product_videos FOR SELECT TO anon USING (is_active = TRUE);

-- Product SEO
ALTER TABLE product_seo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full seo" ON product_seo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read seo" ON product_seo FOR SELECT TO anon USING (true);

-- Product Collections
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full prod_collections" ON product_collections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full tags" ON tags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read tags" ON tags FOR SELECT TO anon USING (true);

-- Product Tags
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full prod_tags" ON product_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Variants
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full variants" ON variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Content Blocks
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full content_blocks" ON content_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read active blocks" ON content_blocks FOR SELECT TO anon USING (is_active = TRUE AND (published_at IS NULL OR published_at <= NOW()));

-- Pages
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full pages" ON pages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read published pages" ON pages FOR SELECT TO anon USING (status = 'published');

-- Page Templates
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full templates" ON page_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Media
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full media" ON media FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read media" ON media FOR SELECT TO anon USING (true);

-- Site Settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full settings" ON site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read settings" ON site_settings FOR SELECT TO anon USING (true);

-- Navigation Menu
ALTER TABLE navigation_menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full nav" ON navigation_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read nav" ON navigation_menu FOR SELECT TO anon USING (is_active = TRUE);

-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Order Items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full order_items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Order History
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full order_history" ON order_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Activity Log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full activity" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- VIEWS
-- ============================================

-- Dashboard: Recent Orders Summary
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS orders_last_30_days,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
    COUNT(*) FILTER (WHERE status = 'shipped') AS shipped_orders,
    COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) AS revenue_last_30_days,
    COALESCE(SUM(total_amount), 0) AS total_revenue,
    (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS active_products,
    (SELECT COUNT(*) FROM products WHERE stock < 3 AND is_active = TRUE) AS low_stock_products
FROM orders;

-- Product Catalog with images
CREATE OR REPLACE VIEW v_product_catalog AS
SELECT
    p.*,
    c.name AS category_name,
    col.name AS collection_name,
    pi.url AS primary_image_url,
    (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) AS image_count,
    seo.meta_title,
    seo.meta_description
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN collections col ON p.collection_id = col.id
LEFT JOIN LATERAL (
    SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1
) pi ON TRUE
LEFT JOIN product_seo seo ON seo.product_id = p.id
WHERE p.is_active = TRUE;