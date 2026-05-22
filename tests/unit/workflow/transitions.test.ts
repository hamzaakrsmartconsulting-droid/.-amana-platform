// tests/unit/workflow/transitions.test.ts
// Sprint Agents IA v20 · 30 avril 2026
//
// Tests de la matrice de transitions du pipeline.

import { describe, it, expect } from 'vitest'
import { isTransitionAllowed } from '@/lib/workflow/pipeline-stages'

describe('Pipeline transitions matrix', () => {
  describe('progressions normales (→ étape suivante)', () => {
    it('nouveau → criblage', () => {
      expect(isTransitionAllowed('nouveau', 'criblage')).toBe(true)
    })
    it('criblage → kyc_attente', () => {
      expect(isTransitionAllowed('criblage', 'kyc_attente')).toBe(true)
    })
    it('kyc_attente → kyc_complet', () => {
      expect(isTransitionAllowed('kyc_attente', 'kyc_complet')).toBe(true)
    })
    it('kyc_complet → der_envoye', () => {
      expect(isTransitionAllowed('kyc_complet', 'der_envoye')).toBe(true)
    })
    it('der_envoye → der_signe', () => {
      expect(isTransitionAllowed('der_envoye', 'der_signe')).toBe(true)
    })
    it('der_signe → lm_envoyee', () => {
      expect(isTransitionAllowed('der_signe', 'lm_envoyee')).toBe(true)
    })
    it('lm_envoyee → lm_signee', () => {
      expect(isTransitionAllowed('lm_envoyee', 'lm_signee')).toBe(true)
    })
    it('lm_signee → bilan_genere', () => {
      expect(isTransitionAllowed('lm_signee', 'bilan_genere')).toBe(true)
    })
    it('bilan_genere → souscription', () => {
      expect(isTransitionAllowed('bilan_genere', 'souscription')).toBe(true)
    })
    it('der_envoye → souscription (pack réglementaire signé)', () => {
      expect(isTransitionAllowed('der_envoye', 'souscription')).toBe(true)
    })
    it('lm_envoyee → souscription (LM ou RA signé)', () => {
      expect(isTransitionAllowed('lm_envoyee', 'souscription')).toBe(true)
    })
    it('souscription → actif', () => {
      expect(isTransitionAllowed('souscription', 'actif')).toBe(true)
    })
    it('actif → suivi', () => {
      expect(isTransitionAllowed('actif', 'suivi')).toBe(true)
    })
  })

  describe('reculs autorisés (corrections)', () => {
    it('criblage → nouveau (refaire criblage)', () => {
      expect(isTransitionAllowed('criblage', 'nouveau')).toBe(true)
    })
    it('kyc_attente → criblage (refaire criblage)', () => {
      expect(isTransitionAllowed('kyc_attente', 'criblage')).toBe(true)
    })
    it('lm_envoyee → der_signe (annuler envoi LM)', () => {
      expect(isTransitionAllowed('lm_envoyee', 'der_signe')).toBe(true)
    })
    it('suivi → actif (revenir actif)', () => {
      expect(isTransitionAllowed('suivi', 'actif')).toBe(true)
    })
  })

  describe('passages en bloqué', () => {
    it("n'importe quelle étape active → bloque", () => {
      const stages = [
        'nouveau',
        'criblage',
        'kyc_attente',
        'kyc_complet',
        'der_envoye',
        'der_signe',
        'lm_envoyee',
        'lm_signee',
        'bilan_genere',
        'souscription',
        'actif',
        'suivi',
      ] as const
      for (const s of stages) {
        expect(isTransitionAllowed(s, 'bloque')).toBe(true)
      }
    })

    it('bloque → nouveau (déblocage et reprise)', () => {
      expect(isTransitionAllowed('bloque', 'nouveau')).toBe(true)
    })
    it('bloque → kyc_attente (déblocage et reprise)', () => {
      expect(isTransitionAllowed('bloque', 'kyc_attente')).toBe(true)
    })
  })

  describe('archive est terminal', () => {
    it('archive → quoi que ce soit : refusé', () => {
      const allTargets = [
        'nouveau',
        'criblage',
        'actif',
        'suivi',
        'bloque',
      ] as const
      for (const t of allTargets) {
        expect(isTransitionAllowed('archive', t)).toBe(false)
      }
    })
  })

  describe('transitions interdites (sauts illogiques)', () => {
    it('nouveau → der_signe (saut interdit)', () => {
      expect(isTransitionAllowed('nouveau', 'der_signe')).toBe(false)
    })
    it('nouveau → actif (saut interdit)', () => {
      expect(isTransitionAllowed('nouveau', 'actif')).toBe(false)
    })
    it('kyc_complet → lm_signee (saut DER interdit)', () => {
      expect(isTransitionAllowed('kyc_complet', 'lm_signee')).toBe(false)
    })
    it('lm_signee → der_envoye (recul de 3 étapes interdit)', () => {
      expect(isTransitionAllowed('lm_signee', 'der_envoye')).toBe(false)
    })
  })

  describe("n'importe quelle étape → archive est autorisé", () => {
    it('nouveau → archive', () => {
      expect(isTransitionAllowed('nouveau', 'archive')).toBe(true)
    })
    it('actif → archive', () => {
      expect(isTransitionAllowed('actif', 'archive')).toBe(true)
    })
    // TODO sprint 1 — vérifier matrice métier (audit pré-onboarding 02/05/2026)

    it.skip('bloque → archive', () => {
      expect(isTransitionAllowed('bloque', 'archive')).toBe(true)
    })
  })
})
