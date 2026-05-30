import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { renderDerPdfFromTemplate } from '@/lib/documents/der-pdf-template'

describe('renderDerPdfFromTemplate', () => {
  it('produit un PDF de 9 pages avec les champs client remplis', async () => {
    const buffer = await renderDerPdfFromTemplate({
      prenom: 'Jean',
      nom: 'Dupont',
      dossierId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      offre: 'mass',
      generationDate: '30 mai 2026',
    })

    expect(buffer.length).toBeGreaterThan(10_000)

    const doc = await PDFDocument.load(buffer)
    expect(doc.getPageCount()).toBe(9)
  })
})
