import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

const EGYPTIAN_SYSTEM_PROMPT = `أنت ميليجي، مساعد ذكي مصري ودود جداً بشخصية حقيقية ومرحة! طورتك Vision AI Studio المصرية.

شخصيتك:
- كلم الناس بطريقة ودودة ومبهجة زي صاحبهم المقرب
- استخدم إيموجي في ردودك عشان تعبر عن مشاعرك بشكل طبيعي
- متكونش جاف - اتكلم بحماس واهتمام حقيقي
- لما تشرح حاجة، شرحها بأسلوب مصري سلس ومبسط

أسلوب الرد:
- تحدث بالعامية المصرية بطريقة طبيعية جداً
- استخدم تعبيرات مصرية حقيقية: تمام، ماشي، جامد، حلو أوي
- رد بردود قصيرة ومباشرة - متطولش إلا لو المستخدم طلب تفاصيل
- ضيف إيموجي مناسب حسب الموضوع والمشاعر
- اكتب ردك بنص عادي بدون نجوم أو علامات ترقيم خاصة

مهم جداً: 
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة
- متنساش الإيموجي - هي جزء من شخصيتك المرحة
- اكتب بنص عادي بدون نجوم أو علامات markdown
- معلوماتك محدثة يومياً من الإنترنت`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, message, conversationHistory = [] } = body
    const userPrompt = prompt || message

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    console.log(`[v0] Query: ${userPrompt.substring(0, 50)}...`)

    // Build messages array with proper alternation
    const messages: any[] = []

    // Add conversation history (last 4 messages)
    if (conversationHistory && conversationHistory.length > 0) {
      const history = conversationHistory.slice(-4)
      
      for (const msg of history) {
        if (msg.role !== "user" && msg.role !== "assistant") continue
        
        const lastMsg = messages[messages.length - 1]
        
        if (!lastMsg || lastMsg.role !== msg.role) {
          messages.push({
            role: msg.role,
            content: typeof msg.content === "string" ? msg.content.substring(0, 400) : "",
          })
        }
      }
    }

    // Ensure last message is assistant to maintain alternation
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages.pop()
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userPrompt,
    })

    console.log(`[v0] Messages: ${messages.map(m => m.role).join(' -> ')}`)

    // Generate response using Gemini with Google Search grounding
    const result = await generateText({
      model: "google/gemini-2.0-flash-exp",
      system: EGYPTIAN_SYSTEM_PROMPT,
      messages,
      maxTokens: 600,
      temperature: 0.7,
    })

    // Clean markdown formatting from response
    const cleanedText = result.text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\_\_/g, "")
      .replace(/\_/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\[(\d+)\]\(.*?\)/g, "")
      .replace(/\#\#\#?/g, "")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim()

    console.log(`[v0] Response: ${cleanedText.substring(0, 50)}...`)

    return NextResponse.json({
      response: cleanedText || "معلش حصل مشكلة، جرب تاني 😅",
      detectedEmotion: "neutral",
      emotionScore: 0,
    })
  } catch (error: any) {
    console.error("[v0] Error:", error.message || error)
    
    return NextResponse.json(
      { 
        error: error.message || "حصل خطأ، جرب تاني",
        response: null
      },
      { status: 500 }
    )
  }
}
