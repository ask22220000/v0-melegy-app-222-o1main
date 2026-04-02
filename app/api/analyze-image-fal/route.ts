import { type NextRequest, NextResponse } from "next/server"
 v0/visionaieg-2041-978f6390
import { getModel, urlToInlinePart, stripMarkdown } from "@/lib/gemini"
import { generateWithFalRouterVision } from "@/lib/falRouterService"
 main

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

 v0/visionaieg-2041-978f6390
    const imagePart = await urlToInlinePart(imageUrl)
    const model = getModel("gemini-2.0-flash")

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: analysisPrompt }, imagePart],
      }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    })
    
    try {
      // Use Fal OpenRouter with vision capability
      const raw = await generateWithFalRouterVision(
        "أنت مساعد ذكي متخصص في تحليل ووصف الصور بدقة عالية.",
        analysisPrompt,
        imageUrl,
        { maxTokens: 2048, temperature: 0.7 }
      )
 main

    const description = stripMarkdown(result.response.text())

    if (description && description.length > 20) {
      return NextResponse.json({ description, provider: "gemini-vision" })
    }

    throw new Error("No valid description from Gemini API")
  } catch (error: any) {
    console.error("[v0] Image analysis error:", error)
    return NextResponse.json({ error: "حصل خطأ في تحليل الصورة" }, { status: 500 })
  }
}
