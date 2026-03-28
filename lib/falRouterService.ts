import * as fal from "@fal-ai/serverless-client"

// Configure fal client - check multiple possible env var names
const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.FAL_API

function initFalClient() {
  if (!FAL_KEY) {
    console.error("[FalRouter] No FAL API key found! Checked: FAL_KEY, FAL_API_KEY, FAL_API")
    return false
  }
  
  console.log("[FalRouter] Configuring with key starting with:", FAL_KEY.substring(0, 8) + "...")
  
  fal.config({
    credentials: FAL_KEY,
  })
  return true
}

const isConfigured = initFalClient()

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

interface FalRouterOutput {
  output: string
  reasoning?: string
  usage?: {
    prompt_tokens: number
    total_tokens: number
    completion_tokens: number
    cost: number
  }
  error?: string
}

/**
 * Generate text using Fal OpenRouter
 * This replaces AI Gateway and Gemini API calls
 */
export async function generateWithFalRouter(
  systemPrompt: string,
  messages: Message[],
  options: {
    maxTokens?: number
    temperature?: number
    model?: string
  } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7, model = "google/gemini-2.0-flash-001" } = options

  try {
    // Check if FAL is configured
    if (!isConfigured) {
      console.error("[FalRouter] FAL not configured, returning error message")
      return "عذراً، في مشكلة في الإعدادات. تأكد من إضافة FAL_KEY في Settings > Vars"
    }

    // Build the prompt from messages - only include the last user message
    // Previous context is handled by system prompt
    let prompt = ""
    const lastUserMessage = messages.filter(m => m.role === "user").pop()
    if (lastUserMessage) {
      prompt = lastUserMessage.content.trim()
    }

    console.log(`[FalRouter] Sending request to model: ${model}`)
    console.log(`[FalRouter] FAL_KEY exists: ${!!FAL_KEY}`)

    const result = await fal.subscribe("fal-ai/any-llm", {
      input: {
        model,
        prompt,
        system_prompt: systemPrompt,
        max_tokens: maxTokens,
        temperature,
      },
    }) as FalRouterOutput

    if (result.error) {
      throw new Error(result.error)
    }

    const responseText = result.output || ""
    console.log("[FalRouter] Response received successfully")

    return responseText
  } catch (error: any) {
    console.error("[FalRouter] Error:", error.message)
    // Return a friendly error message instead of throwing
    return "عذراً، حصل خطأ في الاتصال. جرب تاني بعد شوية."
  }
}

/**
 * Generate text with vision (image analysis) using Fal OpenRouter
 */
export async function generateWithFalRouterVision(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options: {
    maxTokens?: number
    temperature?: number
    model?: string
  } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7, model = "google/gemini-2.0-flash-001" } = options

  try {
    // Check if FAL is configured
    if (!isConfigured) {
      return "عذراً، في مشكلة في الإعدادات. تأكد من إضافة FAL_KEY في Settings > Vars"
    }

    // For vision, include image URL in the prompt
    const prompt = `${userPrompt}\n\n[صورة: ${imageUrl}]`

    console.log(`[FalRouter Vision] Analyzing image with model: ${model}`)

    const result = await fal.subscribe("fal-ai/any-llm", {
      input: {
        model,
        prompt,
        system_prompt: systemPrompt,
        max_tokens: maxTokens,
        temperature,
      },
    }) as FalRouterOutput

    if (result.error) {
      throw new Error(result.error)
    }

    const responseText = result.output || ""
    console.log("[FalRouter Vision] Response received successfully")

    return responseText
  } catch (error: any) {
    console.error("[FalRouter Vision] Error:", error.message)
    return "عذراً، حصل خطأ في تحليل الصورة. جرب تاني."
  }
}

/**
 * Generate streaming response using Fal OpenRouter
 */
export async function generateStreamingWithFalRouter(
  systemPrompt: string,
  messages: Message[],
  options: {
    maxTokens?: number
    temperature?: number
    model?: string
  } = {}
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await generateWithFalRouter(systemPrompt, messages, options)

        // Stream the response in chunks for faster perceived speed
        const chunkSize = Math.floor(Math.random() * 3) + 3
        for (let i = 0; i < response.length; i += chunkSize) {
          const chunk = response.slice(i, i + chunkSize)
          controller.enqueue(encoder.encode(chunk))
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        controller.close()
      } catch (error: any) {
        console.error("[FalRouter Streaming] Error:", error)
        const errorMsg = error.message || "عذراً، حصل خطأ. جرب تاني."
        controller.enqueue(encoder.encode(errorMsg))
        controller.close()
      }
    },
  })
}
