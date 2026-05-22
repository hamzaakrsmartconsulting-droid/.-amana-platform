// lib/documents/templates/lcbft-template.tsx
// Fiche de classification LCB-FT — 4 axes de risque
// Conforme Directive (UE) 2015/849 transposée en droit français (art. L.561-10 CMF)

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'
import { Image } from '@react-pdf/renderer'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const DARK   = '#2a3829'
const GREY   = '#666666'
const CREAM  = '#f8f4ec'
const RED    = '#dc2626'
const ORANGE = '#d97706'
const GREEN  = '#16a34a'

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: DARK, lineHeight: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid' },
  logo: { width: 130, height: 62, objectFit: 'contain' },
  brandBlock: { flex: 1, marginLeft: 14 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: FOREST },
  brandSub: { fontSize: 9, color: GREY, marginTop: 3 },
  titleBlock: { marginBottom: 20 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: FOREST, marginBottom: 3 },
  subtitle: { fontSize: 10, color: GREY, fontFamily: 'Helvetica-Oblique' },
  clientBox: { backgroundColor: CREAM, borderRadius: 6, padding: '12 16', marginBottom: 18 },
  row: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  fieldLabel: { fontSize: 9, color: GREY, marginBottom: 2 },
  fieldValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, marginBottom: 8, marginTop: 14 },
  axeBox: { backgroundColor: '#f9f9f7', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', padding: '10 14', marginBottom: 10 },
  axeTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: DARK, marginBottom: 6 },
  axeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  axeItem: { fontSize: 9.5, color: GREY, flex: 1 },
  axeScore: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: DARK, minWidth: 30, textAlign: 'right' },
  scoreBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: FOREST, borderRadius: 8, padding: '14 20', marginTop: 16, marginBottom: 16 },
  scoreTotalLabel: { fontSize: 12, color: 'white' },
  scoreTotalValue: { fontFamily: 'Helvetica-Bold', fontSize: 24, color: GOLD },
  niveauBox: { alignItems: 'center', padding: '8 16', borderRadius: 6, marginLeft: 12 },
  niveauText: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: 'white' },
  nota: { fontSize: 8.5, color: GREY, marginTop: 16, fontFamily: 'Helvetica-Oblique', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#d1d4cf', borderTopStyle: 'solid', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: GREY },
})

export interface LcbftAxe {
  label: string
  items: Array<{ libelle: string; valeur: boolean | string; points: number }>
  score: number
}

export interface LcbftTemplateProps {
  client: { prenom: string | null; nom: string | null; email: string | null; dateNaissance?: string | null; nationalite?: string | null }
  dossierId: string
  generationDate: string
  axeGeographique: LcbftAxe
  axeClient: LcbftAxe
  axeOperation: LcbftAxe
  axeCanal: LcbftAxe
  scoreTotal: number
  niveauRisque: 'faible' | 'modere' | 'eleve'
  noteLcbft?: string
  conseillerId?: string
}

function niveauColor(n: 'faible' | 'modere' | 'eleve') {
  if (n === 'faible') return GREEN
  if (n === 'modere') return ORANGE
  return RED
}
function niveauLabel(n: 'faible' | 'modere' | 'eleve') {
  if (n === 'faible') return 'RISQUE FAIBLE'
  if (n === 'modere') return 'RISQUE MODÉRÉ'
  return 'RISQUE ÉLEVÉ'
}

function AxeSection({ axe }: { axe: LcbftAxe }) {
  return (
    <View style={styles.axeBox}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={styles.axeTitle}>{axe.label}</Text>
        <Text style={[styles.axeTitle, { color: GOLD }]}>Score : {axe.score}</Text>
      </View>
      {axe.items.map((item, i) => (
        <View key={i} style={styles.axeRow}>
          <Text style={styles.axeItem}>
            {item.valeur === true ? '✓' : item.valeur === false ? '—' : item.valeur}  {item.libelle}
          </Text>
          <Text style={styles.axeScore}>{item.points > 0 ? `+${item.points}` : item.points}</Text>
        </View>
      ))}
    </View>
  )
}

export function LcbftTemplate({
  client,
  dossierId,
  generationDate,
  axeGeographique,
  axeClient,
  axeOperation,
  axeCanal,
  scoreTotal,
  niveauRisque,
  noteLcbft,
}: LcbftTemplateProps) {
  return (
    <Document title="Fiche LCB-FT" author="AMANA Patrimoine">
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
          <Text style={styles.title}>Fiche de Classification LCB-FT</Text>
          <Text style={styles.subtitle}>
            Lutte Contre le Blanchiment de Capitaux et le Financement du Terrorisme
            · Art. L.561-10 CMF · Date : {generationDate}
          </Text>
        </View>

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
          <View style={[styles.row, { marginBottom: 0, marginTop: 6 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>N° Dossier</Text>
              <Text style={[styles.fieldValue, { fontSize: 8.5 }]}>{dossierId}</Text>
            </View>
            {client.dateNaissance && (
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Date de naissance</Text>
                <Text style={styles.fieldValue}>{client.dateNaissance}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Axes */}
        <Text style={styles.sectionTitle}>Évaluation par axe de risque</Text>
        <AxeSection axe={axeGeographique} />
        <AxeSection axe={axeClient} />
        <AxeSection axe={axeOperation} />
        <AxeSection axe={axeCanal} />

        {/* Score total */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreTotalLabel}>Score LCB-FT total</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={styles.scoreTotalValue}>{scoreTotal} pts</Text>
            <View style={[styles.niveauBox, { backgroundColor: niveauColor(niveauRisque) }]}>
              <Text style={styles.niveauText}>{niveauLabel(niveauRisque)}</Text>
            </View>
          </View>
        </View>

        {/* Note */}
        {noteLcbft && (
          <View>
            <Text style={styles.sectionTitle}>Note du conseiller</Text>
            <Text style={{ fontSize: 10, color: DARK, lineHeight: 1.6 }}>{noteLcbft}</Text>
          </View>
        )}

        {/* Grille de lecture */}
        <Text style={styles.sectionTitle}>Grille d&apos;interprétation</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { range: '0 – 3 pts', niveau: 'Faible', color: GREEN, desc: 'Vigilance standard' },
            { range: '4 – 7 pts', niveau: 'Modéré', color: ORANGE, desc: 'Vigilance renforcée' },
            { range: '8 pts +',  niveau: 'Élevé',  color: RED,    desc: 'Vigilance maximale + déclaration TRACFIN envisageable' },
          ].map(({ range, niveau, color, desc }) => (
            <View key={niveau} style={{ flex: 1, backgroundColor: CREAM, borderRadius: 6, padding: '8 10', borderTopWidth: 2, borderTopColor: color, borderTopStyle: 'solid' }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color }}>{niveau} ({range})</Text>
              <Text style={{ fontSize: 8.5, color: GREY, marginTop: 3 }}>{desc}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.nota}>
          Cette fiche est établie sur la base des informations déclarées par le client et des vérifications effectuées lors du KYC. Elle doit être conservée pendant 5 ans (art. L.561-12 CMF). AMANA Patrimoine est assujetti aux obligations LCB-FT en tant que CIF/COA/COBSP (ORIAS n° 25009552).
        </Text>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AMANA Patrimoine — CONFIDENTIEL — LCB-FT</Text>
          <Text style={styles.footerText}>Dossier {dossierId} · {generationDate}</Text>
        </View>
      </Page>
    </Document>
  )
}
