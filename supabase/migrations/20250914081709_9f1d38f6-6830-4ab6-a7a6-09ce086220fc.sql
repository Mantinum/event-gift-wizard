-- Ajouter une politique RLS pour permettre aux admins de voir l'usage IA de tous les utilisateurs
CREATE POLICY "Admins can view all AI usage" 
ON ai_usage_limits 
FOR SELECT 
USING (is_admin());