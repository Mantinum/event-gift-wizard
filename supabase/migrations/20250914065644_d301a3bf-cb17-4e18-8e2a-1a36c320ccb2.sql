-- Create a function to get user email by user_id
CREATE OR REPLACE FUNCTION public.get_user_email(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_email, 'Email introuvable');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;