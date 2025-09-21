import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!supported) {
      toast({
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées sur ce navigateur",
        variant: "destructive"
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais des rappels pour vos événements"
        });
        return true;
      } else {
        toast({
          title: "Permissions refusées",
          description: "Activez les notifications dans les paramètres de votre navigateur",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  };

  const scheduleNotification = (title: string, date: Date, options?: NotificationOptions) => {
    const now = new Date().getTime();
    const scheduledTime = date.getTime();
    const delay = scheduledTime - now;

    if (delay > 0) {
      setTimeout(() => {
        sendNotification(title, options);
      }, delay);
    }
  };

  return {
    supported,
    permission,
    requestPermission,
    sendNotification,
    scheduleNotification,
    isGranted: permission === 'granted'
  };
}