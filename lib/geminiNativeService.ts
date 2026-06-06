import { EGYPTIAN_DIALECT_INSTRUCTIONS } from "./egyptianDialect"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_STREAMING_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent"

export async function generateStreamingResponse(
  userInput: string,
  conversationHistory: Message[]
): Promise<ReadableStream<Uint8Array>> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY غير محدد في متغيرات البيئة")
  }

  // Prepare messages for Gemini API
  const geminiMessages = conversationHistory
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
      maxOutputTokens: 2048,
      temperature: 0.9,
      topP: 0.95,
      topK: 64,
    },
  }

  console.log("[v0] Requesting Gemini streaming API with", geminiMessages.length, "messages")

  const response = await fetch(`${GEMINI_STREAMING_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Gemini API error:", response.status, errorText)
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  if (!response.body) {
    throw new Error("No response body from Gemini API")
  }

  // Create a readable stream that processes the streaming response
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
            if (line.startsWith("data: ") || line === "") {
              try {
                if (line.startsWith("data: ")) {
                  const jsonStr = line.substring(6)
                  const chunk = JSON.parse(jsonStr)

                  if (
                    chunk.candidates &&
                    chunk.candidates[0] &&
                    chunk.candidates[0].content &&
                    chunk.candidates[0].content.parts &&
                    chunk.candidates[0].content.parts[0]
                  ) {
                    const text = chunk.candidates[0].content.parts[0].text
                    if (text) {
                      const cleaned = cleanResponse(text)
                      if (cleaned) {
                        controller.enqueue(new TextEncoder().encode(cleaned))
                      }
                    }
                  }
                }
              } catch (parseError) {
                console.error("[v0] Error parsing Gemini chunk:", parseError)
              }
            }
          }

          // Keep the last incomplete line in buffer
          buffer = lines[lines.length - 1]
        }

        // Process any remaining buffer
        if (buffer.trim().startsWith("data: ")) {
          try {
            const jsonStr = buffer.trim().substring(6)
            const chunk = JSON.parse(jsonStr)

            if (
              chunk.candidates &&
              chunk.candidates[0] &&
              chunk.candidates[0].content &&
              chunk.candidates[0].content.parts &&
              chunk.candidates[0].content.parts[0]
            ) {
              const text = chunk.candidates[0].content.parts[0].text
              if (text) {
                const cleaned = cleanResponse(text)
                if (cleaned) {
                  controller.enqueue(new TextEncoder().encode(cleaned))
                }
              }
            }
          } catch (parseError) {
            console.error("[v0] Error parsing final Gemini chunk:", parseError)
          }
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
