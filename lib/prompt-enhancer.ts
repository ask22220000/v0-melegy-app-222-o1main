/**
 * Prompt Enhancer — uses Groq (llama-3.3-70b) for Arabic→English translation
 * and professional prompt engineering before sending to FAL.
 */

const EGYPTIAN_FOOD_DICTIONARY: Record<string, string> = {
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
  "بطارخ": "bottarga (fish roe)",
  "السردين": "sardines",
  "فسيخ": "fesikh",
  "عيش بلدي": "Egyptian baladi bread",
  "عيش": "bread",
  "طبيعي": "natural",
  "واقعي": "realistic",
  "حقيقي": "realistic",
  "مصري": "Egyptian",
  "ذهبي": "golden",
};

const IMAGE_GEN_QUALITY_CONSTANTS = "8k resolution, highly detailed, professional masterpiece";
const PHOTOREALISTIC_ENHANCEMENT = "photorealistic, hyper-realistic, raw photo, f/1.8, cinematic lighting";

function substituteEgyptianFoods(text: string): string {
  let result = text;
  for (const [arabic, english] of Object.entries(EGYPTIAN_FOOD_DICTIONARY)) {
    const regex = new RegExp(arabic, 'gi');
    result = result.replace(regex, english);
  }
  return result;
}

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const substitutedMessage = substituteEgyptianFoods(userMessage);

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
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function processPromptForImageGeneration(userPrompt: string): Promise<string> {
  const wantsPhotorealistic = /واقعي|حقيقي|متصور|كاميرا|صورة حقيقية|صورة واقعية|realistic|photorealistic|like a photograph/i.test(userPrompt);
  const mentionsAnimals = /كلب|قط|حيوان|جرو|كتكوت|طائر|حصان|بقرة|غنم|lion|tiger|dog|cat|bird|animal/i.test(userPrompt);

  const lower = userPrompt.toLowerCase();
  const isLandscape = /عرضي|أفقي|سينمائية|سينمائي|landscape|cinematic|wide|16:9/i.test(lower);
  const isSquare = /مربع|1:1|square/i.test(lower);

  const orientationHint = isLandscape
    ? "LANDSCAPE (16:9 format)"
    : isSquare ? "SQUARE (1:1 format)" : "PORTRAIT (4:5 format)";

  const system = `You are a professional prompt engineer for AI image generation (Flux model).

YOUR CORE JOB:
1. If text is Arabic (Egyptian dialect), translate to English faithfully and completely.
2. Enrich with professional visual details: lighting, composition, mood.
3. Orientation: ${orientationHint}.
4. Return ONLY the final English prompt under 120 words. No explanations.

QUALITY STANDARDS:
- Hyper-realistic, 8K, photo-realistic rendering.
- Anatomically correct humans: exactly 5 fingers per hand, correct proportions.
- Anatomically correct animals: correct number of limbs.`;

  const hasArabic = /[\u0600-\u06FF]/.test(userPrompt);
  const userMsg = hasArabic
    ? `Translate and engineer a professional image prompt for: "${userPrompt}"`
    : `Engineer a professional image prompt for: "${userPrompt}"`;

  try {
    const result = await callGroq(system, userMsg);

    const qualityConstants = wantsPhotorealistic
      ? `${IMAGE_GEN_QUALITY_CONSTANTS}, ${PHOTOREALISTIC_ENHANCEMENT}`
      : IMAGE_GEN_QUALITY_CONSTANTS;

    let enhancedResult = `${result}, ${qualityConstants}`;

    if (mentionsAnimals) {
      enhancedResult = `${enhancedResult} | AVOID: ANIMAL ANATOMY NEGATIVE`;
    }

    return enhancedResult;
  } catch (error) {
    console.error("Error in prompt generation:", error);
    return userPrompt;
  }
}

/**
 * Backwards compatibility 
 */
export async function translateToEnglish(text: string): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (!hasArabic) return text;
  try {
    return await callGroq(
      "Translate Arabic text (including Egyptian dialect) to English accurately. Return ONLY the translation.",
      text
    );
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}