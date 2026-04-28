const FAL_KEY = process.env.FAL_KEY || "ee4132e8-fae7-4efe-8d2b-9d0d59e834a2:a1c4b8f6300ac015ba99fe9682ca8d71"
const DEFAULT_MODEL = "google/gemini-2.5-flash"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

/**
 * Call Fal OpenRouter via direct REST fetch - no SDK needed.
 */
async function falRouterFetch(
  systemPrompt: string,
  messages: Message[],
  options: { maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7, model = DEFAULT_MODEL } = options

  // Build conversation string from messages
  const conversationLines = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const role = m.role === "assistant" ? "ميليجي" : "المستخدم"
      return `${role}: ${m.content}`
    })
    .join("\n")

  const prompt = conversationLines.trim()

  const res = await fetch("https://fal.run/openrouter/router", {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      system_prompt: systemPrompt,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fal OpenRouter error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return (data?.output || "").trim()
}

export async function generateWithFalRouter(
  systemPrompt: string,
  messages: Message[],
  options: { maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<string> {
  try {
    return await falRouterFetch(systemPrompt, messages, options)
  } catch (error: any) {
    console.error("[FalRouter] Error:", error.message)
    return "عذراً، حصل خطأ في الاتصال. جرب تاني بعد شوية."
  }
}

export async function generateWithFalRouterVision(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options: { maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<string> {
  // Vision: embed image URL in the prompt text
  const messages: Message[] = [
    { role: "user", content: `${userPrompt}\n\n[صورة: ${imageUrl}]` },
  ]
  try {
    return await falRouterFetch(systemPrompt, messages, options)
  } catch (error: any) {
    console.error("[FalRouter Vision] Error:", error.message)
    return "عذراً، حصل خطأ في تحليل الصورة. جرب تاني."
  }
}

export async function generateStreamingWithFalRouter(
  systemPrompt: string,
  messages: Message[],
  options: { maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        const response = await generateWithFalRouter(systemPrompt, messages, options)
        const chunkSize = Math.floor(Math.random() * 3) + 3
        for (let i = 0; i < response.length; i += chunkSize) {
          controller.enqueue(encoder.encode(response.slice(i, i + chunkSize)))
          await new Promise((r) => setTimeout(r, 10))
        }
        controller.close()
      } catch (error: any) {
        controller.enqueue(encoder.encode("عذراً، حصل خطأ. جرب تاني."))
        controller.close()
      }
    },
  })
}
