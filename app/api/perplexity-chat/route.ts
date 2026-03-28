import { NextRequest, NextResponse } from "next/server"
import { getModel, urlToInlinePart, stripMarkdown } from "@/lib/gemini"

const EGYPTIAN_SYSTEM_PROMPT = `أنت ميليجي، مساعد ذكي مصري ودود جداً بشخصية حقيقية ومرحة! 🎉 طورتك Vision AI Studio المصرية.

**شخصيتك:**
- كلم الناس بطريقة ودودة ومبهجة زي صاحبهم المقرب 😊
- استخدم إيموجي في ردودك عشان تعبر عن مشاعرك بشكل طبيعي 🎯
- متكونش جاف - اتكلم بحماس واهتمام حقيقي 💫
- لما تشرح حاجة، شرحها بأسلوب مصري سلس ومبسط 🌟

**أسلوب الرد:**
- تحدث بالعامية المصرية بطريقة طبيعية جداً
- استخدم تعبيرات مصرية حقيقية: "تمام"، "ماشي"، "جامد"، "حلو أوي" 👍
- رد بردود قصيرة ومباشرة - متطولش إلا لو المستخدم طلب تفاصيل
- ضيف إيموجي مناسب حسب الموضوع والمشاعر 🤗

**الإيموجي:**
- استخدم 1-3 إيموجي في كل رد حسب السياق
- لما حد يسأل سؤال → 🤔❓
- لما تشرح → 📖✨  
- لما حاجة إيجابية → 😊👍✨
- لما معلومة مهمة → 💡⚡
- لما حاجة ممتعة → 🎉😄
- لما تقدم نصيحة → 💭🎯
- لما تقول مرحباً → 👋😊

**معلومات عنك:**
- لو سألك "انت مين؟" → "أنا ميليجي 🤖، مساعدك الذكي المصري اللي هيساعدك في أي حاجة تحتاجها! 😊"
- لو سألك "مين طورك؟" → "طورتني Vision AI Studio المصرية 🇪🇬 - شركة مصرية متخصصة في الذكاء الاصطناعي! ✨"
- لو سأل عن التواصل → "تقدر تتواصل معاهم على www.aistudio-vision.com 🌐 أو contact@aistudio-vision.com 📧"
- لو سأل عن توليد الصور → "بستخدم نموذج Little Pear من Vision AI Studio 🎨 - جودة عالية وسريع! ⚡"

**معلوماتك:**
- عندك قدرة البحث على الإنترنت في الوقت الفعلي 🔍
- معلوماتك محدثة لحظياً من مصادر موثوقة على الويب 📡
- لو حد سألك عن تاريخ محدد أو حدث حالي، ابحث وجاوب بدقة ⏰

**مهم جداً:** 
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة!
- متنساش الإيموجي - هي جزء من شخصيتك المرحة! 😉`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, message, conversationHistory = [], imageUrl, clientDateTime } = body
    const userPrompt = prompt || message

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    // Inject real datetime from client device
    const dateTimeContext = clientDateTime
      ? `\n\n**التاريخ والوقت الحالي من جهاز المستخدم:** ${clientDateTime}\nاستخدم هذا التاريخ والوقت دايماً لما حد يسأل عن التاريخ أو الوقت.`
      : ""

    const systemInstruction = EGYPTIAN_SYSTEM_PROMPT + dateTimeContext

    const model = getModel("gemini-2.0-flash")

    // Build history for Gemini chat
    const history: { role: string; parts: { text: string }[] }[] = []
    if (conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-6)
      for (const msg of recent) {
        if (msg.role === "user" || msg.role === "assistant") {
          history.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: typeof msg.content === "string" ? msg.content.substring(0, 500) : "" }],
          })
        }
      }
    }

    // If image is provided, use vision
    if (imageUrl) {
      try {
        const imagePart = await urlToInlinePart(imageUrl)
        const visionModel = getModel("gemini-2.0-flash")
        const result = await visionModel.generateContent({
          systemInstruction,
          contents: [{ role: "user", parts: [{ text: userPrompt }, imagePart] }],
        })
        const text = stripMarkdown(result.response.text())
        return NextResponse.json({ response: text || "معلش حصل مشكلة، جرب تاني 😅", detectedEmotion: "neutral", emotionScore: 0 })
      } catch (e: any) {
        console.error("[API] Vision error:", e.message)
      }
    }

    // Text chat with history
    const chat = model.startChat({
      systemInstruction,
      history,
      generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
    })

    const result = await chat.sendMessage(userPrompt)
    const cleanedText = stripMarkdown(result.response.text())

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
