'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function readHashParams() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  return new URLSearchParams(hash)
}

export default function AuthSessionBootstrap() {
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (typeof window === 'undefined') return
      if (!window.location.hash.includes('access_token=')) return

      const params = readHashParams()
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (!accessToken || !refreshToken) return

      const supabase = createClient()
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error || cancelled) return

      // Clean URL + route to onboarding after magic-link invitation.
      window.history.replaceState({}, document.title, window.location.pathname)
      window.location.assign('/onboarding')
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
