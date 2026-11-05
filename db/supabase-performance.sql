-- RIVO Supabase performance setup
-- Run this in the Supabase SQL Editor after the Drizzle schema has been created.
-- Safe to re-run: indexes and bucket are created idempotently.

create extension if not exists pg_trgm;

-- Product browsing, filtering, and category joins
create index if not exists products_active_created_idx
  on public.products (is_active, created_at desc);
create index if not exists products_active_featured_updated_idx
  on public.products (is_active, is_featured, updated_at desc);
create index if not exists products_active_sold_idx
  on public.products (is_active, sold_count desc);
create index if not exists products_category_active_idx
  on public.products (category_id, is_active);
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);
create index if not exists products_sku_trgm_idx
  on public.products using gin (sku gin_trgm_ops);
create index if not exists products_description_trgm_idx
  on public.products using gin (description gin_trgm_ops);
create index if not exists categories_name_trgm_idx
  on public.categories using gin (name gin_trgm_ops);

-- Orders and admin order filters
create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);
create index if not exists orders_phone_created_idx
  on public.orders (phone, created_at desc);
create index if not exists order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at desc);

-- Reviews, audit logs, and expiring rate-limit rows
create index if not exists reviews_approved_product_created_idx
  on public.reviews (product_id, created_at desc)
  where is_approved = true;
create index if not exists audit_logs_created_id_idx
  on public.audit_logs (created_at desc, id desc);
create index if not exists rate_limits_reset_at_idx
  on public.rate_limits (reset_at);

-- Supabase Storage bucket for new product/category images.
-- Uploads are made server-side with the service-role key; public bucket reads
-- allow storefront image delivery without querying PostgreSQL for image bytes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rivo-images',
  'rivo-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
