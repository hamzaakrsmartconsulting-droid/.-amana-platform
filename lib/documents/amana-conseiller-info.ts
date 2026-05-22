// lib/documents/amana-conseiller-info.ts
// Sprint Agents IA v10c · 30 avril 2026
//
// Données légales officielles d'AMANA Patrimoine — partagées par tous les templates PDF.
// Sources :
//   - Attestation ORIAS du 01/02/2026 (n° 25009552)
//   - Attestations RCP AIG Europe SA (police RD02002149P)
//   - Engagement adhésion ANM Consommation (médiation conso, 30/08/2025)
//   - Mandat saisines LMA via Anacofi-Courtage (29/08/2025)

export const AMANA_CONSEILLER_INFO = {
  // Identité
  raison_sociale: 'AMANA PATRIMOINE',
  forme_juridique: 'Société par Actions Simplifiée (SAS)',
  representant_legal: 'Mohamed Mosbahi',
  fonction: 'Président',
  adresse_siege: '60 rue François 1er, 75008 Paris',
  rcs: 'PARIS 988458436',
  email_pro: 'mmosbahi@amana-patrimoine.fr',
  site_web: 'amana-patrimoine.fr',

  // ORIAS (n° unique pour 3 statuts)
  numero_orias: '25009552',
  orias_url: 'https://www.orias.fr',

  // 3 statuts ORIAS
  statuts: {
    cif: {
      nom: 'Conseiller en Investissements Financiers (CIF)',
      depuis: '12/12/2025',
      jusqu_au: '28/02/2027',
      regulateur: 'Autorité des Marchés Financiers (AMF)',
      regulateur_url: 'https://www.amf-france.org',
      articles_loi: 'articles L.541-1 et suivants du Code monétaire et financier',
      association_agreee: 'Anacofi-Courtage',
    },
    coa: {
      nom: "Courtier d'Assurance ou de Réassurance (COA)",
      depuis: '21/11/2025',
      jusqu_au: '28/02/2027',
      regulateur: "Autorité de Contrôle Prudentiel et de Résolution (ACPR)",
      regulateur_url: 'https://acpr.banque-france.fr',
      articles_loi: 'articles L.512-6 et suivants du Code des assurances',
      association_agreee: 'Anacofi-Courtage',
    },
    cobsp: {
      nom: 'Courtier en Opérations de Banque et en Services de Paiement (COBSP)',
      depuis: '21/11/2025',
      jusqu_au: '28/02/2027',
      regulateur: "Autorité de Contrôle Prudentiel et de Résolution (ACPR)",
      regulateur_url: 'https://acpr.banque-france.fr',
      articles_loi: 'articles L.519-1 et suivants du Code monétaire et financier',
      association_agreee: 'Anacofi-Courtage',
    },
  },

  // RC Professionnelle (police unique multi-statuts)
  rc_pro: {
    assureur: 'AIG Europe SA',
    assureur_adresse: 'Tour CBX, 1 Passerelle des Reflets, 92400 Courbevoie',
    police_numero: 'RD02002149P',
    validite_du: '23/07/2025',
    validite_au: '28/02/2026',
    garanties: [
      {
        statut: 'CIF',
        articles: 'art. L.541-3 du Code monétaire et financier',
        plafond_periode: '150 000 €',
        plafond_sinistre: '150 000 €',
      },
      {
        statut: 'COBSP',
        articles: 'art. L.519-3-4 et R.519-16 du Code monétaire et financier',
        plafond_periode: '800 000 €',
        plafond_sinistre: '500 000 €',
      },
      {
        statut: 'COA / Intermédiation en assurance',
        articles: 'art. L.512-6, R.512-14 et A.512-14 du Code des assurances',
        plafond_periode: '2 315 610 €',
        plafond_sinistre: '1 564 610 €',
      },
    ],
  },

  // Association professionnelle agréée
  association: {
    nom: 'Anacofi-Courtage',
    adresse: '92 rue d\'Amsterdam, 75009 Paris',
    siren: '900 008 558',
    site_web: 'www.anacofi.asso.fr',
  },

  // Médiateurs (3 selon le type de litige)
  mediateurs: [
    {
      domaine: 'Litiges CIF (conseil en investissements financiers)',
      nom: "Médiateur de l'AMF",
      adresse: '17 place de la Bourse, 75082 Paris Cedex 02',
      url: 'https://www.amf-france.org/fr/le-mediateur-de-lamf',
    },
    {
      domaine: 'Médiation de la consommation (B2C, tous statuts)',
      nom: 'ANM Consommation',
      adresse: '2 rue de Colmar, 94300 Vincennes',
      email: 'contact@anmconso.com',
      url: 'www.anmconso.com',
    },
    {
      domaine: 'Litiges en assurance (COA / intermédiation)',
      nom: "La Médiation de l'Assurance (LMA)",
      adresse: 'TSA 50110, 75441 Paris Cedex 09',
      url: 'www.mediation-assurance.org',
      via: "via mandat à l'Anacofi-Courtage",
    },
  ],

  // Spécialité métier
  specialite: 'Gestion de patrimoine spécialisée en finance islamique, filtrage AAOIFI',
}

export type AmanaConseillerInfo = typeof AMANA_CONSEILLER_INFO
