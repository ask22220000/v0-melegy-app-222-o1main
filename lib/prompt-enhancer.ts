/**
 * Prompt Enhancer — uses Groq (llama-3.3-70b) for Arabic→English translation
 * and professional prompt engineering before sending to FAL.
 *
 * Groq is extremely fast and very cheap — ideal for this use case.
 * Falls back to the raw user prompt if Groq is unavailable.
 */

/**
 * Egyptian Arabic terms dictionary for accurate translations
 * Basic translations without prescriptive constraints
 */
const EGYPTIAN_FOOD_DICTIONARY: Record<string, string> = {
  // Religious/Biblical figures and themes
  "السيد المسيح": "Jesus Christ",
  "المسيح": "Jesus Christ",
  "الآلام": "passion, suffering",
  "القيامة": "resurrection",
  "العدرا": "Virgin Mary",
  "العذراء": "Virgin Mary",
  "مريم": "Mary",
  "القديس": "saint",
  "القديسة": "female saint",
  "الأيقونة": "religious icon",
  "فن قبطي": "Coptic art",
  "الفن القبطي": "Coptic art",
  
  // Egyptian foods - basic translations
  "بطارخ": "bottarga (fish roe)",
  "السردين": "sardines",
  "سردين": "sardines",
  "فسيخ": "fesikh",
  "مشنة": "meshna (woven basket)",
  "عيش بلدي": "Egyptian baladi bread",
  "عيش": "bread",
  
  // Common terms
  "طبيعي": "natural",
  "واقعي": "realistic",
  "حقيقي": "realistic",
  "مصري": "Egyptian",
  "تقليدي": "traditional",
  "جميل": "beautiful",
  "لذيذ": "delicious",
  "ذهبي": "golden",
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
  
  // Detect if user explicitly asks for realistic/photographic quality
  const wantsPhotorealistic = /واقعي|حقيقي|متصور|كاميرا|صورة حقيقية|صورة واقعية|realistic|photorealistic|like a photograph|like a photo|real|realistic|photograph/i.test(userPrompt)
  
  // Detect if prompt mentions animals (dogs, cats, birds, etc.)
  const mentionsAnimals = /كلب|قط|حيوان|جرو|كتكوت|طائر|حصان|بقرة|غنم|lion|tiger|dog|cat|puppy|kitten|bird|horse|cow|sheep|animal|pet|wolf|fox|deer|elephant|bear|monkey|rabbit|mouse|rat|fish|whale|dolphin|penguin|eagle|owl|parrot/i.test(userPrompt)

  const system = `You are a professional prompt engineer for AI image generation (Flux model).

YOUR CORE JOB:
1. Translate Arabic (Egyptian dialect) to English faithfully - translate EVERY detail, do NOT omit anything.
2. Apply user's EXACT request word-for-word - generate ONLY what they asked for, NOTHING else.
3. Do NOT add elements, objects, figures, decorations, or food NOT mentioned by user.
4. Do NOT modify or interpret the request - engineer it exactly as stated.

QUALITY & TECHNICAL STANDARDS (always maintain):
- Hyper-realistic, 8K professional quality, photo-realistic rendering
- Anatomically correct humans: exactly 5 fingers per hand, correct proportions, natural poses
- Anatomically correct animals: correct number of limbs (4 legs for quadrupeds, 2 for birds), proper body structure, realistic paw pads, correct ear placement, natural tail position
- Natural lighting appropriate to subject/scene
- Sharp professional focus with appropriate depth of field
- No CGI look, no stylization, no plastic appearance unless user specifically requests artistic style

SPECIAL REQUESTS:
- Split images/diptychs: create EXACTLY the structure user requested with specified content on each side
- Religious or historical themes: depict respectfully with professional realism
- Portraits, landscapes, abstracts: render with photorealistic quality matching user's description
- Compositions: follow user's layout/arrangement exactly

CRITICAL RULES:
1. Translate ALL Arabic accurately - cultural terms, religious references, descriptive language
2. Apply request word-for-word - user's exact content goes into the image, nothing else
3. Return ONLY the final English prompt under 250 words. No explanations or extra text.`

  const userMsg = hasArabic
    ? `Translate and engineer a professional image prompt for: "${userPrompt}"`
    : `Engineer a professional image prompt for: "${userPrompt}"`

  try {
    const result = await callGroq(system, userMsg)
    
    // Use enhanced photography quality if user explicitly asked for realistic/photographic images
    const qualityConstants = wantsPhotorealistic 
      ? `${IMAGE_GEN_QUALITY_CONSTANTS}, ${PHOTOREALISTIC_ENHANCEMENT}`
      : IMAGE_GEN_QUALITY_CONSTANTS
    
    const enhancedResult = result 
      ? `${result}, ${qualityConstants}`
      : `${userPrompt}, ${qualityConstants}`
    
    // Return with enhanced animal anatomy handling if animals are mentioned
    return mentionsAnimals 
      ? `${enhancedResult} | AVOID: ${ANIMAL_ANATOMY_NEGATIVE}`
      : enhancedResult
  } catch (error) {
    console.error("[prompt-enhancer] Groq generation error:", error)
    
    const qualityConstants = wantsPhotorealistic 
      ? `${IMAGE_GEN_QUALITY_CONSTANTS}, ${PHOTOREALISTIC_ENHANCEMENT}`
      : IMAGE_GEN_QUALITY_CONSTANTS
    
    const fallback = `${userPrompt}, ${qualityConstants}`
    return mentionsAnimals 
      ? `${fallback} | AVOID: ${ANIMAL_ANATOMY_NEGATIVE}`
      : fallback
  }
}

/**
 * Constant quality/anatomy suffixes appended to every image-editing prompt.
 * Kept in one place so all routes stay in sync.
 * Note: Core quality standards only - apply user's modifications fully.
 */
export const IMAGE_EDIT_QUALITY_CONSTANTS =
  "HIGH QUALITY STANDARDS: 8K resolution, sharp professional focus, photorealistic details, natural lighting. ANATOMY: If hands present: exactly 5 fingers per hand, correct finger proportions, natural hand poses. Apply user's requested modifications fully while maintaining photorealistic quality."

/**
 * Negative prompt to avoid common AI generation issues - FOCUS ON ANATOMY/QUALITY ONLY
 */
export const NEGATIVE_PROMPT_CONSTANTS =
  "bad anatomy, wrong anatomy, deformed hands, bad hands, mutated hands, poorly drawn hands, malformed hands, extra fingers, too many fingers, missing fingers, fewer fingers, fused fingers, six fingers, seven fingers, eight fingers, extra limbs, missing limbs, disconnected limbs, floating limbs, extra legs, missing legs, extra arms, missing arms, long neck, twisted fingers, backwards fingers, unnatural hand position, hand artifacts, hand glitch, broken hands, distorted hands, poorly drawn face, mutation, blurry, bad proportions, gross proportions, cloned face, disfigured, deformed body, duplicate, morbid, mutilated, out of frame, dehydrated, bad quality, low quality, jpeg artifacts, watermark, text, signature, cropped, CGI, plastic appearance, artificial, overly stylized"

/**
 * Additional negative prompt for animal anatomy - prevents extra/missing legs and body parts
 */
export const ANIMAL_ANATOMY_NEGATIVE =
  "extra legs, missing legs, deformed legs, warped legs, twisted legs, backwards legs, extra limbs, missing limbs, extra paws, mutated paws, extra heads, missing tail, deformed tail, extra ears, misplaced ears, grotesque animal, malformed animal body, wrong number of legs, extra body parts, floating limbs"

/**
 * Quality constants for image generation - FOCUSED ON CORE QUALITY AND REALISM ONLY
 */
export const IMAGE_GEN_QUALITY_CONSTANTS =
  "hyper-realistic, 8K quality, professional cinematography, sharp focus, natural lighting, authentic textures, photorealistic details, NO CGI appearance, NO plastic look, NO artificial styling, documentary-style realism, high-definition clarity, professional composition"

/**
 * Advanced photography quality for when user explicitly asks for photorealistic/realistic images
 * Enhances with professional photography techniques similar to high-end digital cameras
 */
export const PHOTOREALISTIC_ENHANCEMENT =
  "shot with professional DSLR camera (Canon EOS R5 equivalent), 50mm f/1.8 lens, natural light or golden hour, shallow depth of field with creamy background blur, macro details visible in foreground, texture details preserved in shadows and highlights, professional color grading, accurate white balance, dynamic range optimized, film-quality rendering, captured by professional photographer, zero AI artifacts, indistinguishable from real photograph"

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

YOUR JOB:
1. Translate Arabic (including Egyptian dialect) to English faithfully - translate EVERYTHING accurately.
2. Write a PRECISE editing instruction that applies EXACTLY what the user asked for.
3. Apply user's request fully: if they ask to modify colors, textures, composition, lighting, specific elements - ENGINEER that into the prompt.
4. Maintain PHOTOREALISTIC quality and professional standards.
5. Preserve what should be preserved ONLY if user doesn't ask to change it.

ANATOMY & QUALITY STANDARDS:
- If hands visible: exactly 5 fingers per hand, natural anatomy.
- Maintain photorealistic appearance: sharp focus, natural lighting, authentic textures.
- No CGI look, plastic appearance, or artificial styling.

FINAL OUTPUT:
Write ONLY an editing instruction describing EXACTLY what the user requested to be changed/modified/adjusted.
Return ONLY the instruction in English, under 150 words. No explanations.`

  const userMsg = hasArabic
    ? `Translate and write an image editing instruction for: "${userPrompt}"`
    : `Write an image editing instruction for: "${userPrompt}"`

  try {
    const result = await callGroq(system, userMsg)
    return result
      ? `${result} ${IMAGE_EDIT_QUALITY_CONSTANTS}`
      : `${userPrompt} ${IMAGE_EDIT_QUALITY_CONSTANTS}`
  } catch (error) {
    console.error("[prompt-enhancer] Groq editing error:", error)
    return `${userPrompt} ${IMAGE_EDIT_QUALITY_CONSTANTS}`
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
