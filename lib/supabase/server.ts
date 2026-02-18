import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// SHARED SINGLETON for service role client (prevents multiple GoTrueClient instances)
let serviceRoleClientInstance: ReturnType<typeof createSupabaseClient> | null = null

export function getServiceRoleClient() {
  if (!serviceRoleClientInstance) {
    // Use SUPABASE_URL for server-side (fallback to NEXT_PUBLIC for backwards compatibility)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    serviceRoleClientInstance = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )
  }
  return serviceRoleClientInstance
}

export async function createClient() {
  const cookieStore = await cookies()
  
  // Use SUPABASE_URL for server-side (fallback to NEXT_PUBLIC for backwards compatibility)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from Server Component
        }
      },
    },
  })
}
