import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import path from 'node:path'

const args = new Map()
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i]
  if (arg.startsWith('--')) {
    args.set(arg.slice(2), process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true)
  }
}

const root = process.cwd()
let plan = args.get('plan')

if (!plan && existsSync(path.join(root, 'sitiohoy.config.json'))) {
  const config = JSON.parse(await readFile(path.join(root, 'sitiohoy.config.json'), 'utf8'))
  plan = config.plan
}

plan = plan || 'esencial'

// Leer config del negocio para el seed
let businessName = 'Mi Negocio'
let tenantSlug = 'mi-negocio'
let siteUrl = ''
if (existsSync(path.join(root, 'sitiohoy.config.json'))) {
  const config = JSON.parse(await readFile(path.join(root, 'sitiohoy.config.json'), 'utf8'))
  if (config.business?.name) businessName = config.business.name
  if (config.business?.slug) tenantSlug = config.business.slug
  if (config.siteUrl) siteUrl = config.siteUrl
  if (!siteUrl && config.domain?.url) siteUrl = config.domain.url
}

// Generar contraseña segura para el usuario admin
const adminPassword = randomBytes(16).toString('base64url')
const adminEmailLocal = `admin${tenantSlug || 'cliente'}`
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-|-$/g, '')
const adminEmail = `${adminEmailLocal}@sitiohoy.com.ar`
const sqlString = (value) => String(value ?? '').replaceAll("'", "''")
const revalidationSecret = randomBytes(32).toString('hex')

// Guardar credenciales en archivo gitignoreado
const credentialsPath = path.join(root, 'credentials.local.json')
const credentials = {
  email: adminEmail,
  password: adminPassword,
  role: 'owner',
  revalidation_secret: revalidationSecret,
  note: 'Credenciales del usuario admin y secret ISR generadas por generate-supabase-migration. NO SUBIR A GIT.',
}
await writeFile(credentialsPath, JSON.stringify(credentials, null, 2) + '\n')

// Asegurar que credentials.local.json esté en .gitignore
const gitignorePath = path.join(root, '.gitignore')
if (existsSync(gitignorePath)) {
  const gitignore = await readFile(gitignorePath, 'utf8')
  if (!gitignore.includes('credentials.local.json')) {
    await writeFile(gitignorePath, gitignore.trimEnd() + '\ncredentials.local.json\n')
  }
} else {
  await writeFile(gitignorePath, 'credentials.local.json\n')
}

console.log(`\n✅ Credenciales admin guardadas en credentials.local.json (gitignoreado)`)
console.log(`   Email: ${adminEmail}`)
console.log(`   Password: ${adminPassword}\n`)

const sql = `-- SitioHoy initial schema
-- Plan activo: ${plan}
-- Generado: ${new Date().toISOString()}

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'esencial' CHECK (plan IN ('esencial', 'emprendimiento', 'empresa')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  max_products integer NOT NULL DEFAULT 50,
  url text,
  revalidation_secret text,
  mp_access_token text,
  mp_public_key text,
  resend_api_key text,
  contact_email text,
  envia_access_token text,
  correo_argentino_customer_id text,
  umami_url text,
  umami_website_id text,
  origin_name text,
  origin_phone text,
  origin_address text,
  origin_city text,
  origin_state text,
  origin_postal_code text,
  subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'editor')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  active boolean DEFAULT true,
  position integer DEFAULT 0,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(10,2),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  stock_unlimited boolean DEFAULT false,
  weight_grams integer DEFAULT 500 CHECK (weight_grams IS NULL OR weight_grams > 0),
  length_cm numeric(10,2) DEFAULT 20 CHECK (length_cm IS NULL OR length_cm > 0),
  width_cm numeric(10,2) DEFAULT 15 CHECK (width_cm IS NULL OR width_cm > 0),
  height_cm numeric(10,2) DEFAULT 8 CHECK (height_cm IS NULL OR height_cm > 0),
  shipping_required boolean DEFAULT true,
  category_id uuid REFERENCES public.categories(id),
  active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  position integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  stock integer DEFAULT 0 CHECK (stock >= 0),
  price numeric(10,2),
  price_modifier numeric(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending', 'pending_payment', 'paid', 'payment_failed',
      'processing', 'confirmed', 'shipped', 'delivered',
      'cancelled', 'refunded'
    )
  ),
  payment_status text DEFAULT 'pending',
  mp_payment_id text,
  payment_provider text DEFAULT 'mercadopago',
  external_reference text,
  total numeric(10,2) DEFAULT 0 CHECK (total >= 0),
  currency text DEFAULT 'ARS',
  payer_email text,
  customer_first_name text,
  customer_last_name text,
  customer_phone text,
  shipping_address jsonb,
  shipping_carrier text,
  shipping_service text,
  shipping_cost numeric(10,2) DEFAULT 0,
  shipping_label_url text,
  shipping_tracking_number text,
  shipping_postal_code text,
  tracking_token text UNIQUE DEFAULT gen_random_uuid()::text,
  notes text,
  coupon_code text,
  discount_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  name text NOT NULL,
  variant_name text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('percent','fixed')),
  value numeric(10,2) NOT NULL CHECK (value >= 0),
  min_amount numeric(10,2) DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  expires_at timestamptz,
  starts_at timestamptz,
  active boolean DEFAULT true,
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  position integer DEFAULT 0,
  active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  source text DEFAULT 'contact_form',
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_event_id text,
  status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text,
  cover_image text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_name text,
  meta_title text,
  meta_description text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo_argentino_user text,
  correo_argentino_password text,
  correo_argentino_customer_id text,
  correo_argentino_token text,
  correo_argentino_token_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_platform_config_updated_at ON public.platform_config;
CREATE TRIGGER trg_platform_config_updated_at BEFORE UPDATE ON public.platform_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_blog_categories_updated_at ON public.blog_categories;
CREATE TRIGGER trg_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_tenant_active ON public.products(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_products_tenant_slug ON public.products(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_slug ON public.categories(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON public.orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_tenant_created ON public.contact_messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant_published ON public.blog_posts(tenant_id, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant_slug ON public.blog_posts(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_tenant ON public.blog_categories(tenant_id);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_tenant_select" ON public.tenants;
CREATE POLICY "own_tenant_select" ON public.tenants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_tenants.tenant_id = tenants.id
      AND user_tenants.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own_relations_select" ON public.user_tenants;
CREATE POLICY "own_relations_select" ON public.user_tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'categories', 'subcategories', 'products', 'product_images', 'product_variants',
    'orders', 'order_items', 'coupons', 'shipping_zones', 'contact_messages',
    'order_events', 'payment_events', 'blog_categories', 'blog_posts'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON public.%I', table_name);

    EXECUTE format('CREATE POLICY tenant_select ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.get_tenant_id())', table_name);
    EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_tenant_id())', table_name);
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (tenant_id = public.get_tenant_id()) WITH CHECK (tenant_id = public.get_tenant_id())', table_name);
    EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING (tenant_id = public.get_tenant_id())', table_name);
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_assets_read" ON storage.objects;
CREATE POLICY "public_assets_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'public_assets');

DROP POLICY IF EXISTS "public_assets_tenant_insert" ON storage.objects;
CREATE POLICY "public_assets_tenant_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public_assets'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

CREATE OR REPLACE FUNCTION public.isr_notify(p_tenant_id uuid, p_table text, p_slug text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url    text;
  _secret text;
  _body   jsonb;
BEGIN
  SELECT url, revalidation_secret
    INTO _url, _secret
    FROM public.tenants
   WHERE id = p_tenant_id;

  IF _url IS NULL OR _secret IS NULL THEN RETURN; END IF;

  IF p_slug IS NOT NULL THEN
    _body := jsonb_build_object('table', p_table, 'slug', p_slug);
  ELSE
    _body := jsonb_build_object('table', p_table);
  END IF;

  PERFORM net.http_post(
    url     := _url || '/api/revalidate',
    body    := _body,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _secret
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_isr_products()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'products', COALESCE(NEW.slug, OLD.slug));
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_products ON public.products;
CREATE TRIGGER isr_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trigger_isr_products();

CREATE OR REPLACE FUNCTION public.trigger_isr_product_images()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'product_images');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_product_images ON public.product_images;
CREATE TRIGGER isr_product_images
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.trigger_isr_product_images();

CREATE OR REPLACE FUNCTION public.trigger_isr_product_variants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'product_variants');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_product_variants ON public.product_variants;
CREATE TRIGGER isr_product_variants
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.trigger_isr_product_variants();

CREATE OR REPLACE FUNCTION public.trigger_isr_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'categories');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_categories ON public.categories;
CREATE TRIGGER isr_categories
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.trigger_isr_categories();

CREATE OR REPLACE FUNCTION public.trigger_isr_coupons()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'coupons');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_coupons ON public.coupons;
CREATE TRIGGER isr_coupons
AFTER INSERT OR UPDATE OR DELETE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.trigger_isr_coupons();

CREATE OR REPLACE FUNCTION public.trigger_isr_blog_posts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'blog_posts', COALESCE(NEW.slug, OLD.slug));
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_blog_posts ON public.blog_posts;
CREATE TRIGGER isr_blog_posts
AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.trigger_isr_blog_posts();

CREATE OR REPLACE FUNCTION public.trigger_isr_blog_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'blog_categories');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_blog_categories ON public.blog_categories;
CREATE TRIGGER isr_blog_categories
AFTER INSERT OR UPDATE OR DELETE ON public.blog_categories
FOR EACH ROW EXECUTE FUNCTION public.trigger_isr_blog_categories();
`

// Seed: tenant inicial + usuario admin
// IMPORTANTE: ejecutar este seed DESPUÉS de crear el usuario en Supabase Auth con el email y password de credentials.local.json
// El seed asume que el usuario ya existe en auth.users. Si usás Supabase MCP, crear el usuario primero con supabase.auth.admin.createUser()
const seed = `
-- ============================================================
-- SEED INICIAL — tenant + usuario admin
-- Ejecutar DESPUÉS de crear el usuario en Supabase Auth.
-- Email y password están en credentials.local.json (gitignoreado).
-- ============================================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_user_id   uuid;
BEGIN
  -- 1. Crear tenant si no existe
  INSERT INTO public.tenants (name, slug, plan, status, url, revalidation_secret)
  VALUES ('${sqlString(businessName)}', '${sqlString(tenantSlug)}', '${sqlString(plan)}', 'active', NULLIF('${sqlString(siteUrl)}', ''), '${sqlString(revalidationSecret)}')
  ON CONFLICT (slug) DO UPDATE SET
    url = COALESCE(EXCLUDED.url, public.tenants.url),
    revalidation_secret = COALESCE(public.tenants.revalidation_secret, EXCLUDED.revalidation_secret);

  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = '${sqlString(tenantSlug)}';

  -- 2. Buscar usuario admin en auth.users por email
  SELECT id INTO v_user_id FROM auth.users WHERE email = '${sqlString(adminEmail)}' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario % no encontrado en auth.users. Crealo en Supabase Auth primero.', '${sqlString(adminEmail)}';
    RETURN;
  END IF;

  -- 3. Asociar usuario al tenant como owner
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (v_user_id, v_tenant_id, 'owner')
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- 4. Inyectar tenant_id en app_metadata del usuario para que get_tenant_id() funcione
  -- COALESCE es necesario: si raw_app_meta_data es NULL (usuario nuevo), el operador ||
  -- devuelve NULL en lugar del objeto esperado.
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant_id)
  WHERE id = v_user_id;

  RAISE NOTICE 'Seed OK — tenant_id: %, user_id: %', v_tenant_id, v_user_id;
END $$;

-- Correo Argentino:
-- Credenciales de plataforma: cargar correo_argentino_user/password en public.platform_config con service role.
-- Customer ID del negocio: cargar tenants.correo_argentino_customer_id desde el panel admin.
-- Datos origin_* obligatorios en public.tenants para cotizar envíos.
`

const output = path.join(root, 'supabase', 'migrations', '001_initial_schema.sql')
const seedOutput = path.join(root, 'supabase', 'migrations', '002_seed_admin.sql')
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${sql}\n`)
await writeFile(seedOutput, seed.trimStart())
console.log(output)
console.log(seedOutput)
