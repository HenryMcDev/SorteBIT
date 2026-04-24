-- Replace permissive UPDATE policy with a stricter one using a trigger guard
DROP POLICY IF EXISTS "Anyone can mark code as used" ON public.student_codes;

-- Function: only allow public updates that toggle is_used false->true and set used_at
CREATE OR REPLACE FUNCTION public.guard_student_code_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to do anything
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For anonymous/public updates, only permit marking unused -> used
  IF OLD.is_used = false
     AND NEW.is_used = true
     AND NEW.code = OLD.code
     AND NEW.student_name = OLD.student_name
     AND NEW.class_name = OLD.class_name
     AND NEW.date = OLD.date
     AND NEW.teacher_name = OLD.teacher_name
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Update not permitted';
END;
$$;

CREATE TRIGGER guard_student_codes_update
BEFORE UPDATE ON public.student_codes
FOR EACH ROW EXECUTE FUNCTION public.guard_student_code_update();

CREATE POLICY "Public can mark unused codes as used"
ON public.student_codes FOR UPDATE
USING (is_used = false)
WITH CHECK (is_used = true);