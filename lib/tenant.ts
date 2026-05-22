import { headers } from 'next/headers'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Tenant = {
  id: string
  slug: string
  name: string
  config: {
    primary_color?: string
    secondary_color?: string
    [key: string]: string | undefined
  }
}

/**
 * Récupère le tenant depuis le header X-Tenant-Slug (injecté par middleware.ts)
 * cache() mémoïse par request React - un seul appel DB par page
 */
export const getTenant = cache(async (): Promise<Tenant> => {
  const headersList = await headers()
  const slug = headersList.get('X-Tenant-Slug') ?? 'amana'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    // Fallback : amana par défaut
    return {
      id: '',
      slug: 'amana',
      name: 'Amana Patrimoine',
      config: { primary_color: '#c9a55a', secondary_color: '#3a4d39' },
    }
  }

  return data as Tenant
})

/**
 * Retourne uniquement le slug (plus léger, sans appel DB)
 */
export const getTenantSlug = cache(async (): Promise<string> => {
  const headersList = await headers()
  return headersList.get('X-Tenant-Slug') ?? 'amana'
})
