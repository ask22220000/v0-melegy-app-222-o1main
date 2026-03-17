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
  "عيش": "aish (Egyptian bread)",
  "عيش بلاش": "simple Egyptian bread",
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
      model: "llama-3.1-8b-instant",
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
 * For image GENERATION via fal-ai/flux/schnell.
 * Translates Arabic Egyptian dialect to English and engineers a professional prompt.
 */
export async function processPromptForImageGeneration(userPrompt: string): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(userPrompt)

  const system = `You are a professional prompt engineer for AI image generation (Flux model).
Your job:
1. If the text is Arabic (including Egyptian dialect), translate it to English faithfully and completely — do NOT omit any detail.
2. If the text mentions Egyptian foods (like konafa, basboussa, koshari, molokheya, falafel, etc.), describe them clearly with appetizing details: vibrant colors, textures, plating style, restaurant or home setting.
3. Enrich the translation with professional visual details: lighting, composition, color palette, mood, camera angle, photographic style.
4. Do NOT change or remove any subject, person, object, or scene the user described.
5. CRITICAL: Do NOT add people, faces, persons, humans, or figures of any kind unless the user explicitly asks for a person in their prompt.
6. CRITICAL: Do NOT add animals, objects, or elements the user did not mention.
7. Do NOT add text overlays, watermarks, or typography.
8. ANATOMY RULES FOR HUMANS: If generating a person, ALWAYS include these anatomical specifications:
   - "anatomically correct human body"
   - "exactly five fingers on each hand (one thumb and four fingers)"
   - "correct finger joints and proportions"
   - "natural hand positioning"
   - "two arms, two legs, proper limb attachment"
9. If showing hands, describe them as: "realistic human hands with exactly 5 fingers each, natural finger length proportions, correct thumb placement"
10. Return ONLY the final English prompt, under 150 words. No explanations.`

  const userMsg = hasArabic
    ? `Translate and engineer a professional image prompt for: "${userPrompt}"`
    : `Engineer a professional image prompt for: "${userPrompt}"`

  try {
    const result = await callGroq(system, userMsg)
    const enhancedResult = result 
      ? `${result}, ${IMAGE_GEN_QUALITY_CONSTANTS}`
      : `${userPrompt}, ${IMAGE_GEN_QUALITY_CONSTANTS}`
    return enhancedResult
  } catch (error) {
    console.error("[prompt-enhancer] Groq generation error:", error)
    return `${userPrompt}, ${IMAGE_GEN_QUALITY_CONSTANTS}`
  }
}

/**
 * Constant quality/anatomy suffixes appended to every image-editing prompt.
 * Kept in one place so all routes stay in sync.
 */
export const IMAGE_EDIT_QUALITY_CONSTANTS =
  "PRESERVE 100% SUBJECT IDENTITY: keep identical face structure, exact facial features, same skin tone, same eye color, same nose shape, same lip shape, same hair color and texture — NO facial modifications whatsoever. PERFECT ANATOMY: anatomically correct human body, exactly 5 fingers per hand (thumb + 4 fingers), correct finger proportions and joints, natural hand poses, two arms, two legs, proper limb attachment, realistic body proportions. HIGH QUALITY: 8K resolution, sharp focus, professional photography, cinematic lighting, photorealistic details."

/**
 * Negative prompt to avoid common AI generation issues
 */
export const NEGATIVE_PROMPT_CONSTANTS =
  "bad anatomy, wrong anatomy, extra fingers, fewer fingers, missing fingers, extra limbs, missing limbs, fused fingers, too many fingers, six fingers, mutated hands, poorly drawn hands, malformed hands, deformed hands, bad hands, extra hands, missing hands, floating limbs, disconnected limbs, extra legs, missing legs, extra arms, missing arms, long neck, duplicate, morbid, mutilated, out of frame, extra bodies, poorly drawn face, mutation, blurry, bad proportions, gross proportions, cloned face, disfigured, deformed body, dehydrated, bad quality, low quality, jpeg artifacts, watermark, text, signature, cropped"

/**
 * Quality constants for image generation
 */
export const IMAGE_GEN_QUALITY_CONSTANTS =
  "masterpiece, best quality, highly detailed, sharp focus, 8K UHD, professional photography, cinematic lighting, photorealistic, anatomically correct, correct hand anatomy with exactly 5 fingers, natural pose, proper body proportions"

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
