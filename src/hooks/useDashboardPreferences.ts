import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WidgetConfig {
  id: string;
  type: string;
  position: number;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
}

export interface DashboardPreferences {
  id?: string;
  user_id?: string;
  widget_layout: WidgetConfig[];
  theme_preference: 'light' | 'dark' | 'auto';
  notification_settings: {
    push_enabled: boolean;
    email_enabled: boolean;
    reminder_days: number[];
  };
}

const defaultPreferences: DashboardPreferences = {
  widget_layout: [
    { id: 'stats', type: 'stats', position: 0, size: 'large', visible: true },
    { id: 'analytics', type: 'analytics', position: 1, size: 'large', visible: true },
    { id: 'tasks', type: 'tasks', position: 2, size: 'medium', visible: true },
    { id: 'weather', type: 'weather', position: 3, size: 'medium', visible: true }
  ],
  theme_preference: 'auto',
  notification_settings: {
    push_enabled: true,
    email_enabled: true,
    reminder_days: [7, 3, 1]
  }
};

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dashboard_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          ...data,
          widget_layout: (data.widget_layout as unknown as WidgetConfig[]) || defaultPreferences.widget_layout,
          notification_settings: (data.notification_settings as unknown as DashboardPreferences['notification_settings']) || defaultPreferences.notification_settings,
          theme_preference: (data.theme_preference as 'light' | 'dark' | 'auto') || 'auto'
        });
      } else {
        await savePreferences(defaultPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos préférences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<DashboardPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedPreferences = { ...preferences, ...newPreferences };
      
      const { error } = await supabase
        .from('dashboard_preferences')
        .upsert({
          user_id: user.id,
          widget_layout: updatedPreferences.widget_layout as any,
          theme_preference: updatedPreferences.theme_preference,
          notification_settings: updatedPreferences.notification_settings as any
        });

      if (error) throw error;

      setPreferences(updatedPreferences);
      
      toast({
        title: "Succès",
        description: "Préférences sauvegardées"
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder vos préférences",
        variant: "destructive"
      });
    }
  };

  const updateWidgetLayout = (newLayout: WidgetConfig[]) => {
    const updatedPreferences = { ...preferences, widget_layout: newLayout };
    setPreferences(updatedPreferences);
    savePreferences({ widget_layout: newLayout });
  };

  const updateThemePreference = (theme: 'light' | 'dark' | 'auto') => {
    savePreferences({ theme_preference: theme });
  };

  const updateNotificationSettings = (settings: Partial<DashboardPreferences['notification_settings']>) => {
    const newSettings = { ...preferences.notification_settings, ...settings };
    savePreferences({ notification_settings: newSettings });
  };

  return {
    preferences,
    loading,
    updateWidgetLayout,
    updateThemePreference,
    updateNotificationSettings,
    refetch: fetchPreferences
  };
}