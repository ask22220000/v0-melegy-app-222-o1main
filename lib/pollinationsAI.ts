const PERPLEXITY_API_ENDPOINT = "https://api.perplexity.ai/chat/completions"

const ULTRA_SHORT_PROMPT = `أنت ميليجي - مساعد ذكي مصري ودود.

⚠️ قواعد صارمة - التزم بها:
1. اسمك "ميليجي" - لو حد سألك اسمك ايه، قول "ميليجي"
2. لو حد قال "يا ميليجي" → رد "نعم" بس
3. الرد يكون جملة واحدة أو جملتين بحد أقصى (إلا لو المستخدم طلب تفاصيل)
4. متكتبش فقرات طويلة أو أرقام كتير - اختصر جداً
5. متشرحش إلا لو المستخدم قال "اشرحلي" أو "فصّل"
6. لو حد ناداك بـ "عم الناس" أو "نجم" أو "يا عمنا" → رد بشكل طبيعي وودود
7. استخدم emoji واحد مناسب في بداية الرد عشان تكون ودود واحترافي

أمثلة للـ emojis المناسبة:
- أسئلة عن المال أو الأسعار: 💰
- أخبار أو معلومات: 📰
- نصائح: 💡
- تحية أو سلام: 👋
- إجابة إيجابية: ✅
- إجابة سلبية: ❌
- معلومات تقنية: 💻
- طعام أو وصفات: 🍽️
- رياضة: ⚽

مثال سؤال: "الدولار كام النهاردة؟"
✅ رد صح: "💰 الدولار النهاردة حوالي 48-49 جنيه"
❌ رد غلط: فقرة طويلة فيها أرقام وتواريخ وشرح

انت صاحب بتتكلم عادي، مش معلم ولا موسوعة. اختصر دايماً.`

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

import { getDailyTip, checkIfDailyTipRequest } from "./dailyTips"

export async function generatePollinationsResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
  try {
    console.log("[v0] Generating response with Pollinations AI (openai model - GPT-5 Nano)...")

    if (checkIfDailyTipRequest(userInput)) {
      const dailyTip = getDailyTip()
      return dailyTip
    }

    const messages: Message[] = [
      {
        role: "system",
        content: ULTRA_SHORT_PROMPT,
      },
      ...conversationHistory.slice(-3),
      {
        role: "user",
        content: userInput,
      },
    ]

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
        messages: messages,
        temperature: 0.7,
        max_tokens: 80,
        seed: Math.floor(Math.random() * 99999),
        jsonMode: false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log("[v0] Pollinations Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Pollinations Error:", errorText)
      throw new Error(`Pollinations API returned ${response.status}`)
    }

    let responseText = await response.text()

    // Remove unnecessary asterisks and formatting
    let cleanedResponse = responseText
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/###/g, "")
      .replace(/##/g, "")
      .replace(/#/g, "")
      .trim()

    cleanedResponse = cleanedResponse.replace(/\n{3,}/g, "\n\n")

    console.log("[v0] Response generated successfully")

    return cleanedResponse
  } catch (error) {
    console.error("[v0] Perplexity error details:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
    }
    return "آسف، حصل خطأ بسيط. ممكن تعيد كتابة رسالتك تاني؟"
  }
}

export async function generateStreamingResponse(
  userInput: string,
  conversationHistory: Message[],
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await generatePollinationsResponse(userInput, conversationHistory)
        controller.enqueue(encoder.encode(response))
        controller.close()
      } catch (error) {
        const fallback = "آسف، في مشكلة مؤقتة"
        controller.enqueue(encoder.encode(fallback))
        controller.close()
      }
    },
  })
}
