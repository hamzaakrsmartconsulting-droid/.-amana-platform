// app/onboard/result/patrimoniale/page.tsx
// Sprint Agents IA v18 · 30 avril 2026

import Link from 'next/link'
import { CALENDLY_BOOKING_URL } from '@/lib/calendly-url'
import AmanaLogo from '@/components/amana-logo'

export default function OnboardResultPatrimoniale() {
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
            Offre Patrimoniale — accompagnement assisté
          </h2>

          <p className="mt-3 text-sm text-amana-dark">
            Votre patrimoine et votre situation appellent un échange direct
            avec Mohamed avant la signature de la mission. Vous bénéficiez
            d'un rdv visio inclus dans le parcours.
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
                <p className="font-semibold">Réservez votre rdv visio (45 min)</p>
                <p className="text-amana-grey">
                  Mohamed découvre votre situation, valide vos objectifs, et
                  prépare votre Bilan Mizan personnalisé.
                </p>
                <a
                  href={CALENDLY_BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded bg-amana-forest px-4 py-2 text-sm font-semibold text-white hover:bg-amana-dark"
                >
                  Choisir un créneau →
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amana-forest text-white">
                2
              </span>
              <div>
                <p className="font-semibold">
                  Connectez-vous à votre espace AMANA
                </p>
                <p className="text-amana-grey">
                  Utilisez l&apos;email et le mot de passe choisis lors de
                  l&apos;inscription pour accéder à votre{' '}
                  <Link href="/dashboard" className="font-semibold text-amana-forest underline">
                    espace client
                  </Link>{' '}
                  (DER, Bilan Mizan, Préco).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amana-forest text-white">
                3
              </span>
              <div>
                <p className="font-semibold">Complétez votre KYC en ligne</p>
                <p className="text-amana-grey">
                  Pièce d'identité, justificatif de domicile, RIB.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amana-forest text-white">
                4
              </span>
              <div>
                <p className="font-semibold">Validation et souscription</p>
                <p className="text-amana-grey">
                  Après validation visio de la préco, signature de la lettre
                  de mission et souscription des supports recommandés.
                </p>
              </div>
            </li>
          </ol>
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
