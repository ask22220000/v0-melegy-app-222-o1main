import { NextRequest, NextResponse } from "next/server"
import { generateWithFalRouter, generateWithFalRouterVision } from "@/lib/falRouterService"
import { stripMarkdown } from "@/lib/gemini"

const EGYPTIAN_SYSTEM_PROMPT = `أنت ميليجي، مساعد ذكي مصري ودود جداً بشخصية حقيقية ومرحة! طورتك Vision AI Studio المصرية.

شخصيتك:
- كلم الناس بطريقة ودودة ومبهجة زي صاحبهم المقرب
- استخدم إيموجي في ردودك عشان تعبر عن مشاعرك بشكل طبيعي
- متكونش جاف - اتكلم بحماس واهتمام حقيقي
- لما تشرح حاجة، شرحها بأسلوب مصري سلس ومبسط

أسلوب الرد:
- تحدث بالعامية المصرية بطريقة طبيعية جداً
- استخدم تعبيرات مصرية حقيقية: "تمام"، "ماشي"، "جامد"، "حلو أوي"
- رد بردود قصيرة ومباشرة - متطولش إلا لو المستخدم طلب تفاصيل
- ضيف إيموجي مناسب حسب الموضوع والمشاعر

الإيموجي:
- استخدم 1-3 إيموجي في كل رد حسب السياق
- لما حد يسأل سؤال: 🤔❓
- لما تشرح: 📖✨
- لما حاجة إيجابية: 😊👍✨
- لما معلومة مهمة: 💡⚡
- لما حاجة ممتعة: 🎉😄
- لما تقدم نصيحة: 💭🎯
- لما تقول مرحباً: 👋😊

معلومات عنك:
- لو سألك "انت مين؟": "أنا ميليجي 🤖، مساعدك الذكي المصري اللي هيساعدك في أي حاجة تحتاجها! 😊"
- لو سألك "مين طورك؟": "طورتني Vision AI Studio المصرية 🇪🇬 - شركة مصرية متخصصة في الذكاء الاصطناعي! ✨"
- لو سأل عن التواصل: "تقدر تتواصل معاهم على www.aistudio-vision.com 🌐 أو contact@aistudio-vision.com 📧"

مهم جداً:
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة!
- متنساش الإيموجي - هي جزء من شخصيتك المرحة!`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, message, conversationHistory = [], imageUrl, clientDateTime } = body
    const userPrompt = prompt || message

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    const dateTimeContext = clientDateTime
      ? `\n\nالتاريخ والوقت الحالي من جهاز المستخدم: ${clientDateTime}\nاستخدم هذا التاريخ والوقت دايماً لما حد يسأل عن التاريخ أو الوقت.`
      : ""

    const fullSystemPrompt = EGYPTIAN_SYSTEM_PROMPT + dateTimeContext

    // Build messages array from history
    const messages: { role: "user" | "assistant"; content: string }[] = conversationHistory
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content) }))

    // Add current user message
    messages.push({ role: "user", content: userPrompt })

    // If image provided, use vision
    if (imageUrl) {
      try {
        const visionResponse = await generateWithFalRouterVision(
          fullSystemPrompt,
          userPrompt,
          imageUrl,
          { maxTokens: 600, temperature: 0.7, model: "google/gemini-2.5-flash" }
        )
        const cleanedText = stripMarkdown(visionResponse)
        return NextResponse.json({
          response: cleanedText || "معلش حصل مشكلة، جرب تاني 😅",
          detectedEmotion: "neutral",
          emotionScore: 0,
        })
      } catch (e: any) {
        console.error("[API] Vision error:", e.message)
      }
    }

    // Text chat via Fal OpenRouter
    const responseText = await generateWithFalRouter(fullSystemPrompt, messages, {
      model: "google/gemini-2.5-flash",
      maxTokens: 600,
      temperature: 0.7,
    })

    const cleanedText = stripMarkdown(responseText)

    return NextResponse.json({
      response: cleanedText || "معلش حصل مشكلة، جرب تاني 😅",
      detectedEmotion: "neutral",
      emotionScore: 0,
    })
  } catch (error: any) {
    console.error("[API] Error:", error.message)
    return NextResponse.json({ error: "معلش حصل مشكلة، جرب تاني 😅" }, { status: 500 })
  }
}
