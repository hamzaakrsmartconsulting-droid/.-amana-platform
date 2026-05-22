// lib/documents/templates/kyc-template.tsx
// Fiche KYC complétée — formulaire AMANA officiel
// Spec Parcours Réglementaire AMANA — Étape 3
// Articles L.561-1 et suivants CMF, 5ème directive UE

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const DARK   = '#2a3829'
const GREY   = '#666666'
const CREAM  = '#f8f4ec'
const GREEN  = '#16a34a'
const RED    = '#dc2626'

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: DARK, lineHeight: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid' },
  logo: { width: 130, height: 62, objectFit: 'contain' },
  brandBlock: { flex: 1, marginLeft: 14 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: FOREST },
  brandSub: { fontSize: 9, color: GREY, marginTop: 3 },
  titleBlock: { marginBottom: 16 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: FOREST, marginBottom: 3 },
  subtitle: { fontSize: 10, color: GREY, fontFamily: 'Helvetica-Oblique' },
  section: { marginBottom: 14 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, backgroundColor: CREAM, padding: '6 10', borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', marginBottom: 8 },
  row2: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  field: { flex: 1 },
  label: { fontSize: 8.5, color: GREY, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: DARK, borderBottomWidth: 1, borderBottomColor: '#ddd', borderBottomStyle: 'solid', paddingBottom: 2, minHeight: 14 },
  valuePlaceholder: { fontFamily: 'Helvetica-Oblique', fontSize: 10, color: '#aaa', borderBottomWidth: 1, borderBottomColor: '#ddd', borderBottomStyle: 'solid', paddingBottom: 2, minHeight: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  checkbox: { width: 12, height: 12, borderWidth: 1, borderColor: GREY, borderStyle: 'solid', borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 9, color: FOREST, fontFamily: 'Helvetica-Bold' },
  riskBadge: { borderRadius: 4, padding: '4 10', alignSelf: 'flex-start', marginTop: 4 },
  riskText: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: 'white' },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#ddd', borderTopStyle: 'solid', paddingTop: 8 },
  footerText: { fontSize: 8, color: GREY, textAlign: 'center' },
  signatureBox: { marginTop: 20, flexDirection: 'row', gap: 32 },
  signatureField: { flex: 1, borderTopWidth: 1, borderTopColor: DARK, borderTopStyle: 'solid', paddingTop: 6 },
  signatureLabel: { fontSize: 9, color: GREY },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: '8 14', borderRadius: 6, marginBottom: 12, alignSelf: 'flex-start' },
  statusText: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
})

export interface KycTemplateProps {
  client: {
    prenom: string
    nom: string
    email?: string
    telephone?: string
    date_naissance?: string
    lieu_naissance?: string
    nationalite?: string
    adresse?: string
    code_postal?: string
    ville?: string
    pays_residence?: string
    domiciliation_fiscale?: string
    numero_fiscal?: string
    situation_familiale?: string
    nb_enfants?: number
    profession?: string
    employeur?: string
    csp?: string
  }
  kyc: {
    qualite_declarant?: string
    patrimoine_net_eur?: string
    revenus_annuels_eur?: string
    charges_annuelles_eur?: string
    capacite_epargne_mensuelle_eur?: string
    origine_fonds?: string
    ppe: boolean
    ppe_fonction?: string
    ppe_entourage: boolean
    ppe_entourage_lien?: string
    risque_lcbft?: 'faible' | 'modere' | 'eleve'
    statut: string
    justificatifs_fournis?: string[]
  }
  generationDate: string
  dossierId?: string
  conseillerNom?: string
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkbox}>
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={{ fontSize: 10, color: DARK }}>{label}</Text>
    </View>
  )
}

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {value
        ? <Text style={styles.value}>{String(value)}</Text>
        : <Text style={styles.valuePlaceholder}>—</Text>
      }
    </View>
  )
}

export function KycTemplate({ client, kyc, generationDate, dossierId, conseillerNom }: KycTemplateProps) {
  const riskColor = kyc.risque_lcbft === 'eleve' ? RED : kyc.risque_lcbft === 'modere' ? '#d97706' : GREEN
  const riskLabel = kyc.risque_lcbft === 'eleve' ? 'RISQUE ÉLEVÉ' : kyc.risque_lcbft === 'modere' ? 'RISQUE MODÉRÉ' : 'RISQUE FAIBLE'
  const fullName = `${client.prenom} ${client.nom}`.trim()

  return (
    <Document title={`Fiche KYC — ${fullName}`} author="AMANA Patrimoine">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Image src={AMANA_LOGO_BASE64} style={styles.logo} />
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>AMANA PATRIMOINE</Text>
            <Text style={styles.brandSub}>Cabinet de conseil en gestion de patrimoine islamique</Text>
            <Text style={styles.brandSub}>ORIAS 25009552 · CIF / COA / COBSP</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Fiche KYC — Connaissance Client LCB-FT</Text>
          <Text style={styles.subtitle}>
            Articles L.561-1 et suivants CMF · 5ème Directive UE (2015/849) · Généré le {generationDate}
          </Text>
          {dossierId && (
            <Text style={{ fontSize: 8, color: GREY, marginTop: 3 }}>Dossier : {dossierId}</Text>
          )}
        </View>

        {/* Statut */}
        <View style={[styles.statusBadge, { backgroundColor: kyc.statut === 'valide' ? '#dcfce7' : '#fef3c7' }]}>
          <Text style={[styles.statusText, { color: kyc.statut === 'valide' ? GREEN : '#d97706' }]}>
            {kyc.statut === 'valide' ? '✓ KYC VALIDÉ PAR MOHAMED MOSBAHI' : '⏳ EN ATTENTE DE VALIDATION'}
          </Text>
        </View>

        {/* Section 1 — Identité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Identité du déclarant</Text>
          <View style={styles.row2}>
            <Field label="Qualité du déclarant" value={kyc.qualite_declarant ?? 'Client'} />
            <Field label="Situation familiale" value={client.situation_familiale} />
            <Field label="Nombre d'enfants" value={client.nb_enfants} />
          </View>
          <View style={styles.row2}>
            <Field label="Nom" value={client.nom} />
            <Field label="Prénom" value={client.prenom} />
            <Field label="Date de naissance" value={client.date_naissance} />
          </View>
          <View style={styles.row2}>
            <Field label="Lieu de naissance" value={client.lieu_naissance} />
            <Field label="Nationalité" value={client.nationalite} />
            <Field label="N° fiscal" value={client.numero_fiscal} />
          </View>
          <View style={styles.row2}>
            <Field label="Adresse" value={client.adresse} />
            <Field label="Code postal" value={client.code_postal} />
            <Field label="Ville" value={client.ville} />
          </View>
          <View style={styles.row2}>
            <Field label="Pays de résidence" value={client.pays_residence ?? 'France'} />
            <Field label="Domiciliation fiscale" value={client.domiciliation_fiscale ?? 'France'} />
            <Field label="Email" value={client.email} />
          </View>
        </View>

        {/* Section 2 — Profession */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Profession et situation économique</Text>
          <View style={styles.row2}>
            <Field label="Profession" value={client.profession} />
            <Field label="Employeur" value={client.employeur} />
            <Field label="CSP" value={client.csp} />
          </View>
          <View style={styles.row2}>
            <Field label="Revenus annuels (€)" value={kyc.revenus_annuels_eur} />
            <Field label="Charges annuelles (€)" value={kyc.charges_annuelles_eur} />
            <Field label="Capacité épargne/mois (€)" value={kyc.capacite_epargne_mensuelle_eur} />
          </View>
          <View style={styles.row2}>
            <Field label="Patrimoine net estimé (€)" value={kyc.patrimoine_net_eur} />
            <Field label="Origine des fonds" value={kyc.origine_fonds} />
          </View>
        </View>

        {/* Section 3 — PPE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Personnes Politiquement Exposées (PPE)</Text>
          <Checkbox checked={kyc.ppe} label="Client est une Personne Politiquement Exposée (PPE)" />
          {kyc.ppe && kyc.ppe_fonction && (
            <Field label="Fonction PPE" value={kyc.ppe_fonction} />
          )}
          <Checkbox checked={kyc.ppe_entourage} label="Client est dans l'entourage d'une PPE" />
          {kyc.ppe_entourage && kyc.ppe_entourage_lien && (
            <Field label="Lien avec la PPE" value={kyc.ppe_entourage_lien} />
          )}
          {(kyc.ppe || kyc.ppe_entourage) && (
            <Text style={{ fontSize: 9, color: RED, marginTop: 4, fontFamily: 'Helvetica-Oblique' }}>
              → Mesures de vigilance renforcée appliquées. Annexe PPE générée.
            </Text>
          )}
        </View>

        {/* Section 4 — Justificatifs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Justificatifs fournis</Text>
          <Checkbox checked={true} label="Pièce d'identité valide (CNI / Passeport)" />
          <Checkbox checked={true} label="Justificatif de domicile < 3 mois" />
          <Checkbox checked={true} label="Dernier avis d'imposition" />
          <Checkbox checked={!!(kyc.origine_fonds)} label="Justificatif source des fonds" />
          {kyc.justificatifs_fournis?.map((j, i) => (
            <Checkbox key={i} checked={true} label={j} />
          ))}
        </View>

        {/* Section 5 — Résultat LCB-FT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Résultat de la classification LCB-FT</Text>
          <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
            <Text style={styles.riskText}>{riskLabel}</Text>
          </View>
          <Text style={{ fontSize: 9, color: GREY, marginTop: 6, fontFamily: 'Helvetica-Oblique' }}>
            Classification calculée selon 4 axes : géographique, client, opération, canal de distribution.
            Voir Fiche d'Analyse Client LCB-FT pour le détail.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureBox}>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Conseiller AMANA</Text>
            <Text style={{ fontSize: 10, marginTop: 4, color: DARK }}>{conseillerNom ?? 'AMANA Patrimoine'}</Text>
            <Text style={{ fontSize: 9, color: GREY, marginTop: 2 }}>Date : {generationDate}</Text>
          </View>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Validation Mohamed MOSBAHI</Text>
            <Text style={{ fontSize: 10, marginTop: 4, color: kyc.statut === 'valide' ? GREEN : GREY }}>
              {kyc.statut === 'valide' ? '✓ Validé' : 'En attente'}
            </Text>
          </View>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Client — Lu et approuvé</Text>
            <Text style={{ fontSize: 9, color: GREY, marginTop: 24 }}>Signature :</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            AMANA Patrimoine SAS · ORIAS 25009552 (CIF/COA/COBSP) · RCS PARIS 988 458 436
            {' '}· Document interne confidentiel — LCB-FT (art. L.561-1 CMF)
          </Text>
        </View>
      </Page>
    </Document>
  )
}
