// Génère un DER de test local pour prévisualiser le rendu PDF.
import fs from 'fs'
import path from 'path'
import { renderDerPdfFromTemplate } from '../lib/documents/der-pdf-template'

async function main() {
  const buffer = await renderDerPdfFromTemplate({
    prenom: 'hamza',
    nom: 'LAZIGHEB',
    dossierId: '5a459376-0000-4000-8000-000000000001',
    offre: 'mass',
    generationDate: '30 mai 2026',
  })

  const outDir = path.join(process.cwd(), 'output')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'DER-test-preview.pdf')
  fs.writeFileSync(outPath, buffer)
  console.log(`DER test généré : ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
