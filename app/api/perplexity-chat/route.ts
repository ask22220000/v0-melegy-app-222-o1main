import { NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"

const analyzeSentiment = (text: string) => {
  const positiveWords = ["رائع", "ممتاز", "جميل", "أحب", "بحب", "زين", "كويس"]
  const negativeWords = ["سيء", "سيئة", "ما عجبني", "زعلان", "تعبان", "محبط"]

  const positiveCount = positiveWords.filter(word => text.includes(word)).length
  const negativeCount = negativeWords.filter(word => text.includes(word)).length

  return {
    emotion: negativeCount > positiveCount ? "sad" : "happy",
    score: Math.abs(positiveCount - negativeCount),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, message, conversationHistory = [], imageUrl } = body
    const userPrompt = prompt || message

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    const sentiment = analyzeSentiment(userPrompt)
    
    console.log("[v0] Processing request with imageUrl:", !!imageUrl)

    // Analyze image with FAL vision model if available
    let imageAnalysisContext = ""
    if (imageUrl) {
      try {
        console.log("[v0] Analyzing image with FAL vision model...")
        
        // Configure FAL with current API key
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
          console.log("[v0] Vision analysis complete:", imageAnalysisContext.substring(0, 100))
        } else {
          console.log("[v0] FAL_KEY not configured, skipping vision analysis")
        }
      } catch (e: any) {
        console.error("[v0] FAL vision analysis failed:", e)
        console.error("[v0] Error details:", e.body || e.message)
        // Continue without image analysis
      }
    }

    const messages: any[] = []

    // إضافة system message لتوجيه السلوك
    messages.push({
      role: "system",
      content: `أنت ميليجي، مساعد ذكي مصري ودود. طورتك Vision AI Studio المصرية.

**أسلوبك:**
- تحدث بالعامية المصرية بطريقة طبيعية وبسيطة
- رد بردود قصيرة ومباشرة - متطولش إلا لو المستخدم طلب تفاصيل
- لما حد ينادي عليك رد عادي: "أيوة" أو "نعم" - مش تشرح
- متديش معلومات محدش طلبها

**ردودك حسب السؤال:**
- لو سألك "انت مين؟" → قول بس: "أنا ميليجي، مساعدك الذكي المصري 😊"
- لو سألك "مين طورك؟" أو "مين عملك؟" → قول: "طورتني Vision AI Studio المصرية"
- لو سأل عن تفاصيل الشركة أو ازاي يتواصل → قول: "تقدر تتواصل معاهم على www.aistudio-vision.com أو contact@aistudio-vision.com"
- لو سأل عن نموذج توليد الصور → قول: "بستخدم نموذج Little Pear من Vision AI Studio"

**مهم جداً:** رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة!`
    })

    // إضافة الرسائل السابقة مع التحقق من التناوب الصحيح
    if (conversationHistory && conversationHistory.length > 0) {
      const history = conversationHistory.slice(-6)
      let lastRole: string | null = null
      
      for (const msg of history) {
        // تجنب رسائل متتالية من نفس الدور
        if ((msg.role === "user" || msg.role === "assistant") && msg.role !== lastRole) {
          messages.push({
            role: msg.role,
            content: typeof msg.content === "string" ? msg.content.substring(0, 500) : "",
          })
          lastRole = msg.role
        }
      }
    }

    // CRITICAL FIX: After system message, first message MUST be user, not assistant
    // Remove any assistant messages that come right after system
    while (messages.length > 1 && messages[1].role === "assistant") {
      messages.splice(1, 1)
    }

    // If last message is user, remove it to avoid user->user
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages.pop()
    }

    // إضافة الرسالة الحالية
    const currentContent = imageAnalysisContext 
      ? `تحليل الصورة: ${imageAnalysisContext.substring(0, 300)}... السؤال: ${userPrompt}`
      : userPrompt

    messages.push({
      role: "user",
      content: currentContent,
    })
    
    console.log("[v0] Final messages array:", JSON.stringify(messages.map(m => ({ role: m.role, contentLength: m.content.length }))))

    // Use Pollinations AI with openai model (GPT-5 Nano - faster and more up-to-date)
    const pollinationsResponse = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        model: "openai",
        seed: Math.floor(Math.random() * 99999),
        jsonMode: false,
      }),
    })

    if (!pollinationsResponse.ok) {
      const errorText = await pollinationsResponse.text()
      console.error("[v0] Pollinations AI error:", pollinationsResponse.status, errorText)
      return NextResponse.json({ error: "معلش حصل مشكلة، جرب تاني" }, { status: 500 })
    }

    let responseText = await pollinationsResponse.text()
    
    if (!responseText || responseText.length < 5) {
      responseText = "معلش حصل مشكلة، جرب تاني"
    }

    responseText = responseText
      .replace(/\*\*/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    return NextResponse.json({
      response: responseText,
      detectedEmotion: sentiment.emotion,
      emotionScore: sentiment.score,
    })
  } catch (error: any) {
    console.error("[v0] Perplexity chat error:", error)
    return NextResponse.json(
      { error: "معلش حصل مشكلة، جرب تاني" },
      { status: 500 }
    )
  }
}
