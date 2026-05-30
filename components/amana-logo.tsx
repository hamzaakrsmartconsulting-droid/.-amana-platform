'use client'

import { AMANA_LOGO_BASE64 } from '@/lib/documents/logo-base64'

const LOGO_SRC = {
  default: '/amana-logo.png',
  dark: '/amana-logo-dark.png',
} as const

type AmanaLogoProps = {
  height?: number
  href?: string
  alt?: string
  variant?: keyof typeof LOGO_SRC
}

export default function AmanaLogo({
  height = 48,
  href,
  alt = 'AMANA Patrimoine',
  variant = 'default',
}: AmanaLogoProps) {
  const src = LOGO_SRC[variant]

  const img = (
    <img
      src={src}
      alt={alt}
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }}
      onError={(e) => {
        const target = e.currentTarget
        if (target.src.includes(src)) {
          target.src = AMANA_LOGO_BASE64
        }
      }}
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
