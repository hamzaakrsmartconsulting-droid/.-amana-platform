import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Healthcheck Docker / Nginx / load-balancer.
 * Volontairement minimal : 200 si le process Node répond.
 * Ne PAS ajouter de check Supabase ici (sinon une panne Supabase coupe
 * tout le container alors que Next.js fonctionne).
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'amana-platform',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 },
  )
}
