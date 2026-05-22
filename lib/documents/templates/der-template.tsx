// lib/documents/templates/der-template.tsx — v2 multi-statuts
// Sprint Agents IA v10c · 30 avril 2026
//
// DER refondu avec :
//   - Vraies données ORIAS (n° 25009552), RC pro, médiateurs, Anacofi-Courtage
//   - 3 statuts : CIF + COA + COBSP avec leurs articles légaux distincts
//   - 3 médiateurs : AMF + ANM Consommation + LMA
//   - 3 garanties RC pro distinctes (CIF / COBSP / IA)
//   - Design plus pro : watermark, hiérarchie visuelle, tableaux

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
  page: {
    paddingTop: 50, paddingBottom: 60, paddingHorizontal: 50,
    fontFamily: 'Helvetica', fontSize: 10, color: DARK, lineHeight: 1.5,
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '15%',
    width: '70%',
    opacity: 0.04,
  },
  header: {
    marginBottom: 24, paddingBottom: 16,
    borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid',
    flexDirection: 'row', alignItems: 'center', gap: 18,
  },
  logo: { width: 160, height: 76, objectFit: 'contain' },
  brandTextBlock: { flex: 1 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: FOREST, letterSpacing: 0.5 },
  brandSub: { fontSize: 9.5, color: GREY, marginTop: 4, fontFamily: 'Helvetica-Oblique' },
  brandRcs: { fontSize: 8.5, color: GREY, marginTop: 6 },
  title: {
    fontFamily: 'Helvetica-Bold', fontSize: 20, color: FOREST,
    marginTop: 18, marginBottom: 4, letterSpacing: 0.2,
  },
  subtitle: { fontSize: 10, color: GREY, marginBottom: 22, fontFamily: 'Helvetica-Oblique' },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6,
    paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: GOLD, borderBottomStyle: 'solid',
  },
  paragraph: { marginBottom: 6, textAlign: 'justify' },
  bullet: { marginLeft: 10, marginBottom: 5 },
  fieldRow: { flexDirection: 'row', marginBottom: 5 },
  fieldLabel: { width: 170, color: GREY, fontSize: 9.5 },
  fieldValue: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: DARK },
  table: {
    marginTop: 8,
    borderWidth: 0.5, borderColor: GREY_LIGHT, borderStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5, borderBottomColor: GREY_LIGHT, borderBottomStyle: 'solid',
  },
  tableHeader: {
    backgroundColor: SOFT_GREY,
    fontFamily: 'Helvetica-Bold',
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
    flex: 1,
  },
  notice: {
    backgroundColor: CREAM, padding: 12,
    borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid',
    marginBottom: 14, fontSize: 9.5,
  },
  warning: {
    backgroundColor: '#fef3c7', padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#d97706', borderLeftStyle: 'solid',
    marginBottom: 14, fontSize: 9.5, color: '#7c2d12',
  },
  signatureBlock: {
    marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', gap: 30,
  },
  signatureBox: {
    flex: 1, borderTopWidth: 1, borderTopColor: GREY, borderTopStyle: 'solid',
    paddingTop: 6, fontSize: 9, color: GREY,
  },
  footer: {
    position: 'absolute', bottom: 24, left: 50, right: 80,
    fontSize: 7.5, color: GREY,
    paddingTop: 6, borderTopWidth: 0.5, borderTopColor: GREY_LIGHT, borderTopStyle: 'solid',
  },
  pageNumber: {
    position: 'absolute', bottom: 24, right: 50, fontSize: 8, color: GREY,
  },
  statutBlock: {
    backgroundColor: SOFT_GREY,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: FOREST, borderLeftStyle: 'solid',
  },
  statutTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST, marginBottom: 3 },
  statutMeta: { fontSize: 8.5, color: GREY },
})

export type DerTemplateProps = {
  client: {
    prenom: string
    nom: string
    email?: string | null
    telephone?: string | null
  }
  generationDate: string
  dossierId: string
}

export function DerTemplate({ client, generationDate, dossierId }: DerTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`
  const c = AMANA_CONSEILLER_INFO

  const PageHeader = (props: { showFull?: boolean }) => (
    <View style={[styles.header, props.showFull ? {} : { marginBottom: 18, paddingBottom: 10 }]}>
      <Image src={AMANA_LOGO_BASE64} style={props.showFull ? styles.logo : { width: 110, height: 52, objectFit: 'contain' }} />
      <View style={styles.brandTextBlock}>
        <Text style={[styles.brand, props.showFull ? {} : { fontSize: 16 }]}>AMANA Patrimoine</Text>
        <Text style={styles.brandSub}>
          {props.showFull ? c.specialite : `DER · ${fullName}`}
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
        AMANA Patrimoine · SAS · RCS {c.rcs} · ORIAS {c.numero_orias} · CIF/COA/COBSP · DER générée le {generationDate}
      </Text>
      <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  )

  const Watermark = () => (
    <Image src={AMANA_LOGO_BASE64} style={styles.watermark} fixed />
  )

  return (
    <Document
      title={`DER AMANA - ${fullName}`}
      author={c.representant_legal}
      subject="Document d'Entrée en Relation"
      creator="AMANA Patrimoine"
      producer="AMANA Patrimoine"
    >
      {/* PAGE 1 — Identité et statuts */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader showFull />

        <Text style={styles.title}>Document d&apos;Entrée en Relation</Text>
        <Text style={styles.subtitle}>
          Document préalable à toute mission · Articles L.541-8-1 du CMF (CIF), L.521-1 du Code des
          assurances (COA), L.519-1 du CMF (COBSP)
        </Text>

        {/* Identité du cabinet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Identité du Cabinet</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Raison sociale</Text><Text style={styles.fieldValue}>{c.raison_sociale}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Forme juridique</Text><Text style={styles.fieldValue}>{c.forme_juridique}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Représentant légal</Text><Text style={styles.fieldValue}>{c.representant_legal}, {c.fonction}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Siège social</Text><Text style={styles.fieldValue}>{c.adresse_siege}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>RCS</Text><Text style={styles.fieldValue}>{c.rcs}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Email professionnel</Text><Text style={styles.fieldValue}>{c.email_pro}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Site web</Text><Text style={styles.fieldValue}>{c.site_web}</Text></View>
        </View>

        {/* Statuts ORIAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Statuts professionnels (ORIAS n° {c.numero_orias})</Text>
          <Text style={styles.paragraph}>
            AMANA Patrimoine est inscrite au Registre Unique des Intermédiaires en Assurance, Banque
            et Finance (ORIAS) sous le numéro <Text style={{ fontFamily: 'Helvetica-Bold' }}>{c.numero_orias}</Text>.
            Vérifiable sur {c.orias_url}. Inscription valable jusqu&apos;au {c.statuts.cif.jusqu_au}.
            Le cabinet exerce les 3 activités suivantes :
          </Text>

          {/* CIF */}
          <View style={styles.statutBlock}>
            <Text style={styles.statutTitle}>{c.statuts.cif.nom}</Text>
            <Text style={styles.statutMeta}>
              Inscrit depuis le {c.statuts.cif.depuis} · {c.statuts.cif.articles_loi}
            </Text>
            <Text style={styles.statutMeta}>
              Régulateur : {c.statuts.cif.regulateur} · Association agréée : {c.statuts.cif.association_agreee}
            </Text>
          </View>

          {/* COA */}
          <View style={styles.statutBlock}>
            <Text style={styles.statutTitle}>{c.statuts.coa.nom}</Text>
            <Text style={styles.statutMeta}>
              Inscrit depuis le {c.statuts.coa.depuis} · {c.statuts.coa.articles_loi}
            </Text>
            <Text style={styles.statutMeta}>
              Régulateur : {c.statuts.coa.regulateur} · Association agréée : {c.statuts.coa.association_agreee}
            </Text>
          </View>

          {/* COBSP */}
          <View style={styles.statutBlock}>
            <Text style={styles.statutTitle}>{c.statuts.cobsp.nom}</Text>
            <Text style={styles.statutMeta}>
              Inscrit depuis le {c.statuts.cobsp.depuis} · {c.statuts.cobsp.articles_loi}
            </Text>
            <Text style={styles.statutMeta}>
              Régulateur : {c.statuts.cobsp.regulateur} · Association agréée : {c.statuts.cobsp.association_agreee}
            </Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 2 — Identification client + spécialité Sharia + rémunération */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        {/* Identification du client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Identification du Client</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Nom et prénom</Text><Text style={styles.fieldValue}>{fullName}</Text></View>
          {client.email && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Email</Text><Text style={styles.fieldValue}>{client.email}</Text></View>}
          {client.telephone && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Téléphone</Text><Text style={styles.fieldValue}>{client.telephone}</Text></View>}
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Référence dossier</Text><Text style={styles.fieldValue}>{dossierId.slice(0, 8).toUpperCase()}…</Text></View>
        </View>

        {/* Spécialité finance islamique */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Spécialité finance islamique</Text>
          <Text style={styles.paragraph}>
            AMANA Patrimoine se distingue par sa spécialisation en gestion de patrimoine conforme aux
            principes de la finance islamique. Les recommandations émises sont filtrées selon les
            normes <Text style={{ fontFamily: 'Helvetica-Bold' }}>AAOIFI</Text> (Accounting and
            Auditing Organization for Islamic Financial Institutions).
          </Text>
          <Text style={styles.paragraph}>
            Sont notamment exclus de l&apos;univers d&apos;investissement proposé : produits adossés à
            l&apos;intérêt usuraire (riba), secteurs ribawi, alcool, tabac, jeux d&apos;argent, armement,
            audiovisuel non-conforme, ainsi que les sociétés présentant des ratios financiers supérieurs
            aux seuils AAOIFI. Les cas complexes peuvent faire l&apos;objet d&apos;une escalade auprès
            de notre partenaire de conformité Sharia.
          </Text>
        </View>

        {/* Mode de rémunération */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Mode de rémunération</Text>
          <Text style={styles.paragraph}>AMANA Patrimoine propose 3 offres avec des modes de rémunération distincts :</Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Offre Mass</Text> : aucun frais de
            conseil, rémunération via les rétrocessions des produits sharia-compliant souscrits par
            le client (uniquement supports validés par notre comité interne).
          </Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Offre Patrimoniale</Text> : frais de
            conseil plafonnés à 2,5 % du patrimoine sous gestion, avec conseiller dédié et bilan annuel.
          </Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Offre Premium</Text> : frais plafonnés à
            1,5 % du patrimoine sous gestion + facturation horaire 250 €/h ou forfaits F1-F5 selon la
            complexité du dossier.
          </Text>
          <Text style={[styles.paragraph, { marginTop: 4 }]}>
            Le détail précis applicable au présent dossier sera annexé à la Lettre de Mission. Toute
            rétrocession perçue par le cabinet ou son groupement (Anacofi-Courtage, Alliance Courtage)
            sera communiquée au client avant souscription, conformément aux obligations CIF.
          </Text>
        </View>

        {/* Conflit d'intérêts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Information sur les conflits d&apos;intérêts</Text>
          <Text style={styles.paragraph}>
            AMANA Patrimoine est adhérente du syndicat Anacofi-Courtage (SIREN {c.association.siren}).
            Certaines conventions distributeur peuvent être signées au nom du groupement Alliance
            Courtage et donner lieu à une rétrocession partielle au profit de ce dernier.
          </Text>
          <Text style={styles.paragraph}>
            Le conseiller s&apos;engage à informer le client de tout conflit d&apos;intérêts avant la
            signature de toute opération. Un registre des conflits d&apos;intérêts est tenu et
            consultable sur demande.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 3 — RC pro multi-statuts + médiateurs + RGPD */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        {/* RC pro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Responsabilité Civile Professionnelle</Text>
          <Text style={styles.paragraph}>
            AMANA Patrimoine bénéficie d&apos;un contrat d&apos;assurance Responsabilité Civile
            Professionnelle souscrit auprès de <Text style={{ fontFamily: 'Helvetica-Bold' }}>{c.rc_pro.assureur}</Text>.
          </Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Assureur</Text><Text style={styles.fieldValue}>{c.rc_pro.assureur}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Adresse</Text><Text style={styles.fieldValue}>{c.rc_pro.assureur_adresse}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>N° de police unique</Text><Text style={styles.fieldValue}>{c.rc_pro.police_numero}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Validité</Text><Text style={styles.fieldValue}>{c.rc_pro.validite_du} → {c.rc_pro.validite_au}</Text></View>

          <Text style={[styles.paragraph, { marginTop: 8 }]}>Garanties par statut professionnel :</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Statut</Text>
              <Text style={[styles.tableCell, { flex: 1.4 }]}>Articles légaux</Text>
              <Text style={styles.tableCell}>Plafond / sinistre</Text>
              <Text style={styles.tableCell}>Plafond / période</Text>
            </View>
            {c.rc_pro.garanties.map((g) => (
              <View key={g.statut} style={styles.tableRow}>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{g.statut}</Text>
                <Text style={[styles.tableCell, { flex: 1.4, fontSize: 8 }]}>{g.articles}</Text>
                <Text style={styles.tableCell}>{g.plafond_sinistre}</Text>
                <Text style={styles.tableCell}>{g.plafond_periode}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Médiateurs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Recours et médiation</Text>
          <Text style={styles.paragraph}>
            En cas de différend non résolu directement, le client peut saisir le médiateur compétent
            selon la nature du litige :
          </Text>
          {c.mediateurs.map((m, i) => (
            <View key={i} style={[styles.statutBlock, { marginBottom: 6 }]}>
              <Text style={styles.statutTitle}>{m.nom}</Text>
              <Text style={styles.statutMeta}>{m.domaine}</Text>
              <Text style={styles.statutMeta}>{m.adresse}</Text>
              {m.url && <Text style={styles.statutMeta}>{m.url}</Text>}
              {m.via && <Text style={[styles.statutMeta, { fontFamily: 'Helvetica-Oblique' }]}>{m.via}</Text>}
            </View>
          ))}
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 4 — RGPD + Notice IA + Signatures */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        {/* RGPD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Protection des données personnelles (RGPD)</Text>
          <Text style={styles.paragraph}>
            Les données personnelles collectées dans le cadre de la mission sont traitées par AMANA
            Patrimoine en qualité de responsable du traitement, exclusivement pour l&apos;exécution
            de la mission de conseil et la conformité réglementaire (LCB-FT, ORIAS, CIF, COA, COBSP).
          </Text>
          <Text style={styles.paragraph}>
            Conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés
            modifiée, le client dispose des droits d&apos;accès, de rectification, d&apos;effacement,
            de limitation, de portabilité et d&apos;opposition. Toute demande peut être adressée à :
            {' '}<Text style={{ fontFamily: 'Helvetica-Bold' }}>{c.email_pro}</Text>.
          </Text>
          <Text style={styles.paragraph}>
            Conservation : 5 ans après la fin de la relation commerciale (obligations LCB-FT/Tracfin).
            Hébergement des données : Union européenne.
          </Text>
          <Text style={styles.paragraph}>
            Le client peut également déposer une réclamation auprès de la CNIL (3 place de Fontenoy,
            TSA 80715, 75334 Paris Cedex 07).
          </Text>
        </View>

        {/* Notice IA */}
        <View style={styles.notice}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
            Productions IA-augmentées
          </Text>
          <Text>
            La plateforme AMANA utilise des agents conversationnels intelligents pour préparer les
            recommandations. Toutes les productions sont systématiquement validées par
            {' '}{c.representant_legal} avant remise au client. La charte de transparence IA est
            disponible sur {c.site_web}/charte-ia.
          </Text>
        </View>

        {/* Avertissement renouvellement RC */}
        {new Date(c.rc_pro.validite_au.split('/').reverse().join('-')) < new Date() && (
          <View style={styles.warning}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
              Note importante
            </Text>
            <Text>
              La présente attestation de RC pro est susceptible d&apos;avoir été renouvelée. Le client
              peut demander une attestation actualisée à tout moment via {c.email_pro}.
            </Text>
          </View>
        )}

        {/* Signatures */}
        <View style={[styles.section, { marginTop: 30 }]}>
          <Text style={styles.sectionTitle}>10. Engagement des parties</Text>
          <Text style={styles.paragraph}>
            La remise de ce document précède toute mission et atteste de la bonne information
            préalable du client sur l&apos;identité, les statuts et les obligations professionnelles
            d&apos;AMANA Patrimoine.
          </Text>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 }}>Le Client</Text>
            <Text style={{ marginTop: 18 }}>{fullName}</Text>
            <Text style={{ marginTop: 2, fontSize: 8 }}>Date et signature</Text>
            <Text style={{ marginTop: 2, fontSize: 8 }}>Reconnaît avoir reçu et lu ce document</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 }}>Le Conseiller</Text>
            <Text style={{ marginTop: 18 }}>{c.representant_legal}</Text>
            <Text style={{ marginTop: 2, fontSize: 8 }}>{c.fonction}, {c.raison_sociale}</Text>
            <Text style={{ marginTop: 2, fontSize: 8 }}>Date et signature</Text>
          </View>
        </View>

        <PageFooter />
      </Page>
    </Document>
  )
}

// Compatibilité v1 — DEFAULT_CONSEILLER_INFO (deprecated, à retirer après migration totale)
export const DEFAULT_CONSEILLER_INFO = {
  nom_complet: AMANA_CONSEILLER_INFO.representant_legal,
  email_pro: AMANA_CONSEILLER_INFO.email_pro,
  forme_juridique: AMANA_CONSEILLER_INFO.forme_juridique,
  numero_orias: AMANA_CONSEILLER_INFO.numero_orias,
  rc_pro_assureur: AMANA_CONSEILLER_INFO.rc_pro.assureur,
  rc_pro_police: AMANA_CONSEILLER_INFO.rc_pro.police_numero,
  rc_pro_plafond: AMANA_CONSEILLER_INFO.rc_pro.garanties[0].plafond_sinistre,
  mediateur_nom: AMANA_CONSEILLER_INFO.mediateurs[0].nom,
  mediateur_adresse: AMANA_CONSEILLER_INFO.mediateurs[0].adresse,
}
