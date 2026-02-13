import { type NextRequest, NextResponse } from "next/server"

const WHATSAPP_ACCESS_TOKEN = process.env.META_BUSINESS_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN
const DEFAULT_PHONE_NUMBER_ID = "1411043180529628"

export async function POST(req: NextRequest) {
  try {
    const { phoneNumberId, to, message, messageType = "text", imageUrl, caption } = await req.json()

    const actualPhoneNumberId = phoneNumberId || DEFAULT_PHONE_NUMBER_ID

    if (!to) {
      return NextResponse.json({ error: "Missing required field: to" }, { status: 400 })
    }

    if (!WHATSAPP_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error: "WhatsApp Access Token not configured. Add META_BUSINESS_API_TOKEN or WHATSAPP_ACCESS_TOKEN in Vars.",
        },
        { status: 500 },
      )
    }

    let requestBody: any

    if (messageType === "image" && imageUrl) {
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "image",
        image: {
          link: imageUrl,
          caption: caption || "",
        },
      }
    } else if (messageType === "document") {
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "document",
        document: {
          link: imageUrl,
          caption: caption || "",
        },
      }
    } else {
      if (!message) {
        return NextResponse.json({ error: "Missing required field: message" }, { status: 400 })
      }
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }
    }

    // Send message via WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v18.0/${actualPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[WhatsApp API Error]", data)
      return NextResponse.json({ error: "Failed to send WhatsApp message", details: data }, { status: response.status })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[WhatsApp Send Error]", error)
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 })
  }
}
