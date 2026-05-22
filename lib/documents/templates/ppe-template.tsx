// lib/documents/templates/ppe-template.tsx
// Annexe PPE — Personne Politiquement Exposée
// Conformité Art. L.561-10-2 CMF + GAFI recommandation 12

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const DARK   = '#2a3829'
const GREY   = '#666666'
const CREAM  = '#f8f4ec'
const ORANGE = '#d97706'

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: DARK, lineHeight: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid' },
  logo: { width: 130, height: 62, objectFit: 'contain' },
  brandBlock: { flex: 1, marginLeft: 14 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: FOREST },
  brandSub: { fontSize: 9, color: GREY, marginTop: 3 },
  alertBox: { backgroundColor: '#fef3c7', borderRadius: 6, borderLeftWidth: 4, borderLeftColor: ORANGE, borderLeftStyle: 'solid', padding: '12 16', marginBottom: 18, flexDirection: 'row', gap: 10 },
  alertIcon: { fontSize: 16, color: ORANGE },
  alertText: { flex: 1, fontSize: 10, color: DARK },
  clientBox: { backgroundColor: CREAM, borderRadius: 6, padding: '12 16', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  fieldLabel: { fontSize: 9, color: GREY, marginBottom: 2 },
  fieldValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, marginBottom: 8, marginTop: 14 },
  infoBox: { backgroundColor: '#f9f9f7', borderRadius: 6, padding: '10 14', marginBottom: 10 },
  label: { fontSize: 9, color: GREY, marginBottom: 2 },
  value: { fontSize: 10, color: DARK },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  checkBox: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5, borderColor: FOREST, borderStyle: 'solid', marginTop: 1 },
  checkBoxChecked: { backgroundColor: FOREST },
  checkLabel: { flex: 1, fontSize: 10, color: DARK },
  signBlock: { marginTop: 24, borderTopWidth: 1, borderTopColor: '#d1d4cf', borderTopStyle: 'solid', paddingTop: 16 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  signField: { flex: 1, borderBottomWidth: 1, borderBottomColor: FOREST, borderBottomStyle: 'solid', paddingBottom: 24 },
  signLabel: { fontSize: 8.5, color: GREY, marginTop: 6 },
  nota: { fontSize: 8.5, color: GREY, marginTop: 14, fontFamily: 'Helvetica-Oblique', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#d1d4cf', borderTopStyle: 'solid', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: GREY },
})

export interface PpeTemplateProps {
  client: { prenom: string | null; nom: string | null; email: string | null; dateNaissance?: string | null; nationalite?: string | null }
  dossierId: string
  generationDate: string
  typePpe: 'ppe_directe' | 'entourage_ppe'
  fonctionPpe?: string
  lienAvecPpe?: string
  nomPpeAssocie?: string
  fonctionPpeAssocie?: string
  origineFonds?: string
  montantPatrimoineEstime?: string
  mesuresVigilanceRenforcee?: string[]
  conseillerNom?: string
}

export function PpeTemplate({
  client,
  dossierId,
  generationDate,
  typePpe,
  fonctionPpe,
  lienAvecPpe,
  nomPpeAssocie,
  fonctionPpeAssocie,
  origineFonds,
  montantPatrimoineEstime,
  mesuresVigilanceRenforcee,
  conseillerNom,
}: PpeTemplateProps) {
  const defaultMesures = [
    'Vérification de l\'origine des fonds (justificatifs)',
    'Approbation hiérarchique interne avant entrée en relation',
    'Surveillance renforcée des opérations tout au long de la relation',
    'Renouvellement annuel de la due diligence renforcée',
  ]
  const mesures = mesuresVigilanceRenforcee ?? defaultMesures

  return (
    <Document title="Annexe PPE" author="AMANA Patrimoine">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image style={styles.logo} src={AMANA_LOGO_BASE64} />
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>AMANA PATRIMOINE</Text>
            <Text style={styles.brandSub}>CIF/COA/COBSP · ORIAS n° 25009552</Text>
          </View>
        </View>

        {/* Alert PPE */}
        <View style={styles.alertBox}>
          <Text style={{ fontSize: 14 }}>⚠</Text>
          <Text style={styles.alertText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Dossier PPE — Vigilance Renforcée Obligatoire</Text>
            {'\n'}Ce client est classifié Personne Politiquement Exposée (PPE) selon l&apos;art. L.561-10-2 CMF. Des mesures de vigilance renforcée s&apos;appliquent.
          </Text>
        </View>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 16, color: FOREST, marginBottom: 4 }}>Annexe PPE</Text>
        <Text style={{ fontSize: 10, color: GREY, fontFamily: 'Helvetica-Oblique', marginBottom: 16 }}>
          Art. L.561-10-2 CMF · GAFI recommandation 12 · Date : {generationDate}
        </Text>

        {/* Client */}
        <View style={styles.clientBox}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Client</Text>
              <Text style={styles.fieldValue}>{client.prenom} {client.nom}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{client.email ?? '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Nationalité</Text>
              <Text style={styles.fieldValue}>{client.nationalite ?? 'Française'}</Text>
            </View>
          </View>
        </View>

        {/* Type PPE */}
        <Text style={styles.sectionTitle}>Classification PPE</Text>
        <View style={styles.infoBox}>
          <Text style={styles.label}>Type</Text>
          <Text style={[styles.value, { fontFamily: 'Helvetica-Bold', color: ORANGE }]}>
            {typePpe === 'ppe_directe' ? 'PPE Directe — le client lui-même est une PPE' : 'Entourage PPE — proche ou associate d\'une PPE'}
          </Text>
          {typePpe === 'ppe_directe' && fonctionPpe && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Fonction/Mandat exercé</Text>
              <Text style={styles.value}>{fonctionPpe}</Text>
            </View>
          )}
          {typePpe === 'entourage_ppe' && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Lien avec la PPE</Text>
                  <Text style={styles.value}>{lienAvecPpe ?? '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nom PPE associée</Text>
                  <Text style={styles.value}>{nomPpeAssocie ?? '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fonction PPE associée</Text>
                  <Text style={styles.value}>{fonctionPpeAssocie ?? '—'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Origine fonds */}
        <Text style={styles.sectionTitle}>Origine des fonds et du patrimoine</Text>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Origine des fonds déclarée</Text>
              <Text style={styles.value}>{origineFonds ?? 'Non renseigné — à compléter'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Patrimoine estimé</Text>
              <Text style={styles.value}>{montantPatrimoineEstime ? `${montantPatrimoineEstime} €` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Mesures */}
        <Text style={styles.sectionTitle}>Mesures de vigilance renforcée appliquées</Text>
        {mesures.map((m, i) => (
          <View key={i} style={styles.checkRow}>
            <View style={[styles.checkBox, styles.checkBoxChecked]} />
            <Text style={styles.checkLabel}>{m}</Text>
          </View>
        ))}

        {/* Signature */}
        <View style={styles.signBlock}>
          <Text style={{ fontSize: 10, color: GREY, marginBottom: 14 }}>
            Je soussigné(e), conseiller AMANA Patrimoine, certifie avoir effectué les vérifications de vigilance renforcée conformément aux obligations LCB-FT applicables aux PPE.
          </Text>
          <View style={styles.signRow}>
            <View style={styles.signField}>
              <Text style={styles.signLabel}>Conseiller responsable : {conseillerNom ?? '_______________'}</Text>
            </View>
            <View style={styles.signField}>
              <Text style={styles.signLabel}>Date et signature</Text>
            </View>
          </View>
        </View>

        <Text style={styles.nota}>
          Document CONFIDENTIEL — LCB-FT · Dossier {dossierId} · Conservation 5 ans (art. L.561-12 CMF). AMANA Patrimoine, CIF/COA/COBSP, ORIAS n° 25009552.
        </Text>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AMANA Patrimoine — CONFIDENTIEL — Annexe PPE</Text>
          <Text style={styles.footerText}>Dossier {dossierId} · {generationDate}</Text>
        </View>
      </Page>
    </Document>
  )
}
