export const maxDuration = 30

interface IdeaToPromptRequest {
  idea: string
}

const arabicToEnglishDictionary: Record<string, string> = {
  // Objects and nouns
  أهرامات: "pyramids of Egypt",
  الأهرامات: "pyramids of Egypt",
  للأهرامات: "pyramids of Egypt",
  قطة: "cat",
  قط: "cat",
  كلب: "dog",
  كلاب: "dogs",
  حصان: "horse",
  طائر: "bird",
  سمكة: "fish",
  أسد: "lion",
  نمر: "tiger",
  فيل: "elephant",
  زرافة: "giraffe",
  ولد: "boy",
  بنت: "girl",
  طفل: "child",
  رجل: "man",
  امرأة: "woman",
  شجرة: "tree",
  زهرة: "flower",
  جبل: "mountain",
  بحر: "sea ocean",
  نهر: "river",
  سماء: "sky",
  شمس: "sun",
  قمر: "moon",
  نجوم: "stars",
  غيوم: "clouds",
  سحاب: "clouds",
  مطر: "rain",
  ثلج: "snow",
  بيت: "house",
  قصر: "palace castle",
  مدينة: "city",
  قرية: "village",
  شارع: "street",
  سيارة: "car",
  طائرة: "airplane",
  مركب: "boat ship",
  قارب: "boat",
  دراجة: "bicycle",

  // Colors
  أحمر: "red",
  أزرق: "blue",
  أخضر: "green",
  أصفر: "yellow",
  برتقالي: "orange",
  بنفسجي: "purple violet",
  وردي: "pink",
  أبيض: "white",
  أسود: "black",
  رمادي: "gray",
  بني: "brown",
  ذهبي: "golden",
  فضي: "silver",

  // Adjectives
  كبير: "big large",
  صغير: "small tiny",
  جميل: "beautiful",
  حلو: "nice pretty",
  قبيح: "ugly",
  طويل: "tall long",
  قصير: "short",
  سريع: "fast",
  بطيء: "slow",
  قوي: "strong",
  ضعيف: "weak",
  سعيد: "happy",
  حزين: "sad",
  غاضب: "angry",
  مبتسم: "smiling",
  ضاحك: "laughing",
  نائم: "sleeping",
  واقف: "standing",
  جالس: "sitting",
  يجري: "running",
  يطير: "flying",
  يسبح: "swimming",
  قديم: "old ancient",
  جديد: "new modern",
  نظيف: "clean",
  وسخ: "dirty",
  ساخن: "hot",
  بارد: "cold",
  دافئ: "warm",
  لامع: "shiny bright",
  مظلم: "dark",
  فاتح: "light",

  // Art styles
  كرتون: "cartoon animated",
  كرتوني: "cartoon animated",
  كرتونية: "cartoon animated",
  كرتونيه: "cartoon animated",
  بخطوط: "with lines outlined",
  خطوط: "lines outlines",
  واقعي: "realistic photorealistic",
  حقيقي: "realistic real",
  ثلاثي: "3D three dimensional",
  "3d": "3D three dimensional",
  رسم: "drawing illustration",
  رسمة: "drawing illustration",
  لوحة: "painting artwork",
  فني: "artistic",
  تاريخي: "historical ancient",
  عصري: "modern contemporary",
  تقليدي: "traditional classic",
  مبهج: "cheerful joyful vibrant",
  احترافي: "professional",

  // Actions and verbs - removed as filler words
  عاوز: "",
  اعمل: "",
  ولد: "",
  ارسم: "",
  صور: "",
  اكتب: "",
  قول: "",
  شوف: "",
  عايز: "",

  // Filler words
  ايوة: "",
  كده: "",
  يعني: "",
  بقى: "",
  "...": "",
}

function translateArabicToEnglish(text: string): string {
  console.log("[v0] Original text:", text)

  // Normalize text
  let normalized = text.replace(/\s+/g, " ").replace(/[،؛]/g, ",").trim()

  console.log("[v0] Normalized text:", normalized)

  // Check for direct phrase matches first
  for (const [arabic, english] of Object.entries(arabicToEnglishDictionary)) {
    if (normalized.includes(arabic)) {
      console.log(`[v0] Direct match: ${arabic} -> ${english}`)
      normalized = normalized.replace(new RegExp(arabic, "g"), english)
    }
  }

  console.log("[v0] After phrase translation:", normalized)

  // Word by word translation for remaining Arabic
  const words = normalized.split(" ")
  const translatedWords = words.map((word) => {
    // Remove common Arabic prefixes
    let cleanWord = word
    const prefixes = ["لل", "ال", "ب", "و", "ف", "ك"]
    for (const prefix of prefixes) {
      if (cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 1) {
        cleanWord = cleanWord.substring(prefix.length)
        console.log(`[v0] Removed prefix "${prefix}" from "${word}" -> "${cleanWord}"`)
      }
    }

    // Try to translate the cleaned word
    if (arabicToEnglishDictionary[cleanWord]) {
      console.log(`[v0] Translated: ${cleanWord} -> ${arabicToEnglishDictionary[cleanWord]}`)
      return arabicToEnglishDictionary[cleanWord]
    }

    // Try original word
    if (arabicToEnglishDictionary[word]) {
      console.log(`[v0] Translated: ${word} -> ${arabicToEnglishDictionary[word]}`)
      return arabicToEnglishDictionary[word]
    }

    console.log(`[v0] No translation for: ${word}`)
    return word
  })

  let result = translatedWords.join(" ").replace(/\s+/g, " ").trim()

  console.log("[v0] After word-by-word translation:", result)

  // Remove any remaining Arabic characters
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g
  result = result.replace(arabicPattern, "").replace(/\s+/g, " ").trim()

  console.log("[v0] Final translated:", result)

  // If result is empty or too short, return a generic prompt
  if (!result || result.length < 3) {
    result = "professional high quality image"
    console.log("[v0] Result too short, using fallback:", result)
  }

  return result
}

function enhancePromptToProfessional(basicIdea: string): string {
  console.log("[v0] Enhancing idea:", basicIdea)

  // Translate from Arabic to English
  const englishIdea = translateArabicToEnglish(basicIdea)

  console.log("[v0] Translated idea:", englishIdea)

  // Add professional enhancement terms
  const qualityTerms = [
    "highly detailed",
    "ultra realistic",
    "8k resolution",
    "professional photography",
    "perfect composition",
    "cinematic lighting",
    "sharp focus",
    "vibrant colors",
    "masterpiece",
    "best quality",
  ]

  // Randomly select 5-7 enhancement terms
  const selectedTerms = qualityTerms.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 5)

  const enhancedPrompt = `${englishIdea}, ${selectedTerms.join(", ")}`

  console.log("[v0] Enhanced professional prompt:", enhancedPrompt)

  return enhancedPrompt
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IdeaToPromptRequest
    const { idea } = body

    if (!idea || idea.trim().length === 0) {
      return Response.json({ error: "Idea is required" }, { status: 400 })
    }

    console.log("[v0] Received idea:", idea)

    const professionalPrompt = enhancePromptToProfessional(idea)

    return Response.json({
      prompt: professionalPrompt,
      original: idea,
    })
  } catch (error) {
    console.error("[v0] Idea to prompt conversion error:", error)
    return Response.json(
      {
        error: "Failed to convert idea to prompt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
