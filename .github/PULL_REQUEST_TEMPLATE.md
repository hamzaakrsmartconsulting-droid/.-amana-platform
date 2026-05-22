# Pull Request

## Quoi

<!-- 1-3 lignes : qu'est-ce que cette PR change ? -->

## Pourquoi

<!-- contexte métier / bug ID / lien ticket si applicable -->

## Comment tester

<!-- étapes pour reproduire / valider en review -->

1.
2.
3.

## Checklist

- [ ] CI verte (typecheck + lint + tests + build)
- [ ] Tests ajoutés ou mis à jour si comportement modifié
- [ ] Migrations Supabase versionnées dans `supabase/migrations/` si applicable
- [ ] Variables d'env nouvelles ajoutées au `.env.example`
- [ ] Pas de secret en clair dans le code ou les commits
- [ ] Pas de `console.log` oublié
- [ ] Documentation mise à jour si comportement public changé (README, AGENTS.md)
- [ ] Reviewer assigné

## Risques / points d'attention

<!-- bug potentiel, breaking change, dépendance externe, etc. -->

## Conformité ORIAS

<!-- cocher si la PR touche les documents réglementaires (DER/LM/RA/Bilan/Préco/Zakat/Succession) -->
- [ ] PR n'impacte pas un document réglementaire
- [ ] PR impacte un document réglementaire — validation ORIAS externe nécessaire avant merge
