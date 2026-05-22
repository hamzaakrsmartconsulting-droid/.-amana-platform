import './globals.css'
import type { Metadata } from 'next'
import FooterLegal from '@/components/footer-legal'
import AuthSessionBootstrap from '@/components/auth-session-bootstrap'

export const metadata: Metadata = {
  title: 'AMANA Patrimoine — Gestion de patrimoine islamique',
  description: 'Cabinet de conseil en gestion de patrimoine spécialisé dans les solutions financières conformes aux principes islamiques.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthSessionBootstrap />
        {children}
        <FooterLegal />
      </body>
    </html>
  )
}
