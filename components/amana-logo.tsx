import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'

type AmanaLogoProps = {
  height?: number
  href?: string
  alt?: string
}

export default function AmanaLogo({
  height = 48,
  href,
  alt = 'AMANA Patrimoine',
}: AmanaLogoProps) {
  const img = (
    <img
      src={AMANA_LOGO_BASE64}
      alt={alt}
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  )

  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none', lineHeight: 0 }}>
        {img}
      </a>
    )
  }

  return img
}
