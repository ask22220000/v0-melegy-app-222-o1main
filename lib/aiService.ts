const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"

interface Message {
  role: "user" | "assistant"
  content: string
}

export async function generateNaturalResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[v0] Attempt ${attempt + 1}/${maxRetries} - Using Perplexity API`)

      const apiKey = process.env.PERPLEXITY_API_KEY

      if (!apiKey) {
        throw new Error("PERPLEXITY_API_KEY is not configured")
      }

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

      const messages: any[] = [
        {
          role: "system",
          content: `أنت ميليجي، مساعد ذكي مصري ودود.

التاريخ والوقت: ${dateStr} - ${timeStr}

**تعليمات اللغة:**
- استخدم اللهجة المصرية الطبيعية
- رد بنفس أسلوب المستخدم
- كن ودوداً ومساعداً`,
        },
      ]

      const recentMessages = conversationHistory.slice(-6)
      let lastRole: string | null = null

      for (const msg of recentMessages) {
        if ((msg.role === "user" || msg.role === "assistant") && msg.role !== lastRole) {
          messages.push({
            role: msg.role,
            content: msg.content.substring(0, 500),
          })
          lastRole = msg.role
        }
      }

      // Remove last message if it's from user (to avoid user->user)
      if (messages.length > 1 && messages[messages.length - 1].role === "user") {
        messages.pop()
      }

      messages.push({
        role: "user",
        content: userInput,
      })

      const response = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[v0] Perplexity API error ${response.status}:`, errorText)

        if (response.status === 429 && attempt < maxRetries - 1) {
          console.log("[v0] Rate limit exceeded, retrying...")
          await new Promise((resolve) => setTimeout(resolve, 2000))
          continue
        }

        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.choices?.[0]?.message?.content) {
        let text = data.choices[0].message.content.trim()
        // Clean up response
        text = text
          .replace(/\*\*/g, "")
          .replace(/\[\d+\]/g, "")
          .replace(/\s+/g, " ")
          .trim()
        return text
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
