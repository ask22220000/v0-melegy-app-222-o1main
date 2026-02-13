import { type NextRequest, NextResponse } from "next/server"
import { generatePollinationsResponse } from "@/lib/pollinationsAI"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, conversationHistory = [] } = body

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    try {
      const response = await generatePollinationsResponse(prompt, conversationHistory)
      return NextResponse.json({ response })
    } catch (apiError: any) {
      console.error("[v0] Pollinations API error:", apiError)

      // Check if it's a Pollinations server error
      if (apiError?.message?.includes("500") || apiError?.message?.includes("ENOSPC")) {
        return NextResponse.json(
          {
            error: "خدمة الذكاء الاصطناعي مشغولة حالياً. من فضلك حاول مرة أخرى بعد قليل.",
          },
          { status: 503 },
        )
      }

      throw apiError
    }
  } catch (error) {
    console.error("[v0] Pollinations API error:", error)
    return NextResponse.json(
      {
        error: "حدث خطأ أثناء معالجة طلبك. من فضلك حاول مرة أخرى.",
      },
      { status: 500 },
    )
  }
}
