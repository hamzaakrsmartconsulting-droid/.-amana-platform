// app/onboard/result/premium/page.tsx
// Sprint Agents IA v18 · 30 avril 2026

import Link from 'next/link'
import { CALENDLY_BOOKING_URL } from '@/lib/calendly-url'
import AmanaLogo from '@/components/amana-logo'

export default function OnboardResultPremium() {
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
              Votre situation appelle un accompagnement Premium
            </p>
          </div>

          <h2 className="mt-6 text-xl font-bold text-amana-forest">
            Offre Premium — sur-mesure
          </h2>

          <p className="mt-3 text-sm text-amana-dark">
            Votre patrimoine et la complexité de votre situation justifient un
            accompagnement personnalisé par Mohamed Mosbahi, fondateur d'AMANA
            Patrimoine. Pas d'algorithme générique : un travail sur mesure,
            articulé avec votre notaire, votre fiscaliste et le référent
            Sharia (Sakina Consulting) si nécessaire.
          </p>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-amana-forest">
            Le parcours Premium
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-amana-gold">•</span>
              <span>
                Premier rdv découverte (1h, visio ou présentiel) pour cadrer en
                profondeur votre situation et vos objectifs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amana-gold">•</span>
              <span>
                Diagnostic patrimonial complet : Bilan Mizan, analyse Sharia
                approfondie, diagnostic successoral, cartographie fiscale.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amana-gold">•</span>
              <span>
                Articulation avec votre notaire, fiscaliste, expert-comptable
                — Mohamed est le chef d'orchestre de votre patrimoine.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amana-gold">•</span>
              <span>
                Suivi régulier (rdv trimestriels) et points stratégiques aux
                événements clés de votre vie.
              </span>
            </li>
          </ul>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-amana-forest">
            Prochaine étape
          </h3>
          <p className="mt-2 text-sm">
            Mohamed vous propose un premier rdv découverte gratuit pour
            comprendre votre situation et déterminer si un accompagnement
            AMANA Premium est adapté pour vous.
          </p>
          <a
            href={CALENDLY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded bg-amana-forest px-6 py-3 text-sm font-semibold text-white hover:bg-amana-dark"
          >
            Réserver un rdv découverte (1h, gratuit) →
          </a>

          <p className="mt-6 text-xs text-amana-grey">
            Votre espace AMANA est créé : connectez-vous avec l&apos;email et le
            mot de passe choisis lors de l&apos;inscription via{' '}
            <Link href="/auth" className="underline">
              la page de connexion
            </Link>
            . Vous pourrez y déposer documents et notes en amont du rdv pour
            optimiser notre échange.
          </p>
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
