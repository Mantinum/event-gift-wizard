-- Table pour les préférences du dashboard
CREATE TABLE public.dashboard_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  widget_layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme_preference TEXT DEFAULT 'auto',
  notification_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for dashboard_preferences
CREATE POLICY "Users can view their own dashboard preferences" 
ON public.dashboard_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard preferences" 
ON public.dashboard_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard preferences" 
ON public.dashboard_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard preferences" 
ON public.dashboard_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Amélioration des notifications pour le push
ALTER TABLE public.notifications 
ADD COLUMN push_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE;

-- Add trigger for dashboard_preferences timestamps
CREATE TRIGGER update_dashboard_preferences_updated_at
BEFORE UPDATE ON public.dashboard_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();