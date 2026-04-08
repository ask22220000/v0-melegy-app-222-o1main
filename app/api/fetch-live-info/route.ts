import { falChat } from "@/lib/fal-chat"

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 })
    }

    const systemPrompt = `You are a helpful assistant responding to users in Arabic with a friendly and professional tone. Be conversational, helpful, and accurate. Use Egyptian Arabic when possible.`

    const content = await falChat(query, [], {
      model: "google/gemini-2.5-flash",
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    })

    return Response.json({
      success: true,
      content,
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error fetching live info:", error)
    return Response.json({ error: error.message || "Failed to fetch information" }, { status: 500 })
  }
}
