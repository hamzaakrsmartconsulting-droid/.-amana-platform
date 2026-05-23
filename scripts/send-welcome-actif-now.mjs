/**
 * Envoie l'email bienvenue client actif (test local → Inbucket).
 * Usage: node scripts/send-welcome-actif-now.mjs [email] [prenom]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]
    }),
)

function getClientAppBaseUrl() {
  const localDefault = 'http://localhost:3000'
  const raw = env.AMANA_CLIENT_URL ?? env.NEXT_PUBLIC_APP_URL ?? localDefault
  const url = raw.replace(/\/$/, '')
  if (/ngrok/i.test(url)) return localDefault
  return url
}

const BASE_URL = getClientAppBaseUrl()
const to = process.argv[2] ?? 'hamzaakrsmartconsulting@gmail.com'
const prenom = process.argv[3] ?? 'hamza'

const base = (content) =>
  `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f4ec;font-family:system-ui,sans-serif;">
<table width="100%"><tr><td align="center" style="padding:40px 16px;">
<table width="600" style="background:white;border-radius:16px;">
<tr><td style="background:#2b3a2a;padding:24px 40px;"><span style="font-family:Georgia,serif;color:#f8f4ec;">AMANA <span style="color:#c9a55a;">PATRIMOINE</span></span></td></tr>
<tr><td style="padding:40px;">${content}</td></tr>
</table></td></tr></table></body></html>`

const html = base(`
<h2 style="font-family:Georgia,serif;color:#3a4d39;font-size:24px;">Bienvenue, ${prenom} !</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;">Votre souscription a bien été enregistrée. Votre dossier est désormais <strong>actif</strong> chez AMANA Patrimoine.</p>
<a href="${BASE_URL}/dashboard" style="display:inline-block;padding:14px 32px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Accéder à mon espace →</a>
<p style="color:#6b7f6a;font-size:13px;margin-top:28px;">AMANA Patrimoine — ORIAS n° 25009552</p>
`)

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST ?? '127.0.0.1',
  port: Number(env.SMTP_PORT ?? 54325),
  secure: env.SMTP_SECURE === '1',
  auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
})

const info = await transport.sendMail({
  from: env.EMAIL_FROM ?? 'Amana Patrimoine <noreply@amana-patrimoine.fr>',
  to,
  subject: 'Bienvenue — Votre relation client AMANA Patrimoine est active',
  html,
})

console.log('OK sent to', to)
console.log('Dashboard link:', `${BASE_URL}/dashboard`)
console.log('MessageId:', info.messageId)
console.log('Inbucket (local): http://127.0.0.1:54324')
