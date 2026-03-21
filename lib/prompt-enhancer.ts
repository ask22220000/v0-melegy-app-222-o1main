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

export const IMAGE_GEN_QUALITY_CONSTANTS = "8k resolution, highly detailed, professional masterpiece";
export const IMAGE_EDIT_QUALITY_CONSTANTS = "high quality, maintain consistency, professional retouching";
export const NEGATIVE_PROMPT_CONSTANTS = "low quality, blurry, distorted, low resolution, extra fingers, deformed limbs";
export const PHOTOREALISTIC_ENHANCEMENT = "photorealistic, hyper-realistic, raw photo, f/1.8, cinematic lighting";

function substituteEgyptianFoods(text: string): string {
  let result = text;
  for (const [arabic, english] of Object.entries(EGYPTIAN_FOOD_DICTIONARY)) {
    const regex = new RegExp(arabic, 'gi');
    result = result.replace(regex, english);
  }
  return result;
}

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = (globalThis as any).env.GROQ_API_KEY;

  if (!apiKey) {
    return userMessage;
  }

  try {
    const substitutedMessage = substituteEgyptianFoods(userMessage);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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

    if (!response.ok) return userMessage;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? userMessage;
  } catch (e) {
    return userMessage;
  }
}

export async function processPromptForImageGeneration(userPrompt: string): Promise<string> {
  const wantsPhotorealistic = /واقعي|حقيقي|متصور|كاميرا|صورة حقيقية|صورة واقعية/i.test(userPrompt);
  const system = `You are a professional prompt engineer. Translate and enrich the prompt for AI image generation. Return ONLY English text.`;

  const result = await callGroq(system, userPrompt);
  const quality = wantsPhotorealistic ? `${IMAGE_GEN_QUALITY_CONSTANTS}, ${PHOTOREALISTIC_ENHANCEMENT}` : IMAGE_GEN_QUALITY_CONSTANTS;
  return `${result}, ${quality}`;
}

export async function processPromptForImageEditing(prompt: string): Promise<string> {
  const system = `You are a professional editor. Translate and optimize this prompt for image editing/retouching. Return ONLY English.`;
  const result = await callGroq(system, prompt);
  return `${result}, ${IMAGE_EDIT_QUALITY_CONSTANTS}`;
}

export async function translateToEnglish(text: string): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (!hasArabic) return text;
  return await callGroq("Translate to English accurately. Return ONLY the translation.", text);
}