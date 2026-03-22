import { generateStreamingResponse } from "@/lib/perplexityService"

export const maxDuration = 30

// Detect if user wants to generate an image
function isImageRequest(text: string): boolean {
  const imageKeywords = [
    "عاوز صورة",
    "عايز صورة",
    "عاوزك تعملي صورة",
    "عاوزك تعمل صورة",
    "عايزك تعملي صورة",
    "عايزك تعمل صورة",
    "اعملي صورة",
    "اعمل صورة",
    "ولد صورة",
    "توليد صورة",
    "جنرات صورة",
    "generate image",
    "create image",
  ]
  return imageKeywords.some((keyword) => text.toLowerCase().includes(keyword))
}

// Detect if user wants to generate a video
function isVideoRequest(text: string): boolean {
  const videoKeywords = [
    "عاوز فيديو",
    "عايز فيديو",
    "عاوزك تعملي فيديو",
    "عاوزك تعمل فيديو",
    "عايزك تعملي فيديو",
    "عايزك تعمل فيديو",
    "اعملي فيديو",
    "اعمل فيديو",
    "ولد فيديو",
    "توليد فيديو",
    "جنرات فيديو",
    "generate video",
    "create video",
  ]
  return videoKeywords.some((keyword) => text.toLowerCase().includes(keyword))
}

// Extract prompt from user message - remove only the request keywords from the start
function extractPrompt(text: string): string {
  // Remove request keywords from the beginning only
  let prompt = text
    .replace(/^عاوز صورة\s+/i, "")
    .replace(/^عايز صورة\s+/i, "")
    .replace(/^عاوزك تعملي صورة\s+/i, "")
    .replace(/^عاوزك تعمل صورة\s+/i, "")
    .replace(/^عايزك تعملي صورة\s+/i, "")
    .replace(/^عايزك تعمل صورة\s+/i, "")
    .replace(/^اعملي صورة\s+/i, "")
    .replace(/^اعمل صورة\s+/i, "")
    .replace(/^ولد صورة\s+/i, "")
    .replace(/^عاوز فيديو\s+/i, "")
    .replace(/^عايز فيديو\s+/i, "")
    .replace(/^عاوزك تعملي فيديو\s+/i, "")
    .replace(/^عاوزك تعمل فيديو\s+/i, "")
    .replace(/^عايزك تعملي فيديو\s+/i, "")
    .replace(/^عايزك تعمل فيديو\s+/i, "")
    .replace(/^اعملي فيديو\s+/i, "")
    .replace(/^اعمل فيديو\s+/i, "")
    .replace(/^ولد فيديو\s+/i, "")
    .trim()

  return prompt || text
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const userMessage = messages[messages.length - 1]?.content || ""

    // Check if user wants to generate an image
    if (isImageRequest(userMessage)) {
      const prompt = extractPrompt(userMessage)

      try {
        const imageResponse = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/perplexity-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        })

        const imageData = await imageResponse.json()
        const encoder = new TextEncoder()
        const imageMessage = `[صورة]\n${imageData.imageUrl}`
        return new Response(encoder.encode(imageMessage), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        })
      } catch (error) {
        console.error("[v0] Image generation error:", error)
        const encoder = new TextEncoder()
        return new Response(encoder.encode("آسف، ما قدرت أوليد الصورة دلوقتي"), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          status: 500,
        })
      }
    }

    // Check if user wants to generate a video
    if (isVideoRequest(userMessage)) {
      const prompt = extractPrompt(userMessage)

      try {
        const videoResponse = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/pollinations-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        })

        const videoData = await videoResponse.json()
        const encoder = new TextEncoder()
        const videoMessage = `[فيديو]\n${videoData.videoUrl}`
        return new Response(encoder.encode(videoMessage), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        })
      } catch (error) {
        console.error("[v0] Video generation error:", error)
        const encoder = new TextEncoder()
        return new Response(encoder.encode("آسف، ما قدرت أوليد الفيديو دلوقتي"), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          status: 500,
        })
      }
    }

    // Regular chat response
    const conversationHistory = messages.slice(-1).map((m: any) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }))

    const stream = await generateStreamingResponse(userMessage, conversationHistory)

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[v0] Chat error:", error)

    return new Response("آسف، في مشكلة مؤقتة", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
