// lib/documents/templates/zakat-template.tsx — v1
// Sprint Agents IA v11d · 30 avril 2026
//
// Calendrier Zakat — 7 pages.
//
// Différence vs Bilan Mizan :
//   - Bilan Mizan : photo annuelle + estimation zakat ponctuelle dans le doc
//   - Zakat       : MODE D'EMPLOI pluriannuel + détail classe par classe +
//                   projection 3-5 ans + plan de versement
//
// Pages :
//   1. Couverture + synthèse zakatable
//   2. Principes : nisab, hawl, taux, conditions
//   3. Calcul par classe (tableau détaillé : base, taux, due, commentaire)
//   4. Plan annuel (hawl, paiement, bénéficiaires)
//   5. Projection pluriannuelle (3-5 ans)
//   6. Points de vigilance & spécificités d'écoles
//   7. Mentions + signatures
//
// Ce document est INDICATIF — la validation finale se fait avec le référent
// Sharia (Sakina Consulting) car certaines situations (parts SARL, cryptos,
// or de bijouterie, métiers du bétail) requièrent un avis cas par cas.

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'
import { AMANA_CONSEILLER_INFO } from '@/lib/documents/amana-conseiller-info'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const DARK = '#2a3829'
const GREY = '#666666'
const CREAM = '#f8f4ec'
const GREY_LIGHT = '#d1d4cf'
const SOFT_GREY = '#f0eee9'

const styles = StyleSheet.create({
  page: { paddingTop: 50, paddingBottom: 60, paddingHorizontal: 50, fontFamily: 'Helvetica', fontSize: 10, color: DARK, lineHeight: 1.5 },
  watermark: { position: 'absolute', top: '40%', left: '15%', width: '70%', opacity: 0.04 },
  header: { marginBottom: 22, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid', flexDirection: 'row', alignItems: 'center', gap: 18 },
  logo: { width: 160, height: 76, objectFit: 'contain' },
  brandTextBlock: { flex: 1 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: FOREST, letterSpacing: 0.5 },
  brandSub: { fontSize: 9.5, color: GREY, marginTop: 4, fontFamily: 'Helvetica-Oblique' },
  brandRcs: { fontSize: 8.5, color: GREY, marginTop: 6 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: FOREST, marginTop: 14, marginBottom: 4 },
  subtitle: { fontSize: 10, color: GREY, marginBottom: 18, fontFamily: 'Helvetica-Oblique' },
  section: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: GOLD, borderBottomStyle: 'solid' },
  paragraph: { marginBottom: 6, textAlign: 'justify' },
  fieldRow: { flexDirection: 'row', marginBottom: 5 },
  fieldLabel: { width: 200, color: GREY, fontSize: 9.5 },
  fieldValue: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: DARK },

  table: { marginTop: 8, borderWidth: 0.5, borderColor: GREY_LIGHT, borderStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: GREY_LIGHT, borderBottomStyle: 'solid' },
  tableHeader: { backgroundColor: SOFT_GREY, fontFamily: 'Helvetica-Bold' },

  // Tableau zakat par classe : Classe | Base | Taux | Due | Commentaire
  cellClasse: { padding: 6, fontSize: 9, flex: 2 },
  cellBase: { padding: 6, fontSize: 9, flex: 1.4, textAlign: 'right' },
  cellTaux: { padding: 6, fontSize: 9, flex: 0.7, textAlign: 'right' },
  cellDue: { padding: 6, fontSize: 9, flex: 1.3, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: GOLD },
  cellComment: { padding: 6, fontSize: 8.5, flex: 2.5, color: GREY },

  // Tableau projection : Année | Patrimoine zakatable | Zakat estimée | Hypothèses
  cellAnnee: { padding: 6, fontSize: 9, flex: 1, fontFamily: 'Helvetica-Bold' },
  cellPatrimoine: { padding: 6, fontSize: 9, flex: 1.4, textAlign: 'right' },
  cellZakat: { padding: 6, fontSize: 9, flex: 1.3, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: GOLD },
  cellHypo: { padding: 6, fontSize: 8.5, flex: 2.5, color: GREY },

  notice: { backgroundColor: CREAM, padding: 12, borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', marginBottom: 14, fontSize: 9.5 },
  warningBox: { backgroundColor: '#fef3c7', padding: 10, borderLeftWidth: 3, borderLeftColor: '#d97706', borderLeftStyle: 'solid', marginBottom: 12, fontSize: 9.5, color: '#7c2d12' },

  bigKpi: { backgroundColor: SOFT_GREY, padding: 12, marginBottom: 8, borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigKpiLabel: { fontSize: 9.5, color: GREY },
  bigKpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: FOREST },

  signatureBlock: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', gap: 30 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: GREY, borderTopStyle: 'solid', paddingTop: 6, fontSize: 9, color: GREY },
  footer: { position: 'absolute', bottom: 24, left: 50, right: 80, fontSize: 7.5, color: GREY, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: GREY_LIGHT, borderTopStyle: 'solid' },
  pageNumber: { position: 'absolute', bottom: 24, right: 50, fontSize: 8, color: GREY },

  vigilanceItem: { marginBottom: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: GOLD, borderLeftStyle: 'solid' },
  vigilanceTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST, marginBottom: 2 },
  vigilanceText: { fontSize: 9, color: DARK },
})

// =====================================================================
// Types
// =====================================================================
export type NisabRetenu = 'or' | 'argent'

export type ZakatBaseLine = {
  classe: string
  montant_zakatable_eur: string
  taux: string // typiquement "2,5%"
  zakat_due_eur: string
  commentaire?: string
}

export type ProjectionLine = {
  annee: string
  patrimoine_zakatable_eur: string
  zakat_estimee_eur: string
  hypotheses?: string
}

export type ZakatTemplateProps = {
  client: {
    prenom: string
    nom: string
    email?: string | null
  }
  inputs: {
    /** Synthèse de la situation zakatable du client (3-6 lignes) */
    synthese_zakat_client: string
    /** Date de référence du document */
    zakat_date_reference?: string
    /** Nisab */
    nisab_or_eur?: string
    nisab_argent_eur?: string
    nisab_date_reference?: string
    nisab_retenu: NisabRetenu
    /** Hawl */
    hawl_date_anniversaire: string
    /** Détail par classe (≥ 1 ligne requis) */
    bases_par_classe: ZakatBaseLine[]
    /** Dettes déductibles totales */
    dettes_deductibles_eur?: string
    /** Total agrégé (utile pour KPI) */
    total_zakat_due_eur?: string
    /** Plan de paiement */
    beneficiaires_choisis?: string
    prochaine_echeance_paiement?: string
    /** Projection pluriannuelle (3-5 lignes) */
    projection_pluriannuelle?: ProjectionLine[]
    /** Vigilance / cas particuliers */
    vigilance_specificites?: string
  }
  generationDate: string
  dossierId: string
}

const NISAB_LABEL: Record<NisabRetenu, string> = {
  or: "85 g d'or",
  argent: "595 g d'argent",
}

// =====================================================================
// Composant
// =====================================================================
export function ZakatTemplate({
  client,
  inputs,
  generationDate,
  dossierId,
}: ZakatTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`
  const c = AMANA_CONSEILLER_INFO

  const PageHeader = (props: { showFull?: boolean }) => (
    <View style={[styles.header, props.showFull ? {} : { marginBottom: 16, paddingBottom: 10 }]}>
      <Image src={AMANA_LOGO_BASE64} style={props.showFull ? styles.logo : { width: 110, height: 52, objectFit: 'contain' }} />
      <View style={styles.brandTextBlock}>
        <Text style={[styles.brand, props.showFull ? {} : { fontSize: 16 }]}>AMANA Patrimoine</Text>
        <Text style={styles.brandSub}>{props.showFull ? c.specialite : `Calendrier Zakat · ${fullName}`}</Text>
        {props.showFull && (
          <Text style={styles.brandRcs}>ORIAS {c.numero_orias} · RCS {c.rcs} · {c.email_pro}</Text>
        )}
      </View>
    </View>
  )

  const PageFooter = () => (
    <>
      <Text style={styles.footer} fixed>
        AMANA Patrimoine · SAS · 60 rue François 1er, 75008 Paris · ORIAS{' '}
        {c.numero_orias} (CIF/COA/COBSP) · Calendrier Zakat généré le {generationDate} ·
        Dossier {dossierId.slice(0, 8)}
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </>
  )

  const Watermark = () => <Image src={AMANA_LOGO_BASE64} style={styles.watermark} fixed />

  return (
    <Document>
      {/* PAGE 1 — Couverture + synthèse */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader showFull />

        <Text style={styles.title}>Calendrier Zakat</Text>
        <Text style={styles.subtitle}>
          Calcul, plan annuel et projection pluriannuelle · Établi pour {fullName}
        </Text>

        <View style={styles.notice}>
          <Text>
            Le présent document est un outil opérationnel destiné à accompagner
            le client dans le calcul et le versement annuel de la zakat (al-zakât
            al-mâl). Il ne se substitue pas à un avis individuel d'un référent
            Sharia : certaines situations (parts de société, or de bijouterie
            d'usage, cryptoactifs, créances douteuses) requièrent une analyse
            cas par cas que la base de calcul présentée ici simplifie.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synthèse client</Text>
          <Text style={styles.paragraph}>{inputs.synthese_zakat_client}</Text>
          {inputs.zakat_date_reference && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date de référence</Text>
              <Text style={styles.fieldValue}>{inputs.zakat_date_reference}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date d'édition</Text>
            <Text style={styles.fieldValue}>{generationDate}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date hawl (anniversaire)</Text>
            <Text style={styles.fieldValue}>{inputs.hawl_date_anniversaire}</Text>
          </View>
          {inputs.total_zakat_due_eur && (
            <View style={[styles.bigKpi, { marginTop: 12 }]}>
              <Text style={styles.bigKpiLabel}>Zakat due cette année (estimation)</Text>
              <Text style={[styles.bigKpiValue, { color: GOLD }]}>
                {inputs.total_zakat_due_eur}
              </Text>
            </View>
          )}
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 2 — Principes & nisab */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>1. Principes & nisab</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions d'assujettissement</Text>
          <Text style={styles.paragraph}>
            La zakat al-mâl est due chaque année lunaire (hawl) sur le
            patrimoine zakatable, dès lors que celui-ci atteint ou dépasse le
            seuil minimum (nisab) à la date hawl, et qu'il a été détenu pendant
            une année lunaire complète (≈ 354 jours).
          </Text>
          <Text style={styles.paragraph}>
            Le taux standard est de <Text style={{ fontFamily: 'Helvetica-Bold' }}>2,5%</Text>{' '}
            (un quarantième, 1/40) sur les actifs financiers, le numéraire,
            l'or, l'argent, les marchandises commerciales et certaines créances
            recouvrables. Des taux spécifiques s'appliquent aux récoltes
            (5% irrigation artificielle / 10% pluie), aux trésors enfouis (20%)
            et au bétail (selon nombre).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nisab — seuil minimum</Text>
          <Text style={styles.paragraph}>
            Le nisab correspond à la valeur de 85 g d'or ou 595 g d'argent. Le
            client retient le nisab le plus protecteur des bénéficiaires
            (généralement celui de l'argent, plus bas). En finance islamique
            patrimoniale moderne, le nisab-or est plus fréquemment retenu pour
            sa stabilité.
          </Text>
          {inputs.nisab_or_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Nisab-or (85 g)</Text>
              <Text style={styles.bigKpiValue}>{inputs.nisab_or_eur}</Text>
            </View>
          )}
          {inputs.nisab_argent_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Nisab-argent (595 g)</Text>
              <Text style={styles.bigKpiValue}>{inputs.nisab_argent_eur}</Text>
            </View>
          )}
          <View style={styles.bigKpi}>
            <Text style={styles.bigKpiLabel}>Nisab retenu pour ce dossier</Text>
            <Text style={[styles.bigKpiValue, { color: GOLD }]}>
              {NISAB_LABEL[inputs.nisab_retenu]}
            </Text>
          </View>
          {inputs.nisab_date_reference && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Cours de référence</Text>
              <Text style={styles.fieldValue}>{inputs.nisab_date_reference}</Text>
            </View>
          )}
        </View>

        <View style={styles.warningBox}>
          <Text>
            Les cours de l'or et de l'argent fluctuent quotidiennement.
            Recalculer le nisab à la date hawl effective avant chaque paiement
            (pas au moment de la rédaction du document).
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 3 — Calcul par classe */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>2. Calcul détaillé par classe d'actif</Text>
        <Text style={styles.subtitle}>
          Bases zakatables, taux applicables et zakat due
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.cellClasse}>Classe</Text>
            <Text style={styles.cellBase}>Base</Text>
            <Text style={styles.cellTaux}>Taux</Text>
            <Text style={styles.cellDue}>Due</Text>
            <Text style={styles.cellComment}>Commentaire</Text>
          </View>
          {inputs.bases_par_classe.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cellClasse}>{line.classe}</Text>
              <Text style={styles.cellBase}>{line.montant_zakatable_eur}</Text>
              <Text style={styles.cellTaux}>{line.taux}</Text>
              <Text style={styles.cellDue}>{line.zakat_due_eur}</Text>
              <Text style={styles.cellComment}>{line.commentaire ?? '—'}</Text>
            </View>
          ))}
        </View>

        {inputs.dettes_deductibles_eur && (
          <View style={[styles.bigKpi, { marginTop: 14 }]}>
            <Text style={styles.bigKpiLabel}>Dettes déductibles</Text>
            <Text style={styles.bigKpiValue}>−{inputs.dettes_deductibles_eur}</Text>
          </View>
        )}
        {inputs.total_zakat_due_eur && (
          <View style={styles.bigKpi}>
            <Text style={styles.bigKpiLabel}>Total zakat due (cette année)</Text>
            <Text style={[styles.bigKpiValue, { color: GOLD, fontSize: 14 }]}>
              {inputs.total_zakat_due_eur}
            </Text>
          </View>
        )}

        <View style={styles.notice}>
          <Text>
            Sont zakatables : numéraire, comptes courants/épargne (sans intérêts
            zakatables, intérêts perçus à purifier en charité distincte), or et
            argent (hors usage personnel selon écoles), parts de business,
            créances recouvrables, marchandises commerciales, sukuk, AV en
            sukuk, ETF/fonds actions zakatables sur la valeur courante (ou les
            actifs liquides selon école).
          </Text>
          <Text style={[styles.paragraph, { marginTop: 6 }]}>
            Ne sont pas zakatables : résidence principale, biens d'usage
            personnel (mobilier, voiture personnelle), retraite future non
            perçue. Les SCPI / immobilier locatif sont zakatables sur les{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>loyers nets perçus</Text>,
            pas sur le capital immobilisé.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 4 — Plan annuel */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>3. Plan annuel de versement</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date hawl & échéance</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date hawl (anniversaire)</Text>
            <Text style={styles.fieldValue}>{inputs.hawl_date_anniversaire}</Text>
          </View>
          {inputs.prochaine_echeance_paiement && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Prochaine échéance</Text>
              <Text style={styles.fieldValue}>
                {inputs.prochaine_echeance_paiement}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bénéficiaires éligibles</Text>
          <Text style={styles.paragraph}>
            Le Coran (sourate 9, verset 60) identifie 8 catégories de
            bénéficiaires : les pauvres (al-fuqarâ'), les nécessiteux
            (al-masâkîn), les agents collecteurs, les cœurs à concilier
            (al-mu'allafati qulûbuhum), l'affranchissement de captifs (catégorie
            historiquement éteinte), les débiteurs incapables de rembourser
            (al-ghârimîn), la cause de Dieu (fî sabîlillâh), et les voyageurs en
            détresse (ibn al-sabîl).
          </Text>
          {inputs.beneficiaires_choisis && (
            <>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginTop: 10 }]}>
                Bénéficiaires identifiés pour ce dossier
              </Text>
              <Text style={styles.paragraph}>{inputs.beneficiaires_choisis}</Text>
            </>
          )}
        </View>

        <View style={styles.notice}>
          <Text>
            La zakat al-mâl (sur le patrimoine) est distincte de la zakat
            al-fitr (versée avant la prière de l'Aïd al-Fitr, montant fixe par
            personne du foyer). Les deux obligations coexistent et ne se
            substituent pas l'une à l'autre.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 5 — Projection pluriannuelle */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>4. Projection pluriannuelle</Text>
        <Text style={styles.subtitle}>
          Estimation indicative sur les prochaines années
        </Text>

        {inputs.projection_pluriannuelle && inputs.projection_pluriannuelle.length > 0 ? (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.cellAnnee}>Année</Text>
              <Text style={styles.cellPatrimoine}>Patrimoine zakatable</Text>
              <Text style={styles.cellZakat}>Zakat estimée</Text>
              <Text style={styles.cellHypo}>Hypothèses</Text>
            </View>
            {inputs.projection_pluriannuelle.map((line, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellAnnee}>{line.annee}</Text>
                <Text style={styles.cellPatrimoine}>
                  {line.patrimoine_zakatable_eur}
                </Text>
                <Text style={styles.cellZakat}>{line.zakat_estimee_eur}</Text>
                <Text style={styles.cellHypo}>{line.hypotheses ?? '—'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.paragraph}>
            Aucune projection pluriannuelle n'a été modélisée à ce stade. Une
            projection peut être ajoutée lors de la prochaine revue annuelle, à
            partir des hypothèses d'évolution du patrimoine validées avec le
            client.
          </Text>
        )}

        <View style={styles.warningBox}>
          <Text>
            Les projections supposent une évolution stable des cours de l'or, du
            patrimoine et de la fiscalité. Tout évènement majeur (achat / vente
            d'immobilier, héritage, donation, retraite, perte d'emploi)
            invalide les hypothèses et requiert une mise à jour du calendrier.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 6 — Points de vigilance */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>5. Points de vigilance & spécificités</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spécificités d'écoles juridiques</Text>

          <View style={styles.vigilanceItem}>
            <Text style={styles.vigilanceTitle}>Or de bijouterie d'usage personnel</Text>
            <Text style={styles.vigilanceText}>
              Hanafi : zakatable. Shafi'i, Maliki, Hanbali : exonéré tant qu'il
              reste dans la limite d'usage habituel et n'est pas thésaurisé.
              Conserver une trace écrite du choix d'école.
            </Text>
          </View>

          <View style={styles.vigilanceItem}>
            <Text style={styles.vigilanceTitle}>Actions cotées</Text>
            <Text style={styles.vigilanceText}>
              Deux approches AAOIFI selon la nature de la détention : sur la
              valeur courante (investisseur passif, fluide, type ETF Islamic) ou
              sur les actifs nets liquides (investisseur en logique de business,
              type holding familiale). Préciser le régime retenu dans la note
              annuelle.
            </Text>
          </View>

          <View style={styles.vigilanceItem}>
            <Text style={styles.vigilanceTitle}>SCPI / immobilier locatif</Text>
            <Text style={styles.vigilanceText}>
              Capital non zakatable (immobilisé hors commerce). Zakat sur les
              loyers nets perçus année par année, à compter du 1er encaissement
              et après hawl.
            </Text>
          </View>

          <View style={styles.vigilanceItem}>
            <Text style={styles.vigilanceTitle}>Créances détenues vs dettes</Text>
            <Text style={styles.vigilanceText}>
              Les créances recouvrables sont zakatables (au prorata de la
              probabilité de recouvrement). Les dettes échues à payer sont
              déductibles de la base zakatable, à hauteur de leur montant exact.
            </Text>
          </View>

          <View style={styles.vigilanceItem}>
            <Text style={styles.vigilanceTitle}>Cryptoactifs & or numérique</Text>
            <Text style={styles.vigilanceText}>
              Sujet en cours de stabilisation côté AAOIFI. Approche prudente :
              traiter comme du numéraire si stablecoin sharia ou or tokenisé,
              comme une marchandise commerciale si trading actif. Validation
              Sakina Consulting recommandée pour tout encours significatif.
            </Text>
          </View>
        </View>

        {inputs.vigilance_specificites && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes spécifiques au dossier</Text>
            <Text style={styles.paragraph}>{inputs.vigilance_specificites}</Text>
          </View>
        )}

        <PageFooter />
      </Page>

      {/* PAGE 7 — Mentions + signatures */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>Mentions & validation</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadre & limites du document</Text>
          <Text style={styles.paragraph}>
            Le présent calendrier zakat est un outil d'aide au calcul et au
            versement. Les montants estimés ne préjugent pas du résultat final
            au moment du paiement (cours de l'or, évolution patrimoniale,
            ajustements école par école). Le client demeure seul responsable de
            la conformité religieuse de son versement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conformité Sharia</Text>
          <Text style={styles.paragraph}>
            Méthodologie alignée sur les standards AAOIFI. Validation des cas
            complexes par Sakina Consulting, partenaire conformité d'AMANA.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadre d'exercice</Text>
          <Text style={styles.paragraph}>
            AMANA Patrimoine — SAS · ORIAS {c.numero_orias} (CIF/COA/COBSP) ·{' '}
            {c.email_pro}. Le calcul de la zakat ne relève pas du conseil en
            investissements financiers stricto sensu : il s'agit d'un service
            d'accompagnement patrimonial annexe à la mission de gestion.
          </Text>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 24 }}>
              Le client
            </Text>
            <Text>{fullName}</Text>
            <Text>Date :</Text>
            <Text>Signature :</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 24 }}>
              Le conseiller
            </Text>
            <Text>{c.representant_legal}, {c.fonction}</Text>
            <Text>{c.raison_sociale}</Text>
            <Text>Date : {generationDate}</Text>
            <Text>Signature :</Text>
          </View>
        </View>

        <PageFooter />
      </Page>
    </Document>
  )
}
