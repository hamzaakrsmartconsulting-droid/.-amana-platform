-- Migration : grants sur la table products + données de démonstration
-- Date : 2026-05-12
-- Cause du 400 : anon n'a pas le privilege SELECT → PostgREST retourne 400

-- 1. Grants sur le schéma et les tables utiles au catalogue
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- Accords supplémentaires pour les tables couramment lues en client-side
GRANT SELECT ON public.kyc TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.dossiers TO authenticated;
GRANT SELECT ON public.documents TO authenticated;
GRANT SELECT ON public.document_inputs TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.messages TO authenticated;

-- 2. Données de démonstration — catalogue produits halal
-- Safe à re-runner : ON CONFLICT DO NOTHING
INSERT INTO public.products (slug, nom, categorie, type, description, rendement_cible_pct, risque_niveau, sharia_compliant, actif, ordre_affichage)
VALUES
  (
    'scpi-pierval-sante',
    'SCPI Pierval Sante',
    'scpi',
    'scpi',
    'SCPI investissant dans des actifs de sante (cliniques, EHPAD, cabinets medicaux) en Europe. Revenus potentiels reguliers, diversification geographique.',
    4.50,
    3,
    TRUE,
    TRUE,
    10
  ),
  (
    'av-salam-patrimoine',
    'Assurance-vie Salam Patrimoine',
    'assurance_vie',
    'assurance_vie',
    'Contrat assurance-vie multisupport 100% conforme aux principes islamiques. Acces a des UC selectionnees par le Comite Sharia AMANA.',
    4.20,
    2,
    TRUE,
    TRUE,
    20
  ),
  (
    'per-iqbal',
    'PER Iqbal Retraite',
    'per',
    'retraite',
    'Plan d''epargne retraite halal avec deduction fiscale a l''entree. Allocation dynamique selon l''horizon de retraite.',
    5.00,
    3,
    TRUE,
    TRUE,
    30
  ),
  (
    'or-physique-amana',
    'Or Physique AMANA',
    'or',
    'or',
    'Investissement en or physique alloue, stocke dans un coffre securise en Suisse. Actif tangible, aucune exposition aux instruments derives.',
    NULL,
    2,
    TRUE,
    TRUE,
    40
  ),
  (
    'scpi-corum-origin',
    'SCPI Corum Origin',
    'scpi',
    'scpi',
    'SCPI de rendement investissant dans l''immobilier d''entreprise en zone euro. Diversification sectorielle et geographique.',
    6.00,
    4,
    TRUE,
    TRUE,
    50
  ),
  (
    'immo-mourabaha',
    'Financement Mourabaha Immobilier',
    'immobilier',
    'immobilier',
    'Solution de financement immobilier conforme a la charia via contrat Mourabaha. Accompagnement de A a Z par les conseillers AMANA.',
    NULL,
    2,
    TRUE,
    TRUE,
    60
  )
ON CONFLICT (slug) DO NOTHING;
