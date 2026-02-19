import { apiKeyManager } from "./apiKeyManager"

interface SearchResult {
  title: string
  snippet: string
  url: string
  source: string
  relevanceScore: number
  timestamp?: string
}

interface SearchResponse {
  results: SearchResult[]
  totalResults: number
  searchTime: number
}

export class SearchService {
  private apiKey: string

  constructor() {
    this.apiKey = apiKeyManager.getCurrentKey()
  }

  async searchInternet(query: string, sources: string[] = ["all"]): Promise<SearchResponse> {
    const startTime = Date.now()
    const results: SearchResult[] = []

    try {
      // Run searches in parallel for speed
      const searchPromises: Promise<SearchResult[]>[] = []
      
      // DuckDuckGo Search
      if (sources.includes("all") || sources.includes("duckduckgo")) {
        searchPromises.push(this.searchDuckDuckGo(query))
      }

      // Wikipedia Search
      if (sources.includes("all") || sources.includes("wikipedia")) {
        searchPromises.push(this.searchWikipedia(query))
      }

      // Wait for all searches with timeout
      const allResults = await Promise.race([
        Promise.all(searchPromises),
        new Promise<SearchResult[][]>((_, reject) => 
          setTimeout(() => reject(new Error("Search timeout")), 2500)
        )
      ])

      // Flatten results
      allResults.forEach(sourceResults => results.push(...sourceResults))

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore)

      return {
        results: results.slice(0, 5), // Only top 5 for speed
        totalResults: results.length,
        searchTime: Date.now() - startTime,
      }
    } catch (error) {
      console.error("[SearchService] Error:", error)
      return {
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
      }
    }
  }

  private async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000) // 2 second timeout
      
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
        { signal: controller.signal }
      )
      clearTimeout(timeout)
      
      const data = await response.json()
      const results: SearchResult[] = []

      if (data.AbstractText) {
        results.push({
          title: data.Heading || "DuckDuckGo Result",
          snippet: data.AbstractText.substring(0, 200), // Truncate for speed
          url: data.AbstractURL || "",
          source: "DuckDuckGo",
          relevanceScore: 0.9,
        })
      }

      if (data.RelatedTopics && results.length < 3) {
        data.RelatedTopics.slice(0, 2).forEach((topic: any) => {
          if (topic.Text) {
            results.push({
              title: topic.Text.split(" - ")[0] || "Related Topic",
              snippet: topic.Text.substring(0, 150),
              url: topic.FirstURL || "",
              source: "DuckDuckGo",
              relevanceScore: 0.7,
            })
          }
        })
      }

      return results
    } catch (error) {
      console.error("[SearchService] DuckDuckGo error:", error)
      return []
    }
  }

  private async searchWikipedia(query: string): Promise<SearchResult[]> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000) // 2 second timeout
      
      const response = await fetch(
        `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=2`,
        { signal: controller.signal }
      )
      clearTimeout(timeout)
      
      const data = await response.json()
      const results: SearchResult[] = []

      if (data.query?.search) {
        data.query.search.slice(0, 2).forEach((result: any) => { // Only top 2 for speed
          results.push({
            title: result.title,
            snippet: result.snippet.replace(/<[^>]*>/g, "").substring(0, 150), // Truncate
            url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
            source: "Wikipedia",
            relevanceScore: 0.85,
            timestamp: result.timestamp,
          })
        })
      }

      return results
    } catch (error) {
      console.error("[SearchService] Wikipedia error:", error)
      return []
    }
  }

  calculateRelevance(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(" ")
    const textLower = text.toLowerCase()

    let matches = 0
    queryWords.forEach((word) => {
      if (textLower.includes(word)) matches++
    })

    return matches / queryWords.length
  }
}
