import { NextResponse } from "next/server"

import { getServiceRoleClient } from "@/lib/supabase/server"



export async function GET() {
  try {
    const supabase = getServiceRoleClient()
    if (!supabase) {
      return NextResponse.json({ totalConversations: 0, totalUsers: 0, totalMessages: 0 })
    }

    const { count: convCount } = await supabase

      .from("melegy_history")

      .select("*", { count: "exact", head: true })

    const totalConversations = convCount ?? 0



    const { count: userCount } = await supabase

      .from("subscriptions")

      .select("*", { count: "exact", head: true })

    const totalUsers = userCount ?? 0



    const { count: msgCount } = await supabase

      .from("chat_messages")

      .select("*", { count: "exact", head: true })

    const totalMessages = msgCount ?? 0



    return NextResponse.json({

      totalConversations,

      totalUsers,

      totalMessages,

    })

  } catch {

    return NextResponse.json(

      { totalConversations: 0, totalUsers: 0, totalMessages: 0 },

      { status: 200 }

    )

  }

}



export async function POST(request: Request) {

  try {

    const body = await request.json()

    const { action } = body



    if (!action) {

      return NextResponse.json({ ok: true })

    }



    const supabase = getServiceRoleClient()
    if (!supabase) return NextResponse.json({ ok: true })

    if (action === "trackSession") {

      const { sessionId, pagePath, deviceInfo, userFingerprint } = body.data ?? {}

      await supabase.from("user_sessions").upsert(

        {

          session_id: sessionId,

          page_path: pagePath,

          device_info: deviceInfo,

          user_fingerprint: userFingerprint,

          last_seen: new Date().toISOString(),

        },

        { onConflict: "session_id" }

      ).catch(() => { })

    }



    if (action === "trackUser") {

      const { userId, userFingerprint } = body.data ?? {}

      if (userId) {

        await supabase

          .from("subscriptions")

          .update({ last_active: new Date().toISOString() })

          .eq("auth_user_id", userId)

          .catch(() => { })

      }

      if (userFingerprint) {

        await supabase.from("visitor_fingerprints").upsert(

          { fingerprint: userFingerprint, last_seen: new Date().toISOString() },

          { onConflict: "fingerprint" }

        ).catch(() => { })

      }

    }



    return NextResponse.json({ ok: true })

  } catch {

    return NextResponse.json({ ok: true })

  }

}
