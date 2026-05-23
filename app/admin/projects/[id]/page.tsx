// app/admin/projects/[id]/page.tsx
//
// Page admin dédiée à une souscription complémentaire (pipeline additionnel).
// Volontairement plus légère que /admin/dossiers/[id] : on n'affiche QUE
// ce qui concerne le project (pas tout l'historique du dossier client).
//
// Visible :
//   - Identité résumée du client (avec lien vers le dossier complet)
//   - Infos du project (produit, montant, stage, statut)
//   - Documents générés POUR CE PROJECT uniquement (documents.project_id)
//   - Boutons de génération rapide LM / RA / Bilan / Bulletin (propagent project_id)
//   - Historique des transitions de stage du project

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProjectManualTargets,
  PROJECT_STAGE_LABEL,
  type ProjectStage,
} from '@/lib/workflow/project-pipeline-stages'

type Project = {
  id: string
  user_id: string
  conseiller_id: string | null
  dossier_id: string | null
  type: string
  montant: number | null
  statut: string
  pipeline_stage: string
  pipeline_stage_updated_at: string
  created_at: string
  updated_at: string
  client_prenom: string | null
  client_nom: string | null
  client_email: string | null
  client_offre: 'mass' | 'patrimoniale' | 'premium' | null
  product_id: string | null
  product_nom: string | null
  product_gestionnaire: string | null
  docs_count: number
  metadata: Record<string, unknown> | null
}

type ProjectDoc = {
  id: string
  type: string
  filename: string
  storage_path: string | null
  status: string | null
  yousign_status: string | null
  yousign_signature_request_id: string | null
  yousign_signed_at: string | null
  created_at: string
  project_id: string | null
}

type ProjectHistory = {
  id: string
  from_stage: string | null
  to_stage: string
  triggered_by: string
  notes: string | null
  created_at: string
}

const DOC_LABEL: Record<string, string> = {
  der: 'DER',
  lm: 'Lettre de mission',
  ra: 'Rapport d\'adéquation',
  bilan: 'Bilan patrimonial',
  preco: 'Préco allocation',
  bulletin: 'Bulletin de souscription',
  zakat: 'Calendrier zakat',
  succession: 'Stratégie successorale',
  profil_risque: 'Profil de risque',
}

const QUICK_DOCS: Array<{ type: string; label: string }> = [
  { type: 'lm',       label: 'Lettre de mission' },
  { type: 'ra',       label: 'Rapport d\'adéquation' },
  { type: 'bilan',    label: 'Bilan patrimonial' },
  { type: 'bulletin', label: 'Bulletin' },
]

export default function AdminProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const projectId = params.id

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<ProjectDoc[]>([])
  const [history, setHistory] = useState<ProjectHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<ProjectStage | ''>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/projects/${projectId}`)
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Erreur chargement')
      setProject(d.project as Project)
      setDocuments(d.documents as ProjectDoc[])
      setHistory(d.history as ProjectHistory[])
      const targets = getProjectManualTargets(
        (d.project as Project).pipeline_stage as ProjectStage,
      )
      setSelectedTarget(targets[0] ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const handleTransition = async () => {
    if (!project || !selectedTarget) return
    const stage = project.pipeline_stage as ProjectStage
    const label = PROJECT_STAGE_LABEL[selectedTarget]
    if (!window.confirm(`Déplacer la souscription : ${PROJECT_STAGE_LABEL[stage]} → ${label} ?`)) {
      return
    }
    setMoving(true)
    try {
      const r = await fetch('/api/admin/projects-pipeline/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          to_stage: selectedTarget,
          notes: `Déplacement manuel depuis fiche projet : ${stage} → ${selectedTarget}`,
          trigger_context: { source: 'project_detail_page' },
        }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      await load()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur déplacement')
    } finally {
      setMoving(false)
    }
  }

  if (loading) return <div className="p-6 text-amana-grey">Chargement…</div>
  if (error || !project) {
    return (
      <div className="p-6">
        <p className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error ?? 'Project introuvable'}
        </p>
        <Link href="/admin/pipeline" className="mt-3 inline-block text-sm text-amana-forest underline">
          ← Retour au pipeline
        </Link>
      </div>
    )
  }

  const stage = project.pipeline_stage as ProjectStage
  const manualTargets = getProjectManualTargets(stage)
  const stageLabel = PROJECT_STAGE_LABEL[stage] ?? stage
  const clientName =
    `${project.client_prenom ?? ''} ${project.client_nom ?? ''}`.trim() ||
    project.client_email ||
    '—'

  return (
    <div className="min-h-screen bg-amana-cream">
      <div className="mx-auto max-w-5xl p-6">
        {/* Header */}
        <div className="mb-4 text-xs text-amana-grey">
          <Link href="/admin/pipeline" className="hover:underline">Pipeline</Link>
          {' › '}
          <span>Souscription complémentaire</span>
        </div>

        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-amana-forest">
              {project.product_nom ?? project.type}
            </h1>
            <p className="mt-1 text-sm text-amana-grey">
              Souscription de <strong className="text-amana-dark">{clientName}</strong>
              {project.dossier_id && (
                <>
                  {' · '}
                  <Link
                    href={`/admin/dossiers/${project.dossier_id}`}
                    className="text-amana-forest underline hover:opacity-80"
                  >
                    voir le dossier client complet
                  </Link>
                </>
              )}
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: '#3a4d39', color: 'white' }}
          >
            {stageLabel}
          </span>
        </header>

        {error && (
          <div className="mb-3 rounded border-l-4 border-red-500 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Bloc identité client */}
        <section className="mb-5 rounded bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amana-grey">
            Identité client
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-amana-grey">Nom</p>
              <p className="font-medium text-amana-dark">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-amana-grey">Email</p>
              <p className="font-medium text-amana-dark">{project.client_email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-amana-grey">Offre AMANA</p>
              <p className="font-medium text-amana-dark">
                {project.client_offre ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-amana-grey">Project ID</p>
              <p className="font-mono text-[11px] text-amana-grey">{project.id}</p>
            </div>
          </div>
        </section>

        {/* Bloc projet */}
        <section className="mb-5 rounded bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amana-grey">
            Souscription
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-amana-grey">Produit</p>
              <p className="font-medium text-amana-dark">
                {project.product_nom ?? project.type}
              </p>
              {project.product_gestionnaire && (
                <p className="text-xs text-amana-grey">{project.product_gestionnaire}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-amana-grey">Montant</p>
              <p className="text-lg font-semibold text-amana-dark">
                {project.montant != null
                  ? `${project.montant.toLocaleString('fr-FR')} €`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-amana-grey">Statut</p>
              <p className="font-medium text-amana-dark">{project.statut}</p>
            </div>
            <div>
              <p className="text-xs text-amana-grey">Étape pipeline</p>
              <p className="font-medium text-amana-dark">{stageLabel}</p>
            </div>
            <div>
              <p className="text-xs text-amana-grey">Créée le</p>
              <p className="text-amana-dark">
                {new Date(project.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-amana-grey">Dernière mise à jour stage</p>
              <p className="text-amana-dark">
                {new Date(project.pipeline_stage_updated_at).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Transition manuelle */}
          {manualTargets.length > 0 && (
            <div className="mt-4 flex items-center gap-2 border-t border-amana-grey-light pt-3">
              <span className="text-xs text-amana-grey">Déplacer vers :</span>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value as ProjectStage)}
                disabled={moving}
                className="rounded border border-amana-grey-light px-2 py-1 text-sm"
              >
                {manualTargets.map((t) => (
                  <option key={t} value={t}>
                    → {PROJECT_STAGE_LABEL[t]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={moving || !selectedTarget}
                onClick={() => void handleTransition()}
                className="rounded bg-amana-forest px-3 py-1 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {moving ? 'Déplacement…' : 'Appliquer'}
              </button>
            </div>
          )}
        </section>

        {/* Génération rapide de documents POUR CE PROJET */}
        {project.dossier_id && (
          <section className="mb-5 rounded bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amana-grey">
              Générer un document pour cette souscription
            </h2>
            <p className="mb-3 text-xs text-amana-grey">
              Les documents générés ici sont rattachés à ce project et n'apparaîtront
              pas dans l'historique général du dossier client.
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_DOCS.map(({ type, label }) => (
                <Link
                  key={type}
                  href={`/admin/dossiers/${project.dossier_id}/generate-doc/${type}?project_id=${project.id}`}
                  className="rounded bg-amana-forest px-3 py-1.5 text-xs font-semibold text-white hover:opacity-80"
                >
                  + {label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Documents liés au project */}
        <section className="mb-5 rounded bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amana-grey">
            Documents de cette souscription ({documents.length})
          </h2>
          {documents.length === 0 ? (
            <p className="rounded bg-amana-cream p-3 text-center text-sm text-amana-grey">
              Aucun document généré pour cette souscription pour l'instant.
              <br />
              <span className="text-xs">Utilisez les boutons ci-dessus pour créer la LM, le RA et le Bilan.</span>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amana-grey-light text-left text-xs uppercase tracking-wide text-amana-grey">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Fichier</th>
                    <th className="py-2 pr-3">Signature</th>
                    <th className="py-2 pr-3">Généré</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b border-amana-grey-light/40">
                      <td className="py-2 pr-3 font-medium text-amana-dark">
                        {DOC_LABEL[d.type] ?? d.type}
                      </td>
                      <td className="py-2 pr-3 text-amana-grey">{d.filename}</td>
                      <td className="py-2 pr-3">
                        {d.yousign_status === 'signed' ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ✓ Signé
                          </span>
                        ) : d.yousign_status === 'pending' ? (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            En attente
                          </span>
                        ) : (
                          <span className="text-xs text-amana-grey">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-amana-grey">
                        {new Date(d.created_at).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Historique pipeline du project */}
        <section className="mb-5 rounded bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amana-grey">
            Historique étapes ({history.length})
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-amana-grey">Aucune transition encore.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="border-l-2 border-amana-gold pl-3">
                  <p className="text-amana-dark">
                    {h.from_stage
                      ? `${PROJECT_STAGE_LABEL[h.from_stage as ProjectStage] ?? h.from_stage} → `
                      : ''}
                    <strong>{PROJECT_STAGE_LABEL[h.to_stage as ProjectStage] ?? h.to_stage}</strong>
                  </p>
                  {h.notes && <p className="text-xs text-amana-grey">{h.notes}</p>}
                  <p className="text-[11px] text-amana-grey">
                    {new Date(h.created_at).toLocaleString('fr-FR')} · {h.triggered_by}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
