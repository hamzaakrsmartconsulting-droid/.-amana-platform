// app/admin/pipeline/page.tsx
// Sprint Agents IA v19 · 30 avril 2026
//
// Vue Kanban du pipeline AMANA pour Mohamed.
// Colonnes = stages, cards = dossiers. Drag-drop optionnel (v2).
// v1 = lecture + clic pour ouvrir le détail dossier.

'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import {
  getManualPipelineTargets,
  PIPELINE_STAGE_LABEL,
  type PipelineStage,
} from '@/lib/workflow/pipeline-stages'
import {
  getProjectManualTargets,
  PROJECT_STAGE_LABEL,
  type ProjectStage,
} from '@/lib/workflow/project-pipeline-stages'

type DossierRow = {
  id: string
  prenom: string
  nom: string
  email_client: string | null
  statut: string
  offre_amana_cible: 'mass' | 'patrimoniale' | 'premium' | null
  pipeline_stage: string
  pipeline_stage_updated_at: string
  updated_at: string
  docs_count: number
  compliance_checks_recent: number
  critical_alerts_open: number
}

const STAGES_ACTIVE: Array<{ key: string; label: string; color: string }> = [
  { key: 'nouveau', label: 'Nouveau', color: '#9ca3af' },
  { key: 'criblage', label: 'Criblage', color: '#f59e0b' },
  { key: 'kyc_attente', label: 'KYC en attente', color: '#fbbf24' },
  { key: 'kyc_complet', label: 'KYC complet', color: '#10b981' },
  {
    key: 'lm_envoyee',
    label: 'LM / RA / KYC / Bilan / relevé frais',
    color: '#8b5cf6',
  },
  { key: 'souscription', label: 'Souscription', color: '#f43f5e' },
  { key: 'actif', label: 'Actif', color: '#16a34a' },
  { key: 'suivi', label: 'Suivi', color: '#84cc16' },
]

/** Colonnes Kanban : regroupe plusieurs pipeline_stage DB (étapes masquées). */
const COLUMN_STAGE_KEYS: Record<string, string[]> = {
  lm_envoyee: ['lm_envoyee', 'der_envoye', 'der_signe', 'bilan_genere', 'lm_signee'],
}

/** Étapes de la colonne LM/RA/KYC/Bilan — pas de validation ni déplacement depuis le Kanban. */
const LM_RA_KANBAN_COLUMN_STAGES = new Set(COLUMN_STAGE_KEYS.lm_envoyee)

const STAGES_SIDE: Array<{ key: string; label: string; color: string }> = [
  { key: 'bloque', label: 'Bloqué', color: '#dc2626' },
  { key: 'archive', label: 'Archivé', color: '#6b7280' },
]

const OFFRE_LABEL: Record<string, string> = {
  mass: 'Mass',
  patrimoniale: 'Pat.',
  premium: 'Prem.',
}

const OFFRE_COLOR: Record<string, string> = {
  mass: '#84cc16',
  patrimoniale: '#3b82f6',
  premium: '#a855f7',
}

// =====================================================================
// Pipeline additionnel (souscriptions complémentaires) — 2e Kanban
// =====================================================================

type ProjectRow = {
  id: string
  user_id: string
  conseiller_id: string | null
  dossier_id: string | null
  type: string
  montant: number | null
  statut: string
  pipeline_stage: string
  pipeline_stage_updated_at: string
  client_prenom: string | null
  client_nom: string | null
  client_email: string | null
  client_offre: 'mass' | 'patrimoniale' | 'premium' | null
  product_id: string | null
  product_nom: string | null
  product_gestionnaire: string | null
  docs_count: number
}

const PROJECT_STAGES_ACTIVE: Array<{ key: ProjectStage; color: string }> = [
  { key: 'nouveau',        color: '#9ca3af' },
  { key: 'docs_a_generer', color: '#f59e0b' },
  { key: 'lm_ra_envoyes',  color: '#8b5cf6' },
  { key: 'signes',         color: '#06b6d4' },
  { key: 'souscription',   color: '#f43f5e' },
  { key: 'actif',          color: '#16a34a' },
  { key: 'suivi',          color: '#84cc16' },
]

const PROJECT_STAGES_SIDE: Array<{ key: ProjectStage; color: string }> = [
  { key: 'bloque',  color: '#dc2626' },
  { key: 'archive', color: '#6b7280' },
]

export default function AdminPipelinePage() {
  const [rows, setRows] = useState<DossierRow[]>([])
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadPipeline()
  }, [])

  const loadPipeline = async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/pipeline/list'),
        fetch('/api/admin/projects-pipeline/list'),
      ])
      const d1 = await r1.json()
      if (!d1.ok) throw new Error(d1.error ?? 'Erreur chargement pipeline principal')
      setRows(d1.rows as DossierRow[])

      const d2 = await r2.json()
      if (d2.ok) {
        setProjectRows(d2.rows as ProjectRow[])
      } else {
        // Le pipeline additionnel ne doit pas bloquer le pipeline principal.
        console.warn('[pipeline] additionnel non chargé :', d2.error)
        setProjectRows([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const dossiersForColumn = (columnKey: string) => {
    const stages = COLUMN_STAGE_KEYS[columnKey] ?? [columnKey]
    return rows.filter((r) => stages.includes(r.pipeline_stage))
  }

  const totalActive = rows.filter(
    (r) => !['bloque', 'archive'].includes(r.pipeline_stage)
  ).length
  const totalBloque = rows.filter((r) => r.pipeline_stage === 'bloque').length

  if (loading) return <div className="p-6 text-amana-grey">Chargement…</div>

  return (
    <div className="min-h-screen bg-amana-cream">
      <div className="mx-auto max-w-screen-2xl p-4">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-amana-forest">
              Pipeline AMANA
            </h1>
            <p className="text-sm text-amana-grey">
              {totalActive} dossier{totalActive > 1 ? 's' : ''} actif
              {totalActive > 1 ? 's' : ''} ·{' '}
              <span className="text-red-600">{totalBloque} bloqué{totalBloque > 1 ? 's' : ''}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadPipeline()}
              className="rounded border border-amana-forest px-3 py-1 text-xs text-amana-forest hover:bg-amana-cream"
            >
              Recharger
            </button>
            <Link
              href="/admin/dossiers"
              className="rounded border border-amana-grey-light px-3 py-1 text-xs text-amana-grey hover:bg-white"
            >
              Liste classique
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-3 rounded border-l-4 border-red-500 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Pipeline principal — scroll horizontal */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES_ACTIVE.map((s) => {
            const items = dossiersForColumn(s.key)
            return (
              <div
                key={s.key}
                className="flex w-64 flex-shrink-0 flex-col rounded bg-white shadow-sm"
              >
                <div
                  className="rounded-t border-b-4 px-3 py-2 text-sm font-semibold"
                  style={{ borderBottomColor: s.color, color: s.color }}
                >
                  {s.label} ({items.length})
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {items.length === 0 && (
                    <p className="py-4 text-center text-xs text-amana-grey">
                      Aucun dossier
                    </p>
                  )}
                  {items.map((d) => (
                    <DossierCard key={d.id} dossier={d} onRefresh={loadPipeline} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bloqués + Archivés */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STAGES_SIDE.map((s) => {
            const items = dossiersForColumn(s.key)
            if (items.length === 0) return null
            return (
              <div key={s.key} className="rounded bg-white p-3 shadow-sm">
                <h3
                  className="mb-2 text-sm font-semibold"
                  style={{ color: s.color }}
                >
                  {s.label} ({items.length})
                </h3>
                <div className="space-y-2">
                  {items.map((d) => (
                    <DossierCard key={d.id} dossier={d} onRefresh={loadPipeline} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ============================================================ */}
        {/* 2e Kanban : Pipeline souscriptions complémentaires (projects)*/}
        {/* ============================================================ */}
        <div className="mt-10 border-t-2 border-amana-gold/40 pt-6">
          <header className="mb-3">
            <h2 className="text-xl font-semibold text-amana-forest">
              Pipeline souscriptions complémentaires
            </h2>
            <p className="text-sm text-amana-grey">
              {projectRows.filter((r) => !['bloque', 'archive'].includes(r.pipeline_stage)).length} souscription{projectRows.filter((r) => !['bloque', 'archive'].includes(r.pipeline_stage)).length > 1 ? 's' : ''} en cours · clients déjà actifs · workflow LM / RA / Bilan
            </p>
          </header>

          <div className="flex gap-3 overflow-x-auto pb-4">
            {PROJECT_STAGES_ACTIVE.map((s) => {
              const items = projectRows.filter((p) => p.pipeline_stage === s.key)
              return (
                <div
                  key={s.key}
                  className="flex w-64 flex-shrink-0 flex-col rounded bg-white shadow-sm"
                >
                  <div
                    className="rounded-t border-b-4 px-3 py-2 text-sm font-semibold"
                    style={{ borderBottomColor: s.color, color: s.color }}
                  >
                    {PROJECT_STAGE_LABEL[s.key]} ({items.length})
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {items.length === 0 && (
                      <p className="py-4 text-center text-xs text-amana-grey">
                        Aucune souscription
                      </p>
                    )}
                    {items.map((p) => (
                      <ProjectCard key={p.id} project={p} onRefresh={loadPipeline} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Side : bloqué / archivé projets */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROJECT_STAGES_SIDE.map((s) => {
              const items = projectRows.filter((p) => p.pipeline_stage === s.key)
              if (items.length === 0) return null
              return (
                <div key={s.key} className="rounded bg-white p-3 shadow-sm">
                  <h3
                    className="mb-2 text-sm font-semibold"
                    style={{ color: s.color }}
                  >
                    {PROJECT_STAGE_LABEL[s.key]} ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <ProjectCard key={p.id} project={p} onRefresh={loadPipeline} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Pour chaque étape du pipeline, quel document proposer en génération rapide
const STAGE_QUICK_DOC: Record<string, { type: string; label: string }[]> = {
  kyc_complet:  [
    { type: 'der', label: 'DER' },
    { type: 'lm', label: 'LM' },
    { type: 'ra', label: 'RA' },
    { type: 'bilan', label: 'Bilan' },
  ],
  bilan_genere: [{ type: 'preco', label: 'Préco' }, { type: 'bilan', label: 'Bilan' }, { type: 'ra', label: 'RA' }],
  der_envoye:   [{ type: 'lm', label: 'LM' }, { type: 'ra', label: 'RA' }],
  der_signe:    [{ type: 'lm', label: 'LM' }, { type: 'ra', label: 'RA' }],
  lm_envoyee:   [
    { type: 'lm', label: 'LM' },
    { type: 'ra', label: 'RA' },
    { type: 'bilan', label: 'Bilan' },
    { type: 'preco', label: 'Préco' },
    { type: 'der', label: 'DER' },
  ],
  lm_signee:    [{ type: 'ra', label: 'RA' }],
  souscription: [
    { type: 'bulletin', label: 'Bulletin' },
    { type: 'ra', label: 'RA' },
    { type: 'succession', label: 'Succession' },
    { type: 'zakat', label: 'Zakat' },
  ],
  actif:        [{ type: 'zakat', label: 'Zakat' }],
  suivi:        [{ type: 'ra', label: 'Nouveau RA' }],
}

function DossierCard({
  dossier,
  onRefresh,
}: {
  dossier: DossierRow
  onRefresh: () => void
}) {
  const [moving, setMoving] = useState(false)
  const stage = dossier.pipeline_stage as PipelineStage
  const manualTargets = getManualPipelineTargets(stage)
  const [selectedTarget, setSelectedTarget] = useState<PipelineStage | ''>(
    manualTargets[0] ?? '',
  )

  useEffect(() => {
    setSelectedTarget(manualTargets[0] ?? '')
  }, [dossier.pipeline_stage, manualTargets.join(',')])

  const dateUpdated = new Date(dossier.pipeline_stage_updated_at)
  const daysSince = Math.floor(
    (Date.now() - dateUpdated.getTime()) / (1000 * 60 * 60 * 24)
  )
  const inLmRaColumn = LM_RA_KANBAN_COLUMN_STAGES.has(dossier.pipeline_stage)
  const quickDocs = inLmRaColumn
    ? []
    : (STAGE_QUICK_DOC[dossier.pipeline_stage] ?? [])
  const isSouscription = dossier.pipeline_stage === 'souscription'
  const stageLabel =
    PIPELINE_STAGE_LABEL[stage] ?? dossier.pipeline_stage
  const showManualMove = !inLmRaColumn && manualTargets.length > 0

  async function transitionTo(
    e: MouseEvent,
    toStage: PipelineStage,
    label: string,
  ) {
    e.preventDefault()
    e.stopPropagation()
    if (
      !window.confirm(
        `Déplacer ${dossier.prenom} ${dossier.nom} : ${stageLabel} → ${label} ?`,
      )
    ) {
      return
    }
    setMoving(true)
    try {
      const res = await fetch('/api/pipeline/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dossier_id: dossier.id,
          to_stage: toStage,
          notes: `Déplacement manuel pipeline : ${stage} → ${toStage}`,
          trigger_context: { source: 'pipeline_kanban' },
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      onRefresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erreur déplacement')
    } finally {
      setMoving(false)
    }
  }

  async function handlePasserActif(e: MouseEvent) {
    await transitionTo(e, 'actif', 'Actif')
  }

  async function handleManualMove(e: MouseEvent) {
    if (!selectedTarget) return
    const label =
      PIPELINE_STAGE_LABEL[selectedTarget as PipelineStage] ?? selectedTarget
    await transitionTo(e, selectedTarget as PipelineStage, label)
  }

  return (
    <div className="rounded border border-amana-grey-light bg-white text-sm hover:shadow-sm">
      <Link
        href={`/admin/dossiers/${dossier.id}`}
        className="block p-2 hover:bg-amana-cream"
      >
        <div className="flex items-center justify-between gap-1">
          <p className="truncate font-semibold text-amana-dark">
            {dossier.prenom} {dossier.nom}
          </p>
          {dossier.offre_amana_cible && (
            <span
              className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: OFFRE_COLOR[dossier.offre_amana_cible] }}
            >
              {OFFRE_LABEL[dossier.offre_amana_cible]}
            </span>
          )}
        </div>
        {dossier.email_client && (
          <p className="mt-0.5 truncate text-[11px] text-amana-grey">{dossier.email_client}</p>
        )}
        <p className="mt-1 text-[10px] font-medium text-amana-forest/80">
          Étape : {stageLabel}
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-amana-grey">
          <span>📄 {dossier.docs_count}</span>
          {dossier.compliance_checks_recent > 0 && (
            <span>✓ {dossier.compliance_checks_recent}</span>
          )}
          {dossier.critical_alerts_open > 0 && (
            <span className="text-red-600">⚠ {dossier.critical_alerts_open}</span>
          )}
          <span>
            {daysSince === 0 ? "auj." : `${daysSince}j`}
          </span>
        </div>
      </Link>
      {quickDocs.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-amana-grey-light px-2 py-1.5">
          {quickDocs.map(({ type, label }) => (
            <Link
              key={type}
              href={`/admin/dossiers/${dossier.id}/generate-doc/${type}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded bg-amana-forest px-2 py-0.5 text-[11px] font-semibold text-white hover:opacity-80"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
      {showManualMove && (
        <div className="space-y-1.5 border-t border-amana-grey-light px-2 py-1.5">
          {isSouscription && (
            <button
              type="button"
              disabled={moving}
              onClick={(e) => void handlePasserActif(e)}
              className="w-full rounded bg-[#16a34a] px-2 py-1.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {moving ? 'Déplacement…' : '✓ Passer en actif'}
            </button>
          )}
          <div className="flex gap-1">
            <select
              value={selectedTarget}
              disabled={moving}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedTarget(e.target.value as PipelineStage)
              }}
              className="min-w-0 flex-1 rounded border border-amana-grey-light px-1 py-1 text-[10px] text-amana-dark"
            >
              {manualTargets.map((t) => (
                <option key={t} value={t}>
                  → {PIPELINE_STAGE_LABEL[t]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={moving || !selectedTarget}
              onClick={(e) => void handleManualMove(e)}
              className="shrink-0 rounded border border-amana-forest px-2 py-1 text-[10px] font-semibold text-amana-forest hover:bg-amana-cream disabled:opacity-50"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {inLmRaColumn && (
        <p className="border-t border-amana-grey-light px-2 py-1.5 text-[10px] text-amana-grey">
          Docs, validations et Yousign : fiche dossier + menu Validations
        </p>
      )}
    </div>
  )
}

// =====================================================================
// ProjectCard — carte d'une souscription complémentaire (2e Kanban)
// =====================================================================

// Doc generation rapide selon l'étape projet (LM/RA/Bilan au cœur du flow).
const PROJECT_STAGE_QUICK_DOC: Record<ProjectStage, { type: string; label: string }[]> = {
  nouveau:        [{ type: 'lm', label: 'LM' }, { type: 'ra', label: 'RA' }, { type: 'bilan', label: 'Bilan' }],
  docs_a_generer: [{ type: 'lm', label: 'LM' }, { type: 'ra', label: 'RA' }, { type: 'bilan', label: 'Bilan' }],
  lm_ra_envoyes:  [{ type: 'lm', label: 'LM' }, { type: 'ra', label: 'RA' }, { type: 'bilan', label: 'Bilan' }],
  signes:         [{ type: 'bulletin', label: 'Bulletin' }],
  souscription:   [{ type: 'bulletin', label: 'Bulletin' }],
  actif:          [],
  suivi:          [],
  bloque:         [],
  archive:        [],
}

function ProjectCard({
  project,
  onRefresh,
}: {
  project: ProjectRow
  onRefresh: () => void
}) {
  const [moving, setMoving] = useState(false)
  const stage = project.pipeline_stage as ProjectStage
  const manualTargets = getProjectManualTargets(stage)
  const [selectedTarget, setSelectedTarget] = useState<ProjectStage | ''>(
    manualTargets[0] ?? '',
  )

  useEffect(() => {
    setSelectedTarget(manualTargets[0] ?? '')
  }, [project.pipeline_stage, manualTargets.join(',')])

  const dateUpdated = new Date(project.pipeline_stage_updated_at)
  const daysSince = Math.floor(
    (Date.now() - dateUpdated.getTime()) / (1000 * 60 * 60 * 24)
  )
  const stageLabel = PROJECT_STAGE_LABEL[stage] ?? project.pipeline_stage
  const quickDocs = PROJECT_STAGE_QUICK_DOC[stage] ?? []
  const isSouscription = stage === 'souscription'
  const clientFullName =
    `${project.client_prenom ?? ''} ${project.client_nom ?? ''}`.trim() ||
    project.client_email ||
    '—'

  async function transitionTo(
    e: MouseEvent,
    toStage: ProjectStage,
    label: string,
  ) {
    e.preventDefault()
    e.stopPropagation()
    if (
      !window.confirm(
        `Déplacer la souscription ${project.product_nom ?? project.type} de ${clientFullName} : ${stageLabel} → ${label} ?`,
      )
    ) {
      return
    }
    setMoving(true)
    try {
      const res = await fetch('/api/admin/projects-pipeline/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          to_stage: toStage,
          notes: `Déplacement manuel pipeline projet : ${stage} → ${toStage}`,
          trigger_context: { source: 'projects_pipeline_kanban' },
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      onRefresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erreur déplacement')
    } finally {
      setMoving(false)
    }
  }

  async function handlePasserActif(e: MouseEvent) {
    await transitionTo(e, 'actif', 'Actif')
  }

  async function handleManualMove(e: MouseEvent) {
    if (!selectedTarget) return
    const label =
      PROJECT_STAGE_LABEL[selectedTarget as ProjectStage] ?? selectedTarget
    await transitionTo(e, selectedTarget as ProjectStage, label)
  }

  // Cible : page dédiée au project (vue isolée — pas l'historique complet du
  // dossier client). C'est cette page qui n'affiche que les documents/gates
  // rattachés à ce project_id.
  const detailHref = `/admin/projects/${project.id}`

  const CardInner = (
    <>
      <div className="flex items-center justify-between gap-1">
        <p className="truncate font-semibold text-amana-dark">
          {clientFullName}
        </p>
        {project.client_offre && (
          <span
            className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: OFFRE_COLOR[project.client_offre] }}
          >
            {OFFRE_LABEL[project.client_offre]}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-amana-forest font-medium">
        {project.product_nom ?? project.type}
      </p>
      {project.montant != null && (
        <p className="text-[11px] text-amana-grey">
          {project.montant.toLocaleString('fr-FR')} €
        </p>
      )}
      <p className="mt-1 text-[10px] font-medium text-amana-forest/80">
        Étape : {stageLabel}
      </p>
      <div className="mt-1 flex items-center justify-between text-[11px] text-amana-grey">
        <span>📄 {project.docs_count}</span>
        <span>{daysSince === 0 ? "auj." : `${daysSince}j`}</span>
      </div>
    </>
  )

  return (
    <div className="rounded border border-amana-grey-light bg-white text-sm hover:shadow-sm">
      <Link href={detailHref} className="block p-2 hover:bg-amana-cream">
        {CardInner}
      </Link>
      {quickDocs.length > 0 && project.dossier_id && (
        <div className="flex flex-wrap gap-1 border-t border-amana-grey-light px-2 py-1.5">
          {quickDocs.map(({ type, label }) => (
            <Link
              key={type}
              href={`/admin/dossiers/${project.dossier_id}/generate-doc/${type}?project_id=${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded bg-amana-forest px-2 py-0.5 text-[11px] font-semibold text-white hover:opacity-80"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
      {manualTargets.length > 0 && (
        <div className="space-y-1.5 border-t border-amana-grey-light px-2 py-1.5">
          {isSouscription && (
            <button
              type="button"
              disabled={moving}
              onClick={(e) => void handlePasserActif(e)}
              className="w-full rounded bg-[#16a34a] px-2 py-1.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {moving ? 'Déplacement…' : '✓ Passer en actif'}
            </button>
          )}
          <div className="flex gap-1">
            <select
              value={selectedTarget}
              disabled={moving}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedTarget(e.target.value as ProjectStage)
              }}
              className="min-w-0 flex-1 rounded border border-amana-grey-light px-1 py-1 text-[10px] text-amana-dark"
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
              onClick={(e) => void handleManualMove(e)}
              className="shrink-0 rounded border border-amana-forest px-2 py-1 text-[10px] font-semibold text-amana-forest hover:bg-amana-cream disabled:opacity-50"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
