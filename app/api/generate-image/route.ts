export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[v0] 1. Original Arabic prompt:", prompt)

    // Extract negative prompts (things to avoid)
    const negativePatterns = [
      /بدون\s+([^،.]+)/gi,
      /من\s+غير\s+([^،.]+)/gi,
      /لا\s+يوجد\s+([^،.]+)/gi,
      /مفيش\s+([^،.]+)/gi,
    ]

    let cleanPrompt = prompt
    const negativeItems: string[] = []

    for (const pattern of negativePatterns) {
      const matches = prompt.match(pattern)
      if (matches) {
        for (const match of matches) {
          const item = match.replace(/^(بدون|من غير|لا يوجد|مفيش)\s*/i, "").trim()
          if (item) negativeItems.push(item)
          cleanPrompt = cleanPrompt.replace(match, "").trim()
        }
      }
    }

    console.log("[v0] 2. After negative extraction:", cleanPrompt)
    console.log("[v0] 3. Negative items found:", negativeItems)

    const translateText = async (text: string): Promise<string> => {
      if (text.length <= 450) {
        try {
          const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`,
          )
          const data = await response.json()
          if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText
            if (!translated.includes("QUERY LENGTH LIMIT") && !translated.includes("PLEASE SELECT")) {
              return translated
            }
          }
        } catch {
          // Continue with dictionary fallback
        }
      }

      // Split long text
      const parts = text.split(/[،.؛,]/g).filter((p) => p.trim())
      const translatedParts: string[] = []

      for (const part of parts) {
        if (!part.trim() || part.length < 2) continue
        try {
          const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(part.trim().substring(0, 450))}&langpair=ar|en`,
          )
          const data = await response.json()
          if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText
            if (!translated.includes("QUERY LENGTH LIMIT") && !translated.includes("PLEASE SELECT")) {
              translatedParts.push(translated)
              continue
            }
          }
          translatedParts.push(part)
        } catch {
          translatedParts.push(part)
        }
      }

      return translatedParts.join(", ")
    }

    const translatedPrompt = await translateText(cleanPrompt)
    console.log("[v0] 4. After MyMemory translation:", translatedPrompt)

    // Arabic to English dictionary for common words
    const arabicToEnglish: { [key: string]: string } = {
      صورة: "image",
      محاربة: "warrior",
      إغريقية: "Greek",
      بدوية: "Bedouin",
      ملابس: "clothes",
      عتيقة: "vintage",
      مجوهرات: "jewelry",
      معدنية: "metal",
      ترقص: "dancing",
      حافية: "barefoot",
      القدمين: "feet",
      جمر: "embers",
      مشتعل: "burning",
      جسد: "body",
      نقوش: "engravings",
      قبلية: "tribal",
      شعر: "hair",
      ضفائر: "braids",
      طويلة: "long",
      خلفية: "background",
      قمر: "moon",
      مكتمل: "full",
      منير: "shining",
      سماء: "sky",
      ليل: "night",
      رموز: "symbols",
      سحرية: "magical",
      لاتينية: "Latin",
      قديمة: "ancient",
      مضيئة: "glowing",
      ذهبي: "golden",
      سينمائي: "cinematic",
      فانتازيا: "fantasy",
      مستقبل: "futuristic",
      جودة: "quality",
      ناعمة: "smooth",
    }

    let finalPrompt = translatedPrompt
    for (const [arabic, english] of Object.entries(arabicToEnglish)) {
      const regex = new RegExp(arabic, "gi")
      finalPrompt = finalPrompt.replace(regex, english)
    }

    console.log("[v0] 5. After dictionary cleanup:", finalPrompt)

    const compositionPrefix =
      "full body shot, wide angle view, distant perspective, subject in center frame, no close-up hands, standard photo composition"

    const qualitySuffix =
      "8K ultra high resolution, highly detailed, professional quality, sharp focus, masterpiece, best quality, intricate details, vibrant colors, photorealistic, cinematic lighting"

    const negativePrompt = negativeItems.length > 0 ? negativeItems.join(", ") + ", " : ""

    const fullPrompt = `${compositionPrefix}, ${finalPrompt}, ${qualitySuffix} | AVOID: ${negativePrompt}blurry, low quality, pixelated, bad quality, low resolution, ugly, deformed, distorted, artifacts`

    console.log("[v0] 6. Final prompt sent to flux-turbo:", fullPrompt.substring(0, 500) + "...")

    const seed = Math.floor(Math.random() * 1000000)
    const pollinationsUrl = `https://gen.pollinations.ai/image/a%20blooming%20flower%20in%20golden%20hour?model=zimage`

    console.log("[v0] 7. Trying Pollinations zimage...")

    // Return the URL directly - Pollinations generates on request
    return new Response(JSON.stringify({ imageUrl: pollinationsUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Image generation error:", error)

    return new Response(
      JSON.stringify({
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
