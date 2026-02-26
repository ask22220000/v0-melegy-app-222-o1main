export async function searchWeb(query: string): Promise<string> {
  // Web search معطل مؤقتاً لأن DuckDuckGo API مش شغال
  // هنرجع string فاضي علشان الـ AI يستخدم معرفته
  return ""
}

export function detectSearchQuery(input: string): { needsSearch: boolean; query: string } {
  // معطل مؤقتاً لحد ما نلاقي API كويس
  return { needsSearch: false, query: "" }
}
