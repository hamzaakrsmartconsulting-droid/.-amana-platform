// lib/documents/templates/preco-template.tsx — v1
// Sprint Agents IA v11b · 30 avril 2026
//
// Préconisation Patrimoniale — 8 pages.
//
// Différence vs RA et Bilan :
//   - RA   : justification réglementaire (pourquoi cette allocation est adéquate)
//   - Bilan : photo du patrimoine actuel + zakat + reco prioritaires
//   - Préco : PLAN D'EXÉCUTION CONCRET (qui / quoi / combien / quand / coût)
//
// Pages :
//   1. Couverture + cadrage mission
//   2. Allocation cible détaillée (tableau)
//   3. Supports recommandés (justification + ISIN + statut sharia)
//   4. Choix d'enveloppe (AV vs CTO vs hors enveloppe + comparatif fiscal)
//   5. Calendrier d'exécution (versement initial / programmés / arbitrages)
//   6. Frais & coûts (entrée / gestion / honoraires)
//   7. Impact attendu & risques
//   8. Mentions + signatures

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
import { ENVELOPPE_LABEL, type Enveloppe } from '@/lib/data/supports-catalog'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const DARK = '#2a3829'
const GREY = '#666666'
const CREAM = '#f8f4ec'
const GREY_LIGHT = '#d1d4cf'
const SOFT_GREY = '#f0eee9'
const HALAL = '#3a4d39'
const DOUTEUX = '#d97706'
const HARAM = '#b91c1c'

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

  // tableau alloc cible : Classe | Support | Enveloppe | Mt € | % | Statut
  table: { marginTop: 8, borderWidth: 0.5, borderColor: GREY_LIGHT, borderStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: GREY_LIGHT, borderBottomStyle: 'solid' },
  tableHeader: { backgroundColor: SOFT_GREY, fontFamily: 'Helvetica-Bold' },
  cellClasse: { padding: 6, fontSize: 9, flex: 1.4 },
  cellSupport: { padding: 6, fontSize: 8.5, flex: 2.2 },
  cellEnveloppe: { padding: 6, fontSize: 8.5, flex: 1.5 },
  cellMontant: { padding: 6, fontSize: 9, flex: 1.2, textAlign: 'right' },
  cellPct: { padding: 6, fontSize: 9, flex: 0.7, textAlign: 'right' },
  cellStatut: { padding: 6, fontSize: 9, flex: 0.9, textAlign: 'center', fontFamily: 'Helvetica-Bold' },

  notice: { backgroundColor: CREAM, padding: 12, borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', marginBottom: 14, fontSize: 9.5 },
  warningBox: { backgroundColor: '#fef3c7', padding: 10, borderLeftWidth: 3, borderLeftColor: '#d97706', borderLeftStyle: 'solid', marginBottom: 12, fontSize: 9.5, color: '#7c2d12' },
  signatureBlock: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', gap: 30 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: GREY, borderTopStyle: 'solid', paddingTop: 6, fontSize: 9, color: GREY },
  footer: { position: 'absolute', bottom: 24, left: 50, right: 80, fontSize: 7.5, color: GREY, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: GREY_LIGHT, borderTopStyle: 'solid' },
  pageNumber: { position: 'absolute', bottom: 24, right: 50, fontSize: 8, color: GREY },

  bigKpi: { backgroundColor: SOFT_GREY, padding: 12, marginBottom: 8, borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigKpiLabel: { fontSize: 9.5, color: GREY },
  bigKpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: FOREST },

  envCard: { backgroundColor: SOFT_GREY, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: FOREST, borderLeftStyle: 'solid' },
  envTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, marginBottom: 4 },
  envMontant: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: GOLD, marginBottom: 4 },
  envFisc: { fontSize: 9, color: GREY },

  supportCard: { borderLeftWidth: 2, borderLeftColor: GOLD, borderLeftStyle: 'solid', paddingLeft: 10, paddingBottom: 8, marginBottom: 10 },
  supportNom: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: FOREST },
  supportMeta: { fontSize: 8.5, color: GREY, marginTop: 2, marginBottom: 4 },
  supportJustif: { fontSize: 9.5, color: DARK, textAlign: 'justify' },
})

// =====================================================================
// Types
// =====================================================================
export type StatutSharia = 'halal' | 'a_verifier' | 'douteux' | 'haram'

export type AllocationCibleLine = {
  classe: string
  pourcentage: string
  montant_eur: string
  support_nom?: string
  support_isin?: string
  enveloppe?: Enveloppe
  statut_sharia?: StatutSharia
  justification?: string
}

export type EnveloppeLine = {
  type: Enveloppe
  montant_eur: string
  justification_fiscale?: string
}

export type FreqVersement = 'unique' | 'mensuel' | 'trimestriel' | 'annuel'
export type FreqArbitrage = 'aucun' | 'semestriel' | 'annuel'
export type FreqRevision = 'semestrielle' | 'annuelle' | 'biennale'

export type PrecoTemplateProps = {
  client: {
    prenom: string
    nom: string
    email?: string | null
    telephone?: string | null
  }
  inputs: {
    /** Synthèse de la mission (rappel des objectifs validés en LM/RA) */
    mission_synthese: string
    /** Date de la préco */
    preco_date?: string
    /** Allocation cible ligne par ligne (≥ 1 ligne requis) */
    allocation_cible_detaillee: AllocationCibleLine[]
    /** Répartition par enveloppe choisie (AV / CTO / hors) */
    enveloppes_choisies: EnveloppeLine[]
    /** Calendrier */
    versement_initial_eur?: string
    versements_programmes_eur?: string
    versements_frequence?: FreqVersement
    arbitrage_frequence?: FreqArbitrage
    /** Frais */
    frais_entree_pct?: string
    frais_gestion_annuel_pct?: string
    honoraires_amana?: string
    /** Performance attendue (sans promesse — texte libre encadré) */
    rendement_cible_annuel_pct?: string
    rendement_horizon?: string
    risques_identifies?: string
    /** Révision */
    prochaine_revision_frequence: FreqRevision
    prochaine_revision_date?: string
  }
  generationDate: string
  dossierId: string
}

const STATUT_LABEL: Record<StatutSharia, string> = {
  halal: '✓ Halal',
  a_verifier: '? À vérifier',
  douteux: '⚠ Douteux',
  haram: '✗ Haram',
}
const STATUT_COLOR: Record<StatutSharia, string> = {
  halal: HALAL,
  a_verifier: GOLD,
  douteux: DOUTEUX,
  haram: HARAM,
}
const FREQ_VERSEMENT_LABEL: Record<FreqVersement, string> = {
  unique: 'Versement unique',
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
}
const FREQ_ARBITRAGE_LABEL: Record<FreqArbitrage, string> = {
  aucun: 'Pas de rebalancing programmé',
  semestriel: 'Semestriel',
  annuel: 'Annuel',
}
const FREQ_REVISION_LABEL: Record<FreqRevision, string> = {
  semestrielle: 'Semestrielle',
  annuelle: 'Annuelle',
  biennale: 'Tous les 2 ans',
}

function formatEur(s: string | undefined): string {
  if (!s) return '—'
  return s
}

// =====================================================================
// Composant
// =====================================================================
export function PrecoTemplate({
  client,
  inputs,
  generationDate,
  dossierId,
}: PrecoTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`
  const c = AMANA_CONSEILLER_INFO

  const PageHeader = (props: { showFull?: boolean }) => (
    <View style={[styles.header, props.showFull ? {} : { marginBottom: 16, paddingBottom: 10 }]}>
      <Image src={AMANA_LOGO_BASE64} style={props.showFull ? styles.logo : { width: 110, height: 52, objectFit: 'contain' }} />
      <View style={styles.brandTextBlock}>
        <Text style={[styles.brand, props.showFull ? {} : { fontSize: 16 }]}>AMANA Patrimoine</Text>
        <Text style={styles.brandSub}>{props.showFull ? c.specialite : `Préconisation · ${fullName}`}</Text>
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
        {c.numero_orias} (CIF/COA/COBSP) · Préconisation générée le {generationDate} ·
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
      {/* PAGE 1 — Couverture & cadrage */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader showFull />
        <Text style={styles.title}>Préconisation patrimoniale</Text>
        <Text style={styles.subtitle}>
          Plan d'exécution sharia-compliant · Établi pour {fullName}
        </Text>

        <View style={styles.notice}>
          <Text>
            La présente préconisation propose un plan d'allocation chiffré et un
            calendrier de mise en œuvre, fondés sur le bilan Mizan et le rapport
            d'adéquation préalablement établis. Elle ne constitue pas une
            promesse de rendement et reste sous votre seule responsabilité de
            décision.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadrage de la mission</Text>
          <Text style={styles.paragraph}>{inputs.mission_synthese}</Text>
          {inputs.preco_date && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date de la préconisation</Text>
              <Text style={styles.fieldValue}>{inputs.preco_date}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date d'édition</Text>
            <Text style={styles.fieldValue}>{generationDate}</Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 2 — Allocation cible détaillée */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>1. Allocation cible</Text>
        <Text style={styles.subtitle}>
          Plan d'allocation poste par poste avec support, enveloppe et statut Sharia
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.cellClasse}>Classe</Text>
            <Text style={styles.cellSupport}>Support</Text>
            <Text style={styles.cellEnveloppe}>Enveloppe</Text>
            <Text style={styles.cellMontant}>Montant</Text>
            <Text style={styles.cellPct}>%</Text>
            <Text style={styles.cellStatut}>Sharia</Text>
          </View>
          {inputs.allocation_cible_detaillee.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cellClasse}>{line.classe}</Text>
              <Text style={styles.cellSupport}>
                {line.support_nom ?? '—'}
                {line.support_isin ? `\n${line.support_isin}` : ''}
              </Text>
              <Text style={styles.cellEnveloppe}>
                {line.enveloppe ? ENVELOPPE_LABEL[line.enveloppe] : '—'}
              </Text>
              <Text style={styles.cellMontant}>{line.montant_eur}</Text>
              <Text style={styles.cellPct}>{line.pourcentage}</Text>
              <Text
                style={[
                  styles.cellStatut,
                  {
                    color: line.statut_sharia
                      ? STATUT_COLOR[line.statut_sharia]
                      : GREY,
                  },
                ]}
              >
                {line.statut_sharia ? STATUT_LABEL[line.statut_sharia] : '—'}
              </Text>
            </View>
          ))}
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 3 — Détail des supports recommandés */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>2. Supports recommandés</Text>
        <Text style={styles.subtitle}>
          Justification ligne par ligne au regard du profil et du filtrage AAOIFI
        </Text>

        {inputs.allocation_cible_detaillee.filter((l) => l.justification?.trim()).length === 0 ? (
          <Text style={styles.paragraph}>
            Les justifications détaillées par support seront ajoutées en annexe ou
            transmises lors du rdv de mise en œuvre.
          </Text>
        ) : (
          inputs.allocation_cible_detaillee
            .filter((l) => l.justification?.trim())
            .map((line, i) => (
              <View key={i} style={styles.supportCard}>
                <Text style={styles.supportNom}>
                  {line.support_nom ?? line.classe}
                </Text>
                <Text style={styles.supportMeta}>
                  {line.support_isin ? `ISIN ${line.support_isin} · ` : ''}
                  {line.classe} ·{' '}
                  {line.enveloppe ? ENVELOPPE_LABEL[line.enveloppe] : 'Enveloppe non précisée'}
                  {line.statut_sharia ? ` · ${STATUT_LABEL[line.statut_sharia]}` : ''}
                </Text>
                <Text style={styles.supportJustif}>{line.justification}</Text>
              </View>
            ))
        )}

        <View style={styles.notice}>
          <Text>
            Tous les supports listés ont été screenés selon les standards AAOIFI
            (filtrage sectoriel et financier) avec le concours de Sakina
            Consulting, partenaire conformité Sharia d'AMANA. Les actions
            individuelles éventuelles font l'objet d'une purification annuelle
            calculée au prorata des revenus non-conformes.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 4 — Choix d'enveloppe */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>3. Choix d'enveloppe</Text>
        <Text style={styles.subtitle}>
          Répartition entre AV (Vie Plus), CTO (Intencial) et hors enveloppe
        </Text>

        {inputs.enveloppes_choisies.map((env, i) => (
          <View key={i} style={styles.envCard}>
            <Text style={styles.envTitle}>{ENVELOPPE_LABEL[env.type]}</Text>
            <Text style={styles.envMontant}>{env.montant_eur}</Text>
            {env.justification_fiscale && (
              <Text style={styles.envFisc}>{env.justification_fiscale}</Text>
            )}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comparatif fiscal indicatif</Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>AV (Vie Plus / Suravenir)</Text>
            {' '}— rachats partiels après 8 ans : abattement annuel de 4 600 € (célibataire) ou 9 200 € (couple), puis prélèvement forfaitaire 7,5% (en deçà de 150 k€ versés). Régime favorable transmission (152 500 € par bénéficiaire avant 70 ans).
          </Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>CTO (Intencial / Apicil)</Text>
            {' '}— dividendes et plus-values soumis au PFU 30% (12,8% IR + 17,2% prélèvements sociaux) ou option barème progressif. Pas d'abattement temps de détention. Souplesse de gestion supérieure mais fiscalité moins efficace en horizon long.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Hors enveloppe (SCPI Norma NCap)</Text>
            {' '}— revenus fonciers SCPI imposés au barème IR + prélèvements sociaux (sauf détention via une autre enveloppe spécifique). Considérer un emprunt sharia-compliant si applicable pour optimiser.
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text>
            Le comparatif fiscal ci-dessus est indicatif et applicable au régime
            résident fiscal France au 30/04/2026. Toute évolution législative
            (loi de finances annuelle) peut modifier ces paramètres. Validation
            par votre conseil fiscal habituel avant arbitrage.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 5 — Calendrier d'exécution */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>4. Calendrier d'exécution</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Versements</Text>
          {inputs.versement_initial_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Versement initial</Text>
              <Text style={styles.bigKpiValue}>{inputs.versement_initial_eur}</Text>
            </View>
          )}
          {inputs.versements_programmes_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>
                Versements programmés
                {inputs.versements_frequence
                  ? ` (${FREQ_VERSEMENT_LABEL[inputs.versements_frequence]})`
                  : ''}
              </Text>
              <Text style={styles.bigKpiValue}>
                {inputs.versements_programmes_eur}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arbitrages programmés</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Fréquence de rebalancing</Text>
            <Text style={styles.fieldValue}>
              {inputs.arbitrage_frequence
                ? FREQ_ARBITRAGE_LABEL[inputs.arbitrage_frequence]
                : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suivi & révision</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Fréquence de revue</Text>
            <Text style={styles.fieldValue}>
              {FREQ_REVISION_LABEL[inputs.prochaine_revision_frequence]}
            </Text>
          </View>
          {inputs.prochaine_revision_date && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Prochaine revue</Text>
              <Text style={styles.fieldValue}>
                {inputs.prochaine_revision_date}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.notice}>
          <Text>
            Les versements programmés permettent un lissage du point d'entrée
            (DCA) et limitent l'effet timing sur des marchés volatils. Les
            arbitrages servent à ramener l'allocation effective vers la cible si
            elle dérive sous l'effet des performances de chaque classe.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 6 — Frais & coûts */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>5. Frais & coûts</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frais sur enveloppes</Text>
          {inputs.frais_entree_pct && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Frais d'entrée</Text>
              <Text style={styles.bigKpiValue}>{inputs.frais_entree_pct}</Text>
            </View>
          )}
          {inputs.frais_gestion_annuel_pct && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Frais de gestion annuels</Text>
              <Text style={styles.bigKpiValue}>
                {inputs.frais_gestion_annuel_pct}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Honoraires AMANA</Text>
          <Text style={styles.paragraph}>
            {inputs.honoraires_amana ??
              "Selon l'offre souscrite (Mass / Patrimoniale / Premium) — détail dans la lettre de mission."}
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text>
            Les frais affichés sont ceux communiqués par les assureurs et les
            sociétés de gestion à la date de génération. Vérifier les DICI/KID
            actualisés au moment de la souscription. Les frais réduisent la
            performance nette ; leur impact se cumule dans le temps.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 7 — Impact attendu & risques */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>6. Impact attendu & risques</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance attendue</Text>
          {inputs.rendement_cible_annuel_pct ? (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>
                Rendement annualisé cible
                {inputs.rendement_horizon ? ` (${inputs.rendement_horizon})` : ''}
              </Text>
              <Text style={[styles.bigKpiValue, { color: GOLD }]}>
                {inputs.rendement_cible_annuel_pct}
              </Text>
            </View>
          ) : (
            <Text style={styles.paragraph}>
              Aucune cible de rendement chiffrée n'est garantie. Les performances
              passées ne préjugent pas des performances futures.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risques identifiés</Text>
          {inputs.risques_identifies ? (
            inputs.risques_identifies
              .split('\n')
              .map((r) => r.trim())
              .filter(Boolean)
              .map((r, i) => (
                <Text key={i} style={[styles.paragraph, { marginBottom: 6 }]}>
                  • {r}
                </Text>
              ))
          ) : (
            <Text style={styles.paragraph}>
              Risques généraux : marché actions, taux/sukuk, change si supports
              en USD, liquidité (notamment SCPI), concentration géographique ou
              sectorielle, risque sharia (évolution du screening AAOIFI).
            </Text>
          )}
        </View>

        <View style={styles.warningBox}>
          <Text>
            Cette préconisation reste indicative. La décision finale appartient
            au client. AMANA Patrimoine n'engage sa responsabilité que dans la
            limite de la diligence et de la conformité réglementaire de ses
            recommandations.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 8 — Mentions + signatures */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>Mentions légales & validation</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadre d'exercice</Text>
          <Text style={styles.paragraph}>
            AMANA Patrimoine est immatriculée à l'ORIAS sous le numéro{' '}
            {c.numero_orias}, en qualité de Conseiller en Investissements
            Financiers (CIF, supervision AMF), Courtier d'Assurance (COA,
            supervision ACPR) et Courtier en Opérations de Banque et Services de
            Paiement (COBSP, supervision ACPR). Membre de l'association{' '}
            {c.association.nom}.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conformité Sharia</Text>
          <Text style={styles.paragraph}>
            Le filtrage Sharia s'appuie sur les standards AAOIFI et la
            supervision de Sakina Consulting, partenaire conformité d'AMANA. La
            qualification de chaque support fait l'objet d'une revue annuelle.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RGPD & confidentialité</Text>
          <Text style={styles.paragraph}>
            Les données personnelles et patrimoniales sont traitées dans le
            cadre de la mission de conseil. Droit d'accès, rectification,
            portabilité et effacement (art. 15, 16, 17, 20 RGPD) à exercer à{' '}
            {c.email_pro}.
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
