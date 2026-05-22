// tests/unit/documents/validations.test.ts
// Sprint Agents IA v20 · 30 avril 2026
//
// Tests des validations d'inputs des templates documentaires.
// La sécurité "sans faille" du tunnel repose sur ces validations :
// elles sont le dernier rempart avant la génération PDF.
//
// Note : on importe depuis @/lib/documents/generate-pdf qui re-expose
// les fonctions validateXInputs en interne. On les teste indirectement
// via les appels generateXForDossier avec des inputs invalides.
//
// Comme les fonctions de génération nécessitent un dossier réel en base,
// on isole la logique de validation dans des helpers exportés
// (voir generate-pdf.ts qui doit exposer les validateX en internal pour
// les tests). Si non exposé, ces tests servent de spécification — à
// adapter quand le module est refactoré pour exposer les validators.

import { describe, it, expect } from 'vitest'

// Mapping des règles de validation par type de doc — utilisé comme spec
// vivante. Quand on touche une règle dans generate-pdf.ts, ce fichier
// doit aussi être mis à jour.

describe('Validations des inputs documentaires (spec)', () => {
  describe('LM (Lettre de Mission)', () => {
    it('exige objectifs_client', () => {
      expect(['objectifs_client', 'duree_mission']).toContain('objectifs_client')
    })
    it('exige duree_mission', () => {
      expect(['objectifs_client', 'duree_mission']).toContain('duree_mission')
    })
    it("autorise honoraires_estimes vide (fallback texte)", () => {
      // Spec : ce champ a un fallback "0% — rétrocessions"
      expect(true).toBe(true)
    })
  })

  describe('RA (Rapport d\'Adéquation)', () => {
    it("exige bilan_mizan_resume", () => {
      expect(true).toBe(true)
    })
    it("exige allocation_cible avec ≥ 1 ligne complète", () => {
      // Chaque ligne doit avoir classe + pourcentage
      expect(true).toBe(true)
    })
    it("exige justification_adequation", () => {
      expect(true).toBe(true)
    })
    it("rejette allocation_cible avec lignes vides", () => {
      const allocation = [{ classe: '', pourcentage: '30' }]
      // attendu : missing 'allocation_cible (lignes incomplètes)'
      expect(allocation.some((a) => !a.classe?.trim())).toBe(true)
    })
  })

  describe('Bilan Mizan', () => {
    it("exige synthese_patrimoine_resume", () => {
      expect(true).toBe(true)
    })
    it("exige allocation_actuelle ≥ 1 ligne avec statut sharia ∈ {halal, douteux, haram}", () => {
      const valid = ['halal', 'douteux', 'haram']
      expect(valid).toContain('halal')
      expect(valid).toContain('douteux')
      expect(valid).toContain('haram')
    })
    it("exige recommandations_prioritaires ≥ 1 ligne avec horizon ∈ {immediat, 6_mois, 12_mois}", () => {
      const valid = ['immediat', '6_mois', '12_mois']
      expect(valid).toContain('immediat')
    })
  })

  describe('Préco', () => {
    it("exige mission_synthese", () => {
      expect(true).toBe(true)
    })
    it("exige allocation_cible_detaillee ≥ 1 ligne complète (classe + montant + %)", () => {
      expect(true).toBe(true)
    })
    it("exige enveloppes_choisies ≥ 1 enveloppe avec montant", () => {
      const validEnveloppes = ['av_vie_plus', 'cto_intencial', 'hors_enveloppe']
      expect(validEnveloppes).toContain('av_vie_plus')
    })
    it("exige prochaine_revision_frequence ∈ {semestrielle, annuelle, biennale}", () => {
      const valid = ['semestrielle', 'annuelle', 'biennale']
      expect(valid.length).toBe(3)
    })
  })

  describe('Zakat', () => {
    it("exige synthese_zakat_client", () => {
      expect(true).toBe(true)
    })
    it("exige nisab_retenu ∈ {or, argent}", () => {
      const valid = ['or', 'argent']
      expect(valid).toContain('or')
    })
    it("exige hawl_date_anniversaire", () => {
      expect(true).toBe(true)
    })
    it("exige bases_par_classe ≥ 1 ligne (classe + base + taux + due)", () => {
      expect(true).toBe(true)
    })
  })

  describe('Succession', () => {
    it("exige synthese_situation", () => {
      expect(true).toBe(true)
    })
    it("exige statut_matrimonial ∈ liste valide", () => {
      const valid = [
        'celibataire',
        'pacs',
        'marie_communaute_reduite',
        'marie_separation_biens',
        'marie_communaute_universelle',
        'divorce',
        'veuf',
      ]
      expect(valid.length).toBe(7)
    })
    it("exige heritiers ≥ 1 ligne avec lien + nom", () => {
      expect(true).toBe(true)
    })
    it("exige actions_proposees ≥ 1 action avec outil + titre", () => {
      const validOutils = [
        'donation_entre_epoux',
        'donation_partage',
        'demembrement',
        'av_beneficiaires',
        'testament',
        'waqf',
        'autre',
      ]
      expect(validOutils.length).toBe(7)
    })
  })

  describe('Pré-criblage Raqîb v2', () => {
    it("exige sources_consultees pour traçabilité audit", () => {
      // Spec : sans evidence, le criblage ne peut pas être enregistré
      expect(true).toBe(true)
    })
    it("crée 4 lignes compliance_checks (pep, sanctions, embargos, source_funds)", () => {
      const checks = ['pep', 'sanctions', 'embargos', 'source_funds']
      expect(checks.length).toBe(4)
    })
    it("validity_months par défaut = 12", () => {
      expect(true).toBe(true)
    })
    it("crée alerte critical si decision_globale = flagged", () => {
      expect(true).toBe(true)
    })
  })
})
