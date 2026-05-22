import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

// Couleurs AMANA
const FOREST = rgb(0.227, 0.302, 0.224)   // #3a4d39
const GOLD   = rgb(0.788, 0.647, 0.353)   // #c9a55a
const DARK   = rgb(0.169, 0.224, 0.165)   // #2b3a2a
const GRAY   = rgb(0.42, 0.498, 0.416)    // #6b7f6a
const LIGHT  = rgb(0.973, 0.957, 0.925)   // #f8f4ec
const BLACK  = rgb(0.18, 0.18, 0.18)

// A4 en points
const W = 595.28
const H = 841.89
const MARGIN = 52

type Fonts = { serif: PDFFont; sans: PDFFont; sansBold: PDFFont }

function sanitizeWinAnsi(input: string): string {
  // pdf-lib + StandardFonts (WinAnsi) ne supporte pas certains espaces unicode
  // (ex: U+202F narrow no-break space, U+00A0 no-break space).
  return input.replace(/[\u202F\u00A0]/g, ' ')
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color })
}

function text(page: PDFPage, t: string, x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  page.drawText(sanitizeWinAnsi(t), { x, y, font, size, color })
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color })
}

function wrap(str: string, maxChars: number): string[] {
  const words = str.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim())
      current = word
    } else {
      current = (current + ' ' + word).trim()
    }
  }
  if (current) lines.push(current.trim())
  return lines
}

export type BulletinData = {
  nomClient:   string
  prenom:      string
  nom:         string
  email:       string
  ville?:      string
  produit:     string
  type:        string
  montant:     number
  gestionnaire?: string
  rendement?:  string
  date:        string
  conseillerNom?: string
}

export async function genererBulletinSouscription(data: BulletinData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([W, H])

  const serif    = await doc.embedFont(StandardFonts.TimesRoman)
  const serifB   = await doc.embedFont(StandardFonts.TimesRomanBold)
  const sans     = await doc.embedFont(StandardFonts.Helvetica)
  const sansB    = await doc.embedFont(StandardFonts.HelveticaBold)
  const fonts: Fonts = { serif: serifB, sans, sansBold: sansB }

  let y = H

  // ── Header ──────────────────────────────────────────────────────────────────
  drawRect(page, 0, H - 80, W, 80, DARK)

  // Logo texte
  text(page, 'AMANA', MARGIN, H - 50, serifB, 20, LIGHT)
  const amanaW = serifB.widthOfTextAtSize('AMANA ', 20)
  text(page, 'PATRIMOINE', MARGIN + amanaW, H - 50, serif, 20, GOLD)

  // Tagline
  text(page, 'Cabinet de gestion de patrimoine islamique', MARGIN, H - 68, sans, 8, rgb(0.75, 0.78, 0.75))

  // Date en haut à droite
  text(page, data.date, W - MARGIN - 80, H - 50, sans, 9, rgb(0.75, 0.78, 0.75))

  y = H - 80

  // ── Titre document ──────────────────────────────────────────────────────────
  y -= 36
  text(page, 'BULLETIN DE SOUSCRIPTION', MARGIN, y, sansB, 13, FOREST)
  y -= 4
  line(page, MARGIN, y, W - MARGIN, y, GOLD, 1.5)
  y -= 20

  text(page, `Référence : AMANA-${data.date.replace(/\//g, '')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`, MARGIN, y, sans, 8, GRAY)
  y -= 30

  // ── Informations client ─────────────────────────────────────────────────────
  drawRect(page, MARGIN, y - 90, W - 2 * MARGIN, 105, LIGHT)

  y -= 12
  text(page, 'INFORMATIONS CLIENT', MARGIN + 14, y, sansB, 9, FOREST)
  line(page, MARGIN + 14, y - 4, MARGIN + 14 + sansB.widthOfTextAtSize('INFORMATIONS CLIENT', 9), y - 4, GOLD, 0.8)

  y -= 22
  const col2 = MARGIN + 14 + 220

  text(page, 'Nom & Prénom', MARGIN + 14, y, sans, 8, GRAY)
  text(page, `${data.prenom} ${data.nom}`, MARGIN + 14, y - 12, sansB, 10, BLACK)

  text(page, 'Email', col2, y, sans, 8, GRAY)
  text(page, data.email, col2, y - 12, fonts.sans, 9, BLACK)

  y -= 36

  if (data.ville) {
    text(page, 'Ville', MARGIN + 14, y, sans, 8, GRAY)
    text(page, data.ville, MARGIN + 14, y - 12, fonts.sans, 9, BLACK)
  }

  y -= 36

  // ── Détails produit ─────────────────────────────────────────────────────────
  y -= 8
  text(page, 'PRODUIT SOUSCRIT', MARGIN, y, sansB, 9, FOREST)
  line(page, MARGIN, y - 4, MARGIN + sansB.widthOfTextAtSize('PRODUIT SOUSCRIT', 9), y - 4, GOLD, 0.8)
  y -= 22

  drawRect(page, MARGIN, y - 78, W - 2 * MARGIN, 92, LIGHT)
  y -= 12

  text(page, 'Produit', MARGIN + 14, y, sans, 8, GRAY)
  text(page, data.produit, MARGIN + 14, y - 13, serifB, 13, FOREST)

  if (data.gestionnaire) {
    text(page, 'Gestionnaire', col2, y, sans, 8, GRAY)
    text(page, data.gestionnaire, col2, y - 13, fonts.sans, 9, BLACK)
  }

  y -= 36

  text(page, 'Catégorie', MARGIN + 14, y, sans, 8, GRAY)
  text(page, data.type, MARGIN + 14, y - 12, fonts.sans, 9, BLACK)

  if (data.rendement) {
    text(page, 'Rendement indicatif', col2, y, sans, 8, GRAY)
    text(page, data.rendement, col2, y - 12, fonts.sans, 9, BLACK)
  }

  y -= 44

  // ── Montant ─────────────────────────────────────────────────────────────────
  drawRect(page, MARGIN, y - 52, W - 2 * MARGIN, 60, FOREST)
  y -= 10

  text(page, 'MONTANT DE SOUSCRIPTION', MARGIN + 14, y, sansB, 9, GOLD)
  y -= 20
  const montantStr = sanitizeWinAnsi(`${data.montant.toLocaleString('fr-FR')} EUR`)
  text(page, montantStr, MARGIN + 14, y, serifB, 22, LIGHT)
  text(page, '(en euros)', MARGIN + 14 + serifB.widthOfTextAtSize(montantStr, 22) + 10, y + 4, sans, 8, rgb(0.75, 0.78, 0.75))

  y -= 36

  // ── Conformité halal ────────────────────────────────────────────────────────
  y -= 8
  text(page, 'CONFORMITÉ ÉTHIQUE & ISLAMIQUE', MARGIN, y, sansB, 9, FOREST)
  line(page, MARGIN, y - 4, MARGIN + sansB.widthOfTextAtSize('CONFORMITÉ ÉTHIQUE & ISLAMIQUE', 9), y - 4, GOLD, 0.8)
  y -= 20

  const conformites = [
    '- Produit sélectionné selon les principes de la finance islamique (absence de riba)',
    '- Exclusion des secteurs haram (alcool, tabac, armement, jeux, pornographie)',
    '- Screene selon les criteres AAOIFI et audite annuellement par un comite charia',
    '- Le souscripteur confirme que le present investissement est conforme a ses convictions',
  ]

  for (const conf of conformites) {
    text(page, conf, MARGIN, y, sans, 8.5, rgb(0.25, 0.35, 0.25))
    y -= 14
  }

  y -= 14

  // ── Déclaration ─────────────────────────────────────────────────────────────
  text(page, 'DÉCLARATION DU SOUSCRIPTEUR', MARGIN, y, sansB, 9, FOREST)
  line(page, MARGIN, y - 4, MARGIN + sansB.widthOfTextAtSize('DÉCLARATION DU SOUSCRIPTEUR', 9), y - 4, GOLD, 0.8)
  y -= 20

  const declaration = `En signant ce document, le souscripteur déclare avoir pris connaissance des caractéristiques du produit sélectionné, des risques associés à cet investissement, et confirme que son profil investisseur MIF2 est compatible avec ce produit. Il reconnaît avoir été informé conformément aux exigences réglementaires en vigueur.`

  const declLines = wrap(declaration, 88)
  for (const l of declLines) {
    text(page, l, MARGIN, y, sans, 8.5, rgb(0.3, 0.3, 0.3))
    y -= 13
  }

  y -= 24

  // ── Zone signature ──────────────────────────────────────────────────────────
  const sigBoxW = (W - 2 * MARGIN - 24) / 2
  const sigBoxH = 80

  // Client
  drawRect(page, MARGIN, y - sigBoxH, sigBoxW, sigBoxH, LIGHT)
  text(page, 'Signature du souscripteur', MARGIN + 10, y - 14, sansB, 8, FOREST)
  text(page, `${data.prenom} ${data.nom}`, MARGIN + 10, y - 26, sans, 8, GRAY)
  line(page, MARGIN + 10, y - sigBoxH + 20, MARGIN + sigBoxW - 10, y - sigBoxH + 20, GRAY, 0.5)
  text(page, 'Signature électronique via Yousign', MARGIN + 10, y - sigBoxH + 8, sans, 7, GRAY)

  // Conseiller
  const sig2X = MARGIN + sigBoxW + 24
  drawRect(page, sig2X, y - sigBoxH, sigBoxW, sigBoxH, LIGHT)
  text(page, 'Conseiller AMANA Patrimoine', sig2X + 10, y - 14, sansB, 8, FOREST)
  if (data.conseillerNom) {
    text(page, data.conseillerNom, sig2X + 10, y - 26, sans, 8, GRAY)
  }
  line(page, sig2X + 10, y - sigBoxH + 20, sig2X + sigBoxW - 10, y - sigBoxH + 20, GRAY, 0.5)
  text(page, 'Cachet et signature', sig2X + 10, y - sigBoxH + 8, sans, 7, GRAY)

  y -= sigBoxH + 20

  // ── Footer ──────────────────────────────────────────────────────────────────
  line(page, MARGIN, 52, W - MARGIN, 52, GOLD, 0.8)
  text(page, 'AMANA Patrimoine — Cabinet de conseil en investissement — Conforme aux principes de la finance islamique', MARGIN, 38, sans, 7, GRAY)
  text(page, `Document généré le ${data.date} — Conservez ce document`, MARGIN, 26, sans, 7, GRAY)

  void fonts

  const bytes = await doc.save()
  return bytes
}
