import { EGYPTIAN_DIALECT_INSTRUCTIONS } from "./egyptianDialect"
import { apiKeyManager } from "./apiKeyManager"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

export async function generateGeminiResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
  const MAX_RETRIES = 9 // Try all 9 API keys before failing

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[v0] Attempt ${attempt + 1}/${MAX_RETRIES} - Using Gemini Pro`)

      const apiKey = apiKeyManager.getCurrentKey()

      const conversationText = conversationHistory
        .slice(-3)
        .map((m) => `${m.role === "user" ? "المستخدم" : "ميليجي"}: ${m.content}`)
        .join("\n")

      const fullPrompt = `${EGYPTIAN_DIALECT_INSTRUCTIONS}

${conversationText}
المستخدم: ${userInput}
ميليجي:`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 300,
            topP: 0.95,
            topK: 40,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 429) {
        console.log(`[v0] Quota exceeded (key ${attempt + 1}), rotating to next key...`)
        apiKeyManager.reportError(response.status)
        await new Promise((resolve) => setTimeout(resolve, 500))
        continue
      }

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`[v0] Gemini API error: ${response.status}`, errorBody)
        apiKeyManager.reportError(response.status)
        await new Promise((resolve) => setTimeout(resolve, 500))
        continue
      }

      const data = await response.json()
      console.log("[v0] ✅ Received response from Gemini Pro successfully")

      apiKeyManager.reportSuccess()

      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

      if (!generatedText) {
        console.log("[v0] Empty response from Gemini, retrying...")
        continue
      }

      return generatedText.trim()
    } catch (error: any) {
      console.error(`[v0] Error on attempt ${attempt + 1}:`, error.message)
      apiKeyManager.reportError()

      if (attempt === MAX_RETRIES - 1) {
        throw new Error("جميع مفاتيح API فشلت. جرب تاني بعد شوية لما تتجدد الـ quota")
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  throw new Error("فشل الاتصال بـ Gemini API")
}

export async function generateStreamingResponse(
  userInput: string,
  conversationHistory: Message[],
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await generateGeminiResponse(userInput, conversationHistory)

        for (let i = 0; i < response.length; i++) {
          controller.enqueue(encoder.encode(response[i]))
          await new Promise((resolve) => setTimeout(resolve, 1))
        }

        controller.close()
      } catch (error: any) {
        console.error("[v0] Streaming error:", error)
        const errorMsg = error.message || "آسف، في مشكلة مؤقتة. جرب تاني بعد شوية"
        controller.enqueue(encoder.encode(errorMsg))
        controller.close()
      }
    },
  })
}
