import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import * as fal from "@fal-ai/serverless-client"

const EGYPTIAN_SYSTEM_PROMPT = `أنت ميليجي، مساعد ذكي مصري ودود. طورتك Vision AI Studio المصرية.

**أسلوبك:**
- تحدث بالعامية المصرية بطريقة طبيعية وبسيطة
- رد بردود قصيرة ومباشرة - متطولش إلا لو المستخدم طلب تفاصيل
- لما حد ينادي عليك رد عادي: "أيوة" أو "نعم" - مش تشرح
- متديش معلومات محدش طلبها

**ردودك حسب السؤال:**
- لو سألك "انت مين؟" → قول بس: "أنا ميليجي، مساعدك الذكي المصري"
- لو سألك "مين طورك؟" أو "مين عملك؟" → قول: "طورتني Vision AI Studio المصرية"
- لو سأل عن تفاصيل الشركة أو ازاي يتواصل → قول: "تقدر تتواصل معاهم على www.aistudio-vision.com أو contact@aistudio-vision.com"
- لو سأل عن نموذج توليد الصور → قول: "بستخدم نموذج Little Pear من Vision AI Studio"

**مهم جداً:** رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة!`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, message, conversationHistory = [], imageUrl } = body
    const userPrompt = prompt || message

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    // Analyze image with FAL vision model if available
    let imageAnalysisContext = ""
    if (imageUrl) {
      try {
        if (process.env.FAL_KEY) {
          fal.config({
            credentials: process.env.FAL_KEY,
          })
          
          const result = await fal.subscribe("fal-ai/llava-next", {
            input: {
              image_url: imageUrl,
              prompt: userPrompt || "اوصف الصورة دي بالتفصيل",
            },
          })

          imageAnalysisContext = (result as any).output || ""
        }
      } catch (e: any) {
        console.error("[API] Image analysis error:", e.message)
      }
    }

    // Build messages array
    const messages: any[] = []

    // Add conversation history (last 6 messages)
    if (conversationHistory && conversationHistory.length > 0) {
      const history = conversationHistory.slice(-6)
      let lastRole: string | null = null
      
      for (const msg of history) {
        if ((msg.role === "user" || msg.role === "assistant") && msg.role !== lastRole) {
          messages.push({
            role: msg.role,
            content: typeof msg.content === "string" ? msg.content.substring(0, 500) : "",
          })
          lastRole = msg.role
        }
      }
    }

    // Ensure no consecutive messages from same role
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages.pop()
    }

    // Add current message
    const currentContent = imageAnalysisContext 
      ? `تحليل الصورة: ${imageAnalysisContext.substring(0, 300)}... السؤال: ${userPrompt}`
      : userPrompt

    messages.push({
      role: "user",
      content: currentContent,
    })

    // Use generateText with Google Gemini 3 Flash from Vercel AI Gateway
    const result = await generateText({
      model: "google/gemini-3-flash",
      system: EGYPTIAN_SYSTEM_PROMPT,
      messages,
      maxTokens: 500,
      temperature: 0.7,
    })

    const cleanedText = result.text
      .replace(/\*\*/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    return NextResponse.json({
      response: cleanedText || "معلش حصل مشكلة، جرب تاني",
      detectedEmotion: "neutral",
      emotionScore: 0,
    })
  } catch (error: any) {
    console.error("[API] Error:", error.message)
    return NextResponse.json(
      { error: "معلش حصل مشكلة، جرب تاني" },
      { status: 500 }
    )
  }
}
