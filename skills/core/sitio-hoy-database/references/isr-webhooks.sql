CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION isr_notify(p_tenant_id uuid, p_table text, p_slug text DEFAULT NULL)
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

CREATE OR REPLACE FUNCTION trigger_isr_products()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'products', COALESCE(NEW.slug, OLD.slug));
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_products ON public.products;
CREATE TRIGGER isr_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION trigger_isr_products();

CREATE OR REPLACE FUNCTION trigger_isr_product_images()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'product_images');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_product_images ON public.product_images;
CREATE TRIGGER isr_product_images
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION trigger_isr_product_images();

CREATE OR REPLACE FUNCTION trigger_isr_product_variants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'product_variants');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_product_variants ON public.product_variants;
CREATE TRIGGER isr_product_variants
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION trigger_isr_product_variants();

CREATE OR REPLACE FUNCTION trigger_isr_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'categories');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_categories ON public.categories;
CREATE TRIGGER isr_categories
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION trigger_isr_categories();

CREATE OR REPLACE FUNCTION trigger_isr_coupons()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'coupons');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_coupons ON public.coupons;
CREATE TRIGGER isr_coupons
AFTER INSERT OR UPDATE OR DELETE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION trigger_isr_coupons();

CREATE OR REPLACE FUNCTION trigger_isr_blog_posts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'blog_posts', COALESCE(NEW.slug, OLD.slug));
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_blog_posts ON public.blog_posts;
CREATE TRIGGER isr_blog_posts
AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION trigger_isr_blog_posts();

CREATE OR REPLACE FUNCTION trigger_isr_blog_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'blog_categories');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_blog_categories ON public.blog_categories;
CREATE TRIGGER isr_blog_categories
AFTER INSERT OR UPDATE OR DELETE ON public.blog_categories
FOR EACH ROW EXECUTE FUNCTION trigger_isr_blog_categories();
