import { updateSession } from "./lib/supabase/middleware"

export async function proxy(request) {
  return updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

export default proxy
