export const EGYPTIAN_LEXICON = {
  // كلمات أساسية
  greetings: {
    formal: ["إزيك", "عامل إيه", "أخبارك إيه"],
    informal: ["يا هلا", "يا هلا بيك", "ازيك يا حبيبي"],
    regional: {
      cairo: ["إزيك يا معلم", "أهلاً يا باشا"],
      alexandria: ["إزيك يا غالي", "كيفك يا عم"],
      saeed: ["إيه أخبارك يا راجل", "عامل إيه يا جدع"],
    },
  },

  // تعبيرات المشاعر
  emotions: {
    happy: ["مبسوط", "فرحان", "مستمتع", "على الموج", "على الماشي"],
    sad: ["زعلان", "متضايق", "مش مبسوط", "نفسي تعبانة", "قلبي وجعني"],
    angry: ["متعصب", "غضبان", "متضايق", "مش طايقه", "على آخري"],
    surprised: ["مصدوم", "مستغرب", "مش مصدق", "يا نهار"],
  },

  // أمثال مصرية شهيرة
  proverbs: [
    "اللي يحبه ربنا يحوش له فلوسه",
    "اللي ما يعرف الصقر يشويه",
    "القرد في عين أمه غزال",
    "اللي استحوا ماتوا",
    "اللي يتجوز أمي أقول له يا عمي",
    "مركب نوح مش هتستحمل أكتر من كده",
  ],

  // كلمات الطعام المصري
  food: {
    كشري: "أكلة مصرية شعبية من الأرز والمكرونة والعدس",
    فول: "الفول المدمس - فطور المصريين",
    طعمية: "الفلافل المصري",
    كفتة: "لحمة مفرومة متبلة ومشوية",
    ملوخية: "أكلة خضراء مصرية",
    محشي: "ورق عنب أو كوسة محشية",
  },

  // تعبيرات الاستهجان والسخرية
  sarcasm: {
    mild: ["يا نهار", "يا سلام", "فعلاً", "طبعاً طبعاً"],
    strong: ["يا نهار أسود", "يا حرام", "مش معقول", "ده جامد"],
  },

  // كود-سويتشنج شائع (عربي-إنجليزي)
  codeSwitch: {
    ok: ["اوكي", "تمام", "ماشي"],
    sorry: ["سوري", "آسف", "معلش"],
    thanks: ["ثانكس", "شكراً", "مرسي"],
    please: ["بليز", "من فضلك", "لو سمحت"],
    nice: ["نايس", "حلو", "جامد"],
  },

  // تصريفات الأفعال المصرية
  verbConjugations: {
    يعمل: {
      present: "بيعمل",
      past: "عمل",
      future: "هيعمل",
      continuous: "بيعمل دلوقتي",
    },
    يروح: {
      present: "بيروح",
      past: "راح",
      future: "هيروح",
      continuous: "رايح دلوقتي",
    },
    يقول: {
      present: "بيقول",
      past: "قال",
      future: "هيقول",
      continuous: "بيقول دلوقتي",
    },
  },

  // خلفيات ثقافية
  culturalContext: {
    ramadan: "شهر الصيام المقدس - وقت الإفطار الساعة 5 مساءً تقريباً",
    eid: "عيد الفطر وعيد الأضحى - أعياد المسلمين",
    coptic: "الأقباط المصريون - عيد الميلاد 7 يناير",
    football: "الأهلي والزمالك - أكبر نادِيين في مصر",
    traffic: "الزحمة في القاهرة أسطورية - خصوصاً وقت الذروة",
  },

  // تعبيرات الدهشة
  surprise: ["يا نهار!", "مش معقول!", "يا سلام!", "يا خبر!", "يا ترى!", "إيه ده!"],

  // تعبيرات الموافقة القوية
  strongAgreement: ["مية المية", "تمام التمام", "صح مية بالمية", "فعلاً كده", "بالظبط"],

  // تعبيرات الرفض القوي
  strongDisagreement: ["مستحيل", "لأ خالص", "أبداً", "مينفعش", "ده مش منطقي"],
}

export class SarcasmDetector {
  detectSarcasm(text: string): { isSarcastic: boolean; confidence: number; type: string } {
    const lowerText = text.toLowerCase()

    // مؤشرات السخرية في المصري
    const sarcasmMarkers = [
      { pattern: /يا نهار أسود|يا سلام|طبعاً طبعاً/i, type: "heavy", confidence: 0.9 },
      { pattern: /فعلاً|صح|تمام أوي/i, type: "mild", confidence: 0.6 },
      { pattern: /جامد جداً|روعة|في القمة/i, type: "exaggeration", confidence: 0.7 },
    ]

    for (const marker of sarcasmMarkers) {
      if (marker.pattern.test(lowerText)) {
        return { isSarcastic: true, confidence: marker.confidence, type: marker.type }
      }
    }

    return { isSarcastic: false, confidence: 0, type: "none" }
  }

  detectIrony(text: string): boolean {
    // اكتشاف التورية - عكس المعنى الظاهر
    const ironyPatterns = [/ما شاء الله.*مش/, /حلو.*أوي.*مش/, /تمام.*خالص.*لكن/]

    return ironyPatterns.some((pattern) => pattern.test(text.toLowerCase()))
  }
}

export class RegionalDialectHandler {
  detectRegion(text: string): string {
    const lowerText = text.toLowerCase()

    // القاهرة
    if (this.containsAny(lowerText, ["يا معلم", "يا باشا", "يا أفندي"])) {
      return "cairo"
    }

    // الإسكندرية
    if (this.containsAny(lowerText, ["يا غالي", "كيفك", "يا عم"])) {
      return "alexandria"
    }

    // الصعيد
    if (this.containsAny(lowerText, ["يا راجل", "يا جدع", "ازاي حضرتك"])) {
      return "saeed"
    }

    return "general"
  }

  adaptToRegion(response: string, region: string): string {
    switch (region) {
      case "alexandria":
        return response.replace(/يا معلم/g, "يا غالي").replace(/يا باشا/g, "يا عم")
      case "saeed":
        return response.replace(/إزيك/g, "ازاي حضرتك").replace(/عامل إيه/g, "أخبارك إيه يا راجل")
      default:
        return response
    }
  }

  private containsAny(text: string, words: string[]): boolean {
    return words.some((word) => text.includes(word))
  }
}

export class CodeSwitchHandler {
  normalizeText(text: string): string {
    // تحويل الكلمات الإنجليزية الشائعة للعربي
    const replacements: Record<string, string> = {
      ok: "تمام",
      okay: "ماشي",
      sorry: "آسف",
      thanks: "شكراً",
      please: "من فضلك",
      nice: "حلو",
      cool: "جامد",
      wow: "يا سلام",
      no: "لأ",
      yes: "أه",
    }

    let normalized = text.toLowerCase()
    for (const [eng, ara] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${eng}\\b`, "gi")
      normalized = normalized.replace(regex, ara)
    }

    return normalized
  }

  // التعامل مع الأرقام الإنجليزية والعربية
  normalizeNumbers(text: string): string {
    const arabicToWestern: Record<string, string> = {
      "٠": "0",
      "١": "1",
      "٢": "2",
      "٣": "3",
      "٤": "4",
      "٥": "5",
      "٦": "6",
      "٧": "7",
      "٨": "8",
      "٩": "9",
    }

    let result = text
    for (const [arabic, western] of Object.entries(arabicToWestern)) {
      result = result.replace(new RegExp(arabic, "g"), western)
    }

    return result
  }
}

export const FEW_SHOT_EXAMPLES = [
  {
    user: "عامل إيه النهارده؟",
    assistant: "تمام الحمد لله يا صاحبي! إنت عامل إيه؟",
  },
  {
    user: "ممكن تساعدني؟",
    assistant: "أكيد يا معلم! قولي عايز إيه؟",
  },
  {
    user: "مش فاهم الحتة دي",
    assistant: "عادي يا حبيبي، هشرحهالك بالراحة. إيه اللي مش واضح؟",
  },
  {
    user: "الطقس إيه النهارده؟",
    assistant: "للأسف مقدرش أجيبلك الطقس دلوقتي يا صاحبي، بس تقدر تشوف من تطبيق الطقس على موبايلك",
  },
  {
    user: "شكراً جداً",
    assistant: "العفو يا جدع! دايماً في الخدمة",
  },
]

export class EgyptianResponseEvaluator {
  evaluateResponse(response: string): { score: number; feedback: string[] } {
    let score = 100
    const feedback: string[] = []

    // تحقق من استخدام اللهجة المصرية
    if (!this.hasMSAWords(response)) {
      feedback.push("✓ يستخدم اللهجة المصرية بشكل طبيعي")
    } else {
      score -= 30
      feedback.push("✗ يحتوي على كلمات فصحى")
    }

    // تحقق من الطول
    const wordCount = response.split(/\s+/).length
    if (wordCount > 50) {
      score -= 20
      feedback.push("✗ الرد طويل جداً (يفضل أقل من 50 كلمة)")
    } else {
      feedback.push("✓ الرد مختصر ومباشر")
    }

    // تحقق من التعبيرات الودودة
    if (this.hasFriendlyExpressions(response)) {
      feedback.push("✓ يحتوي على تعبيرات ودية")
    } else {
      score -= 10
      feedback.push("⚠ يفتقر للتعبيرات الودية")
    }

    return { score, feedback }
  }

  private hasMSAWords(text: string): boolean {
    const msaWords = ["كيف", "لماذا", "أين", "متى", "جداً", "كثيراً"]
    return msaWords.some((word) => text.includes(word))
  }

  private hasFriendlyExpressions(text: string): boolean {
    const friendly = ["يا صاحبي", "يا معلم", "يا حبيبي", "يا جدع", "يا باشا"]
    return friendly.some((expr) => text.includes(expr))
  }
}

export const sarcasmDetector = new SarcasmDetector()
export const regionalDialectHandler = new RegionalDialectHandler()
export const codeSwitchHandler = new CodeSwitchHandler()
export const responseEvaluator = new EgyptianResponseEvaluator()
