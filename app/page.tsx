const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#2b3a2a', padding: '0 52px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.06em' }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/catalogue" style={{ color: 'rgba(248,244,236,0.7)', fontSize: '14px', textDecoration: 'none' }}>Nos produits</a>
          <a href="/onboard" style={{ color: 'rgba(248,244,236,0.7)', fontSize: '14px', textDecoration: 'none' }}>Simulateur</a>
          <a href="/login" style={{ color: 'rgba(248,244,236,0.7)', fontSize: '14px', textDecoration: 'none' }}>Connexion</a>
          <a href="/register" style={{
            padding: '9px 22px', background: GOLD, color: 'white',
            borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500,
          }}>
            Commencer
          </a>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '96px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', background: '#e8f5e9', color: FOREST, fontSize: '13px', fontWeight: 500, marginBottom: '28px', letterSpacing: '0.04em' }}>
          ✓ Certifié conforme à la charia
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '52px', color: FOREST, lineHeight: '1.2', margin: '0 0 24px', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>
          Faites croître votre patrimoine<br />
          <span style={{ color: GOLD }}>selon vos valeurs</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#4b6b49', lineHeight: '1.7', maxWidth: '560px', margin: '0 auto 40px' }}>
          AMANA Patrimoine est le premier cabinet de gestion de patrimoine indépendant 100% halal en France. SCPI, assurance-vie, CTO — sans riba, sans secteurs haram.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/onboard" style={{
            padding: '14px 32px', background: GOLD, color: 'white',
            borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 600,
            boxShadow: '0 4px 20px rgba(201,165,90,0.35)',
          }}>
            Lancer ma simulation →
          </a>
          <a href="/catalogue" style={{
            padding: '14px 32px', background: 'white', color: FOREST,
            borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 500,
            border: '1px solid #d4c9a8',
          }}>
            Voir les produits
          </a>
        </div>
      </div>

      {/* Chiffres cles */}
      <div style={{ background: '#2b3a2a', padding: '56px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', textAlign: 'center' }}>
          {[
            { val: '100%', label: 'Produits certifiés halal' },
            { val: '0%', label: 'Riba (intérêts) dans nos solutions' },
            { val: '48h', label: 'Délai de traitement KYC' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '8px 32px', borderRight: i < 2 ? '1px solid rgba(248,244,236,0.1)' : 'none' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '40px', color: GOLD, fontWeight: 600, marginBottom: '8px' }}>{s.val}</div>
              <div style={{ fontSize: '14px', color: 'rgba(248,244,236,0.6)', lineHeight: '1.5' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Solutions */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 24px' }}>
        <p style={{ fontSize: '13px', color: '#6b7f6a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', textAlign: 'center' }}>Nos solutions</p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: FOREST, textAlign: 'center', margin: '0 0 48px' }}>
          Des produits sélectionnés pour vous
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            {
              icon: '🏢',
              titre: 'SCPI Halal',
              desc: 'Investissez dans l\'immobilier professionnel européen. Revenus locatifs réguliers sans endettement à intérêt.',
              rendement: '5 – 7%',
              tag: 'Pierre-papier',
            },
            {
              icon: '🛡️',
              titre: 'Assurance-vie',
              desc: 'Épargne long terme en unités de compte 100% conformes. Sukuk, fonds ISR, gestion pilotée halal.',
              rendement: '3 – 8%',
              tag: 'Épargne',
            },
            {
              icon: '📈',
              titre: 'Actions Halal',
              desc: 'Portefeuille d\'actions screené AAOIFI. Exclusion stricte des secteurs haram, ratio dette contrôlé.',
              rendement: '5 – 12%',
              tag: 'CTO',
            },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 16px rgba(58,77,57,0.07)' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{s.icon}</div>
              <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', background: CREAM, color: '#6b7f6a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                {s.tag}
              </div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: FOREST, margin: '0 0 10px' }}>{s.titre}</h3>
              <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 20px' }}>{s.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7f6a', marginBottom: '2px' }}>Rendement indicatif</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: FOREST, fontWeight: 600 }}>{s.rendement}</div>
                </div>
                <a href="/catalogue" style={{ fontSize: '13px', color: GOLD, textDecoration: 'none', fontWeight: 500 }}>
                  En savoir plus →
                </a>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a href="/catalogue" style={{ fontSize: '15px', color: FOREST, textDecoration: 'none', fontWeight: 500, borderBottom: `2px solid ${GOLD}`, paddingBottom: '2px' }}>
            Voir tous les produits
          </a>
        </div>
      </div>

      {/* Comment ca marche */}
      <div style={{ background: 'white', padding: '80px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', color: '#6b7f6a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', textAlign: 'center' }}>Processus</p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: FOREST, textAlign: 'center', margin: '0 0 48px' }}>
            Simple, rapide, conforme
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>
            {[
              { num: '01', titre: 'Simulation', desc: 'Renseignez votre situation en 6 étapes. Obtenez une allocation personnalisée.' },
              { num: '02', titre: 'KYC', desc: 'Complétez votre dossier réglementaire en ligne. Pièces justificatives incluses.' },
              { num: '03', titre: 'Validation', desc: 'Votre conseiller AMANA examine et valide votre dossier sous 48h.' },
              { num: '04', titre: 'Investissement', desc: 'Sélectionnez vos produits et signez electroniquement votre contrat.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '0 20px', borderRight: i < 3 ? '1px solid #f0ebe0' : 'none', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: GOLD, fontWeight: 600, marginBottom: '12px' }}>{s.num}</div>
                <h4 style={{ fontWeight: 600, color: FOREST, fontSize: '15px', marginBottom: '8px' }}>{s.titre}</h4>
                <p style={{ fontSize: '13px', color: '#6b7f6a', lineHeight: '1.6' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div style={{ background: FOREST, padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: CREAM, margin: '0 0 16px' }}>
          Prêt à investir selon vos convictions ?
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(248,244,236,0.7)', marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px', lineHeight: '1.6' }}>
          Créez votre espace en 2 minutes et lancez votre première simulation patrimoniale halal.
        </p>
        <a href="/register" style={{
          padding: '15px 36px', background: GOLD, color: 'white',
          borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 600,
          display: 'inline-block', boxShadow: '0 4px 20px rgba(201,165,90,0.4)',
        }}>
          Créer mon espace gratuit
        </a>
      </div>

      {/* Footer */}
      <div style={{ background: '#1a2519', padding: '32px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: 'rgba(248,244,236,0.5)', letterSpacing: '0.06em' }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="/catalogue" style={{ fontSize: '13px', color: 'rgba(248,244,236,0.4)', textDecoration: 'none' }}>Produits</a>
          <a href="/onboard" style={{ fontSize: '13px', color: 'rgba(248,244,236,0.4)', textDecoration: 'none' }}>Simulateur</a>
          <a href="/login" style={{ fontSize: '13px', color: 'rgba(248,244,236,0.4)', textDecoration: 'none' }}>Connexion</a>
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(248,244,236,0.3)' }}>
          © 2026 Amana Patrimoine — Cabinet de conseil en gestion de patrimoine
        </span>
      </div>

    </div>
  )
}
