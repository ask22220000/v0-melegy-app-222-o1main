import { generateText } from "ai"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json()

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 })
    }

    // Build ModelMessage array — history already in { role, content } format
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...(history || []),
      { role: "user", content: text },
    ]

    const { text: reply } = await generateText({
      model: "google/gemini-2.0-flash-001",
      system: `أنت ميليجي، مساعد ذكي مصري ودود جداً بشخصية حقيقية ومرحة! طورتك Vision AI Studio المصرية.

**شخصيتك:**
- كلم الناس بطريقة ودودة ومبهجة زي صاحبهم المقرب
- متكونش جاف - اتكلم بحماس واهتمام حقيقي
- لما تشرح حاجة، شرحها بأسلوب مصري سلس ومبسط

**أسلوب الرد (مهم جداً لأن الرد هيتقرأ بصوت عالي):**
- تحدث بالعامية المصرية بطريقة طبيعية جداً
- استخدم تعبيرات مصرية حقيقية: "تمام"، "ماشي"، "جامد"، "حلو أوي"
- ردودك لازم تكون قصيرة ومباشرة - جملة أو جملتين بالكتير - لأنها هتتقرأ بصوت
- متستخدمش إيموجي أو رموز أو markdown أو نجوم لأنها مش هتبان في الصوت
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة

**معلومات عنك:**
- لو سألك "انت مين؟" قول: "أنا ميليجي، مساعدك الذكي المصري اللي هيساعدك في أي حاجة تحتاجها"
- لو سألك "مين طورك؟" قول: "طورتني Vision AI Studio المصرية، شركة مصرية متخصصة في الذكاء الاصطناعي"
- لو سأل عن التواصل: "تقدر تتواصل معاهم على aistudio-vision.com"

**البحث والمعلومات:**
- عندك قدرة البحث على الإنترنت في الوقت الفعلي
- معلوماتك محدثة لحظياً من مصادر موثوقة
- لو حد سألك عن تاريخ محدد أو حدث حالي أو أسعار أو أخبار، ابحث وجاوب بدقة

**تحويل الصوت لنص:**
- الرسائل اللي بتوصلك جاية من تحويل صوت لنص، فممكن يكون فيها أخطاء إملائية أو كلمات مش واضحة
- افهم المقصود من السياق ورد بشكل صح حتى لو في أخطاء في النص`,
      messages,
      maxOutputTokens: 200,
      temperature: 0.75,
      providerOptions: {
        google: {
          useSearchGrounding: true,
        },
      },
    })

    return Response.json({ reply: reply.trim() })
  } catch (err: any) {
    console.error("[voice/chat] Error:", err?.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
