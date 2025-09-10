-- Supprimer l'événement d'anniversaire incorrect pour Roxane
DELETE FROM events WHERE person_id = '16f2bc39-d005-4a63-a75e-e035a4692ab9' AND type = 'birthday';