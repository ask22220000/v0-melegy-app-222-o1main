interface SearchSource {
  title: string
  url: string
  snippet: string
  domain: string
}

interface DeepSearchResult {
  answer: string
  sources: SearchSource[]
  searchQuery: string
  timestamp: string
}

export class DeepSearchService {
  private readonly SEARCHGPT_API = "https://text.pollinations.ai"
  private readonly MODEL = "openai" // استخدام موديل مجاني متاح

  async searchInternet(query: string): Promise<DeepSearchResult> {
    try {
      console.log("[v0] Starting deep search with SearchGPT for:", query)

      const searchPrompt = this.buildSearchPrompt(query)

      const response = await fetch(this.SEARCHGPT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "أنت محرك بحث ذكي متخصص في البحث عن المعلومات على الإنترنت. تقديم إجابات دقيقة مع ذكر المصادر بشكل واضح.",
            },
            {
              role: "user",
              content: searchPrompt,
            },
          ],
          model: this.MODEL,
          seed: Date.now(),
          jsonMode: true,
        }),
      })

      if (!response.ok) {
        console.error(`[v0] SearchGPT API error: ${response.status}`)
        throw new Error(`SearchGPT API returned ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] SearchGPT response received")

      return this.parseSearchResponse(data, query)
    } catch (error) {
      console.error("[v0] Deep search error:", error)
      return this.getFallbackResult(query)
    }
  }

  private buildSearchPrompt(query: string): string {
    return `ابحث عن معلومات حديثة ودقيقة عن: "${query}"

يرجى تقديم:
1. إجابة شاملة ومفصلة عن الموضوع
2. معلومات محدثة من مصادر موثوقة
3. قائمة بالمصادر المستخدمة (العنوان، الرابط، ملخص قصير)

تنسيق الرد بصيغة JSON:
{
  "answer": "الإجابة التفصيلية هنا",
  "sources": [
    {
      "title": "عنوان المصدر",
      "url": "https://example.com",
      "snippet": "ملخص قصير من المصدر",
      "domain": "example.com"
    }
  ]
}`
  }

  private parseSearchResponse(data: any, query: string): DeepSearchResult {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data

      return {
        answer: parsed.answer || "لم يتم العثور على معلومات كافية",
        sources: Array.isArray(parsed.sources)
          ? parsed.sources.map((s: any) => ({
              title: s.title || "مصدر",
              url: s.url || "#",
              snippet: s.snippet || "",
              domain: s.domain || this.extractDomain(s.url || ""),
            }))
          : [],
        searchQuery: query,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("[v0] Error parsing search response:", error)
      return this.getFallbackResult(query)
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace("www.", "")
    } catch {
      return "unknown"
    }
  }

  private getFallbackResult(query: string): DeepSearchResult {
    return {
      answer: "عذراً، لم أستطع البحث عن المعلومات في الوقت الحالي. جرب مرة أخرى بعد قليل.",
      sources: [],
      searchQuery: query,
      timestamp: new Date().toISOString(),
    }
  }

  isSearchQuery(message: string): boolean {
    const searchKeywords = [
      "ابحث",
      "دور",
      "اعرف",
      "معلومات عن",
      "ايه اخبار",
      "آخر أخبار",
      "احدث",
      "جديد عن",
      "what is",
      "search for",
      "find information",
      "latest news",
      "tell me about",
      "latest",
      "current",
      "نتيجة",
      "ماتش",
      "مباراة",
      "احصائيات",
      "اسعار",
      "سعر",
      "درجة الحرارة",
      "الطقس",
      "weather",
      "news",
      "score",
    ]

    const lowerMessage = message.toLowerCase()
    return searchKeywords.some((keyword) => lowerMessage.includes(keyword))
  }

  formatResponseWithSources(result: DeepSearchResult): string {
    let response = result.answer

    if (result.sources.length > 0) {
      response += "\n\n📚 **المصادر:**\n"
      result.sources.forEach((source, index) => {
        response += `${index + 1}. [${source.title}](${source.url})\n`
        if (source.snippet) {
          response += `   ${source.snippet}\n`
        }
      })
    }

    return response
  }
}

export const deepSearchService = new DeepSearchService()
