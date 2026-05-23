
-- Enums
CREATE TYPE public.app_name AS ENUM ('AIDE', 'HANDICAP', 'CVEC');
CREATE TYPE public.app_role AS ENUM ('admin', 'partenaire', 'direction');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application public.app_name NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, application, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  application public.app_name NOT NULL,
  role public.app_role NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invitations_email ON public.invitations(lower(email));

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _app public.app_name, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND application = _app AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_app_access(_user_id UUID, _app public.app_name)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (application = _app OR role = 'direction')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id UUID, _app public.app_name)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND application = _app AND role = 'admin'
  );
$$;

-- RLS: profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS: user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "App admins view app roles" ON public.user_roles
  FOR SELECT USING (public.is_app_admin(auth.uid(), application));
CREATE POLICY "App admins insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.is_app_admin(auth.uid(), application));
CREATE POLICY "App admins delete roles" ON public.user_roles
  FOR DELETE USING (public.is_app_admin(auth.uid(), application));

-- RLS: invitations
CREATE POLICY "App admins view invitations" ON public.invitations
  FOR SELECT USING (public.is_app_admin(auth.uid(), application));
CREATE POLICY "App admins create invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    public.is_app_admin(auth.uid(), application) AND invited_by = auth.uid()
  );
CREATE POLICY "App admins update invitations" ON public.invitations
  FOR UPDATE USING (public.is_app_admin(auth.uid(), application));
CREATE POLICY "App admins delete invitations" ON public.invitations
  FOR DELETE USING (public.is_app_admin(auth.uid(), application));

-- Trigger: handle new user signup -> create profile + apply pending invitations + bootstrap super admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Bootstrap super admin
  IF lower(NEW.email) = 'nicolas.landry@univ-orleans.fr' THEN
    INSERT INTO public.user_roles (user_id, application, role) VALUES
      (NEW.id, 'AIDE', 'admin'),
      (NEW.id, 'HANDICAP', 'admin'),
      (NEW.id, 'CVEC', 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Apply pending invitations for this email
  FOR inv IN
    SELECT * FROM public.invitations
    WHERE lower(email) = lower(NEW.email)
      AND status = 'pending'
      AND expires_at > now()
  LOOP
    INSERT INTO public.user_roles (user_id, application, role)
    VALUES (NEW.id, inv.application, inv.role)
    ON CONFLICT DO NOTHING;
    UPDATE public.invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
