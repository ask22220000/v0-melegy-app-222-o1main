import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

const EGYPTIAN_SYSTEM_PROMPT = `أنت ميليجي، مساعد ذكي مصري ودود جداً بشخصية حقيقية ومرحة! طورتك Vision AI Studio المصرية.

شخصيتك:
- كلم الناس بطريقة ودودة ومبهجة زي صاحبهم المقرب
- استخدم إيموجي في ردودك عشان تعبر عن مشاعرك بشكل طبيعي
- متكونش جاف - اتكلم بحماس واهتمام حقيقي
- لما تشرح حاجة، شرحها بأسلوب مصري سلس ومبسط

أسلوب الرد:
- تحدث بالعامية المصرية بطريقة طبيعية جداً
- استخدم تعبيرات مصرية حقيقية: تمام، ماشي، جامد، حلو أوي
- رد بردود قصيرة ومباشرة - متطولش إلا لو المستخدم طلب تفاصيل
- ضيف إيموجي مناسب حسب الموضوع والمشاعر
- اكتب ردك بنص عادي بدون نجوم أو علامات ترقيم خاصة

مهم جداً:
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة
- متنساش الإيموجي - هي جزء من شخصيتك المرحة
- اكتب بنص عادي بدون نجوم أو علامات markdown`

// Detect if query needs real-time web search
function needsWebSearch(query: string): boolean {
  const searchKeywords = [
    "متى", "امتى", "إمتى", "when", "تاريخ", "تواريخ", 
    "حدث", "أخبار", "news", "الآن", "الان", "now",
    "اليوم", "today", "حالياً", "حاليا", "currently",
    "recent", "حديث", "جديد", "latest", "مقارنة", "compare",
    "سعر", "اسعار", "price", "معلومات عن", "information",
    "رمضان", "عيد", "موعد", "وقت", "فين", "where",
    "كم", "how much", "ازاي", "how"
  ]
  
  return searchKeywords.some(keyword => query.toLowerCase().includes(keyword))
}

// Search using Pollinations Perplexity API
async function searchWithPerplexity(query: string): Promise<string> {
  const startTime = Date.now()
  
  try {
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: query
          }
        ],
        model: "perplexity",
        jsonMode: false,
        seed: Math.floor(Math.random() * 1000000)
      }),
      signal: AbortSignal.timeout(2500) // 2.5 second timeout
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const searchResults = await response.text()
    const searchTime = Date.now() - startTime
    
    console.log(`[v0] Perplexity search completed in ${searchTime}ms`)
    
    return searchResults.substring(0, 800) // Limit to 800 chars for speed
  } catch (error: any) {
    console.log(`[v0] Perplexity search failed: ${error.message}`)
    return ""
  }
}

الإيموجي:
- استخدم 1-3 إيموجي في كل رد حسب السياق
- لما حد يسأل سؤال استخدم 🤔 أو ❓
- لما تشرح استخدم 📖 أو ✨  
- لما حاجة إيجابية استخدم 😊 أو 👍
- لما معلومة مهمة استخدم 💡 أو ⚡
- لما حاجة ممتعة استخدم 🎉 أو 😄
- لما تقدم نصيحة استخدم 💭 أو 🎯
- لما تقول مرحباً استخدم 👋 أو 😊

معلومات عنك:
- لو سألك انت مين؟ قول: أنا ميليجي، مساعدك الذكي المصري اللي هيساعدك في أي حاجة تحتاجها
- لو سألك مين طورك؟ قول: طورتني Vision AI Studio المصرية - شركة مصرية متخصصة في الذكاء الاصطناعي
- لو سأل عن التواصل قول: تقدر تتواصل معاهم على www.aistudio-vision.com أو contact@aistudio-vision.com
- لو سأل عن توليد الصور قول: بستخدم نموذج Little Pear من Vision AI Studio - جودة عالية وسريع

معلوماتك:
- عندك قدرة البحث على الإنترنت في الوقت الفعلي
- معلوماتك محدثة لحظياً من مصادر موثوقة على الويب
- لو حد سألك عن تاريخ محدد أو حدث حالي، ابحث وجاوب بدقة

مهم جداً: 
- رد على السؤال اللي اتسأل بس - متزودش معلومات زيادة
- متنساش الإيموجي - هي جزء من شخصيتك المرحة
- اكتب بنص عادي بدون نجوم أو علامات markdown`

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()
  
  try {
    const body = await request.json()
    const { prompt, message, conversationHistory = [], imageUrl } = body
    const userPrompt = prompt || message

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 })
    }

    console.log(`[v0] Query: ${userPrompt.substring(0, 50)}...`)

    // Step 1: Check if we need web search
    const shouldSearch = needsWebSearch(userPrompt)
    console.log(`[v0] Web search needed: ${shouldSearch}`)

    let searchContext = ""
    
    // Step 2: If needed, search with Perplexity (max 2.5s)
    if (shouldSearch) {
      searchContext = await searchWithPerplexity(userPrompt)
      if (searchContext) {
        console.log(`[v0] Search results: ${searchContext.substring(0, 100)}...`)
      }
    }

    // Analyze image with Gemini vision if available
    let imageAnalysisContext = ""
    if (imageUrl) {
      try {
        const visionResult = await generateText({
          model: "google/gemini-3-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt || "اوصف الصورة دي بالتفصيل" },
                { type: "image", image: imageUrl }
              ]
            }
          ],
          maxTokens: 300,
        })
        imageAnalysisContext = visionResult.text
      } catch (e: any) {
        console.error("[API] Image analysis error:", e.message)
      }
    }

    // Build messages array with proper alternation
    const messages: any[] = []

    // Add conversation history (last 4 messages for better context)
    if (conversationHistory && conversationHistory.length > 0) {
      const history = conversationHistory.slice(-4)
      
      for (let i = 0; i < history.length; i++) {
        const msg = history[i]
        const prevMsg = messages.length > 0 ? messages[messages.length - 1] : null
        
        // Only add if it's different from previous role
        if (msg.role === "user" || msg.role === "assistant") {
          if (!prevMsg || prevMsg.role !== msg.role) {
            messages.push({
              role: msg.role,
              content: typeof msg.content === "string" ? msg.content.substring(0, 400) : "",
            })
          }
        }
      }
    }

    // Ensure last message is from assistant (so we can add user message)
    // If last message is user, remove it
    while (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages.pop()
    }

    // Add current user message
    const currentContent = imageAnalysisContext 
      ? `تحليل الصورة: ${imageAnalysisContext.substring(0, 300)}... السؤال: ${userPrompt}`
      : userPrompt

    messages.push({
      role: "user",
      content: currentContent,
    })

    console.log(`[API] Messages structure: ${messages.map(m => m.role).join(' -> ')}`)

    // Choose model based on search needs
    const modelToUse = needsWebSearch ? "perplexity/sonar" : "google/gemini-3-flash"

    console.log(`[API] Using model: ${modelToUse} for query: ${userPrompt.substring(0, 50)}`)

    // Generate response with error handling
    let result
    try {
      result = await generateText({
        model: modelToUse,
        system: EGYPTIAN_SYSTEM_PROMPT,
        messages,
        maxTokens: 600,
        temperature: 0.7,
      })
    } catch (genError: any) {
      console.error("[API] Generation error:", genError.message)
      throw new Error(`فشل توليد الرد: ${genError.message}`)
    }

    // Clean markdown formatting and special characters
    const cleanedText = result.text
      .replace(/\*\*/g, "")           // Remove bold markers
      .replace(/\*/g, "")             // Remove asterisks
      .replace(/\_\_/g, "")           // Remove underline markers
      .replace(/\_/g, "")             // Remove underscores
      .replace(/\[\d+\]/g, "")        // Remove citation numbers
      .replace(/\[(\d+)\]\(.*?\)/g, "") // Remove markdown links
      .replace(/\#\#\#?/g, "")        // Remove headers
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean extra line breaks
      .trim()

    return NextResponse.json({
      response: cleanedText || "معلش حصل مشكلة، جرب تاني 😅",
      detectedEmotion: "neutral",
      emotionScore: 0,
    })
  } catch (error: any) {
    console.error("[API] Error:", error.message || error)
    
    // Return a proper error response
    return NextResponse.json(
      { 
        error: error.message || "حصل خطأ، جرب تاني",
        response: null // Don't send response if there's an error
      },
      { status: 500 }
    )
  }
}
}
