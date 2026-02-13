
    // Check if user wants to generate a video
    if (isVideoRequest(userMessage)) {
      const prompt = extractPrompt(userMessage)
      console.log("[v0] Video generation request detected")
      console.log("[v0] Extracted prompt:", prompt)

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

    console.log("[v0] Generating response with Gemini...")

    const stream = await generateStreamingResponse(userMessage, conversationHistory)

    const responseTime = (Date.now() - startTime) / 1000
    console.log("[v0] Response generated in", responseTime, "seconds")

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
