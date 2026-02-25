import { generateText } from 'ai'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query) {
      return Response.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Step 1: Get fresh information from Perplexity/Sonar
    const perplexityResult = await generateText({
      model: 'perplexity/sonar',
      prompt: query,
      maxOutputTokens: 2048,
    })

    // Step 2: Pass the information to Gemini for polished response
    const geminiResult = await generateText({
      model: 'google/gemini-2-flash',
      system: `You are a helpful assistant responding to users in Arabic with a friendly and professional tone. 
      Take the provided information and respond naturally to the user's original question.
      Be conversational, helpful, and accurate.`,
      prompt: `المعلومات المحدثة: ${perplexityResult.text}\n\nالسؤال الأصلي: ${query}\n\nالرجاء الرد على السؤال بناءً على المعلومات المحدثة أعلاه:`,
      maxOutputTokens: 1024,
    })

    return Response.json({
      success: true,
      content: geminiResult.text,
      query: query,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error fetching live info:', error)
    return Response.json(
      { error: error.message || 'Failed to fetch information' },
      { status: 500 }
    )
  }
}
