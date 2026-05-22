// lib/documents/templates/bilan-template.tsx — v1
// Sprint Agents IA v11a · 30 avril 2026
//
// Bilan Patrimonial Mizan — 8 pages, design AMANA, statut sharia par poste,
// estimation purification + zakat, points de vigilance, recommandations.
//
// Réutilise la même grammaire visuelle que DER/LM/RA v2 (sprint v10c) :
//   - Watermark logo discret (opacity 0.04)
//   - PageHeader / PageFooter
//   - Sections soulignées d'un trait or
//   - Tableaux à fond crème pour les lignes statut sharia
//
// Statut sharia : 'halal' (vert forêt) | 'douteux' (orange) | 'haram' (rouge).

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
const HALAL = '#3a4d39' // forest
const DOUTEUX = '#d97706' // amber
const HARAM = '#b91c1c' // red

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: DARK,
    lineHeight: 1.5,
  },
  watermark: { position: 'absolute', top: '40%', left: '15%', width: '70%', opacity: 0.04 },
  header: {
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: FOREST,
    borderBottomStyle: 'solid',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  logo: { width: 160, height: 76, objectFit: 'contain' },
  brandTextBlock: { flex: 1 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: FOREST, letterSpacing: 0.5 },
  brandSub: { fontSize: 9.5, color: GREY, marginTop: 4, fontFamily: 'Helvetica-Oblique' },
  brandRcs: { fontSize: 8.5, color: GREY, marginTop: 6 },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: FOREST,
    marginTop: 14,
    marginBottom: 4,
  },
  subtitle: { fontSize: 10, color: GREY, marginBottom: 18, fontFamily: 'Helvetica-Oblique' },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: FOREST,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    borderBottomStyle: 'solid',
  },
  paragraph: { marginBottom: 6, textAlign: 'justify' },
  fieldRow: { flexDirection: 'row', marginBottom: 5 },
  fieldLabel: { width: 200, color: GREY, fontSize: 9.5 },
  fieldValue: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: DARK },

  // tableaux génériques
  table: { marginTop: 8, borderWidth: 0.5, borderColor: GREY_LIGHT, borderStyle: 'solid' },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: GREY_LIGHT,
    borderBottomStyle: 'solid',
  },
  tableHeader: { backgroundColor: SOFT_GREY, fontFamily: 'Helvetica-Bold' },
  tableCell: { padding: 6, fontSize: 9, flex: 1 },

  // tableau allocation : colonnes pondérées
  allocClasse: { padding: 6, fontSize: 9, flex: 2 },
  allocDetail: { padding: 6, fontSize: 9, flex: 2.4 },
  allocMontant: { padding: 6, fontSize: 9, flex: 1.2, textAlign: 'right' },
  allocPct: { padding: 6, fontSize: 9, flex: 0.7, textAlign: 'right' },
  allocStatut: { padding: 6, fontSize: 9, flex: 1, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  allocCommentaire: { padding: 6, fontSize: 8.5, flex: 2, color: GREY },

  notice: {
    backgroundColor: CREAM,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    borderLeftStyle: 'solid',
    marginBottom: 14,
    fontSize: 9.5,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
    borderLeftStyle: 'solid',
    marginBottom: 12,
    fontSize: 9.5,
    color: '#7c2d12',
  },
  signatureBlock: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 30,
  },
  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: GREY,
    borderTopStyle: 'solid',
    paddingTop: 6,
    fontSize: 9,
    color: GREY,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 50,
    right: 80,
    fontSize: 7.5,
    color: GREY,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: GREY_LIGHT,
    borderTopStyle: 'solid',
  },
  pageNumber: { position: 'absolute', bottom: 24, right: 50, fontSize: 8, color: GREY },

  bigKpi: {
    backgroundColor: SOFT_GREY,
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bigKpiLabel: { fontSize: 9.5, color: GREY },
  bigKpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: FOREST },

  recoLine: {
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: GOLD,
    borderLeftStyle: 'solid',
  },
  recoHorizon: {
    fontSize: 8.5,
    color: GREY,
    fontFamily: 'Helvetica-Oblique',
  },
})

// =====================================================================
// Types
// =====================================================================
export type StatutSharia = 'halal' | 'douteux' | 'haram'

export type AllocationLineBilan = {
  classe: string
  detail?: string
  montant_eur: string
  pourcentage?: string
  statut_sharia: StatutSharia
  commentaire?: string
}

export type RecommandationLine = {
  action: string
  horizon: 'immediat' | '6_mois' | '12_mois'
  justification?: string
}

export type BilanTemplateProps = {
  client: {
    prenom: string
    nom: string
    email?: string | null
    telephone?: string | null
    age?: string
    situation_familiale?: string
    domiciliation_fiscale?: string
  }
  inputs: {
    /** Synthèse 3-6 lignes (point de départ explicatif) */
    synthese_patrimoine_resume: string
    /** Date du bilan (texte libre, ex: "15 avril 2026") */
    bilan_date?: string
    /** Situation financière */
    revenus_annuels_eur?: string
    charges_annuelles_eur?: string
    capacite_epargne_mensuelle_eur?: string
    patrimoine_net_eur?: string
    /** Allocation actuelle ligne par ligne */
    allocation_actuelle: AllocationLineBilan[]
    /** Estimation des intérêts à purifier (charité) */
    purification_estimee_eur?: string
    purification_commentaire?: string
    /** Zakat */
    zakat_base_eur?: string
    zakat_estimee_eur?: string
    zakat_date_hawl?: string
    zakat_nisab_reference?: string
    /** Points de vigilance — texte libre, multilignes */
    points_vigilance?: string
    /** Recommandations prioritaires */
    recommandations_prioritaires: RecommandationLine[]
  }
  generationDate: string
  dossierId: string
}

// =====================================================================
// Helpers
// =====================================================================
const STATUT_LABEL: Record<StatutSharia, string> = {
  halal: '✓ Halal',
  douteux: '⚠ Douteux',
  haram: '✗ Haram',
}
const STATUT_COLOR: Record<StatutSharia, string> = {
  halal: HALAL,
  douteux: DOUTEUX,
  haram: HARAM,
}
const HORIZON_LABEL: Record<RecommandationLine['horizon'], string> = {
  immediat: 'Immédiat',
  '6_mois': '6 mois',
  '12_mois': '12 mois',
}

function totalParStatut(lines: AllocationLineBilan[], statut: StatutSharia): {
  count: number
  montant: number
} {
  const filtered = lines.filter((l) => l.statut_sharia === statut)
  const montant = filtered.reduce((sum, l) => {
    const n = parseFloat((l.montant_eur ?? '0').replace(/[^\d.,-]/g, '').replace(',', '.'))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
  return { count: filtered.length, montant }
}

function formatEur(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

// =====================================================================
// Composant
// =====================================================================
export function BilanTemplate({
  client,
  inputs,
  generationDate,
  dossierId,
}: BilanTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`
  const c = AMANA_CONSEILLER_INFO

  const PageHeader = (props: { showFull?: boolean }) => (
    <View
      style={[
        styles.header,
        props.showFull ? {} : { marginBottom: 16, paddingBottom: 10 },
      ]}
    >
      <Image
        src={AMANA_LOGO_BASE64}
        style={
          props.showFull
            ? styles.logo
            : { width: 110, height: 52, objectFit: 'contain' }
        }
      />
      <View style={styles.brandTextBlock}>
        <Text style={[styles.brand, props.showFull ? {} : { fontSize: 16 }]}>
          AMANA Patrimoine
        </Text>
        <Text style={styles.brandSub}>
          {props.showFull ? c.specialite : `Bilan Mizan · ${fullName}`}
        </Text>
        {props.showFull && (
          <Text style={styles.brandRcs}>
            ORIAS {c.numero_orias} · RCS {c.rcs} · {c.email_pro}
          </Text>
        )}
      </View>
    </View>
  )

  const PageFooter = () => (
    <>
      <Text style={styles.footer} fixed>
        AMANA Patrimoine · SAS · 60 rue François 1er, 75008 Paris · ORIAS{' '}
        {c.numero_orias} (CIF/COA/COBSP) · Bilan Mizan généré le {generationDate} ·
        Dossier {dossierId.slice(0, 8)}
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </>
  )

  const Watermark = () => (
    <Image src={AMANA_LOGO_BASE64} style={styles.watermark} fixed />
  )

  const halal = totalParStatut(inputs.allocation_actuelle, 'halal')
  const douteux = totalParStatut(inputs.allocation_actuelle, 'douteux')
  const haram = totalParStatut(inputs.allocation_actuelle, 'haram')
  const totalActif = halal.montant + douteux.montant + haram.montant
  const pctHalal = totalActif > 0 ? Math.round((halal.montant / totalActif) * 100) : 0
  const pctDouteux = totalActif > 0 ? Math.round((douteux.montant / totalActif) * 100) : 0
  const pctHaram = totalActif > 0 ? Math.round((haram.montant / totalActif) * 100) : 0

  return (
    <Document>
      {/* ============== PAGE 1 — Couverture / Identité ============== */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader showFull />

        <Text style={styles.title}>Bilan Patrimonial Mizan</Text>
        <Text style={styles.subtitle}>
          Cartographie patrimoniale et conformité Sharia · Établi pour {fullName}
        </Text>

        <View style={styles.notice}>
          <Text>
            Ce bilan dresse l'état du patrimoine du client à la date d'établissement
            indiquée et qualifie chaque poste au regard des principes de la finance
            islamique (filtrage AAOIFI, partenariat conformité Sakina Consulting).
            Il sert de socle au Rapport d'Adéquation et aux préconisations
            ultérieures.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identité du client</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Nom complet</Text>
            <Text style={styles.fieldValue}>{fullName}</Text>
          </View>
          {client.age && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Âge</Text>
              <Text style={styles.fieldValue}>{client.age}</Text>
            </View>
          )}
          {client.situation_familiale && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Situation familiale</Text>
              <Text style={styles.fieldValue}>{client.situation_familiale}</Text>
            </View>
          )}
          {client.domiciliation_fiscale && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Domiciliation fiscale</Text>
              <Text style={styles.fieldValue}>{client.domiciliation_fiscale}</Text>
            </View>
          )}
          {client.email && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{client.email}</Text>
            </View>
          )}
          {client.telephone && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <Text style={styles.fieldValue}>{client.telephone}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synthèse</Text>
          <Text style={styles.paragraph}>{inputs.synthese_patrimoine_resume}</Text>
          {inputs.bilan_date && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date du bilan</Text>
              <Text style={styles.fieldValue}>{inputs.bilan_date}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date d'édition</Text>
            <Text style={styles.fieldValue}>{generationDate}</Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ============== PAGE 2 — Situation financière globale ============== */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>1. Situation financière</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenus & charges</Text>
          {inputs.revenus_annuels_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Revenus annuels</Text>
              <Text style={styles.bigKpiValue}>{inputs.revenus_annuels_eur}</Text>
            </View>
          )}
          {inputs.charges_annuelles_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Charges annuelles</Text>
              <Text style={styles.bigKpiValue}>{inputs.charges_annuelles_eur}</Text>
            </View>
          )}
          {inputs.capacite_epargne_mensuelle_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Capacité d'épargne mensuelle</Text>
              <Text style={styles.bigKpiValue}>{inputs.capacite_epargne_mensuelle_eur}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patrimoine net</Text>
          {inputs.patrimoine_net_eur ? (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Patrimoine net (actif - passif)</Text>
              <Text style={styles.bigKpiValue}>{inputs.patrimoine_net_eur}</Text>
            </View>
          ) : (
            <Text style={styles.paragraph}>
              Patrimoine net non renseigné. Voir détail dans la section allocation
              ci-après.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cartographie sharia rapide</Text>
          <View style={styles.bigKpi}>
            <Text style={styles.bigKpiLabel}>✓ Halal</Text>
            <Text style={[styles.bigKpiValue, { color: HALAL }]}>
              {formatEur(halal.montant)} ({pctHalal}%)
            </Text>
          </View>
          <View style={styles.bigKpi}>
            <Text style={styles.bigKpiLabel}>⚠ Douteux</Text>
            <Text style={[styles.bigKpiValue, { color: DOUTEUX }]}>
              {formatEur(douteux.montant)} ({pctDouteux}%)
            </Text>
          </View>
          <View style={styles.bigKpi}>
            <Text style={styles.bigKpiLabel}>✗ Haram</Text>
            <Text style={[styles.bigKpiValue, { color: HARAM }]}>
              {formatEur(haram.montant)} ({pctHaram}%)
            </Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ============== PAGE 3 — Tableau d'allocation détaillé ============== */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>2. Allocation actuelle détaillée</Text>
        <Text style={styles.subtitle}>
          Cartographie poste par poste, avec qualification Sharia
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.allocClasse}>Classe</Text>
            <Text style={styles.allocDetail}>Détail</Text>
            <Text style={styles.allocMontant}>Montant</Text>
            <Text style={styles.allocPct}>%</Text>
            <Text style={styles.allocStatut}>Statut</Text>
            <Text style={styles.allocCommentaire}>Commentaire</Text>
          </View>
          {inputs.allocation_actuelle.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.allocClasse}>{line.classe}</Text>
              <Text style={styles.allocDetail}>{line.detail ?? '—'}</Text>
              <Text style={styles.allocMontant}>{line.montant_eur}</Text>
              <Text style={styles.allocPct}>{line.pourcentage ?? '—'}</Text>
              <Text
                style={[
                  styles.allocStatut,
                  { color: STATUT_COLOR[line.statut_sharia] },
                ]}
              >
                {STATUT_LABEL[line.statut_sharia]}
              </Text>
              <Text style={styles.allocCommentaire}>{line.commentaire ?? '—'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.notice}>
          <Text>
            Le filtrage Sharia est conforme aux standards AAOIFI. Le statut
            « Douteux » désigne un poste partiellement non-conforme (ex:
            assurance-vie en euros avec part d'intérêts) nécessitant une
            purification ou une transition. Le statut « Haram » désigne un poste
            non-conforme (livret bancaire rémunéré, obligations conventionnelles,
            etc.) appelant une sortie progressive ou immédiate.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* ============== PAGE 4 — Analyse Sharia ============== */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>3. Analyse Sharia</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Postes Halal ✓</Text>
          {halal.count > 0 ? (
            <Text style={styles.paragraph}>
              {halal.count} poste{halal.count > 1 ? 's' : ''} pour un total de{' '}
              {formatEur(halal.montant)} ({pctHalal}% du patrimoine cartographié).
              Ces actifs respectent les principes de la finance islamique et
              constituent le socle du patrimoine conforme.
            </Text>
          ) : (
            <Text style={styles.paragraph}>Aucun poste qualifié Halal à ce stade.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Postes Douteux ⚠</Text>
          {douteux.count > 0 ? (
            <>
              <Text style={styles.paragraph}>
                {douteux.count} poste{douteux.count > 1 ? 's' : ''} pour un total
                de {formatEur(douteux.montant)} ({pctDouteux}%). Une démarche de
                purification (versement des intérêts perçus à des œuvres
                caritatives) ou de transition vers un support pleinement conforme
                est recommandée.
              </Text>
              {inputs.allocation_actuelle
                .filter((l) => l.statut_sharia === 'douteux')
                .map((l, i) => (
                  <Text key={i} style={[styles.paragraph, { color: DOUTEUX }]}>
                    • {l.classe}
                    {l.detail ? ` — ${l.detail}` : ''} ({l.montant_eur})
                    {l.commentaire ? ` : ${l.commentaire}` : ''}
                  </Text>
                ))}
            </>
          ) : (
            <Text style={styles.paragraph}>Aucun poste douteux identifié.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Postes Haram ✗</Text>
          {haram.count > 0 ? (
            <>
              <Text style={styles.paragraph}>
                {haram.count} poste{haram.count > 1 ? 's' : ''} pour un total de{' '}
                {formatEur(haram.montant)} ({pctHaram}%). Une sortie progressive
                ou immédiate est recommandée, accompagnée d'une purification des
                gains illicites perçus.
              </Text>
              {inputs.allocation_actuelle
                .filter((l) => l.statut_sharia === 'haram')
                .map((l, i) => (
                  <Text key={i} style={[styles.paragraph, { color: HARAM }]}>
                    • {l.classe}
                    {l.detail ? ` — ${l.detail}` : ''} ({l.montant_eur})
                    {l.commentaire ? ` : ${l.commentaire}` : ''}
                  </Text>
                ))}
            </>
          ) : (
            <Text style={styles.paragraph}>Aucun poste Haram identifié.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purification estimée</Text>
          {inputs.purification_estimee_eur ? (
            <>
              <View style={styles.bigKpi}>
                <Text style={styles.bigKpiLabel}>
                  Intérêts à purifier (charité)
                </Text>
                <Text style={[styles.bigKpiValue, { color: DOUTEUX }]}>
                  {inputs.purification_estimee_eur}
                </Text>
              </View>
              {inputs.purification_commentaire && (
                <Text style={styles.paragraph}>
                  {inputs.purification_commentaire}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.paragraph}>
              Estimation non renseignée. À calculer poste par poste sur base des
              relevés bancaires et avis fiscaux.
            </Text>
          )}
        </View>

        <PageFooter />
      </Page>

      {/* ============== PAGE 5 — Zakat estimée ============== */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>4. Zakat estimée</Text>

        <View style={styles.notice}>
          <Text>
            La zakat est due sur les actifs zakatables détenus depuis au moins un
            an lunaire (hawl). Le taux standard est de 2,5% pour la zakat sur
            l'épargne et les actifs financiers. Le nisab de référence est
            l'équivalent de 85 grammes d'or ou 595 grammes d'argent — le plus
            avantageux pour le zakatable est généralement retenu.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bases & calcul</Text>
          {inputs.zakat_nisab_reference && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Nisab de référence</Text>
              <Text style={styles.fieldValue}>{inputs.zakat_nisab_reference}</Text>
            </View>
          )}
          {inputs.zakat_base_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Base zakatable</Text>
              <Text style={styles.bigKpiValue}>{inputs.zakat_base_eur}</Text>
            </View>
          )}
          {inputs.zakat_estimee_eur && (
            <View style={styles.bigKpi}>
              <Text style={styles.bigKpiLabel}>Zakat estimée (2,5%)</Text>
              <Text style={[styles.bigKpiValue, { color: GOLD }]}>
                {inputs.zakat_estimee_eur}
              </Text>
            </View>
          )}
          {inputs.zakat_date_hawl && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date hawl indicative</Text>
              <Text style={styles.fieldValue}>{inputs.zakat_date_hawl}</Text>
            </View>
          )}
        </View>

        <View style={styles.warningBox}>
          <Text>
            L'estimation de zakat fournie est indicative. Elle doit être validée
            avec un référent Sharia (Sakina Consulting) avant versement. Les
            règles de zakat sur les parts professionnelles, créances et dettes
            requièrent une analyse cas par cas.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* ============== PAGE 6 — Points de vigilance ============== */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>5. Points de vigilance</Text>

        {inputs.points_vigilance ? (
          <View style={styles.section}>
            {inputs.points_vigilance
              .split('\n')
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <Text key={i} style={[styles.paragraph, { marginBottom: 8 }]}>
                  • {p}
                </Text>
              ))}
          </View>
        ) : (
          <Text style={styles.paragraph}>
            Aucun point de vigilance spécifique relevé à ce stade.
          </Text>
        )}

        <View style={styles.warningBox}>
          <Text>
            Les points de vigilance ci-dessus reflètent l'analyse à la date du
            bilan. Toute évolution patrimoniale, fiscale ou familiale appelle une
            révision.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* ============== PAGE 7 — Recommandations prioritaires ============== */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>6. Recommandations prioritaires</Text>
        <Text style={styles.subtitle}>
          Plan d'action structuré par horizon
        </Text>

        {inputs.recommandations_prioritaires.length === 0 ? (
          <Text style={styles.paragraph}>
            Aucune recommandation prioritaire renseignée.
          </Text>
        ) : (
          (['immediat', '6_mois', '12_mois'] as const).map((horizon) => {
            const lines = inputs.recommandations_prioritaires.filter(
              (r) => r.horizon === horizon
            )
            if (lines.length === 0) return null
            return (
              <View key={horizon} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Horizon — {HORIZON_LABEL[horizon]}
                </Text>
                {lines.map((r, i) => (
                  <View key={i} style={styles.recoLine}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                      {r.action}
                    </Text>
                    {r.justification && (
                      <Text style={[styles.paragraph, { marginTop: 3 }]}>
                        {r.justification}
                      </Text>
                    )}
                    <Text style={styles.recoHorizon}>
                      {HORIZON_LABEL[r.horizon]}
                    </Text>
                  </View>
                ))}
              </View>
            )
          })
        )}

        <PageFooter />
      </Page>

      {/* ============== PAGE 8 — Mentions + signatures + RGPD ============== */}
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
          <Text style={styles.sectionTitle}>RGPD & confidentialité</Text>
          <Text style={styles.paragraph}>
            Les données personnelles et patrimoniales du client sont traitées dans
            le cadre de la mission de conseil et conservées pour la durée légale
            applicable. Le client dispose d'un droit d'accès, de rectification, de
            portabilité et d'effacement (articles 15, 16, 17 et 20 du RGPD), à
            exercer à l'adresse {c.email_pro}.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Médiation</Text>
          <Text style={styles.paragraph}>
            En cas de litige et après échec de la procédure interne, le client
            peut saisir : le Médiateur de l'AMF (litiges CIF), ANM Consommation
            (médiation B2C), ou La Médiation de l'Assurance via mandat à
            l'Anacofi-Courtage (litiges assurance).
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
