// lib/anthropic.ts — client Anthropic réutilisable pour les agents AMANA
// Sprint Agents IA · v1 · 2026-04-27

import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

if (!apiKey) {
  // Pas d'erreur fatale au build : on log seulement, les routes feront un 500 propre
  console.warn('[anthropic] ANTHROPIC_API_KEY non configurée — les agents ne pourront pas répondre')
}

export const anthropic = apiKey
  ? new Anthropic({ apiKey })
  : null

// Modèle par défaut. Override possible via env ANTHROPIC_MODEL.
// Sonnet est le bon équilibre qualité/coût pour Mizan en bilan patrimonial.
export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

export const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS ?? '1500')
