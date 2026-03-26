import { NextRequest, NextResponse } from "next/server"
import { setUserSubscription, ensureUserMeta, incrementPlanCount } from "@/lib/db"

export const runtime = "nodejs"

const PLAN_MAP: Record<string, "free" | "startup" | "pro" | "vip"> = {
  startup: "startup", starter: "startup", pro: "pro", vip: "vip", advanced: "vip",
}

function extractPlanAndUser(merchantOrderId?: string): { plan: "free" | "startup" | "pro" | "vip"; userId: string | null } {
  if (!merchantOrderId) return { plan: "free", userId: null }
  const match = merchantOrderId.match(/^plan_(\w+)_(.+)$/)
  if (!match) return { plan: "free", userId: null }
  return { plan: PLAN_MAP[match[1].toLowerCase()] ?? "free", userId: match[2] || null }
}

async function processCallback(body: Record<string, any>) {
  const { transactionId, merchantOrderId, status, response } = body

  if (!transactionId) return { success: false, error: "Missing transaction ID" }

  const isSuccess = ["SUCCESS", "PAID", "CAPTURED"].includes(status) ||
    response?.status === "SUCCESS"

  if (!isSuccess) return { success: true, received: true, status }

  const { plan, userId } = extractPlanAndUser(merchantOrderId)
  if (!userId) return { success: false, error: "Could not determine userId from merchantOrderId" }

  await ensureUserMeta(userId)
  await setUserSubscription(userId, plan, 30)
  incrementPlanCount(plan, 1).catch(() => {})

  return { success: true, received: true, userId, plan }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await processCallback(body)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error"
    console.error("[kasher-callback] error:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// GET — some payment gateways use GET for callbacks
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const body = {
    transactionId: p.get("transactionId") || p.get("transaction_id"),
    merchantOrderId: p.get("merchantOrderId") || p.get("orderId"),
    status: p.get("status"),
  }
  try {
    const result = await processCallback(body)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
