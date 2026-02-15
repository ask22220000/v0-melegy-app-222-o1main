import { generateText } from "ai"
import { EGYPTIAN_DIALECT_INSTRUCTIONS } from "./egyptianDialect"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

export async function generateGeminiResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[v0] Attempt ${attempt + 1}/${MAX_RETRIES} - Using Google Gemini 3 Flash via Vercel AI Gateway`)

      const messages: any[] = []

      // Add conversation history (last 5 messages)
      const recentHistory = conversationHistory.slice(-5)
      let lastRole: string | null = null
      
      for (const msg of recentHistory) {
        if ((msg.role === "user" || msg.role === "assistant") && msg.role !== lastRole) {
          messages.push({
            role: msg.role,
            content: msg.content.substring(0, 500),
          })
          lastRole = msg.role
        }
      }

      // Remove last message if it's from user (to avoid user->user)
      if (messages.length > 0 && messages[messages.length - 1].role === "user") {
        messages.pop()
      }

      // Add current user message
      messages.push({
        role: "user",
        content: userInput,
      })

      console.log("[v0] Sending request to Gemini with", messages.length, "messages")

      const result = await generateText({
        model: "google/gemini-3-flash",
        system: EGYPTIAN_DIALECT_INSTRUCTIONS,
        messages,
        maxTokens: 500,
        temperature: 0.7,
      })

      let generatedText = result.text
      console.log("[v0] ✅ Received response from Gemini successfully")

      if (!generatedText || generatedText.length < 3) {
        console.log("[v0] Empty response from Gemini, retrying...")
        continue
      }

      // Clean up response
      generatedText = generatedText
        .replace(/\*\*/g, "")
        .replace(/\[\d+\]/g, "")
        .replace(/\s+/g, " ")
        .trim()

      return generatedText
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
  conversationHistory: Message[],
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await generateGeminiResponse(userInput, conversationHistory)

        // Stream the response character by character
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
