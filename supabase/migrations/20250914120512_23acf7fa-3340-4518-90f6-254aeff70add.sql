-- Corriger la faille de sécurité des notifications
-- Supprimer la politique trop permissive qui permet à n'importe qui de créer des notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Créer une politique sécurisée pour que les utilisateurs ne puissent créer des notifications que pour eux-mêmes
CREATE POLICY "Users can create notifications for themselves" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Créer une politique pour permettre aux fonctions système (avec service role) de créer des notifications
-- Cette politique n'est active que quand on utilise la service role key (bypass RLS de toute façon)
CREATE POLICY "System functions can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- Vérifier que l'insertion vient d'un contexte système (service role)
  -- En pratique, les edge functions avec service role key bypass RLS
  auth.role() = 'service_role'
);