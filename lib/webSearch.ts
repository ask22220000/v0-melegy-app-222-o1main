import { SearchService } from "./searchService"

export async function searchWeb(query: string): Promise<string> {
  try {
    const searchService = new SearchService()
    const results = await searchService.searchInternet(query)
    
    if (results.results && results.results.length > 0) {
      return results.results
        .map((r) => `${r.title}: ${r.snippet}`)
        .join("\n\n")
    }
    
    return ""
  } catch (error) {
    console.error("[v0] Web search error:", error)
    return ""
  }
}

export function detectSearchQuery(input: string): { needsSearch: boolean; query: string } {
  const searchKeywords = [
    "متى", "امتى", "وقت", "تاريخ", "سعر", "اسعار",
    "اخبار", "جديد", "حديث", "الان", "دلوقتي", "اليوم",
    "when", "what time", "price", "news", "latest", "current",
    "رمضان", "عيد", "موعد", "كام", "اتفاصيل", "معلومات حالية",
  ]

  const needsSearch = searchKeywords.some(keyword => 
    input.toLowerCase().includes(keyword.toLowerCase())
  )

  return { 
    needsSearch, 
    query: needsSearch ? input : "" 
  }
}

