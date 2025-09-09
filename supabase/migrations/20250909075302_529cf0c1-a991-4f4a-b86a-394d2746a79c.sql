-- Create tables for the gift calendar application

-- Create persons table
CREATE TABLE public.persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT,
  interests TEXT[] DEFAULT '{}',
  budget INTEGER NOT NULL DEFAULT 0,
  relationship TEXT NOT NULL,
  birthday DATE NOT NULL,
  last_gift TEXT,
  preferred_categories TEXT[] DEFAULT '{}',
  notes TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('birthday', 'wedding', 'anniversary', 'baptism', 'christmas', 'other')),
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  budget INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ordered', 'completed', 'cancelled')),
  description TEXT,
  location TEXT,
  reminder_days INTEGER DEFAULT 7,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create upcoming_purchases table
CREATE TABLE public.upcoming_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  days_until INTEGER NOT NULL,
  budget INTEGER NOT NULL DEFAULT 0,
  suggested_gift TEXT NOT NULL,
  confidence REAL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'ordered', 'delivered')),
  alternative_gifts TEXT[] DEFAULT '{}',
  ai_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_purchases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for persons
CREATE POLICY "Users can view their own persons" 
ON public.persons 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own persons" 
ON public.persons 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persons" 
ON public.persons 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own persons" 
ON public.persons 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for events
CREATE POLICY "Users can view their own events" 
ON public.events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for upcoming_purchases
CREATE POLICY "Users can view their own purchases" 
ON public.upcoming_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" 
ON public.upcoming_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchases" 
ON public.upcoming_purchases 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchases" 
ON public.upcoming_purchases 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.upcoming_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_persons_user_id ON public.persons(user_id);
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_person_id ON public.events(person_id);
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_purchases_user_id ON public.upcoming_purchases(user_id);
CREATE INDEX idx_purchases_person_id ON public.upcoming_purchases(person_id);
CREATE INDEX idx_purchases_event_id ON public.upcoming_purchases(event_id);