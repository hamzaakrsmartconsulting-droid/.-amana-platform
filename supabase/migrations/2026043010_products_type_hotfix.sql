-- Hotfix: frontend queries order products by "type"
-- Baseline schema used "categorie". Keep both for compatibility.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS type TEXT;

UPDATE public.products
SET type = categorie
WHERE (type IS NULL OR type = '')
  AND categorie IS NOT NULL;
