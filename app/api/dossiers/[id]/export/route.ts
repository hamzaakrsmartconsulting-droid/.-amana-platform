// app/api/dossiers/[id]/export/route.ts
// Sprint Agents IA v7 · 29 avril 2026
// Export RGPD d'un dossier (Art. 15 droit d'accès + Art. 20 portabilité)
// Retourne un JSON structuré avec : dossier + facts + métadonnées
//
// Note : pour la v7, on exporte le contenu de la base. Les documents Storage liés
// (KYC) restent à part (à intégrer en sprint v8 si besoin avec un ZIP combiné).

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getDossier } from '@/lib/dossiers/dossier-service'
import { listClientFacts } from '@/lib/agents/client-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(): Promise<{ authorized: boolean; userId?: string; role?: string }> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { authorized: true, userId: user.id, role: profile?.role ?? 'client' }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const dossier = await getDossier(id)
  if (!dossier) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  const isOwner = dossier.conseiller_id === auth.userId
  const isAdmin = auth.role === 'admin'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const facts = await listClientFacts(auth.userId, id)

  // Audit log de l'export
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  await supabase.from('audit_logs').insert({
    user_id: auth.userId,
    action: 'dossier.export',
    entity_type: 'dossier',
    entity_id: id,
    metadata: {
      facts_exported_count: facts.length,
      reason: 'rgpd_art15_art20',
      timestamp: new Date().toISOString(),
    },
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null,
    user_agent: request.headers.get('user-agent') ?? null,
  })

  // Construction du payload export RGPD
  const exportPayload = {
    export_metadata: {
      generated_at: new Date().toISOString(),
      legal_basis: 'RGPD Art. 15 (droit d\'accès) + Art. 20 (portabilité)',
      controller: 'AMANA Patrimoine',
      controller_rcs: '988458436',
      data_subject_dossier_id: id,
      exported_by_user_id: auth.userId,
      exported_by_role: auth.role,
    },
    dossier: {
      id: dossier.id,
      nom: dossier.nom,
      prenom: dossier.prenom,
      email_client: dossier.email_client,
      telephone: dossier.telephone,
      statut: dossier.statut,
      offre_amana_cible: dossier.offre_amana_cible,
      notes: dossier.notes,
      created_at: dossier.created_at,
      updated_at: dossier.updated_at,
      archived_at: dossier.archived_at,
    },
    facts: facts.map((f) => ({
      key: f.fact_key,
      value: f.fact_value,
      source_agent: f.source_agent,
      confidence: f.confidence,
      updated_at: f.updated_at,
    })),
    facts_count: facts.length,
    notice: [
      'Ce fichier représente l\'ensemble des données structurées détenues par AMANA Patrimoine sur ce dossier.',
      'Les documents KYC (pièce d\'identité, justificatif de domicile, RIB, résidence fiscale) sont stockés séparément dans le bucket sécurisé Supabase Storage et exportables sur demande individuelle.',
      'Les conversations historiques avec les agents IA seront ajoutées à l\'export au sprint v8 (persistence des conversations).',
      'Pour exercer un droit de rectification (Art. 16) ou d\'effacement (Art. 17), contacter mmosbahi@gmail.com.',
    ],
  }

  // Headers : forcer le téléchargement avec un nom de fichier explicite
  const filename = `amana_export_${dossier.prenom}_${dossier.nom}_${id.slice(0, 8)}.json`
    .replace(/[^a-zA-Z0-9_.-]/g, '_')

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
