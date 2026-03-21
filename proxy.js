import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function POST(request: NextRequest) {
  const response = await updateSession(request)
  return response
}

export function GET(request: NextRequest) {
  return new Response("Proxy is working", { status: 200 })
}
