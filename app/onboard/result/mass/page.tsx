// app/onboard/result/mass/page.tsx
// Sprint Agents IA v18 · 30 avril 2026

import Link from 'next/link'
import AmanaLogo from '@/components/amana-logo'

export default function OnboardResultMass() {
  return (
    <div className="min-h-screen bg-amana-cream font-sans">
      <div className="mx-auto max-w-2xl p-6">
        <header className="mb-8 text-center">
          <div className="flex justify-center">
            <AmanaLogo height={72} href="/" variant="dark" />
          </div>
        </header>

        <main className="rounded-lg border border-amana-grey-light bg-white p-6 shadow-sm">
          <div className="rounded border-l-4 border-amana-gold bg-amana-cream p-4 text-center">
            <p className="text-2xl">✓</p>
            <p className="mt-2 font-semibold text-amana-forest">
              Votre espace AMANA est créé
            </p>
          </div>

          <h2 className="mt-6 text-xl font-bold text-amana-forest">
            Offre Mass — parcours 100% digital
          </h2>

          <p className="mt-3 text-sm text-amana-dark">
            Vous bénéficiez d'un parcours autonome, sans rdv obligatoire. AMANA
            vous accompagne par étapes claires, à votre rythme.
          </p>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-amana-forest">
            Prochaines étapes
          </h3>
          <ol className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amana-forest text-white">
                1
              </span>
              <div>
                <p className="font-semibold">Accédez à votre espace</p>
                <p className="text-amana-grey">
                  Vous êtes connecté avec l&apos;email et le mot de passe choisis.
                  Rendez-vous sur votre{' '}
                  <Link href="/dashboard" className="font-semibold text-amana-forest underline">
                    espace client
                  </Link>{' '}
                  pour commencer. Un email de bienvenue avec votre DER peut aussi
                  vous parvenir sous quelques minutes.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amana-forest text-white">
                2
              </span>
              <div>
                <p className="font-semibold">Complétez votre KYC en ligne</p>
                <p className="text-amana-grey">
                  Pièce d'identité, justificatif de domicile, RIB. Tout est
                  fait depuis votre espace, en quelques minutes.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amana-forest text-white">
                3
              </span>
              <div>
                <p className="font-semibold">Recevez votre DER à signer</p>
                <p className="text-amana-grey">
                  Le Document d'Entrée en Relation est généré automatiquement
                  et envoyé en signature électronique sécurisée (Yousign).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amana-forest text-white">
                4
              </span>
              <div>
                <p className="font-semibold">Découvrez votre allocation cible</p>
                <p className="text-amana-grey">
                  Bilan Mizan + préconisation patrimoniale générés sur la base
                  de vos réponses. Souscription en quelques clics.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-6 rounded border border-amana-gold bg-white p-4">
            <p className="text-sm">
              <span className="font-semibold text-amana-forest">
                Une question, un doute ?
              </span>{' '}
              Vous pouvez à tout moment demander un échange visio depuis votre
              espace. Mohamed se rend disponible sous 48h ouvrées.
            </p>
          </div>
        </main>

        <footer className="mt-8 text-center text-xs text-amana-grey">
          AMANA Patrimoine · SAS · ORIAS 25009552 ·{' '}
          <Link href="/" className="underline">
            Retour au site
          </Link>
        </footer>
      </div>
    </div>
  )
}
