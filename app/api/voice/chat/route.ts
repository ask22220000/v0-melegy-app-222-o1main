import { generateText } from "ai"

export const maxDuration = 30

// Convert Western digits to Egyptian Arabic words for natural TTS pronunciation
function numbersToArabicWords(text: string): string {
  const ones = ["", "واحد", "اتنين", "تلاتة", "أربعة", "خمسة", "ستة", "سبعة", "تمانية", "تسعة"]
  const tens = ["", "عشرة", "عشرين", "تلاتين", "أربعين", "خمسين", "ستين", "سبعين", "تمانين", "تسعين"]
  const hundreds = ["", "مية", "ميتين", "تلتمية", "أربعمية", "خمسمية", "ستمية", "سبعمية", "تمانمية", "تسعمية"]

  function convertBelow1000(n: number): string {
    if (n === 0) return ""
    if (n === 11) return "حداشر"
    if (n === 12) return "اتناشر"
    if (n >= 13 && n <= 19) return ones[n - 10] + "تاشر"
    if (n === 1000) return "ألف"
    const h = Math.floor(n / 100)
    const remainder = n % 100
    const t = Math.floor(remainder / 10)
    const o = remainder % 10
    const parts: string[] = []
    if (h > 0) parts.push(hundreds[h])
    if (t > 0 && o > 0) parts.push(ones[o] + " و" + tens[t])
    else if (t > 0) parts.push(tens[t])
    else if (o > 0) parts.push(ones[o])
    return parts.join(" و")
  }

  function convertNumber(n: number): string {
    if (n === 0) return "صفر"
    if (n < 0) return "ناقص " + convertNumber(-n)
    const parts: string[] = []
    if (n >= 1_000_000) {
      const m = Math.floor(n / 1_000_000)
      parts.push(m === 1 ? "مليون" : convertBelow1000(m) + " مليون")
      n %= 1_000_000
    }
    if (n >= 1_000) {
      const k = Math.floor(n / 1_000)
      parts.push(k === 1 ? "ألف" : k === 2 ? "ألفين" : convertBelow1000(k) + " ألف")
      n %= 1_000
    }
    if (n > 0) parts.push(convertBelow1000(n))
    return parts.join(" و")
  }

  // Replace numbers followed by optional decimal part
  return text.replace(/-?\d+(\.\d+)?/g, (match) => {
    const num = parseFloat(match)
    if (isNaN(num)) return match
    if (match.includes(".")) {
      const [intPart, decPart] = match.split(".")
      return convertNumber(parseInt(intPart)) + " فاصلة " + convertNumber(parseInt(decPart))
    }
    return convertNumber(Math.abs(parseInt(match)))
  })
}

const VOICE_SYSTEM_PROMPT = `أنت ميليجي، مساعد ذكي مصري ودود جداً بشخصية حقيقية ومرحة! طورتك Vision AI Studio المصرية.

**شخصيتك:**
- كلم الناس بطريقة ودودة ومبهجة زي صاحبهم المقرب
- متكونش جاف - اتكلم بحماس واهتمام حقيقي
- لما تشرح حاجة، شرحها بأسلوب مصري سلس ومبسط

**البحث على الانترنت (مهم جداً):**
- أي سؤال عن أسعار، أحداث، أخبار، طقس، عملات، أسهم، مباريات — ابحث دلوقتي على النت وجيب أحدث معلومة
- لو السؤال فيه "النهاردة" أو "امبارح" أو "دلوقتي" أو "بكرة" أو "الأسبوع ده" — لازم تبحث على النت قبل ما ترد
- رد بالمعلومة الحقيقية الموجودة على النت مباشرة، ومتقولش "معلوماتي محدودة" أو "مش عارف"
- لو لقيت المعلومة على النت قول "لقيت على النت إن..." بشكل طبيعي

**أسلوب الرد (مهم جداً - الرد هيتقرأ بصوت عالي):**
- تحدث بالعامية المصرية بطريقة طبيعية جداً
- استخدم تعبيرات مصرية حقيقية: "تمام"، "ماشي"، "جامد"، "حلو أوي"
- ردودك لازم تكون قصيرة ومباشرة - جملة أو جملتين بالكتير
- متستخدمش إيموجي أو رموز أو markdown أو نجوم - دول مش هيبانوا في الصوت
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة
- الأرقام اكتبها بالعربي كلمات: مش "58" لكن "تمانية وخمسين"

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

    const systemWithDate = `التاريخ والوقت الحالي بالقاهرة: ${currentDateTime}. استخدم دي دايماً لأسئلة الوقت والتاريخ. ابحث على النت لأي معلومة متغيرة.\n\n${VOICE_SYSTEM_PROMPT}`

    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...(history || []).slice(-8),
      { role: "user", content: text },
    ]

    // perplexity/sonar-pro — real-time web search, more accurate than sonar
    const { text: rawReply } = await generateText({
      model: "perplexity/sonar-pro",
      system: systemWithDate,
      messages,
      maxOutputTokens: 200,
      temperature: 0.6,
    })

    // Strip markdown/citations that don't belong in voice output
    const cleaned = rawReply
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/#{1,6}\s/g, "")
      .trim()

    // Convert any remaining Western digits to Egyptian Arabic words for TTS
    const reply = numbersToArabicWords(cleaned)

    return Response.json({ reply })
  } catch (err: any) {
    console.error("[voice/chat] Error:", err?.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
