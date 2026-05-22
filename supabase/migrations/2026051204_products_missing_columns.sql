-- Migration : ajout des colonnes manquantes sur public.products
-- Date : 2026-05-12
-- Ces colonnes sont utilisées par app/catalogue/page.tsx mais absentes du schéma

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gestionnaire       TEXT,
  ADD COLUMN IF NOT EXISTS ticket_min         NUMERIC(12,0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rendement_min      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS rendement_max      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS halal_certifie     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS risque_sri         INT CHECK (risque_sri BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS horizon_min_ans    INT;

-- Mise à jour des produits seeds avec les nouvelles colonnes
UPDATE public.products SET
  gestionnaire    = 'Euryale Asset Management',
  ticket_min      = 1000,
  rendement_min   = 3.80,
  rendement_max   = 5.20,
  risque_sri      = 3,
  horizon_min_ans = 8
WHERE slug = 'scpi-pierval-sante';

UPDATE public.products SET
  gestionnaire    = 'AMANA Patrimoine',
  ticket_min      = 500,
  rendement_min   = 3.50,
  rendement_max   = 4.90,
  risque_sri      = 2,
  horizon_min_ans = 5
WHERE slug = 'av-salam-patrimoine';

UPDATE public.products SET
  gestionnaire    = 'AMANA Patrimoine',
  ticket_min      = 500,
  rendement_min   = 4.00,
  rendement_max   = 6.00,
  risque_sri      = 3,
  horizon_min_ans = 10
WHERE slug = 'per-iqbal';

UPDATE public.products SET
  gestionnaire    = 'AMANA Gold',
  ticket_min      = 1000,
  rendement_min   = NULL,
  rendement_max   = NULL,
  risque_sri      = 2,
  horizon_min_ans = 3
WHERE slug = 'or-physique-amana';

UPDATE public.products SET
  gestionnaire    = 'Corum Asset Management',
  ticket_min      = 1135,
  rendement_min   = 5.00,
  rendement_max   = 7.00,
  risque_sri      = 4,
  horizon_min_ans = 8
WHERE slug = 'scpi-corum-origin';

UPDATE public.products SET
  gestionnaire    = 'AMANA Patrimoine',
  ticket_min      = 50000,
  rendement_min   = NULL,
  rendement_max   = NULL,
  risque_sri      = 2,
  horizon_min_ans = 15
WHERE slug = 'immo-mourabaha';
