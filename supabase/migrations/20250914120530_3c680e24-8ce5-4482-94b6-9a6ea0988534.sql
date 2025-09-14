-- Corriger la faille de sécurité des notifications en une seule opération
-- Remplacer la politique trop permissive par une politique sécurisée

-- D'abord créer la nouvelle politique sécurisée
CREATE POLICY "Users can create notifications for themselves only" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensuite supprimer l'ancienne politique non sécurisée
DROP POLICY "System can create notifications" ON public.notifications;