// lib/email.ts
// Service d'envoi d'emails transactionnels via Resend ou SMTP.
import 'server-only'
import { getClientAppBaseUrl } from '@/lib/app-url'
// Templates AMANA réutilisables (KYC validé / rejeté, projet actif).
//
// IMPORTANT : le domaine d'envoi DOIT être vérifié dans Resend
// (DKIM + SPF). Tant que noreply@amana-patrimoine.fr n'est pas vérifié,
// les emails partent en spam.

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase()
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM =
  process.env.EMAIL_FROM ??
  process.env.RESEND_FROM ??
  'Amana Patrimoine <noreply@amana-patrimoine.fr>'
const BASE_URL = getClientAppBaseUrl()

type EmailPayload = { to: string; subject: string; html: string }

type Attachment = {
  filename: string
  content: Buffer
  contentType: string
}

type EmailPayloadWithAttachments = EmailPayload & {
  attachments?: Attachment[]
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
  if (EMAIL_PROVIDER === 'smtp') {
    await sendViaSmtp({ to, subject, html })
    return
  }
  await sendViaResend({ to, subject, html })
}

export async function sendEmailWithAttachment({
  to,
  subject,
  html,
  attachments = [],
}: EmailPayloadWithAttachments): Promise<void> {
  if (EMAIL_PROVIDER === 'smtp') {
    await sendViaSmtp({ to, subject, html, attachments })
    return
  }
  await sendViaResendWithAttachment({ to, subject, html, attachments })
}

async function sendViaResend({ to, subject, html }: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY manquant — email non envoyé')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '<unreadable>')
    console.error('[email] Resend a renvoyé', res.status, res.statusText, '—', errBody)
  }
}

async function sendViaResendWithAttachment({
  to,
  subject,
  html,
  attachments = [],
}: EmailPayloadWithAttachments): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY manquant — email non envoyé')
    return
  }
  const resendAttachments = attachments.map((a) => ({
    filename: a.filename,
    content: a.content.toString('base64'),
  }))
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html, attachments: resendAttachments }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '<unreadable>')
    console.error('[email] Resend attachments a renvoyé', res.status, res.statusText, '—', errBody)
  }
}

async function sendViaSmtp({
  to,
  subject,
  html,
  attachments = [],
}: EmailPayloadWithAttachments): Promise<void> {
  const host = process.env.SMTP_HOST ?? '127.0.0.1'
  const port = Number(process.env.SMTP_PORT ?? '54325')
  const secure = process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER ?? ''
  const pass = process.env.SMTP_PASS ?? ''

  const { createTransport } = await import('nodemailer')
  const transporter = createTransport({
    host,
    port,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
  })

  const nodemailerAttachments = attachments.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: a.contentType,
  }))

  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
      attachments: nodemailerAttachments,
    })
  } catch (error) {
    console.error('[email] SMTP erreur envoi', error)
  }
}

// =====================================================================
// Layout commun
// =====================================================================
function base(content: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f4ec;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(58,77,57,0.08);">
<tr><td style="background:#2b3a2a;padding:24px 40px;"><span style="font-family:Georgia,serif;font-size:18px;color:#f8f4ec;letter-spacing:0.06em;">AMANA <span style="color:#c9a55a;">PATRIMOINE</span></span></td></tr>
<tr><td style="padding:40px;">${content}</td></tr>
<tr><td style="background:#f8f4ec;padding:20px 40px;border-top:1px solid #e8dfc8;"><p style="margin:0;font-size:12px;color:#6b7f6a;">AMANA Patrimoine — Cabinet de conseil en gestion de patrimoine islamique<br>Cet email a été envoyé automatiquement.</p></td></tr>
</table></td></tr></table></body></html>`
}

// =====================================================================
// Templates
// =====================================================================
export function emailDerRemis(prenom: string, nom: string, magicLink: string) {
  return {
    subject: 'Bienvenue chez AMANA Patrimoine — Votre Document d\'Entrée en Relation',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Bienvenue, ${prenom} !</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 16px;">Merci de votre confiance. Votre espace AMANA Patrimoine est prêt.</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 16px;">
  Conformément à la réglementation (article L.541-8-1 CMF), vous trouverez en <strong>pièce jointe</strong>
  votre <strong>Document d'Entrée en Relation (DER)</strong> personnalisé,
  qui décrit notre cabinet, nos services et nos modalités de rémunération.
</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
  Cliquez sur le bouton ci-dessous pour accéder à votre espace sécurisé et démarrer votre parcours KYC :
</p>
<a href="${magicLink}" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Accéder à mon espace AMANA →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 8px;">Ce lien est valable 24 heures. Si vous ne l'avez pas demandé, ignorez cet email.</p>
<p style="color:#6b7f6a;font-size:13px;margin:0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.<br>
  Membre ANACOFI, activité sous le contrôle de l'AMF et de l'ACPR.
</p>
`),
  }
}

export function emailKycValide(prenom: string) {
  return {
    subject: 'Votre dossier KYC a été validé — AMANA Patrimoine',
    html: base(`<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre dossier a été validé ✓</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">Votre dossier KYC a été validé par votre conseiller AMANA. Vous pouvez désormais accéder au catalogue de produits halal.</p>
<a href="${BASE_URL}/catalogue" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Découvrir le catalogue →</a>`),
  }
}

/**
 * Email combiné envoyé une seule fois après validation KYC + génération du pack réglementaire.
 * Remplace emailKycValide + emailPackReglementairePretASigner pour l'offre Mass.
 */
export function emailKycValideEtPackPretASigner(
  prenom: string,
  signingUrl: string,
  documents: string[] = ['Document d\'Entrée en Relation (DER)', 'Lettre de Mission', 'Rapport d\'Adéquation']
) {
  const docList = documents.map(d => `<li style="margin:4px 0;">${d}</li>`).join('')
  return {
    subject: '[AMANA] Dossier validé — vos documents sont prêts à signer',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Bonne nouvelle, ${prenom} !</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Votre dossier KYC a été validé par votre conseiller AMANA.</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
  Votre pack réglementaire est prêt. Signez vos 3 documents en une seule session pour finaliser votre relation avec AMANA Patrimoine.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:8px;font-weight:600;">Documents à signer</td></tr>
  <tr><td><ul style="margin:0;padding-left:20px;color:#3a4d39;font-size:14px;line-height:1.8;">${docList}</ul></td></tr>
</table>
<a href="${signingUrl}" style="display:inline-block;padding:14px 32px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:8px;">Signer mes documents →</a>
<p style="color:#6b7f6a;font-size:13px;margin:16px 0 8px;">Ce lien est valable 30 jours. Vous recevrez également un email séparé de notre partenaire Yousign.</p>
<p style="color:#6b7f6a;font-size:13px;margin:0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.<br>
  En cas de question, contactez votre conseiller par retour de cet email.
</p>
`),
  }
}

export function emailKycRejete(prenom: string) {
  return {
    subject: 'Votre dossier KYC nécessite des compléments — AMANA Patrimoine',
    html: base(`<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre dossier nécessite des compléments</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">Votre conseiller a identifié des informations à compléter. Connectez-vous pour prendre connaissance des détails.</p>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#3a4d39;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Accéder à mon espace →</a>`),
  }
}

export function emailKycSoumisAdmin(clientNom: string, dossierId: string, adminUrl: string) {
  return {
    subject: `[AMANA] KYC soumis — ${clientNom} est prêt pour validation`,
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:22px;margin:0 0 16px;">KYC soumis par un client</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 12px;">
  Le client <strong style="color:#3a4d39;">${clientNom}</strong> vient de soumettre son dossier KYC complet.
  Il est maintenant en attente de votre validation pour passer à l'étape <strong>KYC complet</strong>.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Dossier ID</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:14px;color:#3a4d39;">${dossierId}</td></tr>
</table>
<a href="${adminUrl}" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Valider le KYC →</a>
<p style="color:#6b7f6a;font-size:13px;margin:24px 0 0;">Retrouvez tous les KYC en attente sur <a href="${BASE_URL}/admin/validations" style="color:#3a4d39;">la page de validations admin</a>.</p>
`),
  }
}

/**
 * Notif admin : un client actif vient de soumettre une nouvelle souscription
 * (pipeline additionnel — projects.pipeline_stage = 'nouveau').
 */
export function emailProjectSoumisAdmin(
  clientNom: string,
  productNom: string,
  montantEur: number,
  projectId: string,
  adminUrl: string,
) {
  return {
    subject: `[AMANA] Nouvelle souscription — ${clientNom} · ${productNom}`,
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:22px;margin:0 0 16px;">Nouvelle souscription complémentaire</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 12px;">
  Le client <strong style="color:#3a4d39;">${clientNom}</strong> (déjà actif) vient de soumettre une nouvelle demande de souscription.
  Elle apparaît dans le <strong>pipeline additionnel</strong> en étape <strong>Nouveau</strong> et attend la génération des documents (LM / RA / Bilan).
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 16px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Produit</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:15px;color:#3a4d39;font-weight:600;padding-bottom:10px;">${productNom}</td></tr>
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Montant</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:15px;color:#3a4d39;font-weight:600;padding-bottom:10px;">${montantEur.toLocaleString('fr-FR')} €</td></tr>
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Project ID</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:13px;color:#3a4d39;">${projectId}</td></tr>
</table>
<a href="${adminUrl}" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Ouvrir le pipeline →</a>
<p style="color:#6b7f6a;font-size:13px;margin:24px 0 0;">Toutes les souscriptions en cours sont visibles sur <a href="${BASE_URL}/admin/pipeline" style="color:#3a4d39;">la page Pipeline admin</a>.</p>
`),
  }
}

export function emailValidationRequired(gateName: string, dossierNom: string, url: string) {
  return {
    subject: `[AMANA] Action requise — ${gateName} · ${dossierNom}`,
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:22px;margin:0 0 16px;">Validation requise</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 12px;">
  Le dossier <strong style="color:#3a4d39;">${dossierNom}</strong> nécessite votre validation pour continuer le parcours réglementaire.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Verrou à valider</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:16px;color:#3a4d39;font-weight:600;">${gateName}</td></tr>
</table>
<a href="${url}" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Valider maintenant →</a>
<p style="color:#6b7f6a;font-size:13px;margin:24px 0 0;">Accédez à <a href="${BASE_URL}/admin/validations" style="color:#3a4d39;">la page de validations</a> pour tous les dossiers en attente.</p>
`),
  }
}

// Email envoyé au client quand la LM (ou tout doc) est envoyé en signature
// via notre route (complémentaire à l'email Yousign — branding AMANA)
export function emailDocumentPretASigner(prenom: string, nomDocument: string, signingUrl?: string) {
  const ctaBlock = signingUrl
    ? `<a href="${signingUrl}" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Signer le document →</a>`
    : `<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Accéder à mon espace →</a>
<p style="color:#6b7f6a;font-size:13px;margin:12px 0 0;">Vous recevrez également un email séparé de Yousign contenant le lien de signature.</p>`
  return {
    subject: `[AMANA] Votre ${nomDocument} est prêt à signer`,
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Document prêt à signer</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Votre conseiller AMANA Patrimoine a préparé votre <strong>${nomDocument}</strong>
  et vous invite à en prendre connaissance puis à le signer électroniquement.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 28px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Document</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:16px;color:#3a4d39;font-weight:600;">${nomDocument}</td></tr>
</table>
${ctaBlock}
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.<br>
  En cas de question, contactez votre conseiller par retour de cet email.
</p>
`),
  }
}

export function emailSignatureInvitation(prenom: string, nomDocument: string, signingUrl: string) {
  return {
    subject: `[AMANA] Votre document est prêt à signer — ${nomDocument}`,
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Document prêt à signer</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Votre conseiller AMANA Patrimoine a préparé un document nécessitant votre signature électronique.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 28px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Document à signer</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:16px;color:#3a4d39;font-weight:600;">${nomDocument}</td></tr>
</table>
<a href="${signingUrl}" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Signer le document →</a>
<p style="color:#6b7f6a;font-size:13px;margin:24px 0 0;">Ce lien est valable 14 jours. Si vous ne l'avez pas demandé, contactez votre conseiller.</p>
<p style="color:#6b7f6a;font-size:13px;margin:8px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.
</p>
`),
  }
}

export function emailSignatureConfirmation(prenom: string, nomDocument: string) {
  return {
    subject: `[AMANA] Document signé — ${nomDocument}`,
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Signature confirmée ✓</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Votre signature électronique pour le document <strong>${nomDocument}</strong> a bien été enregistrée.
</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
  Votre conseiller AMANA a été notifié. La prochaine étape du parcours sera initiée sous peu.
</p>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Voir mon espace →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.
</p>
`),
  }
}

export function emailBilanPret(prenom: string) {
  return {
    subject: 'Votre Bilan Patrimonial est disponible — AMANA Patrimoine',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre Bilan Patrimonial est prêt</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Votre conseiller AMANA a finalisé votre <strong>Bilan Patrimonial</strong>. Ce document analyse votre situation patrimoniale actuelle et constitue la base de nos recommandations d'investissement halal.
</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
  Votre conseiller vous contactera prochainement pour vous présenter les conclusions de ce bilan et la prochaine étape de votre parcours.
</p>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Accéder à mon espace →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.
</p>
`),
  }
}

export function emailProfilRisquePret(prenom: string) {
  return {
    subject: 'Votre Profil de Risque Investisseur — AMANA Patrimoine',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre Profil de Risque Investisseur a été déterminé</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Suite à l'analyse de vos réponses, votre <strong>Profil de Risque Investisseur</strong> a été établi par votre conseiller AMANA. Ce profil détermine l'univers des solutions halal adaptées à votre situation.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;">Prochaine étape</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:15px;color:#3a4d39;font-weight:600;">Lettre de Mission — engagement de conseil</td></tr>
</table>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Voir mon espace →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.
</p>
`),
  }
}

export function emailReportingTrimestriel(prenom: string, trimestre: string, annee: number) {
  return {
    subject: `Reporting trimestre ${trimestre} ${annee} — AMANA Patrimoine`,
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre Reporting Trimestriel est disponible</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Votre rapport de suivi <strong>Trimestre ${trimestre} ${annee}</strong> est disponible dans votre espace AMANA. Il retrace l'évolution de vos investissements halal sur la période.
</p>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Consulter mon reporting →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.<br>
  Conformément à l'article 25 MIF II, ce reporting vous est adressé périodiquement.
</p>
`),
  }
}

export function emailBilanAnnuel(prenom: string) {
  return {
    subject: 'Bilan annuel — Réévaluation de votre profil — AMANA Patrimoine',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre Bilan Annuel est disponible</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  L'anniversaire de votre mission AMANA approche. Votre conseiller a préparé votre <strong>Bilan Annuel</strong> incluant la mise à jour de votre situation patrimoniale et, le cas échéant, de nouvelles recommandations d'adéquation.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Conformité</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:14px;color:#3a4d39;">Article 25 MIF II — Rapport périodique d'adéquation annuel</td></tr>
</table>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Consulter mon bilan annuel →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.
</p>
`),
  }
}

export function emailPackReglementairePretASigner(
  prenom: string,
  signingUrl: string,
  documents: string[] = ['Document d\'Entrée en Relation (DER)', 'Lettre de Mission', 'Rapport d\'Adéquation']
) {
  const docList = documents.map(d => `<li style="margin:4px 0;">${d}</li>`).join('')
  return {
    subject: '[AMANA] Votre dossier réglementaire est prêt à signer',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre dossier réglementaire est prêt</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Votre conseiller AMANA Patrimoine a préparé l'ensemble de votre dossier réglementaire. Vous pouvez désormais signer tous vos documents en une seule session.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:8px;font-weight:600;">Documents à signer</td></tr>
  <tr><td><ul style="margin:0;padding-left:20px;color:#3a4d39;font-size:14px;line-height:1.8;">${docList}</ul></td></tr>
</table>
<a href="${signingUrl}" style="display:inline-block;padding:14px 32px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Signer mes documents →</a>
<p style="color:#6b7f6a;font-size:13px;margin:24px 0 8px;">Ce lien est valable 30 jours. Vous recevrez également un email de Yousign avec ce même lien.</p>
<p style="color:#6b7f6a;font-size:13px;margin:0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.<br>
  En cas de question, contactez votre conseiller par retour de cet email.
</p>
`),
  }
}

/** Envoyé quand le dossier passe de « souscription » à « actif » (souscription confirmée). */
export function emailBienvenueClientActif(prenom: string) {
  return {
    subject: 'Bienvenue — Votre relation client AMANA Patrimoine est active',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Bienvenue, ${prenom} !</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 16px;">
  Votre souscription a bien été enregistrée. Votre dossier est désormais <strong>actif</strong> chez AMANA Patrimoine : vous êtes officiellement accompagné par notre équipe.
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:8px;font-weight:600;">À partir de maintenant</td></tr>
  <tr><td style="color:#3a4d39;font-size:14px;line-height:1.8;">
    <ul style="margin:0;padding-left:20px;">
      <li>Accédez à votre espace client pour suivre vos documents et votre parcours.</li>
      <li>Votre conseiller reste votre interlocuteur privilégié pour toute question.</li>
      <li>Le suivi patrimonial et réglementaire se poursuit selon votre offre AMANA.</li>
    </ul>
  </td></tr>
</table>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:14px 32px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Accéder à mon espace →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 8px;">
  Pour toute question, répondez à cet email ou contactez votre conseiller.
</p>
<p style="color:#6b7f6a;font-size:13px;margin:0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.<br>
  Membre ANACOFI — activité sous le contrôle de l'AMF et de l'ACPR.
</p>
`),
  }
}

export function emailPackReglementaireSigne(prenom: string) {
  return {
    subject: '[AMANA] Dossier réglementaire signé — Merci',
    html: base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Signatures enregistrées ✓</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">Bonjour ${prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
  Votre signature électronique a bien été enregistrée pour l'ensemble de votre dossier réglementaire (DER, Lettre de Mission, Rapport d'Adéquation).
</p>
<table style="background:#f8f4ec;border-radius:10px;padding:16px 20px;margin:0 0 24px;width:100%;box-sizing:border-box;">
  <tr><td style="font-size:13px;color:#6b7f6a;padding-bottom:4px;">Prochaine étape</td></tr>
  <tr><td style="font-family:Georgia,serif;font-size:15px;color:#3a4d39;font-weight:600;">Votre conseiller va préparer la souscription aux solutions sélectionnées</td></tr>
</table>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Voir mon espace →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">
  AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.
</p>
`),
  }
}

export function emailProjetActif(prenom: string, nomProduit: string, montant: number) {
  return {
    subject: `Votre investissement ${nomProduit} est actif — AMANA Patrimoine`,
    html: base(`<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;margin:0 0 16px;">Votre investissement est actif 🎉</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">Bonjour ${prenom},</p>
<table style="background:#f8f4ec;border-radius:12px;padding:20px 24px;margin:0 0 28px;width:100%;box-sizing:border-box;">
<tr><td style="font-size:13px;color:#6b7f6a;">Produit</td><td style="font-family:Georgia,serif;font-size:16px;color:#3a4d39;text-align:right;font-weight:600;">${nomProduit}</td></tr>
<tr><td style="font-size:13px;color:#6b7f6a;">Montant</td><td style="font-family:Georgia,serif;font-size:16px;color:#3a4d39;text-align:right;font-weight:600;">${montant.toLocaleString('fr-FR')} €</td></tr>
</table>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Voir mon portefeuille →</a>
<p style="color:#6b7f6a;font-size:13px;margin:28px 0 0;">Barak Allahu fik pour votre confiance.</p>`),
  }
}
