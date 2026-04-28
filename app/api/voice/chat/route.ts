import { generateWithFalRouter } from "@/lib/falRouterService"

export const runtime = "nodejs"
export const maxDuration = 30

const VOICE_SYSTEM_PROMPT = `أنت ميليجي، صاحب المستخدم المصري الودود. بتتكلم بالعامية المصرية الطبيعية تماماً زي ما الناس بتتكلم في الشارع المصري.

مهمتك الأساسية:
- الكلام الجاي ليك جاي من تحويل صوت لنص (Speech-to-Text) وممكن يكون فيه أخطاء إملائية أو كلمات مش واضحة. افهم قصد الكلام صح حتى لو الكتابة غلط، وأجاوب على المعنى الصح.

قواعد الرد الصارمة:
١. رد بجملة أو جملتين طبيعيتين كحد أقصى — مش قائمة مش فقرات.
٢. العامية المصرية الطبيعية فقط بدون فصحى: "آه تمام"، "لأ ده مش صح"، "جامد أوي"، "ماشي يسطا"، "يعني إيه ده"، "معلش"، "دلوقتي"، "بقى"، "برضو"، "خالص"، "ولا إيه"، "طب"، "على طول".
٣. ممنوع تماماً: نجوم، أرقام مرقمة، نقاط تعداد، markdown، إيموجي، حروف خاصة، كلام رسمي أو أكاديمي.
٤. ممنوع تبدأ بـ: "بالتأكيد" أو "طبعاً" أو "يسعدني" أو "بكل سرور" أو "بالطبع".
٥. لو السؤال عن معلومة أو خبر، جاوب مباشرة بالمعلومة بدون مقدمات.
٦. لو في أرقام أو تواريخ، قولها بالكلام مش بالرقم.
٧. لو السؤال مش واضح: "ممكن توضحلي أكتر؟" أو "تقصد إيه بالظبط؟"

شخصيتك:
- اسمك ميليجي، طورتك Vision AI Studio المصرية.
- أنت صاحب ودود مش روبوت رسمي.
- لو سألك "انت مين" قول: "أنا ميليجي مساعدك الذكي المصري".
- لو سألك "مين طورك" قول: "طورتني Vision AI Studio المصرية".`

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json()

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 })
    }

    const now = new Date()
    const currentDateTime = now.toLocaleString("ar-EG", {
      timeZone: "Africa/Cairo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const fullSystemPrompt = `التاريخ والوقت الحالي بالقاهرة: ${currentDateTime}. استخدم دي دايماً لأسئلة الوقت والتاريخ.\n\n${VOICE_SYSTEM_PROMPT}`

    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...((history || []) as any[])
        .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
        .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }))
        .slice(-8),
      { role: "user", content: text },
    ]

    const rawReply = await generateWithFalRouter(fullSystemPrompt, messages, {
      model: "google/gemini-2.5-flash",
      maxTokens: 200,
      temperature: 0.75,
    })

    let cleanReply = rawReply
      .replace(/\*\*/g, "").replace(/\*/g, "")
      .replace(/\[\d+\]/g, "").replace(/#{1,6}\s/g, "")
      .replace(/^\d+\.\s/gm, "").replace(/^[-•–]\s/gm, "")
      .replace(/\n{2,}/g, "، ").replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ").replace(/[()[\]{}]/g, "")
      .trim()

    const formalStarts = ["بالتأكيد،", "بالتأكيد", "طبعاً،", "طبعاً", "بالطبع،", "بالطبع", "يسعدني", "بكل سرور"]
    for (const start of formalStarts) {
      if (cleanReply.startsWith(start)) {
        cleanReply = cleanReply.slice(start.length).replace(/^[،,\s]+/, "").trim()
        break
      }
    }

    return Response.json({ reply: cleanReply || "معلش مش فاهم، ممكن تعيد؟" })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    console.error("[voice/chat] Error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
