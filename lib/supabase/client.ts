import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// Singleton instance for browser client (prevents multiple GoTrueClient instances)
let browserClientInstance: SupabaseClient | null = null

export function createClient() {
  if (browserClientInstance) {
    return browserClientInstance
  }

  browserClientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return browserClientInstance
}
