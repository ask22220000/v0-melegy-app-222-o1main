/**
 * Prompt Enhancer — uses Groq (llama-3.3-70b) for Arabic→English translation
 * and professional prompt engineering before sending to FAL.
 *
 * Groq is extremely fast and very cheap — ideal for this use case.
 * Falls back to the raw user prompt if Groq is unavailable.
 */

/**
 * Egyptian Arabic food terms dictionary for better translations
 */
const EGYPTIAN_FOOD_DICTIONARY: Record<string, string> = {
  // CRITICAL Egyptian foods - very specific descriptions for AI accuracy
  
  // BOTTARGA / FISH ROE - VERY IMPORTANT - NOT whole fish, NOT jelly, NOT smooth texture!
  "بطارخ": "bottarga (cured pressed fish roe sac - when CUT/SLICED it shows GRAINY TEXTURE of thousands of tiny compressed fish eggs visible inside, NOT smooth jelly texture, the cross-section reveals densely packed granular fish eggs, amber-orange-brown color, firm but grainy interior)",
  "البطارخ": "bottarga (cured pressed fish roe sac with VISIBLE GRANULAR TEXTURE of compressed fish eggs inside when sliced)",
  "قطعة بطارخ": "a piece of bottarga (cured fish roe sac - when cut open shows GRAINY TEXTURE of densely packed tiny fish eggs, NOT smooth, the interior has visible granular compressed roe texture, amber-golden-brown color)",
  "بطارخ مقطوعة": "sliced bottarga showing GRAINY CROSS-SECTION with visible compressed fish egg granules inside, NOT smooth or jelly-like",
  "بطارخ الخرز": "loose fish roe caviar beads (individual tiny glistening orange-amber fish eggs/caviar pearls, NOT whole fish - these are small spherical shiny roe beads like salmon roe or tobiko, each bead is round and translucent orange, packed together in a container)",
  "بطارخ خرز": "loose fish roe caviar beads (individual tiny glistening orange-amber fish eggs/caviar pearls, small spherical shiny roe beads, each bead is round and translucent orange)",
  "الخرز": "roe beads/pearls (small round glistening fish egg spheres, caviar-like orange beads)",
  "خرز": "beads/pearls (small round spherical items)",
  "علبة البطارخ": "container of fish roe caviar (glass jar or container filled with glistening orange-amber fish egg beads/pearls)",
  
  // SARDINES and SMALL FISH - CORRECT ANATOMY
  "سردين": "sardines (small silver fish with HEAD ON ONE END and TAIL ON THE OTHER END - correct fish anatomy: one head, elongated silver body, one tail fin at opposite end. NOT two heads. Each fish has: 1 head with eye, silver scaled body, dorsal fin on top, 1 forked tail at back)",
  "السردين": "sardines (small silver fish - CORRECT ANATOMY: head on front, tail on back, NOT two-headed)",
  "سردين صغير": "small sardines (tiny silver fish with proper anatomy: single head at front, tail fin at back, silver shiny body)",
  
  // MESHNA - Traditional Egyptian woven basket
  "مشنة": "meshna (traditional Egyptian shallow woven basket made of palm fronds or wicker, round or oval shape, rustic handwoven texture, used for displaying fish and food in Egyptian markets)",
  "المشنة": "meshna (traditional Egyptian woven palm basket for food display)",
  "مشنة خشبية": "wooden meshna basket (traditional Egyptian shallow wooden basket or tray with woven/slatted construction)",
  
  // FESIKH - salted fermented fish
  "فسيخ": "fesikh (traditional Egyptian salted fermented fish, grey-silver boneless fish fillets preserved in salt brine, similar to sardines or mullet)",
  "الفسيخ": "fesikh (traditional Egyptian salted fermented fish, grey-silver boneless fish fillets preserved in salt brine)",
  "فسيخ مخلي": "boneless fesikh fillets (grey-silver fish fillets without bones, Egyptian salted fish)",
  "فسيخ مخلية": "boneless fesikh fillets (grey-silver fish fillets without bones, Egyptian salted fish)",
  "مخلي": "boneless, filleted",
  "مخلية": "boneless, filleted",
  
  // General fish anatomy rule
  "سمك": "fish (CORRECT FISH ANATOMY: head with eye on ONE end, elongated body with scales, tail fin on OPPOSITE end - never two heads)",
  "سمكة": "a fish (single fish with correct anatomy: one head, one body, one tail)",
  
  // Egyptian breads - VERY IMPORTANT
  "عيش بلدي": "authentic Egyptian baladi bread (traditional round flatbread, puffy with air pocket inside, light brown color with dark brown charred spots, rustic texture, made from whole wheat flour, served in traditional woven baskets)",
  "العيش البلدي": "authentic Egyptian baladi bread (traditional round flatbread, puffy with air pocket inside, light brown color with dark brown charred spots, rustic texture)",
  "عيش شمسي": "Egyptian sun-dried bread (shamsi bread, traditional flatbread)",
  "عيش فينو": "Egyptian fino bread (soft elongated white bread rolls)",
  "عيش": "Egyptian bread (aish baladi - round puffy flatbread with brown spots)",
  
  // Egyptian environment/setting
  "بيئة مصرية": "authentic Egyptian setting (traditional Egyptian market street, rustic wooden tables, woven baskets, warm sunlight, terracotta pots, old Cairo architecture in background)",
  "مصري": "authentic Egyptian style, traditional Egyptian setting",
  "شعبي": "Egyptian street food style, traditional popular Egyptian, rustic market setting",
  
  // Common Egyptian foods
  "كنافة": "konafa (Egyptian pastry dessert with cheese and syrup)",
  "كنافه": "konafa (Egyptian pastry dessert with cheese and syrup)",
  "بسبوسة": "basboussa (semolina coconut cake)",
  "بسبوسه": "basboussa (semolina coconut cake)",
  "الكنافة": "konafa (Egyptian pastry dessert)",
  "الكنافه": "konafa (Egyptian pastry dessert)",
  "حلويات": "traditional Egyptian sweets and desserts",
  "فتة": "fetta (bread salad with meat and yogurt)",
  "فتة اللحم": "fetta with meat (traditional Egyptian dish)",
  "محشي": "mahshi (stuffed vegetables)",
  "ملوخية": "molokhia (traditional Egyptian stew)",
  "ملوخيه": "molokhia (traditional Egyptian stew)",
  "فاصوليا": "beans (Egyptian style)",
  "فول": "fava beans (Egyptian breakfast staple)",
  "فول مصري": "Egyptian fava beans",
  "فول الشامي": "Syrian beans Egyptian style",
  "حمص": "hummus (Egyptian style)",
  "بابا غنوج": "baba ganoush",
  "تعميّة": "tameya (Egyptian falafel)",
  "تميه": "tameya (Egyptian falafel)",
  "شاورما": "shawarma",
  "كباب": "kebab",
  "كفتة": "kofta (meatballs)",
  "شيش طاووق": "shish taouk (chicken kebab)",
  "الشيش": "kebab skewers",
  "كشك": "kishk (traditional soup)",
  "كشري": "koshari (mixed pasta rice lentils)",
  "الكشري": "koshari (Egyptian mixed dish)",
  "فرن": "oven baked dishes",
  "سمك": "fish",
  "رنجة": "ringa (salted dried fish, Egyptian staple)",
  "رنجه": "ringa (salted dried fish, Egyptian staple)",
  "جمبري": "shrimp",
  "روبيان": "shrimp",
  "دجاج": "chicken",
  "لحم": "meat",
  "لحمة": "meat",
  "كبده": "liver",
  "نقانق": "sausages",
  "أرز": "rice",
  "جرجير": "arugula salad",
  "خس": "lettuce",
  "خضار": "vegetables",
  "طماطم": "tomatoes",
  "خيار": "cucumber",
  "بصل": "onion",
  "ثوم": "garlic",
  "حار": "spicy",
  "مصري": "Egyptian",
  "شعبي": "street food, popular Egyptian",
  "تقليدي": "traditional",
  "شهي": "delicious",
  "لذيذ": "tasty",
  // Objects and descriptive terms
  "صندوق": "rustic wooden box, wooden crate",
  "صندوق خشبي": "simple wooden box, rustic wooden crate",
  "خشبي": "wooden, simple wood, rustic",
  "رصوص": "neatly stacked, organized, neat rows",
  "مرصوص": "neatly stacked, organized, arranged in neat rows",
  "ذهبي": "golden, golden-colored, warm golden tone",
  "يخطف": "eye-catching, stunning, striking, visually appealing",
  "تحت إضاءة": "under warm lighting, golden hour light",
  "إضاءة قوية": "strong natural lighting, golden hour lighting, professional studio lighting",
  "شخص": "person, man, woman, hand visible",
  "بيفتح": "opening, is opening, opens, hands opening",
  "بيرفع": "lifting, is lifting, raises",
  "بيشيل": "holding, is holding, picking up",
  // Photography and style terms
  "طبيعي": "natural, authentic, real-life",
  "دعائي": "professional photography, commercial style, advertising photography",
  "كاميرا": "shot with professional DSLR camera",
  "تصوير": "professional food photography, macro photography",
  "واقع": "real-life, authentic, documentary style",
  "حقيقي": "realistic, authentic, genuine",
  "مصري": "authentic Egyptian, Egyptian street food style",
}

const NO_CHANGE_PATTERNS = [
  /من غير ما تغير/i,
  /بدون ما تغير/i,
  /ما تغيرش/i,
  /متغيرش/i,
  /without chang/i,
  /don't change/i,
  /keep everything/i,
  /no change/i,
]

/**
 * Replace Egyptian food terms with English equivalents to improve translation accuracy
 */
function substituteEgyptianFoods(text: string): string {
  let result = text
  for (const [arabic, english] of Object.entries(EGYPTIAN_FOOD_DICTIONARY)) {
    const regex = new RegExp(arabic, 'gi')
    result = result.replace(regex, english)
  }
  return result
}

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY is not set")

  // Pre-substitute Egyptian food terms to improve translation
  const substitutedMessage = substituteEgyptianFoods(userMessage)

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: substitutedMessage },
      ],
      temperature: 0.2,
      max_tokens: 350,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ""
}

/**
 * Hand anatomy specification for consistent results
 */
const HAND_ANATOMY_SPEC =
  "realistic human hands with exactly 5 fingers per hand (1 thumb + 4 fingers), natural finger anatomy with correct joints and proportions, proper thumb placement and rotation, realistic finger length ratios, correct finger spacing, natural hand shape and palm structure, accurate skin texture on hands"

/**
 * For image GENERATION via fal-ai/flux/schnell.
 * Translates Arabic Egyptian dialect to English and engineers a professional prompt.
 */
export async function processPromptForImageGeneration(userPrompt: string): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(userPrompt)
  
  // Detect if user explicitly says "no people" or "no hands"
  const noPeople = /بدون ناس|بدون اشخاص|بدون شخص|بدون ايادي|بدون ايد|بدون يد|بدون انسان|بدون أشخاص|بدون أيادي|بدون أيد|بدون يد|without people|without person|without hands|no people|no person|no hands|solo|alone|by itself/i.test(userPrompt)
  
  // Detect if the prompt mentions hands or includes hand-related actions
  const mentionsHands = /hand|ايد|يد|ترش|رش|ممسك|امسك|امساك|قابض|اصابع|اصابع|وضع|يضع|يمسك|بيرش|برش/i.test(userPrompt)

  const system = `You are a professional prompt engineer for AI image generation (Flux model). Your goal: create prompts for HYPER-REALISTIC EGYPTIAN FOOD PHOTOGRAPHY — as if captured by a professional food photographer with a real DSLR camera.

CRITICAL EGYPTIAN FOOD KNOWLEDGE - EXACT VISUAL SPECIFICATIONS:
- FISH ANATOMY IS CRITICAL: Every fish MUST have HEAD on ONE end and TAIL on the OPPOSITE end. Correct anatomy = 1 head with eye -> silver scaled body -> 1 tail fin at back. Never two heads!
  * "سردين" (sardines) = Small silver fish with correct anatomy: head at front, silver scales, tail at back. Stack neatly with heads/tails visible.
  * "فسيخ" (fesikh) = Grey-silver boneless fish fillets, preserved texture, metallic sheen, NOT orange vegetables.
  * "سمك" (fish) = Any fish MUST show: single head with eye, scales on body, tail fin at opposite end.

- BOTTARGA (بطارخ) - CRITICAL DETAILS:
  * "بطارخ" (pressed roe) = Cured fish roe sac. When CUT, shows GRAINY texture with tiny compressed fish eggs inside (NOT smooth, NOT jelly). Amber-orange-brown color. Granular interior appearance is essential.
  * "بطارخ الخرز" (roe caviar) = Individual small ROUND SHINY FISH EGGS like caviar. Orange-amber spherical beads, translucent and glistening. NOT whole fish - loose roe pearls in container.

- EGYPTIAN ITEMS:
  * "مشنة" (meshna) = Traditional shallow WOVEN BASKET (palm fronds/wicker), round/oval, rustic handwoven, used for market food display.
  * "عيش بلدي" (baladi bread) = Round puffy flatbread, light brown with dark brown charred spots, rough rustic texture, in woven baskets.
  * "بيئة مصرية" (Egyptian setting) = Market/street with rustic wooden tables, woven baskets, terracotta pots, warm sunlight.

YOUR ROLE:
1. Translate Arabic faithfully to English - do NOT omit details.
2. Apply user's EXACT request - if they ask for changes, modifications, color adjustments, composition changes, these are what you engineer INTO the prompt.
3. Maintain photorealistic Egyptian food photography style with professional DSLR aesthetics.
4. Describe food with correct anatomy and visual characteristics.
5. Use specific photography terms: "Canon 5D Mark IV, 50mm f/1.4", "shallow DOF", "golden hour lighting", "visible moisture/textures".
6. Include ONLY what user mentioned - do NOT add elements.
7. If user says "no people/no hands" → EXCLUDE. If user shows hand actions → INCLUDE realistic hands.
8. Return ONLY final prompt under 250 words. No explanations.`

  const userMsg = hasArabic
    ? `Translate and engineer a professional image prompt for: "${userPrompt}"`
    : `Engineer a professional image prompt for: "${userPrompt}"`

  try {
    const result = await callGroq(system, userMsg)
    let enhancedResult = result 
      ? `${result}, ${IMAGE_GEN_QUALITY_CONSTANTS}`
      : `${userPrompt}, ${IMAGE_GEN_QUALITY_CONSTANTS}`
    
    // If user says "no people" or "no hands", add explicit instruction to negative prompt
    if (noPeople) {
      enhancedResult = `${enhancedResult} STRICTLY: no people, no humans, no hands visible, no body parts, isolated subject only`
    }
    // Otherwise, if hands are mentioned and user didn't say "no people", add hand anatomy specification
    else if (mentionsHands) {
      enhancedResult = enhancedResult.replace(
        IMAGE_GEN_QUALITY_CONSTANTS,
        `${IMAGE_GEN_QUALITY_CONSTANTS}, ${HAND_ANATOMY_SPEC}`
      )
    }
    
    return enhancedResult
  } catch (error) {
    console.error("[prompt-enhancer] Groq generation error:", error)
    let fallback = `${userPrompt}, ${IMAGE_GEN_QUALITY_CONSTANTS}`
    if (noPeople) {
      fallback = `${fallback} STRICTLY: no people, no humans, no hands visible, no body parts, isolated subject only`
    } else if (mentionsHands) {
      fallback = `${fallback}, ${HAND_ANATOMY_SPEC}`
    }
    return fallback
  }
}

/**
 * Constant quality/anatomy suffixes appended to every image-editing prompt.
 * Kept in one place so all routes stay in sync.
 * Note: These maintain QUALITY STANDARDS while allowing user-requested modifications.
 */
export const IMAGE_EDIT_QUALITY_CONSTANTS =
  "HIGH QUALITY STANDARDS: 8K resolution, sharp professional focus, cinematic lighting, photorealistic food photography textures and details, professional Canon DSLR aesthetic. ANATOMY: If hands present: exactly 5 fingers per hand (thumb + 4 fingers), correct finger proportions, natural hand poses. FOOD IDENTITY: Maintain dish/food species identity and overall composition unless specifically modified as requested. EGYPTIAN FOOD AUTHENTICITY: Preserve traditional Egyptian aesthetic, market-style presentation, warm golden lighting, authentic ingredient textures."

/**
 * Negative prompt to avoid common AI generation issues - HEAVY EMPHASIS ON HANDS AND NO PEOPLE
 */
export const NEGATIVE_PROMPT_CONSTANTS =
  "bad anatomy, wrong anatomy, deformed hands, bad hands, mutated hands, poorly drawn hands, malformed hands, extra fingers, too many fingers, missing fingers, fewer fingers, fused fingers, six fingers, seven fingers, extra limbs, missing limbs, disconnected limbs, floating limbs, extra legs, missing legs, extra arms, missing arms, long neck, twisted fingers, backwards fingers, unnatural hand position, hand artifacts, hand glitch, broken hands, distorted hands, people, humans, persons, human hand, human body, human figure, hands visible, hands in frame, hand holding, person, man, woman, child, face, head, body parts, arm visible, fingers visible, extra bodies, poorly drawn face, mutation, blurry, bad proportions, gross proportions, cloned face, disfigured, deformed body, duplicate, morbid, mutilated, out of frame, dehydrated, bad quality, low quality, jpeg artifacts, watermark, text, signature, cropped"

/**
 * Quality constants for image generation - STRONG EMPHASIS ON REALISTIC PHOTOGRAPHY STYLE
 */
export const IMAGE_GEN_QUALITY_CONSTANTS =
  "PHOTOREALISTIC, masterpiece, best quality, professional food photography, shot with Canon 5D Mark IV DSLR camera with 50mm f/1.4 lens, ultra sharp focus on subject, shallow depth of field with creamy bokeh background, warm golden hour natural lighting, soft directional sunlight with natural shadows, authentic Egyptian street food style, real life Egyptian market setting, macro food photography showing realistic textures, rich warm Mediterranean color palette, authentic rustic weathered wooden surfaces, visible oil droplets and moisture on food, fresh natural ingredients, NO CGI NO artificial look NO plastic appearance, documentary photography style like National Geographic, captured by professional food photographer, authentic Egyptian/Middle Eastern aesthetic, rich warm golden tones, film photography quality, hyper-realistic textures and fine details visible, natural imperfections that make it look real"

/**
 * For image EDITING via fal-ai/flux-2/turbo/edit.
 * Translates + builds an edit instruction that preserves subject identity.
 */
export async function processPromptForImageEditing(userPrompt: string): Promise<string> {
  const wantsNoChange = NO_CHANGE_PATTERNS.some((p) => p.test(userPrompt))
  if (wantsNoChange) {
    return `Enhance image quality and sharpness while preserving all original features, facial identity, scene, and background exactly as they are. No other modifications. ${IMAGE_EDIT_QUALITY_CONSTANTS}`
  }

  const hasArabic = /[\u0600-\u06FF]/.test(userPrompt)

  const system = `You are a professional prompt engineer for AI image editing (Flux model) specializing in EGYPTIAN FOOD PHOTOGRAPHY.

YOUR CRITICAL JOB:
1. Translate Arabic (including Egyptian dialect) to English faithfully - do NOT omit details.
2. Write a PRECISE editing instruction that applies EXACTLY what the user asked for - no limitations, no restrictions.
3. Apply user's request fully: if they ask to modify colors, textures, composition, lighting, details - ENGINEER that into the prompt.
4. Maintain PHOTOREALISTIC quality and professional food photography aesthetics.
5. Preserve the food/dish identity, overall composition, and background UNLESS user explicitly asks to change them.

EGYPTIAN FOOD IDENTITY RULES:
- FISH: Must maintain correct anatomy (head at one end, tail at opposite), species identity, and distinctive characteristics.
- BOTTARGA: Must keep grainy texture appearance if mentioned, or apply exactly what user requested.
- BREAD (عيش): Keep puffy, rustic appearance unless user asks for different.
- COLORS/TEXTURES: Apply user's exact color or texture requests while maintaining photorealism.
- SETTING: Preserve Egyptian/market aesthetic unless user asks for changes.

ANATOMY & QUALITY STANDARDS:
- If hands visible: exactly 5 fingers per hand, natural anatomy.
- Correct food proportions and presentation.
- Professional food photography: macro details, textures, lighting.
- No CGI look, plastic appearance, or artificial styling.

FINAL OUTPUT:
Describe EXACTLY what the user requested to be changed/modified/adjusted, maintaining quality constants.
Return ONLY the editing instruction in English, under 150 words.`

  const userMsg = hasArabic
    ? `Translate and write an image editing instruction for: "${userPrompt}"`
    : `Write an image editing instruction for: "${userPrompt}"`

  try {
    const result = await callGroq(system, userMsg)
    return result
      ? `${result} ${IMAGE_EDIT_QUALITY_CONSTANTS} AVOID: ${NEGATIVE_PROMPT_CONSTANTS}`
      : `Preserve all facial features, skin tone, and original background. ${userPrompt} ${IMAGE_EDIT_QUALITY_CONSTANTS} AVOID: ${NEGATIVE_PROMPT_CONSTANTS}`
  } catch (error) {
    console.error("[prompt-enhancer] Groq editing error:", error)
    return `Preserve all facial features, skin tone, and original background. ${userPrompt} ${IMAGE_EDIT_QUALITY_CONSTANTS} AVOID: ${NEGATIVE_PROMPT_CONSTANTS}`
  }
}

/** Backwards compatibility */
export async function translateToEnglish(text: string): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(text)
  if (!hasArabic) return text
  try {
    return await callGroq(
      "Translate Arabic text (including Egyptian dialect) to English accurately. Return ONLY the translation.",
      text,
    )
  } catch {
    return text
  }
}
