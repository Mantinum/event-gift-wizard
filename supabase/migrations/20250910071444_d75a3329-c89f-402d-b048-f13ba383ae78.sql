-- Ajouter les colonnes gender et address à la table persons
ALTER TABLE public.persons 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN public.persons.gender IS 'Sexe de la personne (Homme, Femme, Non binaire, Préfère ne pas dire)';
COMMENT ON COLUMN public.persons.address IS 'Adresse complète de la personne';