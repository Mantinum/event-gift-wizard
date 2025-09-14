-- Supprimer la politique problématique
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Créer une fonction security definer pour vérifier le rôle admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Créer une nouvelle politique admin sans récursion
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());