export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    console.log("[v0] Enhancing prompt:", prompt)

    const enhancedPrompt = await professionallyEnhancePrompt(prompt)

    console.log("[v0] Enhanced result:", enhancedPrompt)

    return new Response(
      JSON.stringify({
        enhancedPrompt: enhancedPrompt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("[v0] Enhance prompt API error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to enhance prompt",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

async function professionallyEnhancePrompt(basicPrompt: string): Promise<string> {
  const translatedPrompt = translateArabicToEnglish(basicPrompt)
  const styleType = detectImageStyle(basicPrompt)
  return enhanceWithAIModelTechniques(translatedPrompt, styleType)
}

function detectImageStyle(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.match(/كرتون|cartoon|anime|أنمي|رسوم متحركة/)) return "cartoon"
  if (lowerPrompt.match(/واقعي|realistic|فوتوغراف|photo|صورة حقيقية/)) return "realistic"
  if (lowerPrompt.match(/فني|artistic|لوحة|رسم/)) return "artistic"
  if (lowerPrompt.match(/3d|ثري دي|ثلاثي الأبعاد/)) return "3d"
  if (lowerPrompt.match(/خيالي|fantasy|سحري|magical/)) return "fantasy"
  if (
    lowerPrompt.match(
      /قبطي|قبطية|قبطي|فن القبطي|ايقونة|ايقونات|كنيسة|دير|صليب|هالة|مقدس|مقدسة|ديني|دينية|مسيحي|مسيحية|ملاك|ملائكة|قديس|قديسة|قديسين/,
    )
  )
    return "coptic"

  return "realistic" // Default
}

function enhanceWithAIModelTechniques(translatedPrompt: string, styleType: string): string {
  let enhanced = translatedPrompt

  if (
    translatedPrompt.match(/photorealistic|real photo|photography|realistic photo|dslr/i) ||
    styleType === "realistic"
  ) {
    enhanced += ", photorealistic, hyperrealistic, ultra detailed, 8k uhd, dslr photography"
    enhanced += ", professional photography, sharp focus, perfect composition, natural lighting"
    enhanced += ", award winning photography, masterpiece, high resolution"
    // Add negative prompt to explicitly exclude cartoon/illustration
    enhanced +=
      " | negative: cartoon, anime, illustration, drawing, painting, artistic, blurry, low quality, distorted, ugly, bad anatomy, worst quality"
    return enhanced
  }

  // Style-specific enhancements based on Stable Diffusion best practices
  switch (styleType) {
    case "cartoon":
      enhanced += ", cartoon style, vibrant colors, bold outlines, expressive features, cel shaded, animation art"
      enhanced += ", trending on pixiv, studio quality, 2d illustration"
      break

    case "realistic":
      enhanced += ", photorealistic, hyperrealistic, ultra detailed, 8k uhd, dslr photography"
      enhanced += ", professional photography, sharp focus, perfect composition, natural lighting"
      enhanced += ", award winning photography, masterpiece, trending on 500px"
      break

    case "artistic":
      enhanced += ", digital art, artistic painting, beautiful art, concept art"
      enhanced += ", detailed illustration, vibrant colors, artistic masterpiece"
      enhanced += ", trending on artstation, highly detailed, matte painting"
      break

    case "3d":
      enhanced += ", 3d render, octane render, unreal engine 5, cinema 4d"
      enhanced += ", highly detailed 3d model, ray tracing, volumetric lighting"
      enhanced += ", trending on cgsociety, 8k 3d render"
      break

    case "fantasy":
      enhanced += ", fantasy art, magical atmosphere, ethereal lighting, mystical"
      enhanced += ", concept art, highly detailed, dramatic lighting"
      enhanced += ", trending on artstation, matte painting, epic scene"
      break

    case "coptic":
      enhanced += ", Coptic art style, religious iconography, sacred imagery, Virgin Mary, Jesus Christ, saints, angels"
      enhanced += ", detailed religious artwork, high contrast, vibrant colors, traditional Coptic elements"
      enhanced += ", trending on artstation, highly detailed, religious art"
      break
  }

  // Add universal quality enhancers (DALL-E and VQGAN techniques)
  enhanced += ", high quality, intricate details, best quality"
  enhanced += ", highly detailed, perfect details, sharp image"

  // Add negative prompt guidance
  enhanced += " | negative: blurry, low quality, distorted, ugly, bad anatomy, worst quality"

  return enhanced
}

function translateArabicToEnglish(text: string): string {
  console.log("[v0] Original text:", text)

  let normalized = text.replace(/ـ/g, "").replace(/\s+/g, " ").trim()

  const negationPhrases = [
    { arabic: /مش\s+(تمثال|كرتون|رسم|لوحة|خيالي|انمي)/gi, replacement: "" },
    { arabic: /ولا\s+(تمثال|كرتون|رسم|لوحة|خيالي|انمي)/gi, replacement: "" },
    { arabic: /بدون\s+(تمثال|كرتون|رسم|لوحة|خيالي|انمي)/gi, replacement: "" },
    { arabic: /مش\s+عايز\s+(تمثال|كرتون|رسم|لوحة|خيالي|انمي)/gi, replacement: "" },
  ]

  const negativeTerms: string[] = []

  const negMatches = normalized.match(/(?:مش|ولا|بدون)\s+(تمثال|كرتون|رسم|لوحة|خيالي|انمي|cartoon|statue|drawing)/gi)
  if (negMatches) {
    negMatches.forEach((match) => {
      const term = match.replace(/مش|ولا|بدون/gi, "").trim()
      negativeTerms.push(term)
      normalized = normalized.replace(match, "")
    })
  }

  const isRealistic = /حقيقي|حقيقية|واقعي|واقعية|فوتوغراف|صورة\s+حقيقية|realistic|photorealistic|real\s+photo/.test(
    normalized,
  )

  console.log("[v0] Normalized text:", normalized)
  console.log("[v0] Negative terms to exclude:", negativeTerms)
  console.log("[v0] Is realistic:", isRealistic)

  const words = normalized.split(" ")
  const translatedWords: string[] = []

  for (const word of words) {
    const translated = translateWord(word)
    if (translated && translated.trim() !== "") {
      translatedWords.push(translated)
    }
  }

  let result = translatedWords.join(" ").trim()

  result = result.replace(/[\u0600-\u06FF]/g, "")
  result = result.replace(/\s+/g, " ").trim()

  if (isRealistic) {
    result = result.replace(/cartoon|anime|illustration|drawing|painting|artistic/gi, "")
    result = result.trim()
  }

  console.log("[v0] Final translated text:", result)

  return result || "beautiful professional image"
}

function translateWord(word: string): string {
  // Remove diacritics and normalize
  const clean = word.replace(/[\u064B-\u065F]/g, "")

  // First try direct translation
  const direct = arabicDictionary[clean]
  if (direct) return direct

  // Try removing prefixes and suffixes systematically
  const prefixes = ["للل", "بال", "وال", "فال", "لل", "ال", "ب", "و", "ف", "ك", "ل"]
  const suffixes = ["ها", "ه", "ة", "ات", "ين", "ون", "ان"]

  // Try prefix removal
  for (const prefix of prefixes) {
    if (clean.startsWith(prefix) && clean.length > prefix.length) {
      const withoutPrefix = clean.substring(prefix.length)
      const translated = arabicDictionary[withoutPrefix]
      if (translated) return translated

      // Try suffix removal too
      for (const suffix of suffixes) {
        if (withoutPrefix.endsWith(suffix) && withoutPrefix.length > suffix.length) {
          const withoutBoth = withoutPrefix.substring(0, withoutPrefix.length - suffix.length)
          const finalTranslated = arabicDictionary[withoutBoth]
          if (finalTranslated) return finalTranslated
        }
      }
    }
  }

  // Try suffix removal only
  for (const suffix of suffixes) {
    if (clean.endsWith(suffix) && clean.length > suffix.length) {
      const withoutSuffix = clean.substring(0, clean.length - suffix.length)
      const translated = arabicDictionary[withoutSuffix]
      if (translated) return translated
    }
  }

  return ""
}

const arabicDictionary: Record<string, string> = {
  // Religious terms (existing)
  العذرا: "Virgin Mary",
  العذراء: "Virgin Mary",
  مريم: "Mary Virgin",
  "السيدة العذراء": "Virgin Mary",
  "مريم العذراء": "Virgin Mary",
  المسيح: "Jesus Christ",
  "يسوع المسيح": "Jesus Christ",
  يسوع: "Jesus",
  قبطي: "Coptic art style",
  قبطية: "Coptic art style",
  القبطي: "Coptic art",
  "الفن القبطي": "Coptic art style",
  أيقونة: "religious icon",
  أيقونات: "religious icons",
  كنيسة: "church",
  دير: "monastery",
  صليب: "cross",
  هالة: "halo",
  مقدس: "holy sacred",
  مقدسة: "holy sacred",
  ديني: "religious",
  دينية: "religious",
  مسيحي: "Christian",
  مسيحية: "Christian",
  ملاك: "angel",
  ملائكة: "angels",
  قديس: "saint",
  قديسة: "saint",
  قديسين: "saints",

  // Egyptian slang and common phrases
  يا: "",
  يابني: "",
  يابنتي: "",
  ياعم: "",
  ياخويا: "",
  يامعلم: "",
  ياصاحبي: "",
  ياحبيبي: "",
  عاوز: "",
  عايز: "",
  عاوزة: "",
  عايزة: "",
  اعمل: "",
  اعملي: "",
  اعملني: "",
  ولد: "",
  ولدي: "",
  ولدلي: "",
  اكتب: "",
  اكتبلي: "",
  ارسم: "",
  ارسملي: "",
  صور: "",
  صورلي: "",
  صوري: "",
  خلي: "",
  خليها: "",
  خليه: "",
  لي: "",
  لى: "",
  ليا: "",
  لو: "if",
  سمحت: "",
  ممكن: "",
  من: "from",
  فضلك: "",
  صورة: "image",
  فيديو: "video",
  حول: "convert",
  فكرة: "idea",
  برومبت: "prompt",

  // Physical appearance and qualities for people
  حقيقي: "photorealistic real",
  حقيقية: "photorealistic real",
  واقعي: "realistic photorealistic",
  واقعية: "realistic photorealistic",
  فوتوغراف: "photograph",
  فوتوغرافية: "photographic",
  "صورة حقيقية": "real photograph",
  "صورة واقعية": "realistic photograph",
  تمثال: "statue sculpture",
  رسم: "drawing illustration",
  لوحة: "painting artwork",
  تصميم: "design",
  خيالي: "fantasy imaginary",
  خيالية: "fantasy imaginary",

  // People descriptions
  بنت: "young woman girl",
  ولد: "young man boy",
  شاب: "young man",
  شابة: "young woman",
  راجل: "man",
  ست: "woman",
  عيل: "child kid",
  طفل: "child kid",
  "في العشرينات": "in her twenties 20s",
  "في الثلاثينات": "in her thirties 30s",
  "في الأربعينات": "in her forties 40s",
  جميل: "beautiful",
  جميلة: "beautiful",
  حلو: "beautiful nice",
  حلوة: "beautiful pretty",
  وسيم: "handsome",
  وسيمة: "beautiful",
  انيق: "elegant stylish",
  انيقة: "elegant stylish",

  // Clothing and appearance
  لابس: "wearing",
  لابسة: "wearing",
  زي: "outfit costume",
  ملابس: "clothes",
  فستان: "dress",
  بلوزة: "blouse shirt",
  بنطلون: "pants trousers",
  جينز: "jeans",
  قميص: "shirt",
  جلباب: "galabeya robe",
  عباية: "abaya",
  حجاب: "hijab headscarf",
  طرحة: "veil headscarf",
  بدلة: "suit",
  تيشرت: "t-shirt",
  شورت: "shorts",
  جاكيت: "jacket",
  معطف: "coat",
  كوفية: "scarf",

  // Egyptian landmarks and places
  للاهرامات: "pyramids of Giza Egypt",
  للأهرامات: "pyramids of Giza Egypt",
  الاهرامات: "pyramids of Giza",
  اهرامات: "pyramids",
  أهرامات: "pyramids",
  لاهرامات: "pyramids",
  لأهرامات: "pyramids",
  الهرام: "pyramid",
  هرم: "pyramid",
  الجيزة: "Giza Egypt",
  جيزة: "Giza",
  مصر: "Egypt",
  القاهرة: "Cairo Egypt",
  الإسكندرية: "Alexandria Egypt",
  النيل: "Nile river",
  "أبو الهول": "Great Sphinx",
  الأقصر: "Luxor Egypt",
  أسوان: "Aswan Egypt",
  الكرنك: "Karnak temple",
  "معبد الكرنك": "Karnak temple complex",
  "وادي الملوك": "Valley of the Kings",
  "البحر الأحمر": "Red Sea",
  سيناء: "Sinai",
  دهب: "Dahab",
  "شرم الشيخ": "Sharm El Sheikh",
  الغردقة: "Hurghada",
  "مرسى مطروح": "Marsa Matrouh",
  الفيوم: "Fayoum",
  الواحات: "oasis",

  // Photography and camera terms
  سيلفي: "selfie",
  "بتصور سيلفي": "taking selfie",
  "بتاخد سيلفي": "taking selfie",
  كاميرا: "camera",
  فلاش: "flash",
  بتضحك: "smiling laughing",
  بيبتسم: "smiling",
  نظرة: "looking gazing",
  بتبص: "looking at",
  بيبص: "looking at",
  واقف: "standing",
  واقفة: "standing",
  قاعد: "sitting",
  قاعدة: "sitting",
  ماشي: "walking",
  ماشية: "walking",

  // Actions and poses
  يمشي: "walking",
  تمشي: "walking",
  يجري: "running",
  تجري: "running",
  يطير: "flying",
  تطير: "flying",
  يسبح: "swimming",
  تسبح: "swimming",
  ينام: "sleeping",
  تنام: "sleeping",
  ياكل: "eating",
  تاكل: "eating",
  يلعب: "playing",
  تلعب: "playing",
  يضحك: "laughing smiling",
  تضحك: "laughing smiling",
  يبكي: "crying",
  تبكي: "crying",
  يفكر: "thinking",
  تفكر: "thinking",
  يشاهد: "watching",
  تشاهد: "watching",
  يقرأ: "reading",
  تقرأ: "reading",
  يكتب: "writing",
  تكتب: "writing",
  يرسم: "drawing painting",
  ترسم: "drawing painting",
  بيعمل: "doing making",
  بتعمل: "doing making",

  // Style and quality terms
  تاريخي: "historical ancient",
  تاريخية: "historical ancient",
  فرعوني: "ancient Egyptian pharaonic",
  فرعونية: "ancient Egyptian pharaonic",
  "فن فرعوني": "ancient Egyptian art pharaonic style",
  كرتون: "cartoon",
  كرتوني: "cartoon style",
  كرتونية: "cartoon style",
  انمي: "anime",
  أنمي: "anime",
  مبهج: "cheerful joyful",
  مبهجة: "cheerful joyful",
  بخطوط: "with lines",
  خطوط: "lines outlines",
  ملون: "colorful",
  ملونة: "colorful",
  زاهي: "vibrant bright",
  زاهية: "vibrant bright",
  غامق: "dark",
  غامقة: "dark",
  فاتح: "light bright",
  فاتحة: "light bright",
  شفاف: "transparent",
  شفافة: "transparent",

  // Animals
  قط: "cat",
  قطة: "cat",
  قطط: "cats",
  كلب: "dog",
  كلاب: "dogs",
  أسد: "lion",
  أسود: "lions",
  نمر: "tiger",
  نمور: "tigers",
  فيل: "elephant",
  فيلة: "elephants",
  حصان: "horse",
  خيل: "horses",
  جمل: "camel",
  جمال: "camels",
  حمار: "donkey",
  حمير: "donkeys",
  بقرة: "cow",
  بقر: "cows",
  خروف: "sheep",
  خرفان: "sheep",
  ماعز: "goat",
  طائر: "bird",
  طيور: "birds",
  عصفور: "sparrow bird",
  عصافير: "birds",
  حمامة: "pigeon dove",
  حمام: "pigeons",
  بطة: "duck",
  بط: "ducks",
  دجاجة: "chicken hen",
  دجاج: "chickens",
  ديك: "rooster",
  سمكة: "fish",
  أسماك: "fish",
  فراشة: "butterfly",
  فراشات: "butterflies",
  نحلة: "bee",
  نحل: "bees",
  ذئب: "wolf",
  ذئاب: "wolves",
  دب: "bear",
  دببة: "bears",
  ثعلب: "fox",
  ثعالب: "foxes",
  أرنب: "rabbit",
  أرانب: "rabbits",
  فأر: "mouse",
  فئران: "mice",
  زرافة: "giraffe",
  زرافات: "giraffes",
  تمساح: "crocodile",
  تماسيح: "crocodiles",
  ثعبان: "snake",
  ثعابين: "snakes",
  سلحفاة: "turtle",
  سلاحف: "turtles",
  ضفدع: "frog",
  ضفادع: "frogs",

  // Colors
  أحمر: "red",
  أزرق: "blue",
  أخضر: "green",
  أصفر: "yellow",
  برتقالي: "orange",
  بنفسجي: "purple violet",
  موف: "purple",
  وردي: "pink",
  بمبي: "pink",
  بني: "brown",
  أسود: "black",
  أبيض: "white",
  رمادي: "gray",
  ذهبي: "golden gold",
  دهبي: "golden",
  فضي: "silver",
  لون: "color",
  ألوان: "colors",

  // Sizes
  كبير: "big large",
  كبيرة: "big large",
  صغير: "small little",
  صغيرة: "small little",
  صغنن: "tiny very small",
  صغننة: "tiny very small",
  ضخم: "huge giant enormous",
  ضخمة: "huge giant enormous",
  طويل: "tall long",
  طويلة: "tall long",
  قصير: "short",
  قصيرة: "short",
  عريض: "wide broad",
  عريضة: "wide broad",
  ضيق: "narrow thin",
  ضيقة: "narrow thin",
  سميك: "thick",
  سميكة: "thick",
  رفيع: "thin slim",
  رفيعة: "thin slim",

  // Places
  بيت: "house home",
  منزل: "house home",
  شقة: "apartment",
  عمارة: "building",
  فيلا: "villa",
  قصر: "palace",
  مدرسة: "school",
  جامعة: "university",
  كلية: "college",
  مكتب: "office",
  مستشفى: "hospital",
  صيدلية: "pharmacy",
  مطعم: "restaurant",
  مقهى: "cafe",
  قهوة: "cafe coffee",
  كافيه: "cafe",
  محل: "shop store",
  دكان: "shop",
  "سوبر ماركت": "supermarket",
  مول: "mall",
  متحف: "museum",
  معرض: "gallery exhibition",
  مسجد: "mosque",
  حديقة: "garden park",
  جنينة: "garden",
  شاطئ: "beach",
  بحر: "sea beach",
  جبل: "mountain",
  غابة: "forest jungle",
  صحراء: "desert",
  نهر: "river",
  شارع: "street",
  طريق: "road",
  كوبري: "bridge",
  ميدان: "square plaza",
  مدينة: "city",
  قرية: "village",
  بلد: "country town",

  // Weather and nature
  شمس: "sun sunny",
  مشمس: "sunny",
  مشمسة: "sunny",
  قمر: "moon",
  نجم: "star",
  نجوم: "stars",
  نجمة: "star",
  سماء: "sky",
  غيم: "clouds",
  سحاب: "clouds",
  غيوم: "clouds",
  سحب: "clouds",
  مطر: "rain",
  ممطر: "rainy",
  ممطرة: "rainy",
  بيمطر: "raining",
  ثلج: "snow",
  مثلج: "snowy",
  مثلجة: "snowy",
  رياح: "wind",
  ريح: "wind",
  عاصف: "windy stormy",
  عاصفة: "storm",
  برق: "lightning",
  رعد: "thunder",
  "قوس قزح": "rainbow",
  شجرة: "tree",
  أشجار: "trees",
  زهرة: "flower",
  زهور: "flowers",
  ورد: "roses flowers",
  وردة: "rose flower",
  ياسمين: "jasmine",
  فل: "jasmine",
  عشب: "grass",
  حشيش: "grass",
  ورقة: "leaf",
  أوراق: "leaves",
  ورق: "leaves",
  فرع: "branch",
  أفرع: "branches",
  فروع: "branches",
  جذر: "root",
  جذور: "roots",

  // Food and drink
  طعام: "food",
  أكل: "food meal",
  فاكهة: "fruit",
  خضار: "vegetables",
  خضروات: "vegetables",
  لحم: "meat",
  لحمة: "meat",
  فراخ: "chicken",
  دجاج: "chicken",
  سمك: "fish",
  خبز: "bread",
  عيش: "bread",
  أرز: "rice",
  رز: "rice",
  مكرونة: "pasta",
  معكرونة: "pasta",
  بيتزا: "pizza",
  برجر: "burger",
  ساندويتش: "sandwich",
  كشري: "koshari",
  فول: "fava beans",
  طعمية: "falafel",
  فلافل: "falafel",
  شاورما: "shawarma",
  كباب: "kebab",
  كفتة: "kofta",
  محشي: "stuffed vegetables",
  ملوخية: "molokhia",
  مسقعة: "moussaka",
  عصير: "juice",
  ماء: "water",
  مياه: "water",
  شاي: "tea",
  قهوة: "coffee",
  نسكافيه: "nescafe",
  كابتشينو: "cappuccino",
  لبن: "milk",
  حليب: "milk",
  زبادي: "yogurt",
  جبنة: "cheese",
  حلوى: "sweets dessert",
  حلويات: "sweets desserts",
  كعكة: "cake",
  تورتة: "cake",
  بسكويت: "cookies biscuits",
  شوكولاتة: "chocolate",
  "آيس كريم": "ice cream",
  جيلاتي: "gelato ice cream",
  بسبوسة: "basbousa",
  كنافة: "kunafa",
  قطايف: "qatayef",

  // Objects and items
  سيارة: "car",
  عربية: "car",
  سيارات: "cars",
  عربيات: "cars",
  طيارة: "airplane",
  طائرة: "airplane",
  قطر: "train",
  قطار: "train",
  أتوبيس: "bus",
  ميكروباص: "microbus minibus",
  تاكسي: "taxi",
  "توك توك": "tuk-tuk",
  مترو: "metro subway",
  دراجة: "bicycle bike",
  عجلة: "bicycle",
  موتوسيكل: "motorcycle",
  باخرة: "ship boat",
  مركب: "boat",
  فلوكة: "felucca sailboat",
  باب: "door",
  شباك: "window",
  كرسي: "chair",
  طاولة: "table",
  ترابيزة: "table",
  سرير: "bed",
  لمبة: "lamp light bulb",
  نور: "light",
  كتاب: "book",
  قلم: "pen",
  دفتر: "notebook",
  كراسة: "notebook",
  كمبيوتر: "computer",
  لابتوب: "laptop",
  موبايل: "mobile phone smartphone",
  تليفون: "phone",
  تلفزيون: "television tv",
  تلفزيون: "tv television",
  راديو: "radio",
  كاميرا: "camera",
  ساعة: "watch clock",
  نظارة: "glasses",
  نضارة: "glasses",
  قبعة: "hat cap",
  طاقية: "cap",
  حذاء: "shoe",
  شنطة: "bag",
  جزمة: "shoe boot",
  مفتاح: "key",
  كوب: "cup glass",
  صحن: "plate dish",
  طبق: "plate dish",
  ملعقة: "spoon",
  شوكة: "fork",
  سكينة: "knife",

  // Numbers
  واحد: "one 1",
  اتنين: "two 2",
  ثلاثة: "three 3",
  تلاتة: "three 3",
  أربعة: "four 4",
  اربعة: "four 4",
  خمسة: "five 5",
  ستة: "six 6",
  سبعة: "seven 7",
  ثمانية: "eight 8",
  تمانية: "eight 8",
  تسعة: "nine 9",
  عشرة: "ten 10",
  عشر: "ten 10",

  // Time
  صباح: "morning",
  الصبح: "morning",
  ظهر: "noon midday",
  الظهر: "noon",
  عصر: "afternoon",
  العصر: "afternoon",
  مساء: "evening",
  المغرب: "sunset evening",
  ليل: "night",
  الليل: "night",
  نهار: "day daytime",
  النهار: "daytime",
  فجر: "dawn sunrise",
  الفجر: "dawn",
  غروب: "stunning sunset",
  شروق: "beautiful sunrise",
  ساطع: "bright brilliant",
  داكن: "dark moody",

  // Body parts
  رأس: "head",
  راس: "head",
  وجه: "face",
  وش: "face",
  عين: "eye",
  عيون: "eyes",
  أنف: "nose",
  منخير: "nose",
  فم: "mouth",
  بق: "mouth",
  أذن: "ear",
  ودن: "ear",
  آذان: "ears",
  ودان: "ears",
  شعر: "hair",
  يد: "hand arm",
  إيد: "hand arm",
  أيدي: "hands arms",
  إيدين: "hands",
  رجل: "leg foot",
  رجلين: "legs",
  إصبع: "finger toe",
  صباع: "finger",
  أصابع: "fingers toes",
  صوابع: "fingers",
  قلب: "heart",
  جناح: "wing",
  أجنحة: "wings",
  ذيل: "tail",
  مخلب: "claw paw",
  منقار: "beak",
  قرن: "horn",
  قرون: "horns",

  // Moods and emotions
  سعيد: "happy joyful",
  سعيدة: "happy joyful",
  فرحان: "happy",
  فرحانة: "happy",
  مبسوط: "happy content",
  مبسوطة: "happy content",
  حزين: "sad",
  حزينة: "sad",
  زعلان: "sad upset",
  زعلانة: "sad upset",
  غاضب: "angry",
  غاضبة: "angry",
  زعلان: "angry upset",
  غضبان: "angry",
  غضبانة: "angry",
  خائف: "scared afraid",
  خايف: "scared",
  خائفة: "scared afraid",
  خايفة: "scared",
  متفاجئ: "surprised",
  متفاجئة: "surprised",
  متشوق: "excited eager",
  متشوقة: "excited eager",

  // Prepositions
  في: "in",
  على: "on",
  تحت: "under",
  فوق: "above over",
  بجانب: "beside next to",
  جنب: "beside next to",
  أمام: "in front of",
  قدام: "in front of",
  خلف: "behind",
  ورا: "behind",
  بين: "between",
  مع: "with",
  بدون: "without",
  من: "from",
  إلى: "to",
  لـ: "to for",
  و: "and",
  أو: "or",

  // Art styles
  رسمة: "drawing illustration",
  فن: "art",
  فنان: "artist",
  فنانة: "artist",
  إبداعي: "creative",
  إبداعية: "creative",
  "ثري دي": "3d three-dimensional",
  "ثلاثي الأبعاد": "three dimensional 3d",
  بورتريه: "portrait",
  منظر: "landscape scenery",
  "منظر طبيعي": "natural landscape",
  سحري: "magical",
  سحرية: "magical",
  مستقبلي: "futuristic sci-fi",
  مستقبلية: "futuristic sci-fi",
  قديم: "old ancient vintage",
  قديمة: "old ancient vintage",
  جديد: "new modern",
  جديدة: "new modern",
  حديث: "modern contemporary",
  حديثة: "modern contemporary",
  كلاسيكي: "classic classical",
  كلاسيكية: "classic classical",
}
