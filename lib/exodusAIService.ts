/**
 * ExodusAI Service - WhatsApp Integration
 * Uses ExodusAI model from Pollinations.ai for WhatsApp conversations
 */

interface ExodusAIResponse {
  text: string
  conversationId?: string
}

export class ExodusAIService {
  private baseUrl = "https://text.pollinations.ai"
  private conversationHistory = new Map<string, Array<{ role: string; content: string }>>()

  /**
   * Generate response using ExodusAI model for WhatsApp
   */
  async generateWhatsAppResponse(userMessage: string, phoneNumber: string): Promise<ExodusAIResponse> {
    try {
      // Get or create conversation history for this phone number
      if (!this.conversationHistory.has(phoneNumber)) {
        this.conversationHistory.set(phoneNumber, [])
      }

      const history = this.conversationHistory.get(phoneNumber)!

      // Add user message to history
      history.push({ role: "user", content: userMessage })

      // Keep only last 6 messages for context
      if (history.length > 6) {
        history.splice(0, history.length - 6)
      }

      // Build messages for API
      const messages = [
        {
          role: "system",
          content: this.getWhatsAppSystemPrompt(),
        },
        ...history,
      ]

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          model: "openai",
          temperature: 0.8,
          max_tokens: 500, // Shorter for WhatsApp
          seed: Date.now(),
        }),
      })

      if (!response.ok) {
        throw new Error(`ExodusAI API error: ${response.status}`)
      }

      const responseText = await response.text()

      // Add AI response to history
      history.push({ role: "assistant", content: responseText })

      return {
        text: responseText,
        conversationId: phoneNumber,
      }
    } catch (error) {
      console.error("[ExodusAI] Error:", error)
      return {
        text: this.getFallbackResponse(),
        conversationId: phoneNumber,
      }
    }
  }

  /**
   * System prompt optimized for WhatsApp conversations
   */
  private getWhatsAppSystemPrompt(): string {
    return `أنت ميليجي، مساعد ذكي مصري ودود وخفيف الدم.

**شخصيتك:**
- مصري أصيل بتتكلم مصري عادي وطبيعي
- ودود، خفيف الدم، بس جدي لما يحتاج الموقف
- بتفهم سياق المحادثة وتتجاوب بطريقة طبيعية
- بتستخدم كلمات مصرية زي: يا معلم، تمام، على راحتك، ماشي

**أسلوب الرد على WhatsApp:**
- ردودك قصيرة ومباشرة (مناسبة للواتساب)
- استخدم سطور قصيرة وواضحة
- ممكن تستخدم إيموجي بس باعتدال
- متطولش في الرد إلا لو المستخدم طلب كده

**أمثلة على ردودك:**
- "أهلا يا فندم! عامل إيه؟ 😊"
- "تمام، أنا هنا عشان أساعدك في أي حاجة"
- "قول يا معلم، عاوز إيه النهاردة؟"

**ملاحظات مهمة:**
- رد بالمصري العادي مش فصحى
- خلي ردك قصير ومفيد
- استخدم الإيموجي المناسب للموقف
- كن ودود ومتعاون دايماً`
  }

  /**
   * Fallback response if API fails
   */
  private getFallbackResponse(): string {
    const fallbacks = [
      "معلش يا فندم، حصل مشكلة صغيرة. ممكن تعيد تاني؟ 🙏",
      "آسف، النت عندي بطيء شوية. جرب تاني لو سمحت",
      "في خطأ صغير حصل، بس أنا هنا! جرب تاني 😊",
    ]
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }

  /**
   * Clear conversation history for a phone number
   */
  clearConversation(phoneNumber: string): void {
    this.conversationHistory.delete(phoneNumber)
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(phoneNumber: string): { messageCount: number; exists: boolean } {
    const history = this.conversationHistory.get(phoneNumber)
    return {
      messageCount: history?.length || 0,
      exists: !!history,
    }
  }
}

// Export singleton instance
export const exodusAI = new ExodusAIService()
