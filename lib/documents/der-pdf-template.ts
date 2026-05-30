// lib/documents/der-pdf-template.ts
// DER vdef — remplissage du PDF statique AMANA_DER_vdef (9 pages)

import fs from 'fs'
import path from 'path'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'

const TEMPLATE_PATH = path.join(process.cwd(), 'lib/documents/assets/amana-der-template.pdf')
const TEMPLATE_VERSION = 'der-v3-pdf-vdef'

const TEXT_COLOR = rgb(0.208, 0.231, 0.196) // #353b32
const COVER_COLOR = rgb(1, 1, 1)

const OFFRE_FOYER_LABEL: Record<string, string> = {
  mass: 'AMANA Essentiel',
  patrimoniale: 'AMANA Patrimoniale',
  premium: 'AMANA Gestion Privée',
}

export type DerPdfClientData = {
  prenom: string
  nom: string
  dossierId: string
  offre?: string | null
  generationDate: string
}

export { TEMPLATE_VERSION }

function sanitizeWinAnsi(input: string): string {
  return input.replace(/[\u202F\u00A0]/g, ' ')
}

function coverAndDraw(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; coverW: number; coverH: number; font: PDFFont; size?: number }
) {
  const size = opts.size ?? 10.5
  const pad = 2
  page.drawRectangle({
    x: opts.x - pad,
    y: opts.y - 2,
    width: opts.coverW + pad * 2,
    height: opts.coverH + 4,
    color: COVER_COLOR,
  })
  page.drawText(sanitizeWinAnsi(text), {
    x: opts.x,
    y: opts.y,
    font: opts.font,
    size,
    color: TEXT_COLOR,
  })
}

function formatClientName(prenom: string, nom: string): string {
  return `${prenom.trim()} ${nom.trim().toUpperCase()}`
}

function formatDossierRef(dossierId: string): string {
  return dossierId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function formatFoyerLine(data: DerPdfClientData): string {
  const name = formatClientName(data.prenom, data.nom)
  const offre = data.offre ? OFFRE_FOYER_LABEL[data.offre] : undefined
  return offre ? `${name} — ${offre}` : name
}

export async function renderDerPdfFromTemplate(data: DerPdfClientData): Promise<Buffer> {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template DER introuvable : ${TEMPLATE_PATH}`)
  }

  const templateBytes = fs.readFileSync(TEMPLATE_PATH)
  const doc = await PDFDocument.load(templateBytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const clientName = formatClientName(data.prenom, data.nom)
  const dossierRef = formatDossierRef(data.dossierId)
  const editionDate = data.generationDate
  const foyerLine = formatFoyerLine(data)

  // Page 1 — couverture (REMIS À, référence, édition)
  const page1 = doc.getPage(0)
  coverAndDraw(page1, clientName, {
    x: 287,
    y: 308,
    coverW: 90,
    coverH: 12,
    font: fontBold,
    size: 11,
  })
  coverAndDraw(page1, dossierRef, {
    x: 340,
    y: 293,
    coverW: 100,
    coverH: 12,
    font,
  })
  coverAndDraw(page1, editionDate, {
    x: 297,
    y: 251,
    coverW: 80,
    coverH: 12,
    font,
  })

  // Page 5 — Information Foyer
  const page5 = doc.getPage(4)
  coverAndDraw(page5, foyerLine, {
    x: 186,
    y: 188,
    coverW: Math.max(120, foyerLine.length * 5.5),
    coverH: 12,
    font,
    size: 10,
  })

  // Page 9 — Signataire 1
  const page9 = doc.getPage(8)
  coverAndDraw(page9, clientName, {
    x: 94,
    y: 585,
    coverW: Math.max(150, clientName.length * 5.5),
    coverH: 12,
    font: fontBold,
    size: 11,
  })

  const bytes = await doc.save()
  return Buffer.from(bytes)
}
