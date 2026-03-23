import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import * as fal from "@fal-ai/serverless-client"

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

    // Questions about current time/date are answered from clientDateTime - no web search needed
    const isDateTimeQuestion = /النهاردة|اليوم|الوقت|الساعة|كام في الشهر|today|what time|what date|كم الساعة/.test(userPrompt.toLowerCase())

    // Determine if we need web search based on the query
    const needsWebSearch = !isDateTimeQuestion &&
      /متى|إمتى|when|حدث|أخبار|news|الآن|now|حالياً|currently|recent|مقارنة|compare|سعر|price|معلومات عن|information about/.test(userPrompt.toLowerCase())

    // Analyze image with Gemini vision if available
    let imageAnalysisContext = ""
    if (imageUrl) {
      try {
        const visionResult = await generateText({
          model: "google/gemini-3-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt || "اوصف الصورة دي بالتفصيل" },
                { type: "image", image: imageUrl }
              ]
            }
          ],
          maxTokens: 300,
        })
        imageAnalysisContext = visionResult.text
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

    // Inject real datetime from client device
    const dateTimeContext = clientDateTime
      ? `\n\n**التاريخ والوقت الحالي من جهاز المستخدم:** ${clientDateTime}\nاستخدم هذا التاريخ والوقت دايماً لما حد يسأل عن التاريخ أو الوقت.`
      : ""

    const systemWithDateTime = EGYPTIAN_SYSTEM_PROMPT + dateTimeContext

    // Choose model based on search needs
    const modelToUse = needsWebSearch ? "perplexity/sonar" : "google/gemini-3-flash"

    console.log(`[API] Using model: ${modelToUse} for query: ${userPrompt.substring(0, 50)}`)

    // Generate response
    const result = await generateText({
      model: modelToUse,
      system: systemWithDateTime,
      messages,
      maxTokens: 600,
      temperature: 0.7,
    })

    const cleanedText = result.text
      .replace(/\*\*/g, "")
      .replace(/\[\d+\]/g, "")
      .trim()

    return NextResponse.json({
      response: cleanedText || "معلش حصل مشكلة، جرب تاني 😅",
      detectedEmotion: "neutral",
      emotionScore: 0,
    })
  } catch (error: any) {
    console.error("[API] Error:", error.message)
    return NextResponse.json(
      { error: "معلش حصل مشكلة، جرب تاني 😅" },
      { status: 500 }
    )
  }
}
