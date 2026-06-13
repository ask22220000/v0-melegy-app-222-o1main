import { getServiceRoleClient } from "./supabase/server"

// Lazy getter — avoids top-level instantiation during build (env vars not available at build time)
function getSupabase() {
  return getServiceRoleClient()
}

export interface CorrectionData {
  sessionId: string
  originalQuestion: string
  originalAnswer: string
  correctedAnswer?: string
  correctionType: "wrong_info" | "incomplete" | "tone" | "language" | "other"
  userFeedback?: string
  context?: Record<string, any>
}

export interface LearnedPattern {
  patternKey: string
  triggerPhrases: string[]
  correctResponse: string
  responseContext?: string
}

export interface QualityRating {
  question: string
  answer: string
  rating: number
  isHelpful: boolean
  sessionId?: string
}

export class MLLearningService {
  // Record a correction from user
  static async recordCorrection(data: CorrectionData): Promise<boolean> {
    try {
      const { error } = await getSupabase().from("learning_corrections").insert({
        session_id: data.sessionId,
        original_question: data.originalQuestion,
        original_answer: data.originalAnswer,
        corrected_answer: data.correctedAnswer,
        correction_type: data.correctionType,
        user_feedback: data.userFeedback,
        context: data.context || {},
      })

      if (error) {
        console.error("[MLLearning] Error recording correction:", error)
        return false
      }

      // Try to learn from this correction immediately
      if (data.correctedAnswer) {
        await this.learnFromCorrection(data)
      }

      return true
    } catch (error) {
      console.error("[MLLearning] Error:", error)
      return false
    }
  }

  // Learn from a correction and create a pattern
  static async learnFromCorrection(data: CorrectionData): Promise<void> {
    try {
      const triggerPhrases = this.extractTriggerPhrases(data.originalQuestion)
      const patternKey = this.generatePatternKey(triggerPhrases)

      // Check if pattern already exists
      const { data: existing } = await supabase
        .from("learned_patterns")
        .select("*")
        .eq("pattern_key", patternKey)
        .single()

      if (existing) {
        // Update existing pattern
        await supabase
          .from("learned_patterns")
          .update({
            correct_response: data.correctedAnswer,
            usage_count: existing.usage_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("pattern_key", patternKey)
      } else {
        // Create new pattern
        await getSupabase().from("learned_patterns").insert({
          pattern_key: patternKey,
          trigger_phrases: triggerPhrases,
          correct_response: data.correctedAnswer,
          response_context: data.correctionType,
          source: "user_correction",
        })
      }

      // Mark correction as learned
      await supabase
        .from("learning_corrections")
        .update({ learned: true })
        .eq("original_question", data.originalQuestion)
        .eq("session_id", data.sessionId)
    } catch (error) {
      console.error("[MLLearning] Error learning from correction:", error)
    }
  }

  // Find matching learned patterns for a question
  static async findLearnedPatterns(question: string): Promise<LearnedPattern[]> {
    try {
      const keywords = this.extractTriggerPhrases(question)

      const { data: patterns } = await supabase
        .from("learned_patterns")
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .limit(10)

      if (!patterns) return []

      // Filter patterns that match any of our keywords
      const matchingPatterns = patterns.filter((pattern: any) => {
        const patternPhrases = pattern.trigger_phrases || []
        return keywords.some(
          (keyword) =>
            patternPhrases.some((phrase: string) => phrase.toLowerCase().includes(keyword.toLowerCase())) ||
            pattern.pattern_key.toLowerCase().includes(keyword.toLowerCase()),
        )
      })

      return matchingPatterns.map((p: any) => ({
        patternKey: p.pattern_key,
        triggerPhrases: p.trigger_phrases,
        correctResponse: p.correct_response,
        responseContext: p.response_context,
      }))
    } catch (error) {
      console.error("[MLLearning] Error finding patterns:", error)
      return []
    }
  }

  // Record quality rating
  static async recordQualityRating(data: QualityRating): Promise<boolean> {
    try {
      const { error } = await getSupabase().from("response_quality").insert({
        question: data.question,
        answer: data.answer,
        rating: data.rating,
        is_helpful: data.isHelpful,
        session_id: data.sessionId,
      })

      return !error
    } catch (error) {
      console.error("[MLLearning] Error recording rating:", error)
      return false
    }
  }

  // Record a common mistake
  static async recordMistake(mistakePattern: string, correctPattern: string, category: string): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from("common_mistakes")
        .select("*")
        .eq("mistake_pattern", mistakePattern)
        .single()

      if (existing) {
        await supabase
          .from("common_mistakes")
          .update({ frequency: existing.frequency + 1 })
          .eq("mistake_pattern", mistakePattern)
      } else {
        await getSupabase().from("common_mistakes").insert({
          mistake_pattern: mistakePattern,
          correct_pattern: correctPattern,
          category,
        })
      }
    } catch (error) {
      console.error("[MLLearning] Error recording mistake:", error)
    }
  }

  // Get common mistakes to avoid
  static async getCommonMistakes(): Promise<Array<{ mistake: string; correct: string }>> {
    try {
      const { data } = await supabase
        .from("common_mistakes")
        .select("mistake_pattern, correct_pattern")
        .order("frequency", { ascending: false })
        .limit(20)

      return (data || []).map((m: any) => ({
        mistake: m.mistake_pattern,
        correct: m.correct_pattern,
      }))
    } catch (error) {
      console.error("[MLLearning] Error getting mistakes:", error)
      return []
    }
  }

  // Generate learning context for the AI
  static async generateLearningContext(question: string): Promise<string> {
    const patterns = await this.findLearnedPatterns(question)
    const mistakes = await this.getCommonMistakes()

    let context = ""

    if (patterns.length > 0) {
      context += "\n\n--- تعلمت من تجارب سابقة ---\n"
      patterns.forEach((p, i) => {
        context += `${i + 1}. لما حد يسأل عن "${p.triggerPhrases.join(" أو ")}"، الرد الصحيح: "${p.correctResponse}"\n`
      })
    }

    if (mistakes.length > 0) {
      context += "\n--- أخطاء لازم أتجنبها ---\n"
      mistakes.slice(0, 5).forEach((m, i) => {
        context += `${i + 1}. بدل "${m.mistake}" قول "${m.correct}"\n`
      })
    }

    return context
  }

  // Helper: Extract trigger phrases from text
  private static extractTriggerPhrases(text: string): string[] {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "is",
      "are",
      "was",
      "were",
      "what",
      "how",
      "why",
      "when",
      "where",
      "who",
      "ايه",
      "هو",
      "هي",
      "في",
      "على",
      "من",
      "الى",
      "عن",
      "مع",
      "ازاي",
      "ليه",
      "فين",
      "امتى",
      "مين",
      "دي",
      "ده",
      "دول",
    ])

    return text
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 5)
  }

  // Helper: Generate pattern key
  private static generatePatternKey(phrases: string[]): string {
    return phrases.slice(0, 3).join("-").toLowerCase()
  }

  // Get learning statistics
  static async getLearningStats(): Promise<{
    totalCorrections: number
    learnedPatterns: number
    avgRating: number
    commonMistakes: number
  }> {
    try {
      const [corrections, patterns, ratings, mistakes] = await Promise.all([
        getSupabase().from("learning_corrections").select("id", { count: "exact" }),
        getSupabase().from("learned_patterns").select("id", { count: "exact" }).eq("is_active", true),
        getSupabase().from("response_quality").select("rating"),
        getSupabase().from("common_mistakes").select("id", { count: "exact" }),
      ])

      const avgRating =
        ratings.data && ratings.data.length > 0
          ? ratings.data.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.data.length
          : 0

      return {
        totalCorrections: corrections.count || 0,
        learnedPatterns: patterns.count || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        commonMistakes: mistakes.count || 0,
      }
    } catch (error) {
      console.error("[MLLearning] Error getting stats:", error)
      return { totalCorrections: 0, learnedPatterns: 0, avgRating: 0, commonMistakes: 0 }
    }
  }
}
