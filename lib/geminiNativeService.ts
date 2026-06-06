import { EGYPTIAN_DIALECT_INSTRUCTIONS } from "./egyptianDialect"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

export async function generateGeminiResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
  const MAX_RETRIES = 3

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY غير محدد في متغيرات البيئة")
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[v0] Attempt ${attempt + 1}/${MAX_RETRIES} - Using Gemini API`)

      // Build conversation history for context
      const recentHistory = conversationHistory.slice(-5)

      // Prepare messages for Gemini API
      const geminiMessages = recentHistory
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }))

      // Add current user message
      geminiMessages.push({
        role: "user",
        parts: [{ text: userInput }],
      })

      const requestBody = {
        system_instruction: {
          parts: [{ text: EGYPTIAN_DIALECT_INSTRUCTIONS }],
        },
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      }

      console.log("[v0] Sending request to Gemini API with", geminiMessages.length, "messages")

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Gemini API error:", errorData)
        throw new Error(`Gemini API error ${response.status}: ${errorData.error?.message || "Unknown error"}`)
      }

      const data = await response.json()
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

      console.log("[v0] Received response from Gemini API successfully")

      if (!generatedText || generatedText.length < 3) {
        console.log("[v0] Empty response from Gemini, retrying...")
        continue
      }

      // Clean up the response - remove any markdown formatting
      let cleanText = generatedText
        .replace(/\*\*(.+?)\*\*/g, "$1") // bold
        .replace(/\*(.+?)\*/g, "$1") // italic
        .replace(/_{1,2}(.+?)_{1,2}/g, "$1") // underline
        .replace(/#{1,6}\s+/g, "") // headings
        .replace(/^\s*[-*+]\s+/gm, "") // bullet points
        .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
        .replace(/\[\d+\]/g, "") // citation numbers
        .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, "")) // code blocks
        .replace(/\s+/g, " ")
        .trim()

      // Ensure response doesn't start with "المساعد:" or similar
      cleanText = cleanText.replace(/^(المساعد|ميليجي|المساعد الذكي):\s*/i, "").trim()

      return cleanText
    } catch (error: any) {
      console.error(`[v0] Error on attempt ${attempt + 1}:`, error.message)

      if (attempt === MAX_RETRIES - 1) {
        throw new Error("معلش حصل مشكلة، جرب تاني بعد شوية")
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  throw new Error("فشل الاتصال")
}

export async function generateStreamingResponse(
  userInput: string,
  conversationHistory: Message[]
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await generateGeminiResponse(userInput, conversationHistory)

        // Stream the response in chunks for faster perceived speed
        const chunkSize = Math.floor(Math.random() * 3) + 3
        for (let i = 0; i < response.length; i += chunkSize) {
          const chunk = response.slice(i, i + chunkSize)
          controller.enqueue(encoder.encode(chunk))
          await new Promise((resolve) => setTimeout(resolve, 10))
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
