import { NextRequest, NextResponse } from "next/server"
 v0/visionaieg-2041-978f6390
import { falChat } from "@/lib/fal-chat"
import { getModel, urlToInlinePart, stripMarkdown } from "@/lib/gemini"

import { generateWithFalRouter, generateWithFalRouterVision } from "@/lib/falRouterService"
 main

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

 v0/visionaieg-2041-978f6390
    // If image is provided → use Gemini vision (Fal OpenRouter doesn't support multimodal)
    if (imageUrl) {
      try {
        const imagePart = await urlToInlinePart(imageUrl)
        const visionModel = getModel("gemini-2.0-flash")
        const result = await visionModel.generateContent({
          contents: [{ role: "user", parts: [{ text: userPrompt }, imagePart] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
        })
        const text = stripMarkdown(result.response.text())
        return NextResponse.json({
          response: text || "معلش حصل مشكلة، جرب تاني 😅",
          detectedEmotion: "neutral",
          emotionScore: 0,
        })

    // Analyze image with Fal OpenRouter vision if available
    let imageAnalysisContext = ""
    if (imageUrl) {
      try {
        imageAnalysisContext = await generateWithFalRouterVision(
          "اوصف الصورة بالتفصيل بالعربية",
          userPrompt || "اوصف الصورة دي بالتفصيل",
          imageUrl,
          { maxTokens: 300, model: "google/gemini-2.0-flash-001" }
        )
 main
      } catch (e: any) {
        console.error("[API] Vision error:", e.message)
      }
    }

 v0/visionaieg-2041-978f6390
    // Text chat via Fal OpenRouter
    const history = conversationHistory
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content) }))

    const responseText = await falChat(userPrompt, history, {
      model: "google/gemini-2.0-flash",
      systemPrompt: fullSystemPrompt,
      maxTokens: 600,
      temperature: 0.7,
    })

    const cleanedText = stripMarkdown(responseText)

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

    // Inject real datetime from client device
    const dateTimeContext = clientDateTime
      ? `\n\n**التاريخ والوقت الحالي من جهاز المستخدم:** ${clientDateTime}\nاستخدم هذا التاريخ والوقت دايماً لما حد يسأل عن التاريخ أو الوقت.`
      : ""

    const systemWithDateTime = EGYPTIAN_SYSTEM_PROMPT + dateTimeContext

    console.log(`[API] Using Fal OpenRouter for query: ${userPrompt.substring(0, 50)}`)

    // Generate response using Fal OpenRouter
    const result = await generateWithFalRouter(
      systemWithDateTime,
      messages,
      { maxTokens: 600, temperature: 0.7 }
    )

    const cleanedText = result
      .replace(/\*\*/g, "")
      .replace(/\[\d+\]/g, "")
      .trim()
 main

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
