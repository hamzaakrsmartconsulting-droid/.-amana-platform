// lib/documents/templates/ra-template.tsx — v2 multi-statuts + match Mizan + allocation
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
  fieldLabel: { width: 200, color: GREY, fontSize: 9.5 },
  fieldValue: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: DARK },
  table: { marginTop: 8, borderWidth: 0.5, borderColor: GREY_LIGHT, borderStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: GREY_LIGHT, borderBottomStyle: 'solid' },
  tableHeader: { backgroundColor: SOFT_GREY, fontFamily: 'Helvetica-Bold' },
  tableCell: { padding: 6, fontSize: 9, flex: 1 },
  notice: { backgroundColor: CREAM, padding: 12, borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', marginBottom: 14, fontSize: 9.5 },
  warning: { backgroundColor: '#fef3c7', padding: 10, borderLeftWidth: 3, borderLeftColor: '#d97706', borderLeftStyle: 'solid', marginBottom: 14, fontSize: 9.5, color: '#7c2d12' },
  signatureBlock: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', gap: 30 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: GREY, borderTopStyle: 'solid', paddingTop: 6, fontSize: 9, color: GREY },
  footer: { position: 'absolute', bottom: 24, left: 50, right: 80, fontSize: 7.5, color: GREY, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: GREY_LIGHT, borderTopStyle: 'solid' },
  pageNumber: { position: 'absolute', bottom: 24, right: 50, fontSize: 8, color: GREY },
  bilanBox: { backgroundColor: SOFT_GREY, padding: 12, marginBottom: 10, borderRadius: 4 },
})

export type RaTemplateProps = {
  client: {
    prenom: string
    nom: string
    email?: string | null
  }
  /** Facts collectés via les agents (mémoire) */
  facts: {
    age?: string
    situation_familiale?: string
    nb_enfants?: string
    revenus_annuels_eur?: string
    charges_annuelles_eur?: string
    patrimoine_total_eur?: string
    profil_risque?: string
    objectif_principal?: string
    horizon_placement_annees?: string
    offre_amana_cible?: string
    sensibilite_sharia?: string
  }
  /** Inputs spécifiques saisis avant génération */
  inputs?: {
    bilan_mizan_resume?: string
    bilan_mizan_date?: string
    allocation_cible?: Array<{ classe: string; pourcentage: string; montant_eur?: string; supports?: string }>
    capacite_financiere?: string
    connaissances_investissement?: string
    justification_adequation?: string
  }
  generationDate: string
  dossierId: string
}

const FACT_LABELS: Record<string, string> = {
  age: 'Âge',
  situation_familiale: 'Situation familiale',
  nb_enfants: "Nombre d'enfants",
  revenus_annuels_eur: 'Revenus annuels (€)',
  charges_annuelles_eur: 'Charges annuelles (€)',
  patrimoine_total_eur: 'Patrimoine total (€)',
  profil_risque: 'Profil de risque',
  objectif_principal: 'Objectif principal',
  horizon_placement_annees: "Horizon de placement (années)",
  offre_amana_cible: 'Offre AMANA',
  sensibilite_sharia: 'Sensibilité Sharia',
}

export function RaTemplate({ client, facts, inputs, generationDate, dossierId }: RaTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`
  const c = AMANA_CONSEILLER_INFO

  const PageHeader = (props: { showFull?: boolean }) => (
    <View style={[styles.header, props.showFull ? {} : { marginBottom: 18, paddingBottom: 10 }]}>
      <Image src={AMANA_LOGO_BASE64} style={props.showFull ? styles.logo : { width: 110, height: 52, objectFit: 'contain' }} />
      <View style={styles.brandTextBlock}>
        <Text style={[styles.brand, props.showFull ? {} : { fontSize: 16 }]}>AMANA Patrimoine</Text>
        <Text style={styles.brandSub}>{props.showFull ? c.specialite : `Rapport d'adéquation · ${fullName}`}</Text>
        {props.showFull && <Text style={styles.brandRcs}>ORIAS {c.numero_orias} · RCS {c.rcs} · {c.email_pro}</Text>}
      </View>
    </View>
  )

  const PageFooter = () => (
    <>
      <Text style={styles.footer} fixed>
        AMANA Patrimoine · SAS · RCS {c.rcs} · ORIAS {c.numero_orias} · CIF/COA/COBSP · RA généré le {generationDate}
      </Text>
      <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  )

  const Watermark = () => <Image src={AMANA_LOGO_BASE64} style={styles.watermark} fixed />

  return (
    <Document
      title={`Rapport d'adéquation AMANA - ${fullName}`}
      author={c.representant_legal}
      subject="Rapport d'Adéquation MIF2"
      creator="AMANA Patrimoine"
      producer="AMANA Patrimoine"
    >
      {/* PAGE 1 — Identification + profil patrimonial */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader showFull />

        <Text style={styles.title}>Rapport d&apos;Adéquation</Text>
        <Text style={styles.subtitle}>
          Article 25 de la directive 2014/65/UE (MIF2) · Justification de l&apos;adéquation des
          préconisations au profil du Client
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Identification</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Client</Text><Text style={styles.fieldValue}>{fullName}</Text></View>
          {client.email && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Email</Text><Text style={styles.fieldValue}>{client.email}</Text></View>}
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Conseiller</Text><Text style={styles.fieldValue}>{c.representant_legal}, {c.raison_sociale}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>N° ORIAS (CIF)</Text><Text style={styles.fieldValue}>{c.numero_orias}</Text></View>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Référence dossier</Text><Text style={styles.fieldValue}>{dossierId.slice(0, 8).toUpperCase()}…</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Profil patrimonial du Client</Text>
          {Object.entries(FACT_LABELS).map(([key, label]) => {
            const v = (facts as Record<string, string | undefined>)[key]
            return (
              <View key={key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{v ?? '— Non renseigné'}</Text>
              </View>
            )
          })}
          <Text style={[styles.paragraph, { marginTop: 6, fontSize: 8.5, color: GREY }]}>
            Données issues du KYC déclaratif et du test MIF2 du Client. Actualisation à chaque revue annuelle.
          </Text>
        </View>

        {inputs?.connaissances_investissement && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Connaissances et expérience en investissement</Text>
            <Text style={styles.paragraph}>{inputs.connaissances_investissement}</Text>
          </View>
        )}

        <PageFooter />
      </Page>

      {/* PAGE 2 — Bilan Mizan + Capacité financière + Méthodologie */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        {inputs?.bilan_mizan_resume && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Bilan patrimonial (agent Mizan)</Text>
            <View style={styles.bilanBox}>
              {inputs.bilan_mizan_date && (
                <Text style={[styles.paragraph, { fontSize: 9, color: GREY, marginBottom: 6 }]}>
                  Bilan réalisé le : <Text style={{ fontFamily: 'Helvetica-Bold' }}>{inputs.bilan_mizan_date}</Text>
                </Text>
              )}
              <Text style={styles.paragraph}>{inputs.bilan_mizan_resume}</Text>
            </View>
          </View>
        )}

        {inputs?.capacite_financiere && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Capacité financière à supporter les pertes</Text>
            <Text style={styles.paragraph}>{inputs.capacite_financiere}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Méthodologie d&apos;analyse AMANA</Text>
          <Text style={styles.paragraph}>L&apos;analyse d&apos;adéquation s&apos;appuie sur :</Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Bilan patrimonial</Text> (agent Mizan) :
            analyse de la situation actuelle (revenus, charges, actifs, passifs, projets de vie)
          </Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Profil de risque MIF2</Text> :
            classement en 4 profils (prudent / équilibré / dynamique / offensif)
          </Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Filtrage Sharia AAOIFI</Text>
            (agent Tahara) : exclusion secteurs ribawi, alcool, tabac, jeux, armement, audiovisuel
            non-conforme, ratios financiers max 33 %
          </Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Allocation cible halal</Text>
            (agent Tartîb) : répartition entre liquidités, ETF islamic, SCPI Sharia, immobilier
            Mourabaha, or physique
          </Text>
          <Text style={styles.bullet}>
            • <Text style={{ fontFamily: 'Helvetica-Bold' }}>Validation humaine</Text> :
            chaque préconisation est revue et validée par {c.representant_legal} avant remise au Client
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 3 — Allocation cible chiffrée + Univers d'investissement */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        {inputs?.allocation_cible && inputs.allocation_cible.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Allocation cible préconisée</Text>
            <Text style={styles.paragraph}>
              Suite à l&apos;analyse du profil et au bilan patrimonial, l&apos;allocation suivante
              est préconisée pour ce dossier :
            </Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>Classe d&apos;actif</Text>
                <Text style={styles.tableCell}>Pourcentage</Text>
                <Text style={styles.tableCell}>Montant (€)</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>Supports proposés</Text>
              </View>
              {inputs.allocation_cible.map((a, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontFamily: 'Helvetica-Bold' }]}>{a.classe}</Text>
                  <Text style={styles.tableCell}>{a.pourcentage}</Text>
                  <Text style={styles.tableCell}>{a.montant_eur ?? '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, fontSize: 8 }]}>{a.supports ?? '—'}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.paragraph, { marginTop: 8, fontSize: 8.5, color: GREY }]}>
              Allocation indicative à valider et exécuter en fonction de la situation au moment de la
              souscription.
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Allocation cible</Text>
            <View style={styles.warning}>
              <Text>
                Aucune allocation cible saisie pour ce dossier. Le rapport d&apos;adéquation sera
                complété ultérieurement avec la répartition précise issue de la conversation Tartîb.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Univers d&apos;investissement AMANA</Text>
          <Text style={styles.paragraph}>
            Les supports proposés sont uniquement issus de l&apos;univers AMANA, exclusivement
            constitué de produits compatibles finance islamique :
          </Text>
          <Text style={styles.bullet}>• Compte courant + livret bancaire islamique (Chaabi Bank, Al-Baraka)</Text>
          <Text style={styles.bullet}>• ETF islamic : iShares MSCI World Islamic (ISDW), iShares MSCI USA Islamic (ISUS), HSBC MSCI Emerging Markets Islamic</Text>
          <Text style={styles.bullet}>• SCPI Sharia : NCap Education Santé (validation Sakina Consulting)</Text>
          <Text style={styles.bullet}>• Or physique au comptant (livraison physique, allocated bullion)</Text>
          <Text style={styles.bullet}>• Immobilier en Mourabaha (financement halal Chaabi Bank)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Produits exclus</Text>
          <Text style={styles.paragraph}>Sont exclus de l&apos;univers AMANA car non conformes Sharia :</Text>
          <Text style={styles.bullet}>• Fonds en euros (taux garanti = riba)</Text>
          <Text style={styles.bullet}>• SCPI Pinel ou similaires</Text>
          <Text style={styles.bullet}>• Assurance-vie classique multi-supports avec fonds euros</Text>
          <Text style={styles.bullet}>• Crypto-actifs sans validation Sharia individuelle</Text>
          <Text style={styles.bullet}>• Tout produit lié aux secteurs exclus AAOIFI</Text>
        </View>

        <PageFooter />
      </Page>

      {/* PAGE 4 — Justification adéquation + Avertissements + Signatures */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <PageHeader />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Justification de l&apos;adéquation</Text>
          {inputs?.justification_adequation ? (
            <Text style={styles.paragraph}>{inputs.justification_adequation}</Text>
          ) : (
            <Text style={styles.paragraph}>
              Au regard du profil collecté (situation familiale, capacité financière, tolérance au
              risque, horizon de placement, objectifs et sensibilité Sharia), les préconisations
              émises par AMANA Patrimoine sont jugées adaptées au Client.
            </Text>
          )}
          <Text style={[styles.paragraph, { marginTop: 4 }]}>Les préconisations respectent :</Text>
          <Text style={styles.bullet}>• La capacité du Client à supporter les pertes éventuelles (analyse charges + coussin sécurité)</Text>
          <Text style={styles.bullet}>• L&apos;horizon de placement compatible avec la liquidité des supports proposés</Text>
          <Text style={styles.bullet}>• La connaissance et l&apos;expérience en matière d&apos;investissement (test MIF2)</Text>
          <Text style={styles.bullet}>• La sensibilité Sharia (filtrage AAOIFI systématique)</Text>
        </View>

        <View style={styles.warning}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Avertissements MIF2</Text>
          <Text style={{ marginBottom: 4 }}>• Les performances passées ne préjugent pas des performances futures.</Text>
          <Text style={{ marginBottom: 4 }}>• Tout investissement comporte un risque de perte en capital, partiel ou total.</Text>
          <Text>
            • Le Client doit s&apos;assurer que les supports proposés correspondent à ses convictions
            et qu&apos;il en comprend les risques avant toute souscription.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Productions IA-augmentées</Text>
          <Text>
            Les analyses et préconisations contenues dans ce rapport sont préparées avec l&apos;assistance
            d&apos;agents IA AMANA et systématiquement validées par {c.representant_legal} avant remise
            au Client. Charte de transparence : {c.site_web}/charte-ia.
          </Text>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 }}>Le Client</Text>
            <Text style={{ marginTop: 18 }}>{fullName}</Text>
            <Text style={{ marginTop: 2, fontSize: 8 }}>Date et signature</Text>
            <Text style={{ marginTop: 2, fontSize: 8 }}>Reconnaît avoir reçu et compris ce rapport</Text>
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
