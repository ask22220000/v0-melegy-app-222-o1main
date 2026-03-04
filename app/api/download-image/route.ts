import { type NextRequest, NextResponse } from "next/server"

/**
 * Backend proxy for downloading images.
 * Fetches the image server-side to avoid CORS issues,
 * then streams it back with proper Content-Disposition headers
 * so the browser triggers a file download.
 *
 * Usage: GET /api/download-image?url=<encoded_image_url>&filename=<optional_name>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get("url")
  const filename = searchParams.get("filename") || `melegy-image-${Date.now()}.png`

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status },
      )
    }

    const contentType = response.headers.get("content-type") || "image/png"
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[download-image] Error:", error)
    return NextResponse.json({ error: "Failed to download image" }, { status: 500 })
  }
}
