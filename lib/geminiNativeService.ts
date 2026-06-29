import { EGYPTIAN_DIALECT_INSTRUCTIONS } from "./egyptianDialect"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "openai/gpt-4o" // OpenAI GPT-4 Omni model for superior reasoning and multilingual support

export async function generateStreamingResponse(
  userInput: string,
  conversationHistory: Message[]
): Promise<ReadableStream<Uint8Array>> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY غير محدد في متغيرات البيئة")
  }

  // Prepare messages for OpenRouter API (standard OpenAI format)
  const messages = [
    {
      role: "system",
      content: EGYPTIAN_DIALECT_INSTRUCTIONS,
    },
    ...conversationHistory
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    {
      role: "user",
      content: userInput,
    },
  ]

  const requestBody = {
    model: MODEL,
    messages,
    temperature: 0.9,
    top_p: 0.95,
    max_tokens: 2048,
    stream: true,
  }

  console.log("[v0] Requesting OpenRouter NVIDIA Nemotron 3.5 with", messages.length, "messages")

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.href : "http://localhost:3000",
      "X-Title": "Melegy App",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] OpenRouter API error:", response.status, errorText)
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
  }

  if (!response.body) {
    throw new Error("No response body from OpenRouter API")
  }

  // Create a readable stream that processes OpenAI-format streaming response
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")

          // Process all complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()

            if (line === "" || line === "[DONE]") {
              continue
            }

            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.substring(6)
                const chunk = JSON.parse(jsonStr)

                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                  const text = chunk.choices[0].delta.content
                  if (text) {
                    const cleaned = cleanResponse(text)
                    if (cleaned) {
                      controller.enqueue(new TextEncoder().encode(cleaned))
                    }
                  }
                }
              } catch (parseError) {
                console.error("[v0] Error parsing OpenRouter chunk:", parseError)
              }
            }
          }

          // Keep the last incomplete line in buffer
          buffer = lines[lines.length - 1]
        }

        controller.close()
      } catch (error) {
        console.error("[v0] Stream processing error:", error)
        const errorMsg = "آسف، في مشكلة مؤقتة. جرب تاني بعد شوية"
        controller.enqueue(new TextEncoder().encode(errorMsg))
        controller.close()
      }
    },
  })
}

function cleanResponse(text: string): string {
  // Remove any "المساعد:" or similar prefixes
  let cleaned = text.replace(/^(المساعد|ميليجي|المساعد الذكي|Assistant):\s*/i, "")

  // Remove markdown formatting
  cleaned = cleaned
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1") // underline
    .replace(/#{1,6}\s+/g, "") // headings
    .replace(/^\s*[-*+]\s+/gm, " ") // bullet points
    .replace(/^\s*\d+\.\s+/gm, " ") // numbered lists
    .replace(/\[\d+\]/g, "") // citation numbers
    .replace(/`{1,3}/g, "") // code blocks

  return cleaned.trim()
}
