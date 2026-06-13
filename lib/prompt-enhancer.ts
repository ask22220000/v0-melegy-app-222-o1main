/**
 * Prompt Enhancer — uses Groq (llama-3.3-70b) for Arabic→English translation
 * and professional prompt engineering before sending to FAL.
 *
 * Groq is extremely fast and very cheap — ideal for this use case.
 * Falls back to the raw user prompt if Groq is unavailable.
 */

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

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY is not set")

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
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 300,
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
2. Enrich the translation with professional visual details: lighting, composition, color palette, mood, camera angle, photographic style.
3. Do NOT change or remove any subject, person, object, or scene the user described.
4. CRITICAL: Do NOT add people, faces, persons, humans, or figures of any kind unless the user explicitly asks for a person in their prompt.
5. CRITICAL: Do NOT add animals, objects, or elements the user did not mention.
6. Do NOT add text overlays, watermarks, or typography.
7. Return ONLY the final English prompt, under 120 words. No explanations.`

  const userMsg = hasArabic
    ? `Translate and engineer a professional image prompt for: "${userPrompt}"`
    : `Engineer a professional image prompt for: "${userPrompt}"`

  try {
    const result = await callGroq(system, userMsg)
    return result || userPrompt
  } catch (error) {
    console.error("[prompt-enhancer] Groq generation error:", error)
    // Fallback: send as-is — flux handles some Arabic
    return userPrompt
  }
}

/**
 * Constant quality/anatomy suffixes appended to every image-editing prompt.
 * Kept in one place so all routes stay in sync.
 */
export const IMAGE_EDIT_QUALITY_CONSTANTS =
  "No anatomical errors. Correct human anatomy with accurate proportions, natural limb placement, proper finger count, and realistic muscle structure. High quality, sharp details, professional result."

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
3. CRITICAL: Do NOT add people, faces, persons, humans, or figures of any kind unless the user explicitly mentions a person in their request.
4. CRITICAL: Do NOT add animals, objects, or elements not mentioned by the user.
5. Preserve the original subject, content, and background unless the user explicitly asks to change them.
6. Do NOT add text overlays or watermarks.
7. Start your response with: "Apply only the following changes:" then describe exactly what the user asked for.
8. ALWAYS end with: "${IMAGE_EDIT_QUALITY_CONSTANTS}"
9. Return ONLY the instruction in English, under 100 words. No explanations.`

  const userMsg = hasArabic
    ? `Translate and write an image editing instruction for: "${userPrompt}"`
    : `Write an image editing instruction for: "${userPrompt}"`

  try {
    const result = await callGroq(system, userMsg)
    return result
      ? `${result} ${IMAGE_EDIT_QUALITY_CONSTANTS}`
      : `Preserve all facial features, skin tone, and original background. ${userPrompt} ${IMAGE_EDIT_QUALITY_CONSTANTS}`
  } catch (error) {
    console.error("[prompt-enhancer] Groq editing error:", error)
    return `Preserve all facial features, skin tone, and original background. ${userPrompt} ${IMAGE_EDIT_QUALITY_CONSTANTS}`
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
