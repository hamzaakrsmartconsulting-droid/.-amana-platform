// app/api/dossiers/[id]/ra-prefill/route.ts
// Retourne un objet RaInputs pré-rempli à partir des données KYC + MIF2 + client_facts
// pour initialiser le wizard RA sans repartir de zéro.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return { userId: user.id, role: profile?.role ?? 'client' }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser()
  if (!auth || !['admin', 'manager', 'conseiller'].includes(auth.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id: dossierId } = await params

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Vérifier l'accès au dossier
  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  // Vérification d'accès (admin peut tout voir, conseiller ne voit que ses dossiers)
  if (auth.role === 'conseiller' && dossier.conseiller_id !== auth.userId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Charger KYC
  const { data: kycRow } = await svc
    .from('kyc')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Charger MIF2
  const { data: mif2Row } = await svc
    .from('mif2')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Charger client_facts pour l'ESG et autres préférences
  const { data: facts } = await svc
    .from('client_facts')
    .select('fact_key, fact_value')
    .eq('dossier_id', dossierId)

  const factMap: Record<string, string> = {}
  for (const f of facts ?? []) {
    factMap[f.fact_key] = f.fact_value
  }

  const kyc = (kycRow ?? {}) as Record<string, unknown>
  const mif2 = (mif2Row ?? {}) as Record<string, unknown>

  // Construire le profil MIF2 lisible
  function buildProfilMif2(): string {
    if (mif2.profil_risque) return String(mif2.profil_risque)
    const score = Number(mif2.score_total ?? mif2.score_risque ?? 0)
    if (score <= 3) return 'prudent'
    if (score <= 6) return 'équilibré'
    if (score <= 8) return 'dynamique'
    return 'offensif'
  }

  function buildObjectifInvestissement(): string {
    const obj = kyc.objectif_investissement as string
    const map: Record<string, string> = {
      epargne_retraite:      'Constitution d\'une épargne retraite',
      protection_famille:    'Protection de la famille et transmission',
      valorisation_capital:  'Valorisation du capital à long terme',
      revenus_complementaires: 'Génération de revenus complémentaires',
      immobilier:            'Investissement immobilier (financements halal)',
    }
    return map[obj] ?? obj ?? 'Non renseigné'
  }

  function buildHorizonPlacement(): string {
    const h = kyc.horizon_placement as string ?? mif2.horizon_placement as string
    const map: Record<string, string> = {
      court_terme:  'Court terme (< 3 ans)',
      moyen_terme:  'Moyen terme (3 – 8 ans)',
      long_terme:   'Long terme (> 8 ans)',
    }
    return map[h] ?? h ?? 'Non renseigné'
  }

  function buildCapaciteFinanciere(): string {
    const capacite = kyc.capacite_epargne_mensuelle as string
    if (!capacite) return ''
    return `Capacité d'épargne mensuelle : ${capacite} €`
  }

  function buildConnaissancesInvestissement(): string {
    const niveau = mif2.niveau_connaissance as string ?? mif2.experience_financiere as string
    const map: Record<string, string> = {
      aucune:          'Aucune expérience des marchés financiers',
      limitee:         'Connaissance limitée — produits simples uniquement',
      intermediaire:   'Connaissance intermédiaire — fonds et obligations',
      avancee:         'Connaissance avancée — marchés actions, produits structurés',
    }
    return map[niveau] ?? niveau ?? 'Non renseigné'
  }

  // Profil ESG depuis client_facts ou MIF2
  const esgPreference =
    factMap['esg_preference'] ??
    factMap['esg'] ??
    String(mif2.esg_preference ?? mif2.preferences_durabilite ?? '')

  const prefill = {
    client_nom:                [dossier.prenom, dossier.nom].filter(Boolean).join(' '),
    profil_mif2:               buildProfilMif2(),
    score_mif2:                String(mif2.score_total ?? mif2.score_risque ?? ''),
    kyc_note_risque:           String(kyc.kyc_note_risque ?? ''),
    objectif_investissement:   buildObjectifInvestissement(),
    horizon_placement:         buildHorizonPlacement(),
    esg_preference:            esgPreference || '',
    capacite_financiere:       buildCapaciteFinanciere(),
    connaissances_investissement: buildConnaissancesInvestissement(),
    patrimoine_net:            String(kyc.patrimoine_net ?? ''),
    revenu_foyer:              String(kyc.revenu_foyer ?? ''),
    bilan_mizan_date:          new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
  }

  return NextResponse.json({ ok: true, prefill })
}
