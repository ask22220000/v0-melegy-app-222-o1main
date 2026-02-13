export interface EmojiContext {
  text: string
  sentiment: "positive" | "negative" | "neutral" | "excited" | "sad" | "angry" | "confused" | "thinking"
  topic?: string
}

export class EmojiLibrary {
  private emojiMap = {
    // مشاعر إيجابية
    positive: ["😊", "😄", "👍", "❤️", "🌟", "✨", "🎉", "🥳"],
    excited: ["🔥", "🚀", "💪", "⚡", "🎯", "🏆", "🎊"],
    love: ["❤️", "💕", "😍", "🥰", "💖"],

    // مشاعر سلبية
    negative: ["😔", "😢", "💔", "😞", "😿"],
    sad: ["😭", "😥", "😓", "🥺"],
    angry: ["😠", "😡", "🤬", "💢"],

    // حيرة وتفكير
    confused: ["🤔", "😕", "😅", "🤷", "🧐"],
    thinking: ["🤔", "💭", "🧠", "💡", "📝"],

    // تحية وترحيب
    greeting: ["👋", "🙋", "😊", "🤝", "💐"],

    // ضحك
    laughing: ["😂", "🤣", "😹", "😆", "😄"],

    // طعام
    food: ["🍕", "🍔", "🍗", "🍰", "☕", "🥤", "🍎"],

    // تكنولوجيا
    tech: ["💻", "📱", "⚙️", "🔧", "🛠️"],

    // عمل ونجاح
    work: ["💼", "📊", "📈", "✅", "👔"],
    success: ["🏆", "🥇", "🎯", "💯", "✨"],

    // وقت
    time: ["⏰", "🕐", "⌚", "⏳"],

    // طبيعة
    nature: ["🌸", "🌺", "🌻", "🌹", "🌷", "🌱"],

    // نار وطاقة
    energy: ["🔥", "⚡", "💥", "✨", "🌟"],
  }

  private egyptianExpressions = {
    تمام: "👌",
    ماشي: "✅",
    حلو: "😊",
    جامد: "🔥",
    عظمة: "💪",
    يخرب_بيتك: "😂",
    تسلم: "🙏",
    شكرا: "❤️",
    للأسف: "😔",
    مشكلة: "😅",
    هنعمل: "💪",
    جاهز: "✅",
    خلاص: "👍",
    أهلا: "👋",
    مساء_الخير: "🌙",
    صباح_الخير: "🌅",
  }

  public getContextualEmoji(context: EmojiContext): string {
    const { text, sentiment, topic } = context
    const lowerText = text.toLowerCase().replace(/\s+/g, "_")

    // تحقق من التعبيرات المصرية
    for (const [expr, emoji] of Object.entries(this.egyptianExpressions)) {
      if (lowerText.includes(expr)) {
        return emoji
      }
    }

    // تحقق من الموضوع
    if (topic) {
      const topicEmojis = this.emojiMap[topic as keyof typeof this.emojiMap]
      if (topicEmojis) {
        return this.getRandomEmoji(topicEmojis)
      }
    }

    // تحقق من المشاعر
    const sentimentEmojis = this.emojiMap[sentiment]
    if (sentimentEmojis) {
      return this.getRandomEmoji(sentimentEmojis)
    }

    return "😊" // إيموجي افتراضي
  }

  public addEmojiToText(
    text: string,
    sentiment: "positive" | "negative" | "neutral" | "excited" | "sad" | "angry" | "confused" | "thinking",
  ): string {
    // تحليل النص واختيار الإيموجي المناسب
    const emoji = this.getContextualEmoji({ text, sentiment })

    // إضافة الإيموجي في المكان المناسب
    if (text.includes("!") || text.includes("؟")) {
      return `${text} ${emoji}`
    }

    // للجمل الطويلة، أضف في النهاية
    if (text.length > 50) {
      return `${text} ${emoji}`
    }

    return `${emoji} ${text}`
  }

  private getRandomEmoji(emojis: string[]): string {
    return emojis[Math.floor(Math.random() * emojis.length)]
  }

  public detectSentimentFromText(
    text: string,
  ): "positive" | "negative" | "neutral" | "excited" | "sad" | "angry" | "confused" | "thinking" {
    const lowerText = text.toLowerCase()

    // كلمات إيجابية
    if (
      /حلو|جامد|رائع|ممتاز|تمام|عظمة|جميل|كويس/.test(lowerText) ||
      /great|good|awesome|excellent|amazing/.test(lowerText)
    ) {
      return "excited"
    }

    // كلمات سلبية
    if (/زفت|وحش|سيء|مش حلو|للأسف/.test(lowerText) || /bad|terrible|awful|sad|unfortunately/.test(lowerText)) {
      return "sad"
    }

    // حيرة
    if (/ازاي|كيف|ليه|مش فاهم|how|why|confused/.test(lowerText)) {
      return "confused"
    }

    // تفكير
    if (/فكر|رأي|اعتقد|أظن|think|idea|opinion/.test(lowerText)) {
      return "thinking"
    }

    return "positive"
  }
}

export const emojiLibrary = new EmojiLibrary()
