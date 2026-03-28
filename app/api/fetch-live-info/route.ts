import { getModel } from "@/lib/gemini"

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 })
    }

    const model = getModel("gemini-2.0-flash")

    const result = await model.generateContent({
      systemInstruction: `You are a helpful assistant responding to users in Arabic with a friendly and professional tone.
      Be conversational, helpful, and accurate. Use Egyptian Arabic when possible.`,
      contents: [{
        role: "user",
        parts: [{ text: query }],
      }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    })

    return Response.json({
      success: true,
      content: result.response.text(),
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error fetching live info:", error)
    return Response.json({ error: error.message || "Failed to fetch information" }, { status: 500 })
  }
}
