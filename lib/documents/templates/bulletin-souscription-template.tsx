// lib/documents/templates/bulletin-souscription-template.tsx
// Bulletin de souscription — compatible Vie Plus, Intencial, NCap, etc.

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const DARK   = '#353b32'
const GREY   = '#666666'
const CREAM  = '#f8f4ec'

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: DARK, lineHeight: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid' },
  logo: { width: 130, height: 62, objectFit: 'contain' },
  brandBlock: { flex: 1, marginLeft: 14 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: FOREST },
  brandSub: { fontSize: 9, color: GREY, marginTop: 3 },
  titleBlock: { marginBottom: 20 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: FOREST, marginBottom: 3 },
  subtitle: { fontSize: 10, color: GREY, fontFamily: 'Helvetica-Oblique' },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, marginBottom: 8, marginTop: 16, borderBottomWidth: 1, borderBottomColor: GOLD, borderBottomStyle: 'solid', paddingBottom: 4 },
  infoBox: { backgroundColor: CREAM, borderRadius: 6, padding: '12 16', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 20, marginBottom: 6 },
  fieldLabel: { fontSize: 9, color: GREY, marginBottom: 2 },
  fieldValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST },
  tableHeader: { flexDirection: 'row', backgroundColor: FOREST, padding: '8 12', borderRadius: 4 },
  tableHeaderCell: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: 'white' },
  tableRow: { flexDirection: 'row', padding: '7 12', borderBottomWidth: 1, borderBottomColor: '#e8e4dc', borderBottomStyle: 'solid' },
  tableCell: { fontSize: 9.5, color: DARK },
  benefBox: { backgroundColor: '#f0fdf4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: FOREST, borderLeftStyle: 'solid', padding: '10 14', marginBottom: 8 },
  attestationBox: { backgroundColor: CREAM, borderRadius: 6, padding: '12 16', marginTop: 16, marginBottom: 16 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, marginTop: 20 },
  signField: { flex: 1, borderBottomWidth: 1, borderBottomColor: FOREST, borderBottomStyle: 'solid', paddingBottom: 30 },
  signLabel: { fontSize: 8.5, color: GREY, marginTop: 6 },
  nota: { fontSize: 8.5, color: GREY, marginTop: 10, fontFamily: 'Helvetica-Oblique', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#d1d4cf', borderTopStyle: 'solid', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: GREY },
})

export interface BeneficiaireLine {
  nom: string
  lien: string
  dateNaissance?: string
  quotite: string
}

export type FreqVersementBulletin = 'unique' | 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'

export interface BulletinSouscriptionTemplateProps {
  client: {
    prenom: string | null
    nom: string | null
    email: string | null
    dateNaissance?: string | null
    adresse?: string | null
    telephone?: string | null
  }
  dossierId: string
  generationDate: string
  produit: string
  assureur?: string
  isin?: string
  versementInitialEur: number
  versementsProgrammesEur?: number
  frequenceVersements?: FreqVersementBulletin
  dureeContratAns?: number
  beneficiaires?: BeneficiaireLine[]
  uniteCompte?: string
  fraisEntreePct?: number
  fraisGestionAnnuelPct?: number
  objectifGestion?: string
  conseillerNom?: string
  numeroPolice?: string
}

export function BulletinSouscriptionTemplate({
  client,
  dossierId,
  generationDate,
  produit,
  assureur,
  isin,
  versementInitialEur,
  versementsProgrammesEur,
  frequenceVersements,
  dureeContratAns,
  beneficiaires,
  uniteCompte,
  fraisEntreePct,
  fraisGestionAnnuelPct,
  objectifGestion,
  conseillerNom,
  numeroPolice,
}: BulletinSouscriptionTemplateProps) {
  const freqLabel: Record<FreqVersementBulletin, string> = {
    unique: 'Versement unique',
    mensuel: 'Mensuel',
    trimestriel: 'Trimestriel',
    semestriel: 'Semestriel',
    annuel: 'Annuel',
  }

  return (
    <Document title={`Bulletin de souscription — ${produit}`} author="AMANA Patrimoine">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image style={styles.logo} src={AMANA_LOGO_BASE64} />
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>AMANA PATRIMOINE</Text>
            <Text style={styles.brandSub}>CIF/COA/COBSP · ORIAS n° 25009552 · Membre ANACOFI</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Bulletin de Souscription</Text>
          <Text style={styles.subtitle}>{produit}{assureur ? ` — ${assureur}` : ''} · {generationDate}</Text>
          {numeroPolice && <Text style={{ fontSize: 9, color: GREY, marginTop: 3 }}>N° Police : {numeroPolice}</Text>}
        </View>

        {/* Souscripteur */}
        <Text style={styles.sectionTitle}>Souscripteur / Assuré</Text>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Nom complet</Text>
              <Text style={styles.fieldValue}>{client.prenom} {client.nom}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Date de naissance</Text>
              <Text style={styles.fieldValue}>{client.dateNaissance ?? '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{client.email ?? '—'}</Text>
            </View>
          </View>
          {(client.adresse || client.telephone) && (
            <View style={[styles.row, { marginBottom: 0, marginTop: 4 }]}>
              {client.adresse && (
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>Adresse</Text>
                  <Text style={styles.fieldValue}>{client.adresse}</Text>
                </View>
              )}
              {client.telephone && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Téléphone</Text>
                  <Text style={styles.fieldValue}>{client.telephone}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Produit */}
        <Text style={styles.sectionTitle}>Produit souscrit</Text>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Produit</Text>
              <Text style={styles.fieldValue}>{produit}</Text>
            </View>
            {assureur && (
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Assureur / Gestionnaire</Text>
                <Text style={styles.fieldValue}>{assureur}</Text>
              </View>
            )}
            {isin && (
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Code ISIN</Text>
                <Text style={styles.fieldValue}>{isin}</Text>
              </View>
            )}
          </View>
          {uniteCompte && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.fieldLabel}>Unité de compte / Support</Text>
              <Text style={styles.fieldValue}>{uniteCompte}</Text>
            </View>
          )}
          {objectifGestion && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.fieldLabel}>Objectif de gestion</Text>
              <Text style={{ fontSize: 10, color: DARK }}>{objectifGestion}</Text>
            </View>
          )}
        </View>

        {/* Versements */}
        <Text style={styles.sectionTitle}>Modalités de versement</Text>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Versement initial</Text>
              <Text style={[styles.fieldValue, { fontSize: 14, color: FOREST }]}>
                {versementInitialEur.toLocaleString('fr-FR')} €
              </Text>
            </View>
            {versementsProgrammesEur && versementsProgrammesEur > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Versements programmés</Text>
                <Text style={[styles.fieldValue, { fontSize: 14, color: FOREST }]}>
                  {versementsProgrammesEur.toLocaleString('fr-FR')} €
                </Text>
              </View>
            )}
            {frequenceVersements && frequenceVersements !== 'unique' && (
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Fréquence</Text>
                <Text style={styles.fieldValue}>{freqLabel[frequenceVersements]}</Text>
              </View>
            )}
            {dureeContratAns && (
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Durée envisagée</Text>
                <Text style={styles.fieldValue}>{dureeContratAns} ans</Text>
              </View>
            )}
          </View>
        </View>

        {/* Frais */}
        {(fraisEntreePct !== undefined || fraisGestionAnnuelPct !== undefined) && (
          <View>
            <Text style={styles.sectionTitle}>Frais (art. 24 §4 MIF II)</Text>
            <View style={[styles.tableHeader, { marginBottom: 0 }]}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Nature des frais</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Taux</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Montant (versement initial)</Text>
            </View>
            {fraisEntreePct !== undefined && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Frais d&apos;entrée</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{fraisEntreePct} %</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {(versementInitialEur * fraisEntreePct / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €
                </Text>
              </View>
            )}
            {fraisGestionAnnuelPct !== undefined && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Frais de gestion annuels (estimés)</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{fraisGestionAnnuelPct} %</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {(versementInitialEur * fraisGestionAnnuelPct / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €/an
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bénéficiaires */}
        {beneficiaires && beneficiaires.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Clause bénéficiaire (assurance-vie)</Text>
            {beneficiaires.map((b, i) => (
              <View key={i} style={styles.benefBox}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Bénéficiaire {i + 1}</Text>
                    <Text style={styles.fieldValue}>{b.nom}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Lien</Text>
                    <Text style={styles.fieldValue}>{b.lien}</Text>
                  </View>
                  {b.dateNaissance && (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Date de naissance</Text>
                      <Text style={styles.fieldValue}>{b.dateNaissance}</Text>
                    </View>
                  )}
                  <View style={{ flex: 0.7 }}>
                    <Text style={styles.fieldLabel}>Quote-part</Text>
                    <Text style={[styles.fieldValue, { color: GOLD }]}>{b.quotite}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Attestation */}
        <View style={styles.attestationBox}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST, marginBottom: 6 }}>
            Attestation du souscripteur
          </Text>
          <Text style={{ fontSize: 9.5, color: DARK, lineHeight: 1.7 }}>
            Je reconnais avoir reçu et pris connaissance du Document d&apos;Information Clé (DIC), de la notice d&apos;information du contrat, du Document d&apos;Entrée en Relation (DER) et du Rapport d&apos;Adéquation (RA) établis par AMANA Patrimoine. Je certifie que les informations fournies sont exactes et complètes, et consens à la souscription décrite ci-dessus.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signRow}>
          <View style={styles.signField}>
            <Text style={styles.signLabel}>Signature du souscripteur</Text>
          </View>
          <View style={styles.signField}>
            <Text style={styles.signLabel}>Conseiller AMANA : {conseillerNom ?? '_______________'} — Date et cachet</Text>
          </View>
        </View>

        <Text style={styles.nota}>
          Document établi par AMANA Patrimoine, CIF/COA/COBSP, ORIAS n° 25009552. Dossier : {dossierId} · {generationDate}. Ce bulletin ne constitue pas un engagement définitif de l&apos;assureur ; la prise d&apos;effet du contrat est subordonnée à l&apos;acceptation par l&apos;assureur.
        </Text>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AMANA Patrimoine — Bulletin de souscription — {produit}</Text>
          <Text style={styles.footerText}>Dossier {dossierId} · {generationDate}</Text>
        </View>
      </Page>
    </Document>
  )
}
