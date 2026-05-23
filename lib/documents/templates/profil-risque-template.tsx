// lib/documents/templates/profil-risque-template.tsx
// Document Profil de Risque Investisseur — questionnaire Q4.1→Q4.5 + score retenu
// Spec Parcours Réglementaire AMANA — Étape 4
// Articles 25 MIF II + L.541-8-1 CMF

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const DARK   = '#353b32'
const GREY   = '#666666'
const CREAM  = '#f8f4ec'

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: DARK, lineHeight: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: FOREST, borderBottomStyle: 'solid' },
  logo: { width: 130, height: 62, objectFit: 'contain' },
  brandBlock: { flex: 1, marginLeft: 14 },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: FOREST },
  brandSub: { fontSize: 9, color: GREY, marginTop: 3 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: FOREST, marginBottom: 3 },
  subtitle: { fontSize: 10, color: GREY, fontFamily: 'Helvetica-Oblique', marginBottom: 14 },
  clientBox: { backgroundColor: CREAM, borderRadius: 6, padding: '10 14', marginBottom: 16, flexDirection: 'row', gap: 24 },
  clientField: { flex: 1 },
  clientLabel: { fontSize: 8.5, color: GREY, marginBottom: 2 },
  clientValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: DARK },
  section: { marginBottom: 14 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: FOREST, backgroundColor: CREAM, padding: '6 10', borderLeftWidth: 3, borderLeftColor: GOLD, borderLeftStyle: 'solid', marginBottom: 8 },
  qRow: { flexDirection: 'row', marginBottom: 6, gap: 10 },
  qNum: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: GOLD, minWidth: 24 },
  qText: { flex: 1 },
  qQuestion: { fontSize: 10, color: DARK, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  qAnswer: { fontSize: 10, color: FOREST, borderLeftWidth: 2, borderLeftColor: GOLD, borderLeftStyle: 'solid', paddingLeft: 8 },
  qPoints: { fontSize: 9, color: GREY, minWidth: 50, textAlign: 'right', alignSelf: 'flex-start', marginTop: 2 },
  scoreBox: { backgroundColor: FOREST, borderRadius: 8, padding: '16 20', marginTop: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  scoreLeft: { flex: 1 },
  scoreLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  scoreProfil: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: 'white' },
  scoreRight: { alignItems: 'flex-end' },
  scoreTotal: { fontFamily: 'Helvetica-Bold', fontSize: 28, color: GOLD },
  scoreSub: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  esgBox: { borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'solid', borderRadius: 6, padding: '10 14', marginBottom: 14 },
  esgTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: FOREST, marginBottom: 6 },
  esgRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  disclaimer: { backgroundColor: '#fff7ed', borderRadius: 6, padding: '10 14', marginBottom: 14 },
  disclaimerText: { fontSize: 9, color: '#92400e', lineHeight: 1.5 },
  signatureBox: { marginTop: 16, flexDirection: 'row', gap: 32 },
  signatureField: { flex: 1, borderTopWidth: 1, borderTopColor: DARK, borderTopStyle: 'solid', paddingTop: 6 },
  signatureLabel: { fontSize: 9, color: GREY },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#ddd', borderTopStyle: 'solid', paddingTop: 8 },
  footerText: { fontSize: 8, color: GREY, textAlign: 'center' },
})

export type ProfilRetenu = 'prudent' | 'equilibre' | 'dynamique' | 'offensif'

export interface ProfilRisqueTemplateProps {
  client: {
    prenom: string
    nom: string
    email?: string
  }
  questionnaire: {
    // Q4.1
    connaissance_experience: 'aucune' | 'moderee' | 'bonne' | 'elevee'
    produits_detenus?: string[]
    points_q41?: number
    // Q4.2
    reaction_baisse_20pct: 'vendre' | 'inquiet' | 'conserver' | 'racheter'
    points_q42?: number
    // Q4.3
    montant_envisage_eur?: string
    pct_patrimoine?: string
    perte_max_acceptable_pct?: string
    points_q43?: number
    // Q4.4
    horizon_placement_ans?: number
    retrait_planifie?: boolean
    epargne_precaution_eur?: string
    points_q44?: number
    // Q4.5 ESG
    esg_preference?: string
    esg_pct_min?: number
    esg_indicateurs?: string[]
    points_q45?: number
  }
  profil_retenu: ProfilRetenu
  score_total: number
  score_max?: number
  commentaire_conseiller?: string
  generationDate: string
  dossierId?: string
  conseillerNom?: string
}

const PROFIL_LABEL: Record<ProfilRetenu, string> = {
  prudent:   'PROFIL PRUDENT',
  equilibre: 'PROFIL ÉQUILIBRÉ',
  dynamique: 'PROFIL DYNAMIQUE',
  offensif:  'PROFIL OFFENSIF',
}

const PROFIL_DESC: Record<ProfilRetenu, string> = {
  prudent:   'Priorité à la préservation du capital. Acceptation de rendements modestes. Produits à capital garanti ou très faible volatilité.',
  equilibre: 'Équilibre entre sécurité et performance. Acceptation d\'une volatilité modérée. Mix diversifié entre actifs prudents et de croissance.',
  dynamique: 'Recherche de performance à long terme. Acceptation d\'une volatilité significative. Exposition notable aux actifs de croissance.',
  offensif:  'Recherche de performance maximale. Acceptation d\'une forte volatilité et de pertes potentielles importantes. Horizon long terme.',
}

const REACTION_LABEL: Record<string, string> = {
  vendre:    'Vendre immédiatement pour limiter les pertes',
  inquiet:   'S\'inquiéter mais attendre avant de décider',
  conserver: 'Conserver sans paniquer',
  racheter:  'Profiter de la baisse pour investir davantage',
}

const CONNAISSANCE_LABEL: Record<string, string> = {
  aucune:   'Aucune (débutant)',
  moderee:  'Modérée',
  bonne:    'Bonne',
  elevee:   'Élevée (professionnel)',
}

export function ProfilRisqueTemplate({
  client, questionnaire, profil_retenu, score_total, score_max = 20,
  commentaire_conseiller, generationDate, dossierId, conseillerNom,
}: ProfilRisqueTemplateProps) {
  const fullName = `${client.prenom} ${client.nom}`.trim()
  const pct = Math.round((score_total / score_max) * 100)

  return (
    <Document title={`Profil de Risque — ${fullName}`} author="AMANA Patrimoine">
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

        <Text style={styles.title}>Profil de Risque Investisseur</Text>
        <Text style={styles.subtitle}>
          Article 25 MIF II · L.541-8-1 CMF · Généré le {generationDate}
          {dossierId ? `  ·  Dossier ${dossierId}` : ''}
        </Text>

        {/* Client */}
        <View style={styles.clientBox}>
          <View style={styles.clientField}>
            <Text style={styles.clientLabel}>Client</Text>
            <Text style={styles.clientValue}>{fullName}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientLabel}>Email</Text>
            <Text style={styles.clientValue}>{client.email ?? '—'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientLabel}>Conseiller</Text>
            <Text style={styles.clientValue}>{conseillerNom ?? 'AMANA Patrimoine'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientLabel}>Date</Text>
            <Text style={styles.clientValue}>{generationDate}</Text>
          </View>
        </View>

        {/* Q4.1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questionnaire MIF II — 5 dimensions</Text>

          <View style={styles.qRow}>
            <Text style={styles.qNum}>Q4.1</Text>
            <View style={styles.qText}>
              <Text style={styles.qQuestion}>Connaissance et expérience en placements financiers</Text>
              <Text style={styles.qAnswer}>{CONNAISSANCE_LABEL[questionnaire.connaissance_experience] ?? questionnaire.connaissance_experience}</Text>
              {questionnaire.produits_detenus && questionnaire.produits_detenus.length > 0 && (
                <Text style={{ fontSize: 9, color: GREY, marginTop: 2 }}>Produits détenus : {questionnaire.produits_detenus.join(', ')}</Text>
              )}
            </View>
            {questionnaire.points_q41 != null && (
              <Text style={styles.qPoints}>{questionnaire.points_q41} pts</Text>
            )}
          </View>

          {/* Q4.2 */}
          <View style={styles.qRow}>
            <Text style={styles.qNum}>Q4.2</Text>
            <View style={styles.qText}>
              <Text style={styles.qQuestion}>Tolérance au risque — Réaction à une baisse de 20 % du portefeuille</Text>
              <Text style={styles.qAnswer}>{REACTION_LABEL[questionnaire.reaction_baisse_20pct] ?? questionnaire.reaction_baisse_20pct}</Text>
            </View>
            {questionnaire.points_q42 != null && (
              <Text style={styles.qPoints}>{questionnaire.points_q42} pts</Text>
            )}
          </View>

          {/* Q4.3 */}
          <View style={styles.qRow}>
            <Text style={styles.qNum}>Q4.3</Text>
            <View style={styles.qText}>
              <Text style={styles.qQuestion}>Capacité financière à supporter des pertes</Text>
              {questionnaire.montant_envisage_eur && (
                <Text style={styles.qAnswer}>Montant envisagé : {questionnaire.montant_envisage_eur} €</Text>
              )}
              {questionnaire.pct_patrimoine && (
                <Text style={styles.qAnswer}>% du patrimoine : {questionnaire.pct_patrimoine} %</Text>
              )}
              {questionnaire.perte_max_acceptable_pct && (
                <Text style={styles.qAnswer}>Perte max acceptable : {questionnaire.perte_max_acceptable_pct} %</Text>
              )}
            </View>
            {questionnaire.points_q43 != null && (
              <Text style={styles.qPoints}>{questionnaire.points_q43} pts</Text>
            )}
          </View>

          {/* Q4.4 */}
          <View style={styles.qRow}>
            <Text style={styles.qNum}>Q4.4</Text>
            <View style={styles.qText}>
              <Text style={styles.qQuestion}>Horizon de placement et besoins de liquidité</Text>
              {questionnaire.horizon_placement_ans && (
                <Text style={styles.qAnswer}>Horizon : {questionnaire.horizon_placement_ans} an(s)</Text>
              )}
              <Text style={styles.qAnswer}>Retrait planifié : {questionnaire.retrait_planifie ? 'Oui' : 'Non'}</Text>
              {questionnaire.epargne_precaution_eur && (
                <Text style={styles.qAnswer}>Épargne de précaution : {questionnaire.epargne_precaution_eur} €</Text>
              )}
            </View>
            {questionnaire.points_q44 != null && (
              <Text style={styles.qPoints}>{questionnaire.points_q44} pts</Text>
            )}
          </View>

          {/* Q4.5 ESG */}
          <View style={styles.qRow}>
            <Text style={styles.qNum}>Q4.5</Text>
            <View style={styles.qText}>
              <Text style={styles.qQuestion}>Préférences durabilité (ESG / SFDR)</Text>
              <Text style={styles.qAnswer}>{questionnaire.esg_preference ?? 'Sans préférence spécifique'}</Text>
              {questionnaire.esg_pct_min != null && questionnaire.esg_pct_min > 0 && (
                <Text style={{ fontSize: 9, color: GREY, marginTop: 2 }}>% minimum durabilité : {questionnaire.esg_pct_min} %</Text>
              )}
            </View>
            {questionnaire.points_q45 != null && (
              <Text style={styles.qPoints}>{questionnaire.points_q45} pts</Text>
            )}
          </View>
        </View>

        {/* Score & Profil retenu */}
        <View style={styles.scoreBox}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>Profil retenu (scoring pondéré 5 dimensions)</Text>
            <Text style={styles.scoreProfil}>{PROFIL_LABEL[profil_retenu]}</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 6, maxWidth: 340 }}>
              {PROFIL_DESC[profil_retenu]}
            </Text>
          </View>
          <View style={styles.scoreRight}>
            <Text style={styles.scoreTotal}>{score_total}/{score_max}</Text>
            <Text style={styles.scoreSub}>Score ({pct} %)</Text>
          </View>
        </View>

        {/* Commentaire conseiller */}
        {commentaire_conseiller && (
          <View style={styles.esgBox}>
            <Text style={styles.esgTitle}>Commentaire du conseiller / surcharge manuelle</Text>
            <Text style={{ fontSize: 10, color: DARK }}>{commentaire_conseiller}</Text>
          </View>
        )}

        {/* Avertissement */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Ce questionnaire a été complété par le client et analysé par AMANA Patrimoine conformément
            à l'article 25 MIF II. Le profil retenu conditionne les recommandations du Rapport d'Adéquation.
            En cas de désaccord avec le scoring automatique, le conseiller peut surcharger manuellement
            et doit tracer la justification dans l'espace commentaire ci-dessus.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureBox}>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Conseiller AMANA</Text>
            <Text style={{ fontSize: 10, marginTop: 4 }}>{conseillerNom ?? 'AMANA Patrimoine'}</Text>
            <Text style={{ fontSize: 9, color: GREY, marginTop: 2 }}>Date : {generationDate}</Text>
          </View>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Validation Mohamed MOSBAHI</Text>
            <Text style={{ fontSize: 9, color: GREY, marginTop: 24 }}>Signature :</Text>
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
            {' '}· Document réglementaire — Article 25 MIF II
          </Text>
        </View>
      </Page>
    </Document>
  )
}
