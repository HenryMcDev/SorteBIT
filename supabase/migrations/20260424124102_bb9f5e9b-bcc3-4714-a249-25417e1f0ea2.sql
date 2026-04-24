-- App roles enum and user_roles table (secure role storage)
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Teachers table (manually registered by admin)
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read teachers for login"
ON public.teachers FOR SELECT
USING (true);

CREATE POLICY "Admins can insert teachers"
ON public.teachers FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update teachers"
ON public.teachers FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete teachers"
ON public.teachers FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Student codes table
CREATE TABLE public.student_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  teacher_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, date)
);

ALTER TABLE public.student_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_student_codes_code_date ON public.student_codes(code, date);

CREATE POLICY "Anyone can validate codes"
ON public.student_codes FOR SELECT
USING (true);

CREATE POLICY "Anyone can mark code as used"
ON public.student_codes FOR UPDATE
USING (is_used = false)
WITH CHECK (is_used = true);

CREATE POLICY "Admins can insert codes"
ON public.student_codes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete codes"
ON public.student_codes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_student_codes_updated_at
BEFORE UPDATE ON public.student_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lottery participations table
CREATE TABLE public.lottery_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  class_name TEXT NOT NULL,
  lucky_number INTEGER NOT NULL,
  teacher_code TEXT NOT NULL,
  participation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lottery_participations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lottery_participations_date ON public.lottery_participations(participation_date);

CREATE POLICY "Anyone can submit a participation"
ON public.lottery_participations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view participations"
ON public.lottery_participations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete participations"
ON public.lottery_participations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));