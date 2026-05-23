// lib/documents/templates/succession-template.tsx — v1
// Sprint Agents IA v11c · 30 avril 2026
//
// Stratégie Successorale — 9 pages.
//
// Doc le plus délicat de la série : il articule DEUX ordres juridiques qui
// ne disent pas la même chose.
//
//   - Droit musulman ('ilm al-farâ'id) :
//       * parts coraniques fixes (Coran 4:11, 4:12, 4:176)
//       * réservataires (al-furûd al-muqaddara) puis 'aṣaba (résidu)
//       * principes de blocage (hajb)
//   - Droit français :
//       * réserve héréditaire / quotité disponible
//       * démembrement usufruit / nue-propriété
//       * AV hors succession (Art. L132-12 Code des assurances)
//       * abattements (100 k€ enfant, 80 724 € époux, etc.)
//
// La stratégie consiste à appliquer les obligations légales françaises tout
// en s'efforçant — par les outils civils (donation, AV, démembrement,
// testament de complément, waqf) — de tendre vers une répartition cohérente
// avec les parts coraniques souhaitées par le client.
//
// ATTENTION : ce document est une NOTE D'ORIENTATION pré-notariale. Toute
// mise en œuvre doit être validée par un notaire et un référent Sharia
// (Sakina Consulting).

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

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const DARK = '#353b32'
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

  // Tableau héritiers : Lien | Nom | Part Sharia | Part FR | Écart | Commentaire
  cellLien: { padding: 6, fontSize: 9, flex: 1.2 },
  cellNom: { padding: 6, fontSize: 9, flex: 1.5 },
  cellPartSharia: { padding: 6, fontSize: 9, flex: 1, textAlign: 'right' },
  cellPartFr: { padding: 6, fontSize: 9, flex: 1, textAlign: 'right' },
  cellEcart: { padding: 6, fontSize: 9, flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  cellComment: { padding: 6, fontSize: 8.5, flex: 2.5, color: GREY },

  // Tableau outils civils : Outil | Description | Effet | Commentaire
  cellOutil: { padding: 6, fontSize: 9, flex: 1.5, fontFamily: 'Helvetica-Bold' },
  cellOutilDesc: { padding: 6, fontSize: 9, flex: 3 },
  cellOutilEffet: { padding: 6, fontSize: 9, flex: 2 },

  notice: { backgroundColor: CREAM, padding: 12, borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', marginBottom: 14, fontSize: 9.5 },
  warningBox: { backgroundColor: '#fef3c7', padding: 10, borderLeftWidth: 3, borderLeftColor: '#d97706', borderLeftStyle: 'solid', marginBottom: 12, fontSize: 9.5, color: '#7c2d12' },
  ecartPositif: { color: '#444b3f' },
  ecartNegatif: { color: '#b91c1c' },

  bigKpi: { backgroundColor: SOFT_GREY, padding: 12, marginBottom: 8, borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigKpiLabel: { fontSize: 9.5, color: GREY },
  bigKpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: FOREST },

  signatureBlock: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', gap: 30 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: GREY, borderTopStyle: 'solid', paddingTop: 6, fontSize: 9, color: GREY },
  footer: { position: 'absolute', bottom: 24, left: 50, right: 80, fontSize: 7.5, color: GREY, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: GREY_LIGHT, borderTopStyle: 'solid' },
  pageNumber: { position: 'absolute', bottom: 24, right: 50, fontSize: 8, color: GREY },

  actionLine: { marginBottom: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: GOLD, borderLeftStyle: 'solid' },
  actionTitre: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: FOREST, marginBottom: 2 },
  actionMeta: { fontSize: 8.5, color: GREY, marginBottom: 3 },
  actionText: { fontSize: 9.5, color: DARK },
})

// =====================================================================
// Types
// =====================================================================
export type StatutMatrimonial =
  | 'celibataire'
  | 'marie_communaute_reduite'
  | 'marie_separation_biens'
  | 'marie_communaute_universelle'
  | 'pacs'
  | 'divorce'
  | 'veuf'

export const STATUT_MATRIMONIAL_LABEL: Record<StatutMatrimonial, string> = {
  celibataire: 'Célibataire',
  marie_communaute_reduite: 'Marié(e) — communauté réduite aux acquêts',
  marie_separation_biens: 'Marié(e) — séparation de biens',
  marie_communaute_universelle: 'Marié(e) — communauté universelle',
  pacs: 'Pacsé(e)',
  divorce: 'Divorcé(e)',
  veuf: 'Veuf / veuve',
}

export type HeritierLien =
  | 'epoux'
  | 'epouse'
  | 'fils'
  | 'fille'
  | 'pere'
  | 'mere'
  | 'frere'
  | 'soeur'
  | 'autre'

export const HERITIER_LIEN_LABEL: Record<HeritierLien, string> = {
  epoux: 'Époux',
  epouse: 'Épouse',
  fils: 'Fils',
  fille: 'Fille',
  pere: 'Père',
  mere: 'Mère',
  frere: 'Frère',
  soeur: 'Sœur',
  autre: 'Autre',
}

export type HeritierLine = {
  lien: HeritierLien
  nom: string
  part_sharia_pct?: string // ex: "1/8" ou "12,5%"
  part_droit_fr_pct?: string
  ecart_commentaire?: string
}

export type ActionSuccessorale = {
  outil:
    | 'donation_entre_epoux'
    | 'donation_partage'
    | 'demembrement'
    | 'av_beneficiaires'
    | 'testament'
    | 'waqf'
    | 'autre'
  titre: string
  description?: string
  effet_attendu?: string
  horizon?: 'immediat' | '6_mois' | '12_mois' | 'long_terme'
}

export const OUTIL_LABEL: Record<ActionSuccessorale['outil'], string> = {
  donation_entre_epoux: "Donation entre époux",
  donation_partage: 'Donation-partage',
  demembrement: 'Démembrement (usufruit / nue-propriété)',
  av_beneficiaires: 'Clause bénéficiaire AV',
  testament: 'Testament authentique ou olographe',
  waqf: 'Waqf (bien retiré au profit d\'une cause)',
  autre: 'Autre',
}

const HORIZON_LABEL: Record<NonNullable<ActionSuccessorale['horizon']>, string> = {
  immediat: 'Immédiat',
  '6_mois': '6 mois',
  '12_mois': '12 mois',
  long_terme: 'Long terme',
}

export type SuccessionTemplateProps = {
  client: {
    prenom: string
    nom: string
    email?: string | null
    age?: string
  }
  inputs: {
    /** Synthèse de la situation successorale du client (3-6 lignes) */
    synthese_situation: string
    /** Date de référence */
    date_reference?: string
    /** Statut matrimonial */
    statut_matrimonial: StatutMatrimonial
    /** Régime / contrat de mariage si applicable */
    regime_matrimonial_detail?: string
    /** Composition familiale en clair */
    composition_familiale?: string
    /** Patrimoine net successoral estimé */
    patrimoine_succession_eur?: string
    /** Tableau des héritiers identifiés (≥ 1 requis) */
    heritiers: HeritierLine[]
    /** Synthèse parts coraniques (texte libre — explication didactique) */
    synthese_parts_coraniques?: string
    /** Synthèse parts droit français (texte libre) */
    synthese_parts_droit_francais?: string
    /** Écarts identifiés et leur explication */
    ecarts_explication?: string
    /** Plan d'actions civiles structurées (≥ 1 requis) */
    actions_proposees: ActionSuccessorale[]
    /** Notes spécifiques au dossier */
    points_attention?: string
    /** Articulation avec le notaire (cabinet, prochaine étape) */
    notaire_referent?: string
    prochaine_etape?: string
  }
  generationDate: string
  dossierId: string
}

// =====================================================================
// Composant
// =====================================================================
export function SuccessionTemplate({
  client,
  inputs,
  generationDate,
  dossierId,
}: SuccessionTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`
  const c = AMANA_CONSEILLER_INFO

  const PageHeader = (props: { showFull?: boolean }) => (
    <View style={[styles.header, props.showFull ? {} : { marginBottom: 16, paddingBottom: 10 }]}>
      <Image src={AMANA_LOGO_BASE64} style={props.showFull ? styles.logo : { width: 110, height: 52, objectFit: 'contain' }} />
      <View style={styles.brandTextBlock}>
        <Text style={[styles.brand, props.showFull ? {} : { fontSize: 16 }]}>AMANA Patrimoine</Text>
        <Text style={styles.brandSub}>{props.showFull ? c.specialite : `Stratégie successorale · ${fullName}`}</Text>
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
        {c.numero_orias} (CIF/COA/COBSP) · Stratégie successorale générée le{' '}
        {generationDate} · Dossier {dossierId.slice(0, 8)}
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
      {/* PAGE 1 — Couverture */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader showFull />
        <Text style={styles.title}>Stratégie successorale</Text>
        <Text style={styles.subtitle}>
          Articulation droit musulman / droit français · Note d'orientation pré-notariale
        </Text>

        <View style={styles.warningBox}>
          <Text>
            Ce document est une NOTE D'ORIENTATION patrimoniale. Il ne constitue
            ni un acte notarié, ni un avis juridique opposable, ni une fatwa
            personnelle. La mise en œuvre des actions proposées requiert
            l'intervention d'un notaire ou d'un avocat fiscaliste, et la
            validation des arbitrages religieux par un référent Sharia (Sakina
            Consulting). AMANA Patrimoine accompagne, ne se substitue pas.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synthèse situation</Text>
          <Text style={styles.paragraph}>{inputs.synthese_situation}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identité & cadre</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Client</Text>
            <Text style={styles.fieldValue}>{fullName}</Text>
          </View>
          {client.age && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Âge</Text>
              <Text style={styles.fieldValue}>{client.age}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Statut matrimonial</Text>
            <Text style={styles.fieldValue}>
              {STATUT_MATRIMONIAL_LABEL[inputs.statut_matrimonial]}
            </Text>
          </View>
          {inputs.regime_matrimonial_detail && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Régime matrimonial</Text>
              <Text style={styles.fieldValue}>
                {inputs.regime_matrimonial_detail}
              </Text>
            </View>
          )}
          {inputs.date_reference && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date de référence</Text>
              <Text style={styles.fieldValue}>{inputs.date_reference}</Text>
            </View>
          )}
          {inputs.patrimoine_succession_eur && (
            <View style={[styles.bigKpi, { marginTop: 12 }]}>
              <Text style={styles.bigKpiLabel}>Patrimoine successoral estimé</Text>
              <Text style={styles.bigKpiValue}>
                {inputs.patrimoine_succession_eur}
              </Text>
            </View>
          )}
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 2 — Composition familiale */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>1. Composition familiale</Text>

        {inputs.composition_familiale ? (
          <Text style={styles.paragraph}>{inputs.composition_familiale}</Text>
        ) : (
          <Text style={styles.paragraph}>
            Composition non détaillée — voir tableau des héritiers ci-dessous.
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Héritiers identifiés</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.cellLien}>Lien</Text>
              <Text style={styles.cellNom}>Nom</Text>
              <Text style={styles.cellPartSharia}>Part Sharia</Text>
              <Text style={styles.cellPartFr}>Part Droit FR</Text>
              <Text style={styles.cellEcart}>Écart</Text>
              <Text style={styles.cellComment}>Commentaire</Text>
            </View>
            {inputs.heritiers.map((h, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellLien}>{HERITIER_LIEN_LABEL[h.lien]}</Text>
                <Text style={styles.cellNom}>{h.nom}</Text>
                <Text style={styles.cellPartSharia}>{h.part_sharia_pct ?? '—'}</Text>
                <Text style={styles.cellPartFr}>{h.part_droit_fr_pct ?? '—'}</Text>
                <Text style={styles.cellEcart}>—</Text>
                <Text style={styles.cellComment}>{h.ecart_commentaire ?? '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.notice}>
          <Text>
            Les parts sont indiquées en valeur relative ou en fraction. Toute
            répartition coranique précise (ex: 1/8 pour l'épouse en présence de
            descendance) doit être validée par le référent Sharia, car elle
            dépend de la totalité de la composition (frères, parents, enfants,
            enfants de prédécédés, etc.) et des règles de blocage (hajb).
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 3 — Cadre Sharia */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>2. Cadre — droit musulman</Text>

        <View style={styles.notice}>
          <Text>
            Les règles successorales du droit musulman ('ilm al-farâ'iḍ) sont
            fixées principalement par le Coran (4:11, 4:12, 4:176) et la
            Sunna. Elles établissent des parts fixes pour certains héritiers
            (al-furûḍ al-muqaddara), un résidu pour les 'aṣaba (héritiers
            agnatiques), et des principes de blocage (hajb).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synthèse retenue pour ce dossier</Text>
          {inputs.synthese_parts_coraniques ? (
            <Text style={styles.paragraph}>
              {inputs.synthese_parts_coraniques}
            </Text>
          ) : (
            <Text style={styles.paragraph}>
              Les parts coraniques applicables au dossier sont à valider avec le
              référent Sharia. Le tableau de la page précédente donne les
              fractions indicatives sur la base de la composition familiale
              déclarée.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quelques règles structurantes</Text>
          <Text style={styles.paragraph}>
            • L'époux reçoit 1/4 en présence de descendance, 1/2 en l'absence.
          </Text>
          <Text style={styles.paragraph}>
            • L'épouse (ou les épouses à diviser) reçoit 1/8 en présence de descendance, 1/4 en l'absence.
          </Text>
          <Text style={styles.paragraph}>
            • Les enfants : le fils reçoit le double de la part de la fille (li-ḏ-ḏakari miṯlu ḥaẓẓi l-unṯayayn).
          </Text>
          <Text style={styles.paragraph}>
            • La mère reçoit 1/6 en présence de descendance, 1/3 sinon (sauf cas spéciaux dits 'umariyyatân).
          </Text>
          <Text style={styles.paragraph}>
            • Les héritiers non-musulmans ne sont pas, classiquement, héritiers ipso jure ; les divergences doctrinales contemporaines sont nombreuses — validation Sakina obligatoire.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 4 — Cadre français */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>3. Cadre — droit français</Text>

        <View style={styles.notice}>
          <Text>
            Le droit français applique la dévolution légale (Code civil, art.
            720 et suivants) et impose la réserve héréditaire au profit des
            descendants (et, à défaut, du conjoint). Le défunt ne peut disposer
            librement que de la quotité disponible.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synthèse retenue pour ce dossier</Text>
          {inputs.synthese_parts_droit_francais ? (
            <Text style={styles.paragraph}>
              {inputs.synthese_parts_droit_francais}
            </Text>
          ) : (
            <Text style={styles.paragraph}>
              La répartition légale française dépend du nombre d'enfants et de
              la présence d'un conjoint. Voir tableau page 2 pour le détail
              chiffré du dossier.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quelques règles structurantes</Text>
          <Text style={styles.paragraph}>
            • Réserve : 1/2 du patrimoine pour 1 enfant, 2/3 pour 2 enfants, 3/4 pour 3 enfants ou plus.
          </Text>
          <Text style={styles.paragraph}>
            • Quotité disponible (entre vifs ou par testament) : le complément à 1.
          </Text>
          <Text style={styles.paragraph}>
            • Conjoint survivant : choix entre 1/4 en pleine propriété ou usufruit total (en présence de descendants tous communs).
          </Text>
          <Text style={styles.paragraph}>
            • Abattements : 100 000 € par parent / enfant (renouvelable tous les 15 ans), 80 724 € entre époux, 31 865 € entre grands-parents et petits-enfants.
          </Text>
          <Text style={styles.paragraph}>
            • Assurance-vie : sortie du périmètre civil successoral (Art. L132-12 Code des assurances), abattement spécifique 152 500 € par bénéficiaire pour les versements avant 70 ans.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 5 — Articulation Sharia / Droit FR */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>4. Articulation des deux ordres</Text>
        <Text style={styles.subtitle}>
          Écarts identifiés et logique d'optimisation civile pour s'en rapprocher
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Écarts entre les deux régimes</Text>
          {inputs.ecarts_explication ? (
            <Text style={styles.paragraph}>{inputs.ecarts_explication}</Text>
          ) : (
            <>
              <Text style={styles.paragraph}>
                Trois grandes sources d'écart se dessinent typiquement :
              </Text>
              <Text style={styles.paragraph}>
                • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Conjoint</Text>{' '}
                : le droit français protège fortement le conjoint (usufruit
                total possible), là où le droit musulman lui réserve une part
                fixe (1/8 ou 1/4) selon la présence de descendance.
              </Text>
              <Text style={styles.paragraph}>
                • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Filles vs fils</Text>{' '}
                : le droit français applique l'égalité entre enfants, là où le
                droit musulman applique la règle 1:2.
              </Text>
              <Text style={styles.paragraph}>
                • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Réservataires</Text>{' '}
                : le droit français impose la réserve aux descendants, le droit
                musulman applique des parts coraniques fixes y compris à
                certains ascendants (parents) ou collatéraux (frères/sœurs).
              </Text>
            </>
          )}
        </View>

        <View style={styles.warningBox}>
          <Text>
            Le droit français est d'ordre public : on ne peut pas y déroger par
            simple volonté contraire. La stratégie consiste à utiliser les
            outils civils (donation, AV bénéficiaires, démembrement, testament
            de complément, waqf) pour rapprocher la dévolution effective de la
            volonté coranique du client, dans la limite de la quotité
            disponible.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 6 — Outils civils disponibles */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>5. Outils civils mobilisables</Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.cellOutil}>Outil</Text>
            <Text style={styles.cellOutilDesc}>Description</Text>
            <Text style={styles.cellOutilEffet}>Effet structurant</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellOutil}>Donation entre époux</Text>
            <Text style={styles.cellOutilDesc}>
              Acte notarié donnant au survivant un choix entre 1/4 en pleine
              propriété + 3/4 en usufruit, totalité en usufruit, ou quotité
              disponible.
            </Text>
            <Text style={styles.cellOutilEffet}>
              Protège le conjoint, ajuste la part vs descendants.
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellOutil}>Donation-partage</Text>
            <Text style={styles.cellOutilDesc}>
              Répartition anticipée du patrimoine de son vivant entre
              descendants, fige les valeurs au jour de la donation.
            </Text>
            <Text style={styles.cellOutilEffet}>
              Évite contestations, possibilité d'inégalités voulues (dans la QD).
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellOutil}>Démembrement</Text>
            <Text style={styles.cellOutilDesc}>
              Donation de la nue-propriété en conservant l'usufruit. Réversion
              possible entre époux.
            </Text>
            <Text style={styles.cellOutilEffet}>
              Réduit assiette taxable, organise la transmission progressive.
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellOutil}>Clause bénéficiaire AV</Text>
            <Text style={styles.cellOutilDesc}>
              Désignation libre des bénéficiaires (hors succession civile),
              répartition en fractions ou montants.
            </Text>
            <Text style={styles.cellOutilEffet}>
              Outil le plus puissant pour reproduire les parts coraniques.
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellOutil}>Testament</Text>
            <Text style={styles.cellOutilDesc}>
              Authentique (notaire) ou olographe. Peut compléter la dévolution
              légale dans la limite de la quotité disponible.
            </Text>
            <Text style={styles.cellOutilEffet}>
              Mémorialise les volontés, oriente la QD.
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellOutil}>Waqf / fondation</Text>
            <Text style={styles.cellOutilDesc}>
              Affectation pérenne d'un bien à une cause d'intérêt général
              (mosquée, école, social).
            </Text>
            <Text style={styles.cellOutilEffet}>
              Sortie du patrimoine, bénéfice spirituel récurrent (ṣadaqa
              jâriya).
            </Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 7 — Plan d'actions concret */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>6. Plan d'actions proposé</Text>
        <Text style={styles.subtitle}>
          Choix des outils retenus pour ce dossier, à faire valider par notaire et référent Sharia
        </Text>

        {inputs.actions_proposees.length === 0 ? (
          <Text style={styles.paragraph}>
            Aucune action n'a encore été retenue pour ce dossier.
          </Text>
        ) : (
          inputs.actions_proposees.map((a, i) => (
            <View key={i} style={styles.actionLine}>
              <Text style={styles.actionTitre}>{a.titre}</Text>
              <Text style={styles.actionMeta}>
                {OUTIL_LABEL[a.outil]}
                {a.horizon ? ` · ${HORIZON_LABEL[a.horizon]}` : ''}
              </Text>
              {a.description && (
                <Text style={styles.actionText}>{a.description}</Text>
              )}
              {a.effet_attendu && (
                <Text style={[styles.actionText, { color: GOLD, marginTop: 4 }]}>
                  Effet : {a.effet_attendu}
                </Text>
              )}
            </View>
          ))
        )}

        <PageFooter />
      </Page>

      {/* PAGE 8 — Points d'attention + articulation notaire */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>7. Points d'attention & articulation notariale</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spécificités du dossier</Text>
          {inputs.points_attention ? (
            inputs.points_attention
              .split('\n')
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <Text key={i} style={[styles.paragraph, { marginBottom: 6 }]}>
                  • {p}
                </Text>
              ))
          ) : (
            <Text style={styles.paragraph}>
              Aucun point d'attention spécifique noté à ce stade.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articulation notaire</Text>
          {inputs.notaire_referent && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Notaire référent</Text>
              <Text style={styles.fieldValue}>{inputs.notaire_referent}</Text>
            </View>
          )}
          {inputs.prochaine_etape && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Prochaine étape</Text>
              <Text style={styles.fieldValue}>{inputs.prochaine_etape}</Text>
            </View>
          )}
          {!inputs.notaire_referent && !inputs.prochaine_etape && (
            <Text style={styles.paragraph}>
              À définir lors du prochain rdv. AMANA peut orienter vers un
              notaire familier des problématiques de finance islamique si
              souhaité.
            </Text>
          )}
        </View>

        <View style={styles.warningBox}>
          <Text>
            La fiscalité successorale française évolue (loi de finances
            annuelle, niches sectorielles, abattements). Toute stratégie engagée
            doit être revue à chaque étape clé : naissance, mariage, divorce,
            achat ou vente immobilière, héritage reçu, expatriation.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 9 — Mentions + signatures */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />
        <Text style={styles.title}>Mentions & validation</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadre & limites</Text>
          <Text style={styles.paragraph}>
            La présente note est produite par AMANA Patrimoine dans le cadre de
            sa mission de conseil patrimonial. Elle ne se substitue ni au
            conseil notarial, ni à un avis juridique d'avocat fiscaliste, ni à
            une fatwa personnelle. Toute mise en œuvre doit être validée par
            les professionnels compétents (notaire, fiscaliste, référent
            Sharia).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conformité Sharia</Text>
          <Text style={styles.paragraph}>
            Les principes de droit musulman exposés sont alignés avec
            l'orthodoxie sunnite (écoles hanafite, malikite, shâfi'ite,
            hanbalite) et les standards AAOIFI. La validation des cas
            particuliers est confiée à Sakina Consulting, partenaire conformité
            Sharia d'AMANA.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RGPD & confidentialité</Text>
          <Text style={styles.paragraph}>
            Données traitées dans le cadre de la mission. Droit d'accès,
            rectification, portabilité et effacement à exercer à {c.email_pro}.
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
