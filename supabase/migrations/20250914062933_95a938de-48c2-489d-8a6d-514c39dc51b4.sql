-- Créer un profil pour l'utilisateur existant avec le rôle admin
INSERT INTO public.profiles (user_id, role, first_name, last_name) 
VALUES ('1fa78b0d-0b95-4ac1-bdf3-534de800aba4', 'admin', 'Alex', 'Moll')
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', 
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    updated_at = now();