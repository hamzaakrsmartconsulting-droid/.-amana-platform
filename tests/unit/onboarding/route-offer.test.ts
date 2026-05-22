// tests/unit/onboarding/route-offer.test.ts
// Sprint Agents IA v20 · 30 avril 2026
//
// Tests exhaustifs de la matrice d'aiguillage Mass / Patrimoniale / Premium.
// C'est la logique la plus critique du tunnel public — elle décide quel
// parcours le prospect prend. Tout bug ici = mauvaise expérience client.

import { describe, it, expect } from 'vitest'
import { routeToOffer } from '@/lib/onboarding/route-offer'

describe('routeToOffer', () => {
  // ===================================================================
  // MASS — patrimoine < 100 k€ ET 0 indicateur de complexité
  // ===================================================================
  describe('aiguillage Mass', () => {
    it('renvoie mass pour patrimoine 0 sans complexité', () => {
      const r = routeToOffer({})
      expect(r.offre).toBe('mass')
      expect(r.score.rule_triggered).toBe('défaut Mass')
    })

    it('renvoie mass pour patrimoine 50 k€ + capacité moyenne', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 50_000,
        capacite_pertes: 'moyenne',
      })
      expect(r.offre).toBe('mass')
    })

    it('renvoie mass pour patrimoine 99 999 € (juste sous le seuil)', () => {
      const r = routeToOffer({ patrimoine_net_eur: 99_999 })
      expect(r.offre).toBe('mass')
    })

    it('renvoie mass pour patrimoine 49 k€ + capacité élevée (sous le seuil 50 k)', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 49_000,
        capacite_pertes: 'elevee',
      })
      expect(r.offre).toBe('mass')
    })
  })

  // ===================================================================
  // PATRIMONIALE — 100 k€ ≤ patrimoine < 500 k€ OU 1 complexité OU
  // capacité élevée + ≥ 50 k€
  // ===================================================================
  describe('aiguillage Patrimoniale', () => {
    it('renvoie patrimoniale pour patrimoine 100 000 € (seuil bas)', () => {
      const r = routeToOffer({ patrimoine_net_eur: 100_000 })
      expect(r.offre).toBe('patrimoniale')
      expect(r.score.rule_triggered).toContain('100 k€')
    })

    it('renvoie patrimoniale pour patrimoine 250 k€ sans complexité', () => {
      const r = routeToOffer({ patrimoine_net_eur: 250_000 })
      expect(r.offre).toBe('patrimoniale')
    })

    it('renvoie patrimoniale pour patrimoine 499 999 € (juste sous Premium)', () => {
      const r = routeToOffer({ patrimoine_net_eur: 499_999 })
      expect(r.offre).toBe('patrimoniale')
    })

    it('renvoie patrimoniale pour 1 indicateur de complexité (SCI)', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 50_000,
        detient_sci: true,
      })
      expect(r.offre).toBe('patrimoniale')
      expect(r.score.complexity_count).toBe(1)
    })

    it('renvoie patrimoniale pour 1 indicateur (entrepreneur)', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 30_000,
        entrepreneur_ou_liberal: true,
      })
      expect(r.offre).toBe('patrimoniale')
    })

    it('renvoie patrimoniale pour capacité élevée + 50 k€', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 50_000,
        capacite_pertes: 'elevee',
      })
      expect(r.offre).toBe('patrimoniale')
      expect(r.score.rule_triggered).toContain('capacité pertes élevée')
    })

    it('renvoie patrimoniale pour capacité élevée + 80 k€', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 80_000,
        capacite_pertes: 'elevee',
      })
      expect(r.offre).toBe('patrimoniale')
    })
  })

  // ===================================================================
  // PREMIUM — patrimoine ≥ 500 k€ OU ≥ 2 complexités OU succession active
  // ===================================================================
  describe('aiguillage Premium', () => {
    it('renvoie premium pour patrimoine 500 000 € (seuil exact)', () => {
      const r = routeToOffer({ patrimoine_net_eur: 500_000 })
      expect(r.offre).toBe('premium')
      expect(r.score.rule_triggered).toBe('patrimoine ≥ 500 k€')
    })

    it('renvoie premium pour patrimoine 1 M€', () => {
      const r = routeToOffer({ patrimoine_net_eur: 1_000_000 })
      expect(r.offre).toBe('premium')
    })

    it('renvoie premium pour succession active (toujours, indépendamment du patrimoine)', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 30_000,
        succession_active: true,
      })
      expect(r.offre).toBe('premium')
      expect(r.score.rule_triggered).toBe('succession active')
    })

    it('renvoie premium pour 2 indicateurs de complexité (SCI + parts société)', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 50_000,
        detient_sci: true,
        detient_parts_societe: true,
      })
      expect(r.offre).toBe('premium')
      expect(r.score.complexity_count).toBe(2)
    })

    it('renvoie premium pour 3+ indicateurs', () => {
      const r = routeToOffer({
        patrimoine_net_eur: 30_000,
        detient_sci: true,
        expatrie_ou_non_resident: true,
        entrepreneur_ou_liberal: true,
      })
      expect(r.offre).toBe('premium')
      expect(r.score.complexity_count).toBe(3)
    })
  })

  // ===================================================================
  // CAS LIMITES & EDGE
  // ===================================================================
  describe('cas limites', () => {
    it('priorise Premium par patrimoine sur Patrimoniale par complexité', () => {
      // 600 k€ + 1 indicateur → Premium par patrimoine, pas par règle complexité
      const r = routeToOffer({
        patrimoine_net_eur: 600_000,
        detient_sci: true,
      })
      expect(r.offre).toBe('premium')
      expect(r.score.rule_triggered).toBe('patrimoine ≥ 500 k€')
    })

    it("priorise succession active sur n'importe quelle autre règle", () => {
      const r = routeToOffer({
        patrimoine_net_eur: 5_000,
        succession_active: true,
      })
      expect(r.offre).toBe('premium')
      expect(r.score.rule_triggered).toBe('succession active')
    })

    it("retourne tous les indicateurs labellés", () => {
      const r = routeToOffer({
        patrimoine_net_eur: 100_000,
        detient_sci: true,
        entrepreneur_ou_liberal: true,
      })
      expect(r.score.complexity_indicators).toContain('détient une SCI')
      expect(r.score.complexity_indicators).toContain(
        'entrepreneur ou profession libérale'
      )
    })

    it("retourne un message de recommandation pour chaque offre", () => {
      const mass = routeToOffer({ patrimoine_net_eur: 30_000 })
      expect(mass.recommendation_message.length).toBeGreaterThan(20)
      const patri = routeToOffer({ patrimoine_net_eur: 200_000 })
      expect(patri.recommendation_message.length).toBeGreaterThan(20)
      const prem = routeToOffer({ patrimoine_net_eur: 700_000 })
      expect(prem.recommendation_message.length).toBeGreaterThan(20)
    })

    it("traite patrimoine null/undefined comme 0", () => {
      const r = routeToOffer({ patrimoine_net_eur: undefined })
      expect(r.offre).toBe('mass')
      expect(r.score.patrimoine_eur).toBe(0)
    })
  })

  // ===================================================================
  // GARANTIE DÉTERMINISME : même entrée = même sortie
  // ===================================================================
  describe('déterminisme', () => {
    it('produit le même résultat pour deux appels identiques', () => {
      const input = {
        patrimoine_net_eur: 250_000,
        capacite_pertes: 'moyenne' as const,
        detient_sci: true,
      }
      const r1 = routeToOffer(input)
      const r2 = routeToOffer(input)
      expect(r1).toEqual(r2)
    })
  })
})
