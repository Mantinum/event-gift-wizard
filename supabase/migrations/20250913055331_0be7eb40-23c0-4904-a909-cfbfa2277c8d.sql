-- Correction des fonctions pour sécuriser le search_path

-- 1) Correction de la fonction compute_age_fields
CREATE OR REPLACE FUNCTION public.compute_age_fields(bdate date, today date DEFAULT current_date)
RETURNS TABLE (
  out_age_years int,
  out_age_months int,
  out_age_bucket text,
  out_is_minor boolean,
  out_next_birthday date
) LANGUAGE plpgsql IMMUTABLE 
SET search_path = public
AS $$
DECLARE
  yrs int;
  mos int;
  nb date;
  bucket text;
  birth_month int;
  birth_day int;
  today_month int;
  today_day int;
  next_year int;
BEGIN
  IF bdate IS NULL OR bdate > today THEN
    RETURN QUERY SELECT NULL::int, NULL::int, NULL::text, NULL::boolean, NULL::date;
    RETURN;
  END IF;

  yrs := date_part('year', age(today, bdate))::int;
  mos := (date_part('year', age(today, bdate))::int * 12)
       + date_part('month', age(today, bdate))::int;

  -- Extraction des composants de date
  birth_month := extract(month from bdate)::int;
  birth_day := extract(day from bdate)::int;
  today_month := extract(month from today)::int;
  today_day := extract(day from today)::int;

  -- Calcul de la prochaine date d'anniversaire
  IF birth_month < today_month OR (birth_month = today_month AND birth_day <= today_day) THEN
    next_year := extract(year from today)::int + 1;
  ELSE
    next_year := extract(year from today)::int;
  END IF;

  -- Construction de la date d'anniversaire (gestion du 29 février)
  BEGIN
    nb := make_date(next_year, birth_month, birth_day);
  EXCEPTION WHEN others THEN
    -- Si erreur (ex: 29 février année non bissextile), utiliser le 28 février
    nb := make_date(next_year, birth_month, LEAST(birth_day, 28));
  END;

  -- Détermination du bucket d'âge
  IF yrs < 1 THEN bucket := 'infant';
  ELSIF yrs = 1 OR yrs = 2 THEN bucket := 'toddler';
  ELSIF yrs BETWEEN 3 AND 12 THEN bucket := 'child';
  ELSIF yrs BETWEEN 13 AND 17 THEN bucket := 'teen';
  ELSE bucket := 'adult';
  END IF;

  RETURN QUERY SELECT
    yrs,
    mos,
    bucket,
    (yrs < 18),
    nb;
END $$;

-- 2) Correction de la fonction persons_age_before_write
CREATE OR REPLACE FUNCTION public.persons_age_before_write()
RETURNS trigger LANGUAGE plpgsql 
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.compute_age_fields(NEW.birthday);
  NEW.age_years      := r.out_age_years;
  NEW.age_months     := r.out_age_months;
  NEW.age_bucket     := r.out_age_bucket;
  NEW.is_minor       := r.out_is_minor;
  NEW.next_birthday  := r.out_next_birthday;
  NEW.age_updated_at := now();
  RETURN NEW;
END $$;

-- 3) Correction de la fonction refresh_birthdays_for_today
CREATE OR REPLACE FUNCTION public.refresh_birthdays_for_today()
RETURNS void LANGUAGE plpgsql 
SET search_path = public
AS $$
DECLARE
  rec persons%ROWTYPE;
  r record;
BEGIN
  FOR rec IN
    SELECT * FROM persons
    WHERE birthday IS NOT NULL
      AND extract(month from birthday) = extract(month from current_date)
      AND extract(day from birthday) = extract(day from current_date)
  LOOP
    SELECT * INTO r FROM public.compute_age_fields(rec.birthday);
    UPDATE persons
      SET age_years      = r.out_age_years,
          age_months     = r.out_age_months,
          age_bucket     = r.out_age_bucket,
          is_minor       = r.out_is_minor,
          next_birthday  = r.out_next_birthday,
          age_updated_at = now()
      WHERE id = rec.id;
  END LOOP;
END $$;