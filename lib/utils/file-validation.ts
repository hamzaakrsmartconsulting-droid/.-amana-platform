// lib/utils/file-validation.ts
// Sprint Agents IA v7 · 29 avril 2026
//
// Validation magic bytes des fichiers uploadés (F1).
// Le header Content-Type envoyé par le navigateur est forgeable côté client.
// Pour vraiment vérifier le type, on lit les premiers octets du fichier ("magic bytes")
// qui sont une signature universelle propre à chaque format.

export type AllowedMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'

const MAGIC_BYTES: Record<AllowedMimeType, Uint8Array[]> = {
  // PDF : %PDF (en ASCII : 25 50 44 46)
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  // JPEG : FF D8 FF (3 bytes communs à tous les JPEG)
  'image/jpeg': [new Uint8Array([0xff, 0xd8, 0xff])],
  // PNG : 89 50 4E 47 0D 0A 1A 0A
  'image/png': [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  // WebP : RIFF????WEBP (4 bytes RIFF, 4 bytes taille, 4 bytes WEBP)
  // On vérifie RIFF en début et WEBP à l'offset 8
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
}

const ALLOWED_TYPES = Object.keys(MAGIC_BYTES) as AllowedMimeType[]

const EXTENSIONS_BY_MIME: Record<AllowedMimeType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Vérifie que les premiers octets du fichier correspondent à l'un des types
 * autorisés. Retourne le MIME détecté ou null si invalide.
 */
export async function detectFileMime(
  file: File | Blob | ArrayBuffer
): Promise<AllowedMimeType | null> {
  let buf: Uint8Array
  if (file instanceof ArrayBuffer) {
    buf = new Uint8Array(file.slice(0, 16))
  } else {
    const ab = await file.slice(0, 16).arrayBuffer()
    buf = new Uint8Array(ab)
  }

  for (const [mime, signatures] of Object.entries(MAGIC_BYTES) as [AllowedMimeType, Uint8Array[]][]) {
    for (const sig of signatures) {
      if (matchesSignature(buf, sig, 0)) {
        // Cas particulier WebP : vérifier "WEBP" à l'offset 8
        if (mime === 'image/webp') {
          const webpMarker = new Uint8Array([0x57, 0x45, 0x42, 0x50])
          if (matchesSignature(buf, webpMarker, 8)) {
            return mime
          }
          continue
        }
        return mime
      }
    }
  }
  return null
}

function matchesSignature(buf: Uint8Array, signature: Uint8Array, offset: number): boolean {
  if (buf.length < offset + signature.length) return false
  for (let i = 0; i < signature.length; i++) {
    if (buf[offset + i] !== signature[i]) return false
  }
  return true
}

/**
 * Retourne l'extension canonique pour un MIME validé.
 * À utiliser pour générer les paths Storage (pas l'extension du filename client).
 */
export function extensionForMime(mime: AllowedMimeType): string {
  return EXTENSIONS_BY_MIME[mime]
}

export { ALLOWED_TYPES }

/**
 * Calcule un hash SHA-256 du fichier pour audit (preuve d'intégrité).
 * Ne PAS utiliser pour de la crypto (juste audit).
 */
export async function fileHashSha256(file: File | Blob): Promise<string> {
  const ab = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', ab)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
