export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[v0] Generating video with Pollinations:", prompt)

    // Build video URL with proper query parameters
    const params = new URLSearchParams({
      model: "veo", // Video model
      duration: "10", // 10 seconds for paid plans
      aspect_ratio: "16:9", // Widescreen format
      private: "true", // Don't add to public feed
      enhance: "true", // Enhance the prompt
      nofeed: "true",
    })

    // Encode the prompt properly
    const encodedPrompt = encodeURIComponent(prompt)

    // Pollinations video generation endpoint
    const videoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`

    console.log("[v0] Video URL generated:", videoUrl)

    return new Response(
      JSON.stringify({
        url: videoUrl,
        prompt: prompt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("[v0] Video generation error:", error)

    return new Response(
      JSON.stringify({
        error: "فشل توليد الفيديو",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
