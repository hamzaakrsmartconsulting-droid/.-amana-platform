-- Hotfix: admin UI queries expect public.profiles.full_name

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

UPDATE public.profiles
SET full_name = NULLIF(trim(concat_ws(' ', prenom, nom)), '')
WHERE full_name IS NULL OR full_name = '';
