import { NextResponse } from "next/server"
import { Buffer } from "buffer"

async function analyzeImageWithPerplexity(imageBase64: string, mimeType: string, editInstructions: string) {
  try {
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY

    console.log("[v0] Using Perplexity to analyze image...")

    const analysisResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: `You are an advanced 8D facial reconstruction specialist. Analyze this face with MICROSCOPIC PRECISION as if creating a 3D biometric scan:

CRANIAL & FACIAL GEOMETRY (exact 3D measurements):
- Face shape: exact (oval/round/square/heart/diamond/oblong/triangular/pear)
- Face length-to-width ratio: precise (e.g., 1.4:1)
- Facial thirds: upper (hairline to brow), middle (brow to nose tip), lower (nose tip to chin) - are they equal or which is longer/shorter
- Facial symmetry: perfectly symmetrical OR describe asymmetries (left vs right differences)
- Cheekbone prominence: flat/slightly raised/moderately prominent/highly prominent - exact placement (high/mid/low on face)
- Jaw angle: exact (obtuse 120°+/right angle 90°/acute <90°)
- Chin projection: recessed/average/prominent - exact vertical position relative to lips

SKIN ANALYSIS (microscopic):
- EXACT tone using Fitzpatrick scale: Type I-VI, plus specific shade (porcelain/ivory/cream/beige/light tan/medium tan/olive/caramel/bronze/deep brown/ebony)
- Undertones: warm yellow/golden/peach OR cool pink/red/blue OR neutral green/olive
- Texture quality: glass-smooth/slightly textured/visible pores/rough - specify where
- Surface features: any freckles (scattered/clustered), moles (raised/flat, color, size, exact locations like "2mm dark mole right cheek"), beauty marks, scars, birthmarks
- Skin luminosity: matte/natural/dewy/oily - which areas

EYE BIOMETRICS (exact measurements):
- Shape: precise (almond/round/wide-set almond/close-set round/hooded/deep-set/prominent/protruding)
- Iris color: EXACT multi-layered (outer ring color + inner color + limbal ring presence, e.g., "dark brown iris with lighter amber inner ring, prominent dark limbal ring")
- Pupil size: small/medium/large
- Eye size: small/medium/large relative to face width
- Inter-pupillary distance: close-set (<60mm)/average (60-65mm)/wide-set (>65mm) - estimate mm if possible
- Eyelid structure: monolid/double eyelid with shallow crease/double eyelid with deep crease/hooded/visible epicanthic fold
- Eye tilt: exact angle (upward slant 5-10°/neutral 0°/downward slant -5-10°)
- Sclera visibility: above iris/below iris/both/neither
- Upper eyelid exposure: minimal/moderate/high (how much lid shows above eye when open)
- Eyelash characteristics: length (short/medium/long), density (sparse/medium/dense), curl (straight/slight curl/high curl), color
- Lower lash line: visible lashes or not
- Eye whites: pure white/slightly yellowish/with visible veins

EYEBROW ARCHITECTURE (exact):
- Shape: straight/soft arch/medium arch/high arch/s-curve/angled - exact curve degree
- Starting point: aligns with inner eye corner/starts before/starts after
- Arch peak: above pupil/above outer third/above outer edge
- Tail: ends at eye outer corner/extends beyond/stops before
- Thickness: thin (<3mm)/medium (3-5mm)/thick (>5mm) - measure at thickest point
- Hair density: sparse/medium/dense/bushy
- Color: exact shade (jet black/dark brown/medium brown/light brown/taupe/gray) - match or differ from hair
- Growth direction: uniform/unruly/with cowlick
- Distance between brows: very close (<15mm)/close (15-25mm)/average (25-35mm)/wide (>35mm)

NASAL STRUCTURE (3D precise):
- Bridge width: very narrow/narrow/medium/wide/very wide - mm estimate
- Bridge height: very low/low/medium/high/very high - prominence from face
- Bridge shape: straight/convex (dorsal hump)/concave (ski slope)/twisted
- Nasal root: shallow/deep depression at eye level
- Tip shape: pointed/rounded/bulbous/button/upturned/hooked
- Tip projection: under-projected/average/over-projected from face
- Nostril size: small/medium/large - exact (pinched/normal/flared)
- Nostril shape: teardrop/oval/round/crescentic
- Nostril flare: minimal/moderate/prominent - especially when smiling if visible
- Ala (nostril wings): thin/medium/thick
- Columella (between nostrils): visible/partially visible/hidden
- Overall classification: Nubian/Grecian/Roman/aquiline/hawk/snub/button

MOUTH & LIP MORPHOLOGY (exact):
- Upper lip: very thin/thin/medium/full/very full - exact thickness in mm if possible
- Lower lip: very thin/thin/medium/full/very full - specify if upper/lower asymmetric
- Lip ratio: upper:lower (e.g., 1:1.5 if lower is fuller)
- Cupid's bow: absent/soft/defined/pronounced/sharp peaks
- Philtrum: shallow/deep, narrow/medium/wide - exact vertical grooves visible or not
- Philtrum length: short/medium/long from nose to upper lip
- Lip corners: turned up/neutral/turned down
- Vermillion border: sharp/soft/indistinct
- Lip color: pale pink/rose pink/mauve/red/brown/purple-toned - exact shade
- Mouth width: narrow/medium/wide relative to nose width
- Teeth visibility (if visible): white/off-white/yellow, straight/gapped/crooked, size

CHIN & JAW DEFINITION (exact):
- Chin shape: pointed/rounded/square/cleft (dimple)
- Chin size: small/medium/large relative to face
- Chin projection: recessed (behind lips)/average (aligns with lips)/prominent (projects beyond lips)
- Jawline: soft rounded/defined/angular/chiseled/square
- Jaw width: narrow/medium/wide - compared to cheekbone width
- Gonial angle: obtuse (>120° soft)/right angle (90° defined)/acute (<90° sharp)
- Masseter muscle: not visible/slightly visible/prominent (creates squareness)

FACIAL BONE STRUCTURE (3D):
- Forehead: flat/slightly rounded/prominent/sloped back
- Forehead width: narrow/medium/wide
- Brow bone: flat/slightly prominent/very prominent
- Cheekbone structure: flat/low/mid/high placement
- Cheekbone width: narrow/medium/wide - widest point of face or not
- Temporal hollowing: absent/slight/moderate/pronounced
- Under-eye area: smooth/slight hollow/deep tear trough/bags

HAIR CHARACTERISTICS (exact):
- Color: jet black/dark brown (3)/medium brown (5)/light brown (7)/dark blonde (8)/blonde (9)/ash blonde/red/gray/white - exact shade
- Natural or dyed: indicators if visible (roots different color)
- Texture: straight (1A-1C)/wavy (2A-2C)/curly (3A-3C)/coily (4A-4C) - exact curl pattern
- Thickness: fine/medium/coarse individual strands
- Density: thin (sparse)/medium/thick (dense)
- Length: very short (above ears)/short (ear length)/medium (chin-shoulder)/long (below shoulder)/very long
- Style: specific (bob/layers/blunt cut/natural/etc)
- Hairline shape: straight/rounded/widow's peak/M-shaped/receding
- Hairline height: low/average/high forehead
- Part: center/side/no part
- Hair condition: shiny/matte/frizzy/smooth

FACIAL HAIR (if male or visible):
- Type: clean-shaven/stubble/short beard/full beard/goatee/mustache/soul patch
- Coverage: patchy/full
- Color: matching hair/lighter/darker/gray
- Density: sparse/medium/thick
- Length: exact mm or cm

AGE MARKERS (precise):
- Estimated age: exact range (18-22, 25-30, 30-35, 35-40, 40-45, 45-50, 50+)
- Forehead lines: absent/fine/moderate/deep - horizontal count
- Glabellar lines (between brows): absent/fine/moderate/deep - "11" lines
- Crow's feet: absent/fine/moderate/deep - how many lines radiating
- Nasolabial folds: absent/subtle/moderate/deep - from nose to mouth corners
- Marionette lines: absent/subtle/moderate/deep - from mouth corners down
- Under-eye: smooth/fine lines/moderate/prominent
- Skin elasticity: firm/slightly loose/loose

UNIQUE IDENTIFIERS:
- Any facial asymmetries (one eye larger, one brow higher, one smile asymmetry, etc)
- Distinctive marks, scars, birthmarks - exact location and appearance
- Unique features that make face recognizable

Output ONLY features in ultra-compact format:
"[Gender], [age range], [ethnicity/ethnic markers], [face shape + exact ratios], [skin Fitzpatrick + exact shade + undertone], [eye exact: shape, size, color multi-layer, IPD, eyelid, tilt, lash details], [brow exact: shape, thickness, arch, spacing, color], [nose exact: bridge, tip, nostril, classification], [lips exact: size ratio, cupid's bow, philtrum, color], [chin: shape, projection], [jaw: definition, angle], [cheekbones: placement, prominence], [forehead: shape, size], [hair: exact color, texture grade, density, length, style, hairline], [facial hair if any: exact], [age markers: lines locations], [asymmetries], [unique marks]"`,
              },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.01,
      }),
    })

    if (!analysisResponse.ok) {
      throw new Error(`Perplexity analysis failed: ${analysisResponse.status}`)
    }

    const analysisData = await analysisResponse.json()
    const facialFeatures = analysisData.choices[0]?.message?.content || ""

    console.log("[v0] Extracted facial features:", facialFeatures)

    const modificationResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: `Combine these into ONE concise image prompt (MAX 200 words):

CRITICAL: PRESERVE 100% OF FACIAL FEATURES - DO NOT CHANGE ANY FACIAL CHARACTERISTICS
FACE (MAINTAIN EXACTLY AS-IS): "${facialFeatures}"

MODIFICATIONS (translate Arabic, APPLY ONLY TO CLOTHING/BACKGROUND/NON-FACIAL ELEMENTS): "${editInstructions}"

ABSOLUTE REQUIREMENTS:
- FACIAL IDENTITY LOCK: Keep 100% of analyzed facial features - eye shape, nose shape, lip shape, face structure, skin tone, all facial characteristics MUST remain IDENTICAL
- ZERO facial modifications allowed - only clothing, background, accessories, or body elements can change
- FHD+ resolution 1920x1080
- PERFECT FACE PRESERVATION: maintain EXACT facial features from analysis, IDENTICAL face structure, SAME facial identity, no facial distortions
- PERFECT HANDS: exactly five fingers on each hand, natural anatomical pose, correct proportions, no hand deformities
- PERFECT BODY: correct human anatomy and proportions, no body distortions
- NO ERRORS of any kind
- NO ARTIFACTS or glitches
- NO DEFORMITIES in face, hands, or body
- NO DISTORTIONS in any body part
- FLAWLESS details in every aspect
- Professional photography quality
- Creative artistic touch ONLY in non-facial modifications

Format: "Portrait of [EXACT UNCHANGED facial features from analysis], [clothing/setting/non-facial changes ONLY], FHD+ resolution, PRESERVE 100% FACIAL IDENTITY, PERFECT FACE with IDENTICAL features, PERFECT HANDS with five fingers, PERFECT BODY anatomy, NO ERRORS, NO ARTIFACTS, NO DEFORMITIES, NO DISTORTIONS, flawless details, photorealistic"

Output ONLY the final prompt, no explanations.`,
          },
        ],
        max_tokens: 250,
        temperature: 0.2,
      }),
    })

    if (!modificationResponse.ok) {
      throw new Error(`Perplexity modification failed: ${modificationResponse.status}`)
    }

    const modificationData = await modificationResponse.json()
    const finalPrompt = modificationData.choices[0]?.message?.content || ""

    console.log("[v0] Final combined prompt:", finalPrompt)

    return finalPrompt.trim()
  } catch (error: any) {
    console.error("[v0] Perplexity analysis error:", error.message)
    return null
  }
}

function createFallbackPrompt(editInstructions: string): string {
  const arabicToEnglish: Record<string, string> = {
    "شخص|أشخاص|ناس": "people, person",
    "راجل|رجل": "man",
    "ست|امرأة|بنت": "woman",
    "طفل|عيل": "child",
    "لابس|يلبس": "wearing",
    فستان: "dress",
    بدلة: "suit",
    جلابية: "galabiya, traditional Egyptian clothing",
    "فرعوني|فراعنة": "ancient Egyptian pharaoh, pharaonic royal clothing, gold ornaments",
    "أهرامات|هرم": "pyramids of Giza",
    معبد: "ancient Egyptian temple",
    "عذرا|العذراء|مريم": "Virgin Mary, Saint Mary",
    "قبطي|أقباط": "Coptic Christian art style, Byzantine iconography, golden halo",
    أيقونة: "religious icon painting",
    "هالة|نور": "halo, divine light, golden nimbus",
    "واقف|يقف": "standing",
    "قاعد|يقعد": "sitting",
    "شيل|احتفظ|امسح|هشيل": "remove, delete, exclude",
    "خلي|اجعل": "make, transform into",
    "غير|عدل": "change, modify",
    "اسيب|احتفظ|سيب": "keep, preserve, maintain",
    "جنب|بجانب": "next to, beside",
    فوق: "above",
    واقعي: "photorealistic, realistic, highly detailed",
  }

  let englishPrompt = editInstructions.toLowerCase()

  for (const [arabicPattern, englishTerm] of Object.entries(arabicToEnglish)) {
    const regex = new RegExp(arabicPattern, "gi")
    englishPrompt = englishPrompt.replace(regex, englishTerm)
  }

  return `Professional photorealistic image: ${englishPrompt}, masterpiece quality, ultra high resolution, detailed textures`
}

export async function POST(req: Request) {
  try {
    const { imageUrl, editInstructions } = await req.json()

    if (!imageUrl || !editInstructions) {
      return NextResponse.json({ error: "Image URL and edit instructions are required" }, { status: 400 })
    }

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString("base64")
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg"

    const finalPrompt = await analyzeImageWithPerplexity(imageBase64, mimeType, editInstructions)

    const isRefused =
      !finalPrompt ||
      finalPrompt.toLowerCase().includes("sorry") ||
      finalPrompt.toLowerCase().includes("can't") ||
      finalPrompt.toLowerCase().includes("cannot") ||
      finalPrompt.length < 50

    let promptToUse = finalPrompt
    if (isRefused) {
      console.log("[v0] Perplexity refused analysis, using fallback prompt")
      promptToUse =
        createFallbackPrompt(editInstructions) +
        ", perfect facial features, symmetrical face, detailed eyes, natural skin texture, correct anatomy, photorealistic"
    } else {
      let enhancedFinalPrompt = finalPrompt
      if (!finalPrompt.includes("perfect facial features")) {
        enhancedFinalPrompt +=
          ", perfect facial features maintaining exact analyzed characteristics, symmetrical face, detailed eyes, natural skin texture, correct human anatomy"
      }
      promptToUse = enhancedFinalPrompt
    }

    const seed = Math.floor(Math.random() * 1000000)
    // Portrait 4:5 ratio - 1080x1350
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptToUse)}?model=turbo&width=1080&height=1350&seed=${seed}&nologo=true`

    return NextResponse.json({
      imageUrl: pollinationsUrl,
    })
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || "Unknown error occurred"
    console.error("[v0] Image analysis and regeneration error:", errorMessage)
    return NextResponse.json({ error: `Failed to edit image: ${errorMessage}` }, { status: 500 })
  }
}
