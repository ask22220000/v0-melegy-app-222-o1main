import { apiKeyManager } from "./apiKeyManager"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

interface Message {
  role: "user" | "assistant"
  content: string
}

export async function generateNaturalResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[v0] Attempt ${attempt + 1}/${maxRetries}`)

      const now = new Date()
      const dateStr = now.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const timeStr = now.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })

      const recentMessages = conversationHistory.slice(-8)

      let contextPrompt = `أنت ميليجي، مساعد ذكي مصري ودود.

التاريخ والوقت: ${dateStr} - ${timeStr}

**تعليمات اللغة:**
- استخدم اللهجة المصرية الطبيعية
- رد بنفس أسلوب المستخدم
- كن ودوداً ومساعداً

المحادثة:
`

      recentMessages.forEach((msg) => {
        contextPrompt += `${msg.role === "user" ? "User" : "Melegy"}: ${msg.content}\n`
      })

      contextPrompt += `\nUser: ${userInput}\nMelegy:`

      const requestBody = {
        contents: [
          {
            parts: [{ text: contextPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }

      const currentApiKey = apiKeyManager.getCurrentKey()
      const keyInfo = apiKeyManager.getKeyInfo()
      console.log(`[v0] Using API key ${keyInfo.index}/${keyInfo.totalKeys}`)

      const response = await fetch(`${GEMINI_API_URL}?key=${currentApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[v0] API error ${response.status}:`, errorText)
        apiKeyManager.reportError(response.status)

        // If quota exceeded, retry immediately with new key
        if (response.status === 429 && attempt < maxRetries - 1) {
          console.log("[v0] Retrying with next API key...")
          continue
        }

        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        apiKeyManager.reportSuccess()
        return data.candidates[0].content.parts[0].text.trim()
      }

      throw new Error("No response generated")
    } catch (error) {
      console.error(`[v0] Attempt ${attempt + 1} failed:`, error)
      lastError = error as Error

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  console.error("[v0] All retry attempts failed, using fallback")
  return generateFallbackResponse(userInput)
}

function generateFallbackResponse(userInput: string): string {
  const msg = userInput.toLowerCase()

  if (msg.includes("ازيك") || msg.includes("عامل")) {
    return "الحمد لله تمام! 😊 قولي محتاج إيه؟"
  }

  if (msg.includes("شكر")) {
    return "العفو يا حبيبي! دايماً في الخدمة 😊"
  }

  return "آسف، في مشكلة مؤقتة 😅 جرب تاني بعد شوية"
}

export function extractMainTopic(text: string): string {
  // Extract main topic from conversation
  const words = text.split(" ")
  const importantWords = words.filter((w) => w.length > 3)
  return importantWords.slice(0, 3).join(" ")
}
