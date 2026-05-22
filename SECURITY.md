# Politique de sécurité — AMANA Patrimoine

## Reporter une vulnérabilité

Si tu identifies une vulnérabilité dans la plateforme AMANA, **n'ouvre pas
d'issue publique**. Envoie un email à : `security@amana-patrimoine.fr`
(ou contact direct Mohamed) avec :

1. Description de la faille.
2. Étapes pour reproduire.
3. Impact potentiel.
4. Suggestion de mitigation (optionnel).

Réponse sous 48h ouvrées. Patch et CVE publié si applicable.

## Périmètre couvert

- Code de l'application Next.js (`amana-platform`).
- Migrations Supabase et policies RLS.
- Webhooks (Yousign, Resend).
- Documents générés (DER, LM, RA, etc.) côté contenu.

## Hors périmètre

- Vulnérabilités dans Supabase, Vercel, Anthropic (à reporter à l'éditeur).
- Vulnérabilités dans des packages npm (à reporter à l'éditeur via Snyk/GHSA).
- Phishing visant les clients (relève de la gestion incident, pas de la sécu code).

## Gestion des secrets

- Tous les secrets en `.env.local` (jamais commit).
- En CI : valeurs factices via env du workflow.
- En prod / preview : Vercel env variables.
- Rotation tous les 6 mois sur les clés API critiques (Anthropic, Yousign, Resend).
- Service role Supabase rotation immédiate si exposé.

## Audit logs

Toute action sensible est loggée dans `public.audit_logs` :
- KYC valider / rejeter
- Génération de document officiel
- Transition de stage de dossier
- Finalisation onboarding
- Webhook reçu

## Conformité

- **RGPD** : export client + delete client implémentés (sprint v7).
- **ORIAS** : numéro 25009552 (CIF / COA / COBSP) affiché sur les pages
  publiques. Documents réglementaires en cours de validation par un
  prestataire externe avant ouverture aux clients réels.
- **Sharia** : conformité certifiée par Sakina Consulting.
