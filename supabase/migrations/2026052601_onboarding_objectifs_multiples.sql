-- Funnel /onboard étape 1 : objectifs multiples + précision « Autre »

ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS objectifs_principaux text[],
  ADD COLUMN IF NOT EXISTS objectif_autre_precision text;

COMMENT ON COLUMN public.onboarding_sessions.objectifs_principaux IS
  'Codes objectifs sélectionnés (plusieurs choix possibles).';
COMMENT ON COLUMN public.onboarding_sessions.objectif_autre_precision IS
  'Texte libre si le code autre est parmi objectifs_principaux.';

-- Rétrocompat : sessions existantes avec un seul objectif_principal
UPDATE public.onboarding_sessions
SET objectifs_principaux = ARRAY[objectif_principal]
WHERE objectif_principal IS NOT NULL
  AND (objectifs_principaux IS NULL OR cardinality(objectifs_principaux) = 0);
