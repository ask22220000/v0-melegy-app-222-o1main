export class NLPEnhancer {
  private initialized = false

  async initialize() {
    if (this.initialized) return
    this.initialized = true
    console.log("[v0] NLP Enhancer initialized successfully")
  }

  // Lightweight sentiment analysis using patterns
  async analyzeSentiment(text: string): Promise<{ label: string; score: number }> {
    const lowerText = text.toLowerCase()

    // Positive patterns
    const positivePatterns = [
      /تمام|جميل|رائع|ممتاز|شكرا|تسلم|حلو|كويس|عظيم/,
      /good|great|awesome|thanks|nice|excellent/i,
    ]

    // Negative patterns
    const negativePatterns = [/غلط|مش فاهم|مش شغال|وحش|سيء|زفت|مشكلة|فاشل/, /bad|wrong|error|problem|fail|broken/i]

    for (const pattern of positivePatterns) {
      if (pattern.test(lowerText)) {
        return { label: "POSITIVE", score: 0.85 }
      }
    }

    for (const pattern of negativePatterns) {
      if (pattern.test(lowerText)) {
        return { label: "NEGATIVE", score: 0.85 }
      }
    }

    return { label: "NEUTRAL", score: 0.5 }
  }

  // Enhanced Egyptian dialect detection and normalization
  normalizeEgyptianText(text: string): string {
    const egyptianMap: Record<string, string> = {
      ازيك: "كيف حالك",
      ازاي: "كيف",
      ايه: "ما",
      فين: "أين",
      امتى: "متى",
      ليه: "لماذا",
      مين: "من",
      عامل: "تفعل",
      بتعمل: "تفعل",
      عايز: "تريد",
      محتاج: "تحتاج",
      اوي: "جداً",
      قوي: "جداً",
      خالص: "تماماً",
      بقى: "إذن",
      يعني: "أي",
      علشان: "لأجل",
      عشان: "بسبب",
    }

    let normalized = text
    for (const [egyptian, standard] of Object.entries(egyptianMap)) {
      const regex = new RegExp(`\\b${egyptian}\\b`, "gi")
      normalized = normalized.replace(regex, standard)
    }

    return normalized
  }

  // Extract intent from Egyptian dialect messages
  extractIntent(text: string): {
    intent: string
    confidence: number
  } {
    const lowerText = text.toLowerCase()

    // Greeting patterns
    if (/اهلا|هلا|صباح|مساء|السلام|ازيك|عامل ايه/.test(lowerText)) {
      return { intent: "greeting", confidence: 0.95 }
    }

    // Question patterns
    if (/ايه|فين|امتى|ليه|ازاي|مين|هل|ممكن/.test(lowerText)) {
      return { intent: "question", confidence: 0.9 }
    }

    // Request patterns
    if (/عايز|محتاج|ممكن|لو سمحت|من فضلك/.test(lowerText)) {
      return { intent: "request", confidence: 0.85 }
    }

    // Gratitude patterns
    if (/شكرا|تسلم|ميرسي|thanks/.test(lowerText)) {
      return { intent: "gratitude", confidence: 0.9 }
    }

    // Frustration patterns
    if (/غلط|مش فاهم|مش شغال|مش راضي|مشكلة/.test(lowerText)) {
      return { intent: "frustration", confidence: 0.8 }
    }

    return { intent: "statement", confidence: 0.6 }
  }

  // Enhanced context understanding for better responses
  enhanceContext(userMessage: string, conversationHistory: any[]): string {
    const intent = this.extractIntent(userMessage)
    const normalized = this.normalizeEgyptianText(userMessage)

    let contextPrompt = `فهم النية: ${intent.intent}\n`
    contextPrompt += `الرسالة المعدلة: ${normalized}\n`

    if (conversationHistory.length > 0) {
      const lastMessage = conversationHistory[conversationHistory.length - 1]
      contextPrompt += `السياق السابق: ${lastMessage.content}\n`
    }

    return contextPrompt
  }
}

export const nlpEnhancer = new NLPEnhancer()
