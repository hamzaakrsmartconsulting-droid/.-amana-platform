// lib/documents/der-pdf-template.ts
// DER vdef — remplissage du PDF statique AMANA_DER_vdef (9 pages)

import fs from 'fs'
import path from 'path'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'

const TEMPLATE_PATH = path.join(process.cwd(), 'lib/documents/assets/amana-der-template.pdf')
const TEMPLATE_VERSION = 'der-v3-pdf-vdef'

const TEXT_COLOR = rgb(0.208, 0.231, 0.196) // #353b32
const TEXT_MUTED = rgb(0.427, 0.451, 0.408) // #6d7368
const COVER_COLOR = rgb(1, 1, 1)
const CREAM_BAR = rgb(0.973, 0.957, 0.925) // #f8f4ec
const GOLD = rgb(0.788, 0.647, 0.353) // #c9a55a
const PAGE_MARGIN = 50

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

function coverAndDrawCentered(
  page: PDFPage,
  text: string,
  opts: {
    y: number
    coverH: number
    font: PDFFont
    size?: number
    minCoverW?: number
    coverColor?: ReturnType<typeof rgb>
  }
) {
  const size = opts.size ?? 10.5
  const safe = sanitizeWinAnsi(text)
  const textWidth = opts.font.widthOfTextAtSize(safe, size)
  const pageWidth = page.getWidth()
  const coverW = Math.max(opts.minCoverW ?? 200, textWidth + 24)
  const x = (pageWidth - textWidth) / 2
  const coverX = (pageWidth - coverW) / 2
  const pad = 2
  const coverColor = opts.coverColor ?? COVER_COLOR

  page.drawRectangle({
    x: coverX - pad,
    y: opts.y - 2,
    width: coverW + pad * 2,
    height: opts.coverH + 4,
    color: coverColor,
  })
  page.drawText(safe, {
    x,
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

/** Bandeau pleine largeur page 5 — fond crème, filet doré, typo hiérarchisée. */
function drawFoyerBar(page: PDFPage, foyerLine: string, font: PDFFont, fontBold: PDFFont) {
  const pageWidth = page.getWidth()
  const barX = PAGE_MARGIN
  const barW = pageWidth - PAGE_MARGIN * 2
  const barBottom = 176
  const barHeight = 24
  const barTop = barBottom + barHeight
  const textSize = 10
  const textY = barBottom + (barHeight - textSize) / 2 + 1

  // Recouvre le bandeau template sur toute la largeur utile
  page.drawRectangle({ x: barX, y: barBottom, width: barW, height: barHeight, color: CREAM_BAR })

  // Accent doré gauche + filets haut / bas
  page.drawRectangle({ x: barX, y: barBottom, width: 4, height: barHeight, color: GOLD })
  page.drawLine({
    start: { x: barX, y: barTop },
    end: { x: barX + barW, y: barTop },
    thickness: 0.75,
    color: GOLD,
  })
  page.drawLine({
    start: { x: barX, y: barBottom },
    end: { x: barX + barW, y: barBottom },
    thickness: 0.75,
    color: GOLD,
  })

  const label = 'Information Foyer'
  const separator = '  ·  '
  const labelW = fontBold.widthOfTextAtSize(label, textSize)
  const sepW = font.widthOfTextAtSize(separator, textSize)
  const clientW = font.widthOfTextAtSize(sanitizeWinAnsi(foyerLine), textSize)
  const totalW = labelW + sepW + clientW
  const startX = (pageWidth - totalW) / 2

  page.drawText(sanitizeWinAnsi(label), {
    x: startX,
    y: textY,
    font: fontBold,
    size: textSize,
    color: TEXT_COLOR,
  })
  page.drawText(separator, {
    x: startX + labelW,
    y: textY,
    font,
    size: textSize,
    color: TEXT_MUTED,
  })
  page.drawText(sanitizeWinAnsi(foyerLine), {
    x: startX + labelW + sepW,
    y: textY,
    font,
    size: textSize,
    color: TEXT_COLOR,
  })
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

  // Page 1 — couverture (REMIS À, référence, édition) — texte centré sur la page
  const page1 = doc.getPage(0)
  coverAndDrawCentered(page1, clientName, {
    y: 308,
    coverH: 12,
    font: fontBold,
    size: 11,
    minCoverW: 240,
  })
  coverAndDrawCentered(page1, `Référence dossier : ${dossierRef}`, {
    y: 293,
    coverH: 12,
    font,
    minCoverW: 220,
  })
  coverAndDrawCentered(page1, `Édition du ${editionDate}`, {
    y: 251,
    coverH: 12,
    font,
    minCoverW: 200,
  })

  // Page 5 — bandeau Information Foyer (pleine largeur, rendu pro)
  drawFoyerBar(doc.getPage(4), foyerLine, font, fontBold)

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
