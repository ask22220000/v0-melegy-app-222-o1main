import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Testing FAL API key...")
    
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: "FAL_KEY not found in environment" 
      }, { status: 500 })
    }

    const keyPreview = process.env.FAL_KEY.substring(0, 8) + "..."
    console.log("[v0] FAL_KEY found:", keyPreview)

    // Test FAL API with a simple request using fetch
    const response = await fetch("https://queue.fal.run/fal-ai/fast-sdxl", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "test",
        image_size: "square",
        num_inference_steps: 4,
      }),
    })

    const data = await response.json()
    
    console.log("[v0] FAL API test response status:", response.status)
    console.log("[v0] FAL API test response:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: "FAL API returned error",
        status: response.status,
        details: data,
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "FAL API key is working correctly",
      keyPreview,
      testResponse: data,
    })

  } catch (error: any) {
    console.error("[v0] FAL test error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString(),
    }, { status: 500 })
  }
}
