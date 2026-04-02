 v0/visionaieg-2041-978f6390
import { falChat } from "@/lib/fal-chat"

import { generateWithFalRouter } from "@/lib/falRouterService"
 main

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 })
    }

 v0/visionaieg-2041-978f6390
    const systemPrompt = `You are a helpful assistant responding to users in Arabic with a friendly and professional tone. Be conversational, helpful, and accurate. Use Egyptian Arabic when possible.`

    const content = await falChat(query, [], {
      model: "google/gemini-2.0-flash",
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    })

    return Response.json({
      success: true,
      content,
      query,

    // Step 1: Get fresh information using Fal OpenRouter
    const searchResult = await generateWithFalRouter(
      "You are a helpful assistant that provides accurate, up-to-date information. Search for the latest information and provide comprehensive answers.",
      [{ role: "user", content: query }],
      { maxTokens: 2048, temperature: 0.7 }
    )

    // Step 2: Polish the response in Arabic using Fal OpenRouter
    const polishedResult = await generateWithFalRouter(
      `You are a helpful assistant responding to users in Arabic with a friendly and professional tone. 
      Take the provided information and respond naturally to the user's original question.
      Be conversational, helpful, and accurate.`,
      [{ role: "user", content: `المعلومات المحدثة: ${searchResult}\n\nالسؤال الأصلي: ${query}\n\nالرجاء الرد على السؤال بناءً على المعلومات المحدثة أعلاه:` }],
      { maxTokens: 1024, temperature: 0.7 }
    )

    return Response.json({
      success: true,
      content: polishedResult,
      query: query,
 main
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error fetching live info:", error)
    return Response.json({ error: error.message || "Failed to fetch information" }, { status: 500 })
  }
}
