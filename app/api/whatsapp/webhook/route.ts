import { type NextRequest, NextResponse } from "next/server"

const WHATSAPP_ACCESS_TOKEN = process.env.META_BUSINESS_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

/**
 * WhatsApp Webhook verification (for Meta Business setup)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verified successfully")
    return new NextResponse(challenge, { status: 200 })
  }

  console.log("[WhatsApp] Webhook verification failed")
  return new NextResponse("Forbidden", { status: 403 })
}

async function sendWhatsAppMessage(phoneNumberId: string, to: string, message: string) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.error("[WhatsApp] Access token not configured")
    return false
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[WhatsApp] Send error:", data)
      return false
    }

    console.log("[WhatsApp] Message sent successfully to:", to)
    return true
  } catch (error) {
    console.error("[WhatsApp] Send error:", error)
    return false
  }
}

async function sendWhatsAppImage(phoneNumberId: string, to: string, imageUrl: string, caption?: string) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    return false
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "image",
        image: {
          link: imageUrl,
          caption: caption || "",
        },
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[WhatsApp] Image send error:", error)
    return false
  }
}

async function markAsRead(phoneNumberId: string, messageId: string) {
  if (!WHATSAPP_ACCESS_TOKEN) return

  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    })
  } catch (error) {
    console.error("[WhatsApp] Mark as read error:", error)
  }
}

/**
 * WhatsApp Webhook for receiving messages (Meta Business API format)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Meta Business API sends webhook in this format
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value

      // Check if it's a message
      if (value?.messages && value.messages.length > 0) {
        const message = value.messages[0]
        const from = message.from // Phone number
        const messageBody = message.text?.body || ""
        const messageId = message.id
        const phoneNumberId = value.metadata?.phone_number_id || PHONE_NUMBER_ID

        console.log("[WhatsApp] Message from:", from)
        console.log("[WhatsApp] Message text:", messageBody)

        // Mark message as read
        if (phoneNumberId && messageId) {
          await markAsRead(phoneNumberId, messageId)
        }

        // Check if user wants to generate an image
        const imageKeywords = ["صورة", "ارسم", "اعمل صورة", "صور", "رسمة", "image", "draw", "picture"]
        const wantsImage = imageKeywords.some((keyword) => messageBody.toLowerCase().includes(keyword))

        if (wantsImage && phoneNumberId) {
          // Generate image using pollinations
          const prompt = messageBody.replace(/صورة|ارسم|اعمل صورة|صور|رسمة|image|draw|picture/gi, "").trim()
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt || messageBody)}?width=1024&height=1024&nologo=true`

          await sendWhatsAppImage(phoneNumberId, from, imageUrl, "اتفضل الصورة يا صاحبي! 🎨")
          return NextResponse.json({ status: "success" }, { status: 200 })
        }

        // Generate text response using perplexity-chat API
        const chatResponse = await fetch(`${request.nextUrl.origin}/api/perplexity-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: messageBody,
            conversationHistory: [],
          }),
        })

        if (chatResponse.ok && phoneNumberId) {
          const responseData = await chatResponse.json()
          const responseText = responseData.response

          await sendWhatsAppMessage(phoneNumberId, from, responseText)
        } else {
          // Send error message
          if (phoneNumberId) {
            await sendWhatsAppMessage(phoneNumberId, from, "معلش يا صاحبي، حصل مشكلة. جرب تاني بعد شوية! 🙏")
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return NextResponse.json({ status: "success" }, { status: 200 })
    }

    // Not a WhatsApp message, return 200 anyway
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  } catch (error: any) {
    console.error("[WhatsApp] Webhook error:", error)
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: "error", message: error.message }, { status: 200 })
  }
}
