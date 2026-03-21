import { NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase: any = await getServiceRoleClient()
    const { count: convCount } = await supabase.from("melegy_history").select("*", { count: "exact", head: true })
    const { count: userCount } = await supabase.from("subscriptions").select("*", { count: "exact", head: true })
    const { count: msgCount } = await supabase.from("chat_messages").select("*", { count: "exact", head: true })

    return NextResponse.json({
      totalConversations: convCount ?? 0,
      totalUsers: userCount ?? 0,
      totalMessages: msgCount ?? 0,
    })
  } catch (e) {
    return NextResponse.json({ totalConversations: 0, totalUsers: 0, totalMessages: 0 })
  }
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json()
    const { action, data } = body
    if (!action) return NextResponse.json({ ok: true })

    const supabase: any = await getServiceRoleClient()

    if (action === "trackSession") {
      const { sessionId, pagePath, deviceInfo, userFingerprint } = data ?? {}
      await supabase.from("user_sessions").upsert({
        session_id: sessionId, page_path: pagePath, device_info: deviceInfo,
        user_fingerprint: userFingerprint, last_seen: new Date().toISOString()
      }, { onConflict: "session_id" }).catch(() => { })
    }

    if (action === "trackUser") {
      const { userId, userFingerprint } = data ?? {}
      if (userId) {
        await supabase.from("subscriptions").update({ last_active: new Date().toISOString() }).eq("auth_user_id", userId).catch(() => { })
      }
      if (userFingerprint) {
        await supabase.from("visitor_fingerprints").upsert({ fingerprint: userFingerprint, last_seen: new Date().toISOString() }, { onConflict: "fingerprint" }).catch(() => { })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: true })
  }
}