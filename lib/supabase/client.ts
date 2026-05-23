import { createBrowserClient } from '@supabase/ssr'

/** Placeholder utilisé uniquement au `next build` si les ARG Docker sont absents. */
const BUILD_PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const BUILD_PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDYxOTIwMDAsImV4cCI6MTk2MTc2ODAwMH0.placeholder'

export function createClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if ((!url || !key) && typeof window === 'undefined') {
    url = BUILD_PLACEHOLDER_URL
    key = BUILD_PLACEHOLDER_KEY
  }

  if (!url || !key) {
    throw new Error(
      '@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!'
    )
  }

  return createBrowserClient(url, key)
}