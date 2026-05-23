// lib/documents/templates/lm-template.tsx — v2 multi-statuts
// Sprint Agents IA v10c · 30 avril 2026

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
  header: { marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid', flexDirection: 'row', alignItems: 'center', gap: 18 },
  logo: { width: 160, height: 76, objectFit: 'contain' },
  brandTextBlock: { flex: 1 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: FOREST, letterSpacing: 0.5 },
  brandSub: { fontSize: 9.5, color: GREY, marginTop: 4, fontFamily: 'Helvetica-Oblique' },
  brandRcs: { fontSize: 8.5, color: GREY, marginTop: 6 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: FOREST, marginTop: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: GREY, marginBottom: 22, fontFamily: 'Helvetica-Oblique' },
  section: { marginBottom: 18 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: GOLD, borderBottomStyle: 'solid' },
  paragraph: { marginBottom: 6, textAlign: 'justify' },
  bullet: { marginLeft: 10, marginBottom: 5 },
  fieldRow: { flexDirection: 'row', marginBottom: 5 },
  fieldLabel: { width: 170, color: GREY, fontSize: 9.5 },
  fieldValue: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: DARK },
  table: { marginTop: 8, borderWidth: 0.5, borderColor: GREY_LIGHT, borderStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: GREY_LIGHT, borderBottomStyle: 'solid' },
  tableHeader: { backgroundColor: SOFT_GREY, fontFamily: 'Helvetica-Bold' },
  tableCell: { padding: 6, fontSize: 9, flex: 1 },
  notice: { backgroundColor: CREAM, padding: 12, borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', marginBottom: 14, fontSize: 9.5 },
  signatureBlock: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', gap: 30 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: GREY, borderTopStyle: 'solid', paddingTop: 6, fontSize: 9, color: GREY },
  footer: { position: 'absolute', bottom: 24, left: 50, right: 80, fontSize: 7.5, color: GREY, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: GREY_LIGHT, borderTopStyle: 'solid' },
  pageNumber: { position: 'absolute', bottom: 24, right: 50, fontSize: 8, color: GREY },
  statutBlock: { backgroundColor: SOFT_GREY, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: FOREST, borderLeftStyle: 'solid' },
  statutTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST, marginBottom: 3 },
  statutMeta: { fontSize: 8.5, color: GREY },
})

export type LmTemplateProps = {
  client: {
    prenom: string
    nom: string
    email?: string | null
    telephone?: string | null
  }
  offre: 'mass' | 'patrimoniale' | 'premium' | null
  /** Inputs spécifiques saisis avant génération (sprint v10c) */
  inputs?: {
    objectifs_client?: string
    duree_mission?: string
    honoraires_estimes?: string
    perimetre_specifique?: string
  }
  generationDate: string
  dossierId: string
}

export function LmTemplate({ client, offre, inputs, generationDate, dossierId }: LmTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`
  const c = AMANA_CONSEILLER_INFO

  const offreLabel: Record<string, string> = {
    mass: 'Mass — frais de conseil 0%, rémunération via rétrocessions des produits sharia-compliant souscrits',
    patrimoniale: 'Patrimoniale — frais de conseil plafonnés à 2,5 % du patrimoine sous gestion + conseiller dédié',
    premium: 'Premium — frais plafonnés à 1,5 % + facturation 250 €/h ou forfaits F1-F5 selon complexité',
  }
  const offreText = offre ? offreLabel[offre] : 'Offre à confirmer (Mass / Patrimoniale / Premium)'

  const PageHeader = (props: { showFull?: boolean }) => (
    <View style={[styles.header, props.showFull ? {} : { marginBottom: 18, paddingBottom: 10 }]}>
      <Image src={AMANA_LOGO_BASE64} style={props.showFull ? styles.logo : { width: 110, height: 52, objectFit: 'contain' }} />
      <View style={styles.brandTextBlock}>
        <Text style={[styles.brand, props.showFull ? {} : { fontSize: 16 }]}>AMANA Patrimoine</Text>
        <Text style={styles.brandSub}>{props.showFull ? c.specialite : `Lettre de mission · ${fullName}`}</Text>
        {props.showFull && <Text style={styles.brandRcs}>ORIAS {c.numero_orias} · RCS {c.rcs} · {c.email_pro}</Text>}
      </View>
    </View>
  )

  const PageFooter = () => (
    <>
      <Text style={styles.footer} fixed>
        AMANA Patrimoine · SAS · RCS {c.rcs} · ORIAS {c.numero_orias} · CIF/COA/COBSP · LM générée le {generationDate}
      </Text>
      <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  )

  const Watermark = () => <Image src={AMANA_LOGO_BASE64} style={styles.watermark} fixed />

  return (
    <Document
      title={`Lettre de mission AMANA - ${fullName}`}
      author={c.representant_legal}
      subject="Lettre de Mission"
      creator="AMANA Patrimoine"
      producer="AMANA Patrimoine"
    >
      {/* PAGE 1 */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader showFull />

        <Text style={styles.title}>Lettre de Mission</Text>
        <Text style={styles.subtitle}>
          Article L.541-8-1 du Code monétaire et financier · Mission CIF · Articulation COA / COBSP
          si applicable
        </Text>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Parties</Text>
          <Text style={styles.paragraph}>Entre les soussignés :</Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Le Cabinet</Text> : {c.raison_sociale},
            {' '}{c.forme_juridique}, dont le siège social est sis {c.adresse_siege}, RCS {c.rcs},
            représentée par {c.representant_legal} en qualité de {c.fonction},
            ORIAS {c.numero_orias} (CIF/COA/COBSP), ci-après dénommée « le Conseiller ».
          </Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Le Client</Text> : {fullName}
            {client.email ? ` (${client.email})` : ''}, ci-après dénommé « le Client ».
          </Text>
          <View style={[styles.fieldRow, { marginTop: 6 }]}>
            <Text style={styles.fieldLabel}>Référence dossier</Text>
            <Text style={styles.fieldValue}>{dossierId.slice(0, 8).toUpperCase()}…</Text>
          </View>
        </View>

        {/* Objet de la mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Objet de la mission</Text>
          <Text style={styles.paragraph}>
            Le Conseiller s&apos;engage à fournir au Client un conseil patrimonial personnalisé
            conforme aux principes de la finance islamique (filtrage AAOIFI), couvrant les statuts
            suivants au cas par cas :
          </Text>
          <Text style={styles.bullet}>• Conseil en investissements financiers (CIF) — supports financiers sharia-compliant</Text>
          <Text style={styles.bullet}>• Courtage en assurance (COA) — solutions assurance-vie, prévoyance compatibles</Text>
          <Text style={styles.bullet}>• Courtage en opérations de banque et services de paiement (COBSP) — financement Mourabaha, comptes islamiques</Text>
          <Text style={[styles.paragraph, { marginTop: 6 }]}>La mission inclut :</Text>
          <Text style={styles.bullet}>• Bilan patrimonial initial (agent Mizan)</Text>
          <Text style={styles.bullet}>• Test d&apos;adéquation MIF2 et profil de risque</Text>
          <Text style={styles.bullet}>• Préconisation d&apos;allocation halal (agent Tartîb) avec validation Sharia (agent Tahara)</Text>
          <Text style={styles.bullet}>• Suivi annuel et bilans périodiques selon offre AMANA souscrite</Text>

          {inputs?.objectifs_client && (
            <>
              <Text style={[styles.paragraph, { marginTop: 8, fontFamily: 'Helvetica-Bold' }]}>Objectifs spécifiques du Client :</Text>
              <Text style={styles.paragraph}>{inputs.objectifs_client}</Text>
            </>
          )}
          {inputs?.perimetre_specifique && (
            <>
              <Text style={[styles.paragraph, { marginTop: 6, fontFamily: 'Helvetica-Bold' }]}>Périmètre spécifique :</Text>
              <Text style={styles.paragraph}>{inputs.perimetre_specifique}</Text>
            </>
          )}
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 2 — Statuts + Rémunération */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Statuts et autorités de tutelle</Text>
          <Text style={styles.paragraph}>
            Le Conseiller exerce sous 3 statuts ORIAS (n° {c.numero_orias}) :
          </Text>
          <View style={styles.statutBlock}>
            <Text style={styles.statutTitle}>{c.statuts.cif.nom}</Text>
            <Text style={styles.statutMeta}>{c.statuts.cif.articles_loi}</Text>
            <Text style={styles.statutMeta}>Régulateur : {c.statuts.cif.regulateur} · Association agréée : {c.statuts.cif.association_agreee}</Text>
          </View>
          <View style={styles.statutBlock}>
            <Text style={styles.statutTitle}>{c.statuts.coa.nom}</Text>
            <Text style={styles.statutMeta}>{c.statuts.coa.articles_loi}</Text>
            <Text style={styles.statutMeta}>Régulateur : {c.statuts.coa.regulateur} · Association agréée : {c.statuts.coa.association_agreee}</Text>
          </View>
          <View style={styles.statutBlock}>
            <Text style={styles.statutTitle}>{c.statuts.cobsp.nom}</Text>
            <Text style={styles.statutMeta}>{c.statuts.cobsp.articles_loi}</Text>
            <Text style={styles.statutMeta}>Régulateur : {c.statuts.cobsp.regulateur} · Association agréée : {c.statuts.cobsp.association_agreee}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Offre AMANA et rémunération</Text>
          <Text style={styles.paragraph}>
            Offre applicable : <Text style={{ fontFamily: 'Helvetica-Bold' }}>{offreText}</Text>.
          </Text>
          {inputs?.honoraires_estimes && (
            <View style={[styles.fieldRow, { marginTop: 6 }]}>
              <Text style={styles.fieldLabel}>Honoraires estimés</Text>
              <Text style={styles.fieldValue}>{inputs.honoraires_estimes}</Text>
            </View>
          )}
          <Text style={[styles.paragraph, { marginTop: 6 }]}>
            Le détail des rétrocessions perçues par le Cabinet (ou son groupement Anacofi-Courtage)
            sera communiqué au Client avant chaque souscription, conformément aux obligations de
            transparence applicables aux statuts CIF, COA et COBSP. Le Client sera informé en amont
            de tout conflit d&apos;intérêts identifié.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Engagements du Conseiller</Text>
          <Text style={styles.bullet}>• Agir avec loyauté, équité et professionnalisme dans l&apos;intérêt exclusif du Client</Text>
          <Text style={styles.bullet}>• Ne proposer que des supports compatibles avec la finance islamique (filtrage AAOIFI)</Text>
          <Text style={styles.bullet}>• Informer le Client de tout conflit d&apos;intérêts éventuel</Text>
          <Text style={styles.bullet}>• Respecter le secret professionnel et la confidentialité des informations transmises</Text>
          <Text style={styles.bullet}>• Conserver les pièces justificatives 5 ans (obligation LCB-FT/Tracfin)</Text>
          <Text style={styles.bullet}>• Maintenir à jour son inscription ORIAS et son adhésion à Anacofi-Courtage</Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 3 — Engagements client + Durée + RC pro */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Engagements du Client</Text>
          <Text style={styles.bullet}>• Fournir des informations exactes et complètes (KYC, MIF2, situation patrimoniale, objectifs)</Text>
          <Text style={styles.bullet}>• Informer le Conseiller de tout changement substantiel de sa situation</Text>
          <Text style={styles.bullet}>• Ne pas divulguer les analyses et préconisations à des tiers sans accord écrit</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Durée et résiliation</Text>
          <Text style={styles.paragraph}>
            La présente mission est conclue {inputs?.duree_mission ?? 'pour une durée indéterminée à compter de la date de signature'}.
            Chacune des parties peut y mettre fin par lettre recommandée avec AR, avec un préavis de 30 jours.
          </Text>
          <Text style={styles.paragraph}>
            En cas de résiliation, les prestations en cours seront soldées au prorata, et les pièces
            du dossier mises à disposition du Client. Les obligations de conservation 5 ans (LCB-FT)
            restent applicables.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Responsabilité Civile Professionnelle</Text>
          <Text style={styles.paragraph}>
            Police {c.rc_pro.police_numero} souscrite auprès de {c.rc_pro.assureur} ({c.rc_pro.validite_du} → {c.rc_pro.validite_au}).
            Garanties par statut :
          </Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Statut</Text>
              <Text style={styles.tableCell}>Plafond / sinistre</Text>
              <Text style={styles.tableCell}>Plafond / période</Text>
            </View>
            {c.rc_pro.garanties.map((g) => (
              <View key={g.statut} style={styles.tableRow}>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{g.statut}</Text>
                <Text style={styles.tableCell}>{g.plafond_sinistre}</Text>
                <Text style={styles.tableCell}>{g.plafond_periode}</Text>
              </View>
            ))}
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 4 — Médiation + RGPD + Notice IA + Signatures */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Médiation et règlement des différends</Text>
          {c.mediateurs.map((m, i) => (
            <View key={i} style={[styles.statutBlock, { marginBottom: 6 }]}>
              <Text style={styles.statutTitle}>{m.nom}</Text>
              <Text style={styles.statutMeta}>{m.domaine}</Text>
              <Text style={styles.statutMeta}>{m.adresse}</Text>
              {m.url && <Text style={styles.statutMeta}>{m.url}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Confidentialité et RGPD</Text>
          <Text style={styles.paragraph}>
            Les données personnelles sont traitées par AMANA Patrimoine en qualité de responsable du
            traitement. Conservation 5 ans (LCB-FT). Droits RGPD (accès, rectification, effacement,
            portabilité, opposition) exercables auprès de {c.email_pro}. Réclamation possible auprès
            de la CNIL.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Productions IA-augmentées</Text>
          <Text>
            Les analyses et préconisations sont préparées avec l&apos;assistance d&apos;agents IA
            AMANA et systématiquement validées par {c.representant_legal} avant remise au Client.
            Charte de transparence : {c.site_web}/charte-ia.
          </Text>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 }}>Le Client</Text>
            <Text style={{ marginTop: 18 }}>{fullName}</Text>
            <Text style={{ marginTop: 2, fontSize: 8 }}>Date et signature précédée de « Lu et approuvé »</Text>
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
