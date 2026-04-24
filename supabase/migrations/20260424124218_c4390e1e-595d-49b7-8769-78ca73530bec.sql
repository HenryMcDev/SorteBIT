-- Remove the permissive public update policy and the trigger-based guard
DROP POLICY IF EXISTS "Public can mark unused codes as used" ON public.student_codes;
DROP TRIGGER IF EXISTS guard_student_codes_update ON public.student_codes;
DROP FUNCTION IF EXISTS public.guard_student_code_update();

-- Secure RPC: mark a specific unused code (matching code+date) as used
CREATE OR REPLACE FUNCTION public.mark_student_code_used(_code TEXT, _date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE public.student_codes
     SET is_used = true,
         used_at = now()
   WHERE code = _code
     AND date = _date
     AND is_used = false;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_student_code_used(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_student_code_used(TEXT, DATE) TO anon, authenticated;