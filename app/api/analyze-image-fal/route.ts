import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, userMessage } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    const userPrompt = userMessage || "وصفلي الصورة دي بالتفصيل"
    const wantsPrompt = userMessage?.includes("برومبت") || userMessage?.includes("prompt")

    const analysisPrompt = wantsPrompt
      ? "Describe this image in extreme detail and write a comprehensive prompt in English that could be used to generate an identical or very similar image with AI. Be very specific about style, exact colors, composition, lighting, subjects, textures, mood, camera angle, background elements, and any visible text. Write in plain sentences without bullet points, headers, asterisks, or any markdown formatting."
      : `صف هذه الصورة بالتفصيل الدقيق باللغة العربية المصرية العامية.

اكتب وصفك كنص عادي متصل بدون نجوم أو عناوين أو رموز أو تنسيق markdown من أي نوع.

لو في نصوص أو كتابة في الصورة اقراها بالكامل واكتبها بالظبط. لو في جداول أو أرقام أو رسومات بيانية اشرح بياناتها. لو في وجوه أو أشخاص وصف ملامحهم وتعبيراتهم وملابسهم. لو في منتجات وصف شكلها ولونها والعلامة التجارية.

اذكر كل التفاصيل المرئية بدقة: الألوان، الخلفية، الإضاءة، الزوايا، الجو العام.${userPrompt !== "وصفلي الصورة دي بالتفصيل" ? `\n\nالمستخدم عايز يعرف: ${userPrompt}` : ""}`

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString("base64")
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg"

    const result = await model.generateContent([
      { text: analysisPrompt },
      {
        inlineData: {
          mimeType: mimeType as any,
          data: imageBase64,
        },
      },
    ])

    const raw = result.response.text()

    const description = raw
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/^[\s]*[-*•]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    if (description && description.length > 20) {
      return NextResponse.json({ description, provider: "gemini-vision" })
    }

    throw new Error("No valid description from Gemini API")
  } catch (error: any) {
    console.error("[v0] Image analysis error:", error)
    return NextResponse.json({ error: "حصل خطأ في تحليل الصورة" }, { status: 500 })
  }
}
