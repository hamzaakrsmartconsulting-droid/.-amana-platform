-- Remplir full_name / prenom / nom pour les clients existants (funnel, dossiers, auth metadata)

UPDATE public.profiles p
SET
  prenom = COALESCE(NULLIF(trim(p.prenom), ''), NULLIF(trim(u.raw_user_meta_data->>'prenom'), '')),
  nom = COALESCE(NULLIF(trim(p.nom), ''), NULLIF(trim(u.raw_user_meta_data->>'nom'), ''))
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'client'
  AND (
    p.prenom IS NULL OR trim(p.prenom) = ''
    OR p.nom IS NULL OR trim(p.nom) = ''
  );

UPDATE public.profiles p
SET
  prenom = COALESCE(NULLIF(trim(p.prenom), ''), NULLIF(trim(s.prenom), '')),
  nom = COALESCE(NULLIF(trim(p.nom), ''), NULLIF(trim(s.nom), ''))
FROM public.onboarding_sessions s
WHERE s.finalized_user_id = p.id
  AND p.role = 'client'
  AND s.prenom IS NOT NULL
  AND s.nom IS NOT NULL
  AND (
    p.prenom IS NULL OR trim(p.prenom) = ''
    OR p.nom IS NULL OR trim(p.nom) = ''
  );

UPDATE public.profiles p
SET
  prenom = COALESCE(NULLIF(trim(p.prenom), ''), NULLIF(trim(d.prenom), '')),
  nom = COALESCE(NULLIF(trim(p.nom), ''), NULLIF(trim(d.nom), ''))
FROM auth.users u
JOIN LATERAL (
  SELECT d2.prenom, d2.nom
  FROM public.dossiers d2
  WHERE lower(trim(d2.email_client)) = lower(trim(u.email))
  ORDER BY d2.updated_at DESC NULLS LAST
  LIMIT 1
) d ON true
WHERE p.id = u.id
  AND p.role = 'client'
  AND u.email IS NOT NULL
  AND (
    p.prenom IS NULL OR trim(p.prenom) = ''
    OR p.nom IS NULL OR trim(p.nom) = ''
  );

UPDATE public.profiles
SET full_name = NULLIF(trim(concat_ws(' ', prenom, nom)), '')
WHERE role = 'client'
  AND (full_name IS NULL OR trim(full_name) = '')
  AND (
    (prenom IS NOT NULL AND trim(prenom) <> '')
    OR (nom IS NOT NULL AND trim(nom) <> '')
  );

-- Nouveaux comptes auth : full_name dès la création du profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _prenom text := COALESCE(NEW.raw_user_meta_data->>'prenom', '');
  _nom text := COALESCE(NEW.raw_user_meta_data->>'nom', '');
BEGIN
  INSERT INTO public.profiles (id, email, prenom, nom, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    _prenom,
    _nom,
    NULLIF(trim(concat_ws(' ', _prenom, _nom)), ''),
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
