import { NextResponse } from "next/server"
import { getServiceRoleClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getServiceRoleClient()

    const { count: convCount } = await (supabase
      .from("melegy_history")
      .select("*", { count: "exact", head: true }) as any)
    const totalConversations = convCount ?? 0

    const { count: userCount } = await (supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true }) as any)
    const totalUsers = userCount ?? 0

    const { count: msgCount } = await (supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true }) as any)
    const totalMessages = msgCount ?? 0

    return NextResponse.json({
      totalConversations,
      totalUsers,
      totalMessages,
    })
  } catch (error) {
    return NextResponse.json(
      { totalConversations: 0, totalUsers: 0, totalMessages: 0 },
      { status: 200 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data }: any = body

    if (!action) {
      return NextResponse.json({ ok: true })
    }

    const supabase = await getServiceRoleClient()

    if (action === "trackSession") {
      const { sessionId, pagePath, deviceInfo, userFingerprint } = data ?? {}
      await (supabase.from("user_sessions").upsert(
        {
          session_id: sessionId,
          page_path: pagePath,
          device_info: deviceInfo,
          user_fingerprint: userFingerprint,
          last_seen: new Date().toISOString(),
        } as any,
        { onConflict: "session_id" } as any
      ) as any).catch(() => { })
    }

    if (action === "trackUser") {
      const { userId, userFingerprint } = data ?? {}
      if (userId) {
        await (supabase
          .from("subscriptions")
          .update({ last_active: new Date().toISOString() } as any)
          .eq("auth_user_id", userId) as any)
          .catch(() => { })
      }
      if (userFingerprint) {
        await (supabase.from("visitor_fingerprints").upsert(
          { fingerprint: userFingerprint, last_seen: new Date().toISOString() } as any,
          { onConflict: "fingerprint" } as any
        ) as any).catch(() => { })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: true })
  }
}