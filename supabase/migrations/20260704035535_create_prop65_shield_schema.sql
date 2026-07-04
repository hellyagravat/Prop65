/*
# Prop65 Shield — initial schema

1. Overview
   Multi-tenant SaaS for generating/displaying California Prop 65 warning labels.
   Each signed-in business sees only their own products, warnings, embed keys,
   and settings. Auth uses Supabase built-in auth.users (email/password).

2. New Tables
   - `profiles` — company info keyed to auth.users.id (one row per user)
       id (uuid, PK = auth.users.id), company_name, created_at
   - `products` — products a seller has added for warning management
       id (uuid PK), user_id (uuid, owner, default auth.uid()), title, source_url,
       category (text), status (text: 'none'|'flagged'), created_at
   - `warnings` — generated warning for a product (one per product)
       id (uuid PK), product_id (uuid FK -> products.id ON DELETE CASCADE),
       chemicals (text[]), harm_type (text: 'cancer'|'reproductive'|'both'),
       short_text, long_text, is_live (bool), updated_at
   - `embed_keys` — public embed key per user for the JS widget
       id (uuid PK), user_id (uuid, default auth.uid()), public_key (text unique),
       domain_whitelist (text[]), created_at
   - `activity_log` — simple audit of warning generation/updates
       id (uuid PK), user_id (uuid default auth.uid()), product_id (uuid nullable),
       action (text), detail (text), created_at
   - `subscriptions` — Stripe billing state per user
       id (uuid PK), user_id (uuid unique default auth.uid()),
       tier (text: 'starter'|'growth'|'agency'),
       stripe_customer_id, stripe_subscription_id, status (text),
       current_period_end (timestamptz), created_at, updated_at

3. Security
   - RLS enabled on every table.
   - profiles: owner-scoped CRUD (id = auth.uid()).
   - products / embed_keys / activity_log / subscriptions: owner-scoped via user_id.
   - warnings: owner-scoped through parent product (EXISTS check on products.user_id).
     The embed widget reads warnings via an edge function using the service role key,
     NOT the anon key, so no anon SELECT policy is needed on warnings.
   - All policies use auth.uid(); no current_user; no FOR ALL.

4. Notes
   - user_id columns default to auth.uid() so client inserts that omit user_id succeed.
   - products.status defaults to 'none'; set to 'flagged' when seller confirms a warning.
   - warnings.updated_at maintained by trigger on update.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_url text,
  category text,
  status text NOT NULL DEFAULT 'none',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
DROP POLICY IF EXISTS "select_own_products" ON products;
CREATE POLICY "select_own_products" ON products FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_products" ON products;
CREATE POLICY "insert_own_products" ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_products" ON products;
CREATE POLICY "update_own_products" ON products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_products" ON products;
CREATE POLICY "delete_own_products" ON products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- warnings
CREATE TABLE IF NOT EXISTS warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  chemicals text[] NOT NULL DEFAULT '{}',
  harm_type text NOT NULL DEFAULT 'both',
  short_text text NOT NULL,
  long_text text NOT NULL,
  is_live boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_warnings_product_id ON warnings(product_id);
DROP POLICY IF EXISTS "select_own_warnings" ON warnings;
CREATE POLICY "select_own_warnings" ON warnings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = warnings.product_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_warnings" ON warnings;
CREATE POLICY "insert_own_warnings" ON warnings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = warnings.product_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_warnings" ON warnings;
CREATE POLICY "update_own_warnings" ON warnings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = warnings.product_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = warnings.product_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_warnings" ON warnings;
CREATE POLICY "delete_own_warnings" ON warnings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = warnings.product_id AND p.user_id = auth.uid()));

-- updated_at trigger for warnings
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_warnings_updated_at ON warnings;
CREATE TRIGGER trg_warnings_updated_at BEFORE UPDATE ON warnings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- embed_keys
CREATE TABLE IF NOT EXISTS embed_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key text UNIQUE NOT NULL,
  domain_whitelist text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE embed_keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_embed_keys_user_id ON embed_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_embed_keys_public_key ON embed_keys(public_key);
DROP POLICY IF EXISTS "select_own_embed_keys" ON embed_keys;
CREATE POLICY "select_own_embed_keys" ON embed_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_embed_keys" ON embed_keys;
CREATE POLICY "insert_own_embed_keys" ON embed_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_embed_keys" ON embed_keys;
CREATE POLICY "update_own_embed_keys" ON embed_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_embed_keys" ON embed_keys;
CREATE POLICY "delete_own_embed_keys" ON embed_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid,
  action text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
DROP POLICY IF EXISTS "select_own_activity" ON activity_log;
CREATE POLICY "select_own_activity" ON activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_activity" ON activity_log;
CREATE POLICY "insert_own_activity" ON activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_activity" ON activity_log;
CREATE POLICY "delete_own_activity" ON activity_log FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'starter',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
CREATE POLICY "select_own_subscription" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription" ON subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
CREATE POLICY "update_own_subscription" ON subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger for subscriptions
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Auto-create a profile row + starter subscription when a new auth user signs up.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO subscriptions (user_id, tier) VALUES (NEW.id, 'starter') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
