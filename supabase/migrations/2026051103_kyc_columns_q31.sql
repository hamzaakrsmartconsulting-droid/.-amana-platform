-- Migration : ajout colonnes KYC manquantes (Q3.1 spec)
-- qualite_declarant, doc_avis_imposition_url, doc_origine_fonds_url

ALTER TABLE public.kyc
  ADD COLUMN IF NOT EXISTS qualite_declarant TEXT
    CHECK (qualite_declarant IN ('client', 'mandataire', 'beneficiaire_effectif', 'payeur_prime'))
    DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS doc_avis_imposition_url   TEXT,
  ADD COLUMN IF NOT EXISTS doc_origine_fonds_url     TEXT;

COMMENT ON COLUMN public.kyc.qualite_declarant IS
  'Q3.1 spec — qualité du déclarant : client / mandataire / bénéficiaire effectif / payeur de prime (art. L.561-2 CMF)';
COMMENT ON COLUMN public.kyc.doc_avis_imposition_url IS
  'Q3.7 spec — dernier avis d''imposition (art. L.561-5 CMF, mesure de vigilance renforcée)';
COMMENT ON COLUMN public.kyc.doc_origine_fonds_url IS
  'Q3.7 spec — justificatif d''origine des fonds (art. L.561-5 CMF)';
