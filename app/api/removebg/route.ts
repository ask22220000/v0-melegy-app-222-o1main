export const runtime = "edge"

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[v0] Starting background removal...")

    const formData = new FormData()

    if (imageUrl.startsWith("data:")) {
      const base64Data = imageUrl.split(",")[1]
      const mimeType = imageUrl.match(/data:(.*?);base64/)?.[1] || "image/png"
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mimeType })
      formData.append("image_file", blob)
    } else {
      formData.append("image_url", imageUrl)
    }

    formData.append("size", "auto") // حجم تلقائي يحافظ على دقة الصورة الأصلية
    formData.append("format", "png") // PNG للحفاظ على الشفافية والجودة
    formData.append("type", "auto") // detection تلقائي للموضوع
    formData.append("channels", "rgba") // الحفاظ على قناة الشفافية

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": REMOVE_BG_API_KEY,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Remove.bg API error:", errorText)
      return new Response(
        JSON.stringify({
          error: "فشل في إزالة الخلفية",
          details: errorText,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const imageBuffer = await response.arrayBuffer()

    if (imageBuffer.byteLength === 0) {
      throw new Error("Received empty image from Remove.bg")
    }

    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const resultImageUrl = `data:image/png;base64,${base64Image}`

    console.log("[v0] Background removed successfully, image size:", imageBuffer.byteLength, "bytes")

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: resultImageUrl,
        message: "تم إزالة الخلفية بنجاح مع الحفاظ على جودة الصورة الأصلية",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("[v0] Remove.bg error:", error)
    return new Response(
      JSON.stringify({
        error: "حصل خطأ في إزالة الخلفية",
        details: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
