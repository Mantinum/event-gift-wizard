-- Supprimer les doublons d'événements pour TESTO59 (garder seulement les 2 plus anciens)
DELETE FROM events 
WHERE person_name = 'TESTO59' 
AND is_auto_generated = true 
AND id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY date, type ORDER BY created_at) as rn
    FROM events 
    WHERE person_name = 'TESTO59' AND is_auto_generated = true
  ) ranked 
  WHERE rn = 1
);