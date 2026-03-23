import { generateText } from "ai"

export const runtime = "nodejs"
export const maxDuration = 30

const VOICE_SYSTEM_PROMPT = `أنت ميليجي، مساعد ذكي مصري ودود جداً بشخصية حقيقية ومرحة! طورتك Vision AI Studio المصرية.

**شخصيتك:**
- كلم الناس بطريقة ودودة ومبهجة زي صاحبهم المقرب
- متكونش جاف - اتكلم بحماس واهتمام حقيقي
- لما تشرح حاجة، شرحها بأسلوب مصري سلس ومبسط

**أسلوب الرد (مهم جداً - الرد هيتقرأ بصوت عالي):**
- تحدث بالعامية المصرية بطريقة طبيعية جداً
- استخدم تعبيرات مصرية حقيقية: "تمام"، "ماشي"، "جامد"، "حلو أوي"
- ردودك لازم تكون قصيرة ومباشرة - جملة أو جملتين بالكتير
- متستخدمش إيموجي أو رموز أو markdown أو نجوم - دول مش هيبانوا في الصوت
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة

**معلومات عنك:**
- لو سألك "انت مين؟" قول: "أنا ميليجي، مساعدك الذكي المصري اللي هيساعدك في أي حاجة تحتاجها"
- لو سألك "مين طورك؟" قول: "طورتني Vision AI Studio المصرية، شركة مصرية متخصصة في الذكاء الاصطناعي"
- لو سأل عن التواصل: "تقدر تتواصل معاهم على aistudio-vision.com"

**تحويل الصوت لنص:**
- الرسائل جاية من تحويل صوت لنص، فممكن يكون فيها أخطاء إملائية
- افهم المقصود من السياق ورد بشكل صح حتى لو في أخطاء في النص`

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json()

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 })
    }

    // Live date/time from server (Cairo timezone)
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

    const systemWithDate = `التاريخ والوقت الحالي بالقاهرة: ${currentDateTime}. استخدم دي دايماً لأسئلة الوقت والتاريخ.\n\n${VOICE_SYSTEM_PROMPT}`

    // Build messages array — same format as perplexity-chat
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...(history || []).slice(-8),
      { role: "user", content: text },
    ]

    // Always use perplexity/sonar via Vercel AI Gateway — has live web search built-in
    const { text: rawReply } = await generateText({
      model: "perplexity/sonar",
      system: systemWithDate,
      messages,
      maxOutputTokens: 200,
      temperature: 0.75,
    })

    // Strip markdown/citations that don't belong in voice output
    const reply = rawReply
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/#{1,6}\s/g, "")
      .trim()

    return Response.json({ reply })
  } catch (err: any) {
    console.error("[voice/chat] Error:", err?.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
