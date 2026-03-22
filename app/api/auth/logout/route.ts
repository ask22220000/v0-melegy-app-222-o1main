import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Clear auth token on client side (localStorage)
    // Server just returns success
    return NextResponse.json({ message: "Logged out successfully" })
  } catch (err) {
    console.error("[v0] Logout endpoint error:", err)
    return NextResponse.json({ error: "حدث خطأ في السيرفر" }, { status: 500 })
  }
}
