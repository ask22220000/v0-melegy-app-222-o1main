import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, userMessage } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    // Use fal vision API for image analysis
    const falResponse = await fetch(`${request.nextUrl.origin}/api/analyze-image-fal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, userMessage }),
    })

    if (!falResponse.ok) {
      const errorData = await falResponse.json()
      return NextResponse.json({ error: errorData.error || "فشل تحليل الصورة" }, { status: falResponse.status })
    }

    const falResult = await falResponse.json()
    return NextResponse.json(falResult)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "حصل خطأ في تحليل الصورة" }, { status: 500 })
  }
}
