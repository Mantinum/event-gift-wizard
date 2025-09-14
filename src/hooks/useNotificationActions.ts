import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
}

export const useNotificationActions = () => {
  const { toast } = useToast();

  const createNotification = async (data: CreateNotificationData) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: data.type || 'info',
          action_url: data.action_url
        }]);

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la notification",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // Fonction utilitaire pour créer des notifications d'anniversaire
  const createBirthdayNotification = async (userId: string, personName: string, daysUntil: number) => {
    const title = daysUntil === 0 
      ? `🎉 Anniversaire aujourd'hui !`
      : `🎂 Anniversaire dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;
    
    const message = daysUntil === 0
      ? `C'est l'anniversaire de ${personName} aujourd'hui ! N'oubliez pas de lui souhaiter.`
      : `L'anniversaire de ${personName} approche. Pensez à préparer un cadeau !`;

    return createNotification({
      user_id: userId,
      title,
      message,
      type: daysUntil === 0 ? 'success' : 'info',
      action_url: '/dashboard?tab=profiles'
    });
  };

  // Fonction utilitaire pour créer des notifications d'événements
  const createEventNotification = async (userId: string, eventTitle: string, daysUntil: number) => {
    const title = daysUntil === 0 
      ? `📅 Événement aujourd'hui !`
      : `📅 Événement dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;
    
    const message = daysUntil === 0
      ? `L'événement "${eventTitle}" a lieu aujourd'hui !`
      : `N'oubliez pas l'événement "${eventTitle}" qui approche.`;

    return createNotification({
      user_id: userId,
      title,
      message,
      type: daysUntil === 0 ? 'warning' : 'info',
      action_url: '/dashboard?tab=calendar'
    });
  };

  // Fonction utilitaire pour créer des notifications de suggestions de cadeaux
  const createGiftSuggestionNotification = async (userId: string, personName: string, giftSuggestion: string) => {
    return createNotification({
      user_id: userId,
      title: `💡 Nouvelle suggestion de cadeau`,
      message: `Pour ${personName}: ${giftSuggestion}`,
      type: 'success',
      action_url: '/dashboard?tab=profiles'
    });
  };

  return {
    createNotification,
    createBirthdayNotification,
    createEventNotification,
    createGiftSuggestionNotification
  };
};