import AmanaLogo from '@/components/amana-logo'

// TODO: Définir NEXT_PUBLIC_ORIAS_NUM dans .env.local et Vercel
// Exemple: NEXT_PUBLIC_ORIAS_NUM=12345678
const ORIAS_NUM = process.env.NEXT_PUBLIC_ORIAS_NUM ?? '00000000'
const GOLD = '#c9a55a'
const DARK = '#353b32'

export default function FooterLegal() {
  return (
    <footer style={{
      background: DARK,
      padding: '24px 40px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div className="footer-legal-inner" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <AmanaLogo href="/" height={36} />
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              { label: 'Mentions légales', href: '/mentions-legales' },
              { label: 'CGU', href: '/cgu' },
              { label: 'Confidentialité', href: '/confidentialite' },
              { label: 'Entrée en relation', href: '/der' },
            ].map(l => (
              <a key={l.href} href={l.href} style={{
                fontSize: '12px',
                color: 'rgba(248,244,236,0.4)',
                textDecoration: 'none',
              }}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '16px',
          fontSize: '11px',
          color: 'rgba(248,244,236,0.25)',
          lineHeight: '1.8',
        }}>
          <p style={{ margin: '0 0 3px' }}>
            <strong style={{ color: 'rgba(248,244,236,0.45)', fontWeight: 600 }}>AMANA Patrimoine</strong>
            {' '}— SARL au capital de 1 000 € — RCS Paris n° 98845843600017
          </p>
          <p style={{ margin: '0 0 3px' }}>
            Enregistré à l&apos;<strong style={{ fontWeight: 600, color: 'rgba(248,244,236,0.4)' }}>ORIAS</strong>{' '}
            sous le numéro{' '}
            <strong style={{ fontWeight: 600, color: GOLD }}>{ORIAS_NUM}</strong>
            {' '}—{' '}
            <a
              href="https://www.orias.fr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(248,244,236,0.35)', textDecoration: 'underline' }}
            >
              www.orias.fr
            </a>
          </p>
          <p style={{ margin: '0 0 3px' }}>
            Statuts :{' '}
            <strong style={{ color: 'rgba(248,244,236,0.4)', fontWeight: 600 }}>CIF</strong> (AMF){' '}·{' '}
            <strong style={{ color: 'rgba(248,244,236,0.4)', fontWeight: 600 }}>COA</strong>{' '}·{' '}
            <strong style={{ color: 'rgba(248,244,236,0.4)', fontWeight: 600 }}>COBSP/MIOBSP</strong>
          </p>
          <p style={{ margin: 0 }}>
            Membre de l&apos;<strong style={{ color: 'rgba(248,244,236,0.4)', fontWeight: 600 }}>ANACOFI</strong>
            {' '}— association professionnelle agréée par l&apos;AMF.
            Activité sous le contrôle de l&apos;<strong style={{ color: 'rgba(248,244,236,0.4)', fontWeight: 600 }}>AMF</strong>{' '}
            et de l&apos;<strong style={{ color: 'rgba(248,244,236,0.4)', fontWeight: 600 }}>ACPR</strong>.
          </p>
        </div>
      </div>
    </footer>
  )
}
