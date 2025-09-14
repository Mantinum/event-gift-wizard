import { useNotificationActions } from '@/hooks/useNotificationActions';
import { differenceInDays, isToday, addDays } from 'date-fns';

// Fonction utilitaire pour créer des notifications de rappel d'anniversaire
export const createBirthdayReminders = async (persons: any[], userId: string) => {
  const { createBirthdayNotification } = useNotificationActions();
  
  const today = new Date();
  
  for (const person of persons) {
    if (!person.birthday) continue;
    
    const birthdayThisYear = new Date(today.getFullYear(), 
      new Date(person.birthday).getMonth(), 
      new Date(person.birthday).getDate()
    );
    
    // Si l'anniversaire est passé cette année, prendre l'année suivante
    if (birthdayThisYear < today) {
      birthdayThisYear.setFullYear(today.getFullYear() + 1);
    }
    
    const daysUntilBirthday = differenceInDays(birthdayThisYear, today);
    
    // Créer des notifications à différents intervalles
    if (daysUntilBirthday === 0) {
      // Anniversaire aujourd'hui
      await createBirthdayNotification(userId, person.name, 0);
    } else if (daysUntilBirthday === 1) {
      // Demain
      await createBirthdayNotification(userId, person.name, 1);
    } else if (daysUntilBirthday === 7) {
      // Dans une semaine
      await createBirthdayNotification(userId, person.name, 7);
    }
  }
};

// Fonction utilitaire pour créer des notifications de rappel d'événements
export const createEventReminders = async (events: any[], userId: string) => {
  const { createEventNotification } = useNotificationActions();
  
  const today = new Date();
  
  for (const event of events) {
    if (!event.date) continue;
    
    const eventDate = new Date(event.date);
    const daysUntilEvent = differenceInDays(eventDate, today);
    
    // Créer des notifications à différents intervalles
    if (daysUntilEvent === 0) {
      // Événement aujourd'hui
      await createEventNotification(userId, event.title, 0);
    } else if (daysUntilEvent === 1) {
      // Demain
      await createEventNotification(userId, event.title, 1);
    } else if (daysUntilEvent === event.reminder_days || daysUntilEvent === 7) {
      // Selon le rappel configuré ou par défaut 7 jours
      await createEventNotification(userId, event.title, daysUntilEvent);
    }
  }
};

// Fonction pour créer une notification de bienvenue pour les nouveaux utilisateurs
export const createWelcomeNotification = async (userId: string, userName: string) => {
  const { createNotification } = useNotificationActions();
  
  await createNotification({
    user_id: userId,
    title: `🎉 Bienvenue ${userName} !`,
    message: "Commencez par créer des profils de vos proches et nous vous aiderons à ne jamais oublier leurs anniversaires et événements importants.",
    type: 'success',
    action_url: '/dashboard?tab=profiles'
  });
};