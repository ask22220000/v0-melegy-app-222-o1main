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

CRITICAL EGYPTIAN FOOD KNOWLEDGE:
- FISH ANATOMY IS CRITICAL: Every fish MUST have HEAD on ONE end and TAIL on the OPPOSITE end. NEVER draw fish with two heads! Correct fish anatomy = 1 head with eye -> elongated silver body with scales -> 1 forked tail fin at back.
- "سردين" (sardines) = Small silver fish with CORRECT ANATOMY: head at front, silver scaled body, tail fin at back. Stack them neatly showing heads on one side, tails on the other.
- "مشنة" (meshna) = Traditional Egyptian shallow WOVEN BASKET made of palm fronds or wicker. Round/oval shape, rustic handwoven texture. Used to display fish in Egyptian markets.
- "بطارخ" (bottarga) = Cured PRESSED fish roe sac. When SLICED or CUT, the cross-section MUST show GRAINY TEXTURE with thousands of tiny compressed fish eggs visible inside. It is NOT smooth, NOT jelly-like, NOT homogeneous - the interior has a GRANULAR appearance from the densely packed fish eggs. Color is amber-orange-brown. The texture is firm but clearly shows the individual compressed roe granules.
- "بطارخ الخرز" (bottarga beads/fish roe caviar) = Individual small ROUND GLISTENING FISH EGGS (like salmon roe or tobiko caviar). They are ORANGE-AMBER colored SPHERICAL BEADS that are translucent and shiny. This is NOT whole fish! It is loose fish roe/caviar pearls packed in a container. Each bead is small, round, and glistens.
- "فسيخ" (fesikh) = Traditional Egyptian salted fermented FISH. It is GREY-SILVER colored boneless fish fillets (similar to sardines/mullet), NOT orange vegetables or squash. The fish is preserved in salt and has a distinctive grey metallic sheen.
- "عيش بلدي" (baladi bread) = Traditional Egyptian round FLATBREAD. It is PUFFY with an air pocket inside, LIGHT BROWN color with DARK BROWN charred spots, rough rustic texture. It is NOT Western bread, NOT brioche, NOT smooth bread. Always shown in traditional woven baskets.
- "بيئة مصرية" (Egyptian setting) = Traditional Egyptian market/street setting with: rustic weathered wooden tables, woven straw baskets, terracotta pottery, old Cairo architecture, warm sunlight, traditional market stalls in background.

Your job:
1. If the text is Arabic (Egyptian dialect), translate EVERY detail faithfully to English — do NOT omit anything.
2. For Egyptian foods: describe them with EXACT visual characteristics:
   - Fesikh: grey-silver boneless fish fillets, glistening with oil, preserved fish texture
   - Baladi bread: round puffy flatbread with brown charred spots, in woven baskets
   - Egyptian setting: rustic wood, woven baskets, terracotta, warm golden sunlight
3. PHOTOREALISM is KEY:
   - "shot with Canon 5D Mark IV, 50mm f/1.4 lens"
   - "shallow depth of field with creamy bokeh background"
   - "warm golden hour natural lighting"
   - "visible moisture, oil droplets, realistic textures"
   - "documentary-style food photography"
4. For containers: "علبة شفافة" = clear glass bowl or container (NOT wooden box)
5. For actions: "شوكة مرفوعة" = silver metal fork lifting a piece dynamically, frozen mid-action
6. Do NOT change any subject the user described. Keep EXACT items mentioned.
7. If user mentions hand actions → INCLUDE realistic hands. If user says "no people" → EXCLUDE.
8. Do NOT add elements not mentioned by the user.
9. AVOID: CGI look, plastic appearance, overly stylized, fake lighting, Western food styles.
10. Return ONLY the final English prompt, under 250 words. No explanations.`

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
 */
export const IMAGE_EDIT_QUALITY_CONSTANTS =
  "PRESERVE 100% SUBJECT IDENTITY: keep identical face structure, exact facial features, same skin tone, same eye color, same nose shape, same lip shape, same hair color and texture — NO facial modifications whatsoever. PERFECT ANATOMY: anatomically correct human body, exactly 5 fingers per hand (thumb + 4 fingers), correct finger proportions and joints, natural hand poses, two arms, two legs, proper limb attachment, realistic body proportions. HIGH QUALITY: 8K resolution, sharp focus, professional photography, cinematic lighting, photorealistic details."

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

  const system = `You are a professional prompt engineer for AI image editing (Flux model).
Your job:
1. If the text is Arabic (including Egyptian dialect), translate it to English faithfully — do NOT omit any detail.
2. Write a precise editing instruction that applies ONLY what the user explicitly asks to change. Nothing more.
3. IDENTITY LOCK: The subject's face, facial features, skin tone, eye color, nose shape, lips, hair must remain 100% IDENTICAL — do NOT alter them in any way.
4. CRITICAL: Do NOT add people, faces, persons, humans, or figures of any kind unless the user explicitly mentions adding a person.
5. CRITICAL: Do NOT add animals, objects, or elements not mentioned by the user.
6. Preserve the original subject identity, face, and all personal features unless the user explicitly asks to change them.
7. STRICT ANATOMY RULES:
   - Every human hand MUST have exactly 5 fingers (1 thumb + 4 fingers)
   - Fingers must have correct proportions and natural joints
   - No extra, missing, fused, or deformed fingers
   - Two arms attached naturally to shoulders
   - Two legs attached naturally to hips
   - Correct body proportions throughout
8. Do NOT add text overlays or watermarks.
9. Start your response with: "Apply ONLY the following changes while preserving 100% of the subject's face, identity, and features. Maintain perfect hand anatomy with exactly 5 fingers per hand:" then describe exactly what the user asked for.
10. Return ONLY the instruction in English, under 150 words. No explanations.`

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
