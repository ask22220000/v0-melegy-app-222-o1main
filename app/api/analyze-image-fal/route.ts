import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

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

    try {
      // Use Google Gemini 3 Flash with vision capability from Vercel AI Gateway
      const result = await generateText({
        model: "google/gemini-3-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              { type: "image", image: imageUrl }
            ]
          }
        ],
        maxTokens: 2048,
        temperature: 0.7,
      })

      const raw = result.text

      // Strip all markdown formatting: bold/italic asterisks, hashes, backticks, bullet dashes
      const description = raw
        .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
        .replace(/\*(.+?)\*/g, "$1")        // *italic*
        .replace(/_{1,2}(.+?)_{1,2}/g, "$1") // __underline__ / _italic_
        .replace(/^#{1,6}\s+/gm, "")        // # headings
        .replace(/`{1,3}[^`]*`{1,3}/g, "")  // `code` / ```block```
        .replace(/^[\s]*[-*•]\s+/gm, "")    // bullet points
        .replace(/^\d+\.\s+/gm, "")         // numbered lists
        .replace(/\n{3,}/g, "\n\n")         // excessive blank lines
        .trim()

      if (description && description.length > 20) {
        return NextResponse.json({ description, provider: "gemini-vision" })
      }

      throw new Error("No valid description from Gemini API")
    } catch (geminiError: any) {
      console.error("[v0] Gemini vision error:", geminiError)
      throw geminiError
    }
  } catch (error: any) {
    console.error("[v0] Image analysis error:", error)
    return NextResponse.json({ error: "حصل خطأ في تحليل الصورة" }, { status: 500 })
  }
}
