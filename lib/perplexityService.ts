import { generateWithFalRouter } from "./falRouterService"
import { EGYPTIAN_DIALECT_INSTRUCTIONS } from "./egyptianDialect"
import { SearchService } from "./searchService"
import { detectSearchQuery } from "./webSearch"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

// Detect if query needs web search
function needsWebSearch(query: string): boolean {
  const searchKeywords = [
    "متى", "امتى", "وقت", "تاريخ", "سعر", "اسعار",
    "اخبار", "جديد", "حديث", "الان", "دلوقتي", "اليوم",
    "when", "what time", "price", "news", "latest", "current",
    "رمضان", "عيد", "موعد",
  ]
  
  return searchKeywords.some(keyword => query.toLowerCase().includes(keyword))
}

export async function generatePerplexityResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
  const MAX_RETRIES = 2
  const searchNeeded = needsWebSearch(userInput)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[v0] Attempt ${attempt + 1}/${MAX_RETRIES} - Web search: ${searchNeeded}`)

      let enhancedContext = ""
      
      // Perform web search if needed
      if (searchNeeded) {
        try {
          console.log("[v0] Performing web search...")
          const searchService = new SearchService()
          const searchResults = await Promise.race([
            searchService.searchInternet(userInput),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Search timeout")), 3000))
          ]) as any
          
          if (searchResults && searchResults.results && searchResults.results.length > 0) {
            const topResults = searchResults.results.slice(0, 3)
            enhancedContext = "\n\nمعلومات من الإنترنت:\n" + 
              topResults.map((r: any) => `- ${r.title}: ${r.snippet}`).join("\n")
            console.log("[v0] Found", topResults.length, "search results")
          }
        } catch (searchError) {
          console.log("[v0] Search failed or timed out, continuing without it")
        }
      }

      const messages: any[] = []

      // Add conversation history (last 3 messages for speed)
      const recentHistory = conversationHistory.slice(-3)
      let lastRole: string | null = null
      
      for (const msg of recentHistory) {
        if ((msg.role === "user" || msg.role === "assistant") && msg.role !== lastRole) {
          messages.push({
            role: msg.role,
            content: msg.content.substring(0, 300),
          })
          lastRole = msg.role
        }
      }

      // Remove last message if it's from user (to avoid user->user)
      if (messages.length > 0 && messages[messages.length - 1].role === "user") {
        messages.pop()
      }

      // Add current user message with search context
      messages.push({
        role: "user",
        content: userInput + enhancedContext,
      })

      console.log("[v0] Sending request to Fal OpenRouter with", messages.length, "messages")

      const generatedTextPromise = generateWithFalRouter(
        EGYPTIAN_DIALECT_INSTRUCTIONS + "\n\nرد بسرعة وبشكل مباشر ومختصر.",
        messages,
        { maxTokens: 300, temperature: 0.7 }
      )

      let generatedText = await Promise.race([
        generatedTextPromise,
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error("Response timeout")), 8000)
        )
      ])

      console.log("[v0] Received response from Fal OpenRouter successfully")

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
        const response = await generatePerplexityResponse(userInput, conversationHistory)

        // Stream the response in chunks of 3-5 characters for faster perceived speed
        const chunkSize = Math.floor(Math.random() * 3) + 3
        for (let i = 0; i < response.length; i += chunkSize) {
          const chunk = response.slice(i, i + chunkSize)
          controller.enqueue(encoder.encode(chunk))
          await new Promise((resolve) => setTimeout(resolve, 10)) // Faster streaming
        }

        controller.close()
      } catch (error: any) {
        console.error("[v0] Streaming error:", error)
        const errorMsg = error.message || "عذراً، حصل خطأ. جرب تاني."
        controller.enqueue(encoder.encode(errorMsg))
        controller.close()
      }
    },
  })
}
