-- Créer une table pour tracker les utilisations quotidiennes d'IA
CREATE TABLE public.ai_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- Enable RLS
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage" 
ON public.ai_usage_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" 
ON public.ai_usage_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" 
ON public.ai_usage_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_ai_usage_limits_updated_at
BEFORE UPDATE ON public.ai_usage_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check and increment usage
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_role TEXT;
  current_usage INTEGER := 0;
  daily_limit INTEGER := 5;
  result JSON;
BEGIN
  -- Get user role
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = p_user_id;

  -- No limits for premium users and admins
  IF user_role IN ('admin', 'premium_1', 'premium_2') THEN
    RETURN json_build_object(
      'allowed', true, 
      'remaining', -1, 
      'limit', -1,
      'role', user_role
    );
  END IF;

  -- Get or create today's usage record
  INSERT INTO public.ai_usage_limits (user_id, usage_date, generation_count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) 
  DO NOTHING;

  -- Get current usage
  SELECT generation_count INTO current_usage
  FROM public.ai_usage_limits
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  -- Check if limit exceeded
  IF current_usage >= daily_limit THEN
    RETURN json_build_object(
      'allowed', false, 
      'remaining', 0, 
      'limit', daily_limit,
      'role', user_role,
      'reset_time', (CURRENT_DATE + INTERVAL '1 day')::timestamp
    );
  END IF;

  -- Increment usage
  UPDATE public.ai_usage_limits 
  SET generation_count = generation_count + 1,
      updated_at = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  -- Return success with remaining uses
  RETURN json_build_object(
    'allowed', true, 
    'remaining', daily_limit - current_usage - 1, 
    'limit', daily_limit,
    'role', user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;