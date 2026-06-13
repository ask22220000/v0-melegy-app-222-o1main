export interface Intent {
  type: string
  confidence: number
  entities: Record<string, any>
}

export class IntentRecognizer {
  recognizeIntent(text: string): Intent {
    const lowerText = text.toLowerCase()

    // نوايا الإحباط/المشاكل - أولاً عشان هي مهمة
    if (this.isFrustration(lowerText)) {
      return { type: "frustration", confidence: 0.9, entities: { issue: this.extractIssue(lowerText) } }
    }

    // نوايا التحية
    if (this.isGreeting(lowerText)) {
      return { type: "greeting", confidence: 0.95, entities: {} }
    }

    // نوايا الشكر
    if (this.isThank(lowerText)) {
      return { type: "thank", confidence: 0.9, entities: {} }
    }

    // نوايا الأسئلة
    if (this.isQuestion(lowerText)) {
      return { type: "question", confidence: 0.9, entities: this.extractQuestionType(lowerText) }
    }

    // نوايا الطلبات
    if (this.isRequest(lowerText)) {
      return { type: "request", confidence: 0.85, entities: this.extractRequestType(lowerText) }
    }

    return { type: "unknown", confidence: 0.5, entities: {} }
  }

  recognizeEmotion(text: string): string {
    const lowerText = text.toLowerCase()

    if (this.containsWords(lowerText, ["سعيد", "مبسوط", "فرحان", "رائع", "جميل"])) {
      return "happy"
    }
    if (this.containsWords(lowerText, ["زعلان", "حزين", "متضايق", "مش مبسوط"])) {
      return "sad"
    }
    if (this.containsWords(lowerText, ["غضبان", "زعلان", "متضايق", "مش عاجبني"])) {
      return "angry"
    }
    if (this.containsWords(lowerText, ["خايف", "قلقان", "متوتر"])) {
      return "anxious"
    }

    return "neutral"
  }

  private isQuestion(text: string): boolean {
    return /^(ايه|إيه|ازاي|إزاي|ليه|لماذا|كيف|ما|هل|من|متى|أين|فين|كام|كم)/i.test(text) || text.includes("؟")
  }

  private isRequest(text: string): boolean {
    return this.containsWords(text, ["عاوز", "اعمل", "ولد", "اعملي", "ممكن", "لو سمحت"])
  }

  private isGreeting(text: string): boolean {
    return this.containsWords(text, ["أهلا", "اهلا", "السلام", "صباح", "مساء", "ازيك", "إزيك"])
  }

  private isThank(text: string): boolean {
    return this.containsWords(text, ["شكرا", "متشكر", "ممنون", "جزاك", "تسلم"])
  }

  private isFrustration(text: string): boolean {
    return this.containsWords(text, [
      "مش فاهم",
      "مش شغال",
      "مش نافع",
      "مشكلة",
      "خربان",
      "فاهمش",
      "فهمش",
      "متفهمش",
      "عايز اتعلم",
      "محتاج شرح",
      "مستغبي",
      "مش واضح",
      "لخبطت",
      "التبس",
    ])
  }

  private extractIssue(text: string): string {
    // Extract the main issue the user is frustrated about
    if (text.includes("فهم")) return "understanding"
    if (text.includes("شغال") || text.includes("نافع")) return "functionality"
    if (text.includes("صورة")) return "image"
    if (text.includes("فيديو")) return "video"
    if (text.includes("جدول") || text.includes("excel")) return "data"
    return "general"
  }

  private containsWords(text: string, words: string[]): boolean {
    return words.some((word) => text.includes(word))
  }

  private extractQuestionType(text: string): Record<string, any> {
    if (text.includes("ايه") || text.includes("إيه")) {
      return { questionType: "what" }
    }
    if (text.includes("ازاي") || text.includes("إزاي")) {
      return { questionType: "how" }
    }
    if (text.includes("ليه")) {
      return { questionType: "why" }
    }
    return {}
  }

  private extractRequestType(text: string): Record<string, any> {
    if (text.includes("صورة")) return { requestType: "image" }
    if (text.includes("فيديو")) return { requestType: "video" }
    if (text.includes("جدول") || text.includes("excel")) return { requestType: "excel" }
    return {}
  }
}

export const intentRecognizer = new IntentRecognizer()
