
-- 1. Roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'researcher');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role security-definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies for user_roles
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "owner reads all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- 4. owner_id on perception_experiments
ALTER TABLE public.perception_experiments
  ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX perception_experiments_owner_id_idx
  ON public.perception_experiments (owner_id);

-- 5. user_owns_experiment helper
CREATE OR REPLACE FUNCTION public.user_owns_experiment(_user_id UUID, _experiment_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perception_experiments
    WHERE id = _experiment_id
      AND (owner_id = _user_id OR public.has_role(_user_id, 'owner'))
  )
$$;

-- 6. handle_new_user trigger: assign OWNER only to the designated email;
--    block any other public signup (raises exception).
--    Admin-API creations (server-side) must set user_metadata.bypass_signup_guard = true
--    so the OWNER can create researchers later.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_bypassed BOOLEAN := COALESCE(
    (NEW.raw_user_meta_data ->> 'bypass_signup_guard')::BOOLEAN,
    FALSE
  );
  owner_exists BOOLEAN;
BEGIN
  IF NEW.email = 'hiddengrain.exp@gmail.com' THEN
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') INTO owner_exists;
    IF owner_exists THEN
      -- OWNER already exists: assign researcher (unless bypass).
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'researcher')
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
      UPDATE public.perception_experiments
        SET owner_id = NEW.id
        WHERE owner_id IS NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF is_bypassed THEN
    -- Server-side creation by OWNER/ADMIN: default role researcher.
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'researcher')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'signup_not_allowed';
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
