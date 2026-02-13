import type { Message } from "@/types"

export class OfflineAI {
  private responsePatterns = {
    greetings: {
      patterns: [
        /\b(ازيك|ازي|ازى|عامل ايه|عامل اية|اخبارك|احوالك|صباح الخير|مساء الخير|السلام عليكم|اهلا|أهلا|هلا|hello|hi|hey)\b/i,
      ],
      responses: [
        "أهلا وسهلا يا صحبي! نورت، عامل ايه؟",
        "هلا والله! اهلا بيك، كله تمام؟",
        "مرحبا يا غالي! انا هنا، عايز ايه؟",
        "أهلا أهلا! انا ميليجي، تحت أمرك",
        "اهلا بيك يا معلم! قولي محتاج ايه؟",
      ],
    },

    thanks: {
      patterns: [/(شكرا|متشكر|ميرسي|thanks|thank you)/i],
      responses: [
        "العفو يا حبيبي! انا موجود دايماً",
        "ولا يهمك! اي خدمة يا معلم",
        "تسلم يا غالي، دي واجبي",
        "في أي وقت يا صحبي!",
      ],
    },

    identity: {
      patterns: [/(مين انت|انت مين|ايه اسمك|اسمك|what are you|who are you)/i],
      responses: [
        "أنا ميليجي، مساعدك الذكي المصري! هنا علشان أساعدك في أي حاجة تحتاجها",
        "انا ميليجي، الصديق اللي هيساعدك في كل حاجة! عايز ايه النهاردة؟",
        "اسمي ميليجي وأنا مساعد ذكي مصري مية في المية! جاهز لأي سؤال أو مساعدة",
      ],
    },

    sports: {
      patterns: [/(ماتش|مباراة|المنتخب|الكورة|النتيجة|الهداف|كأس|بطولة|match|score|goal|football|soccer)/i],
      responses: [
        "آسف يا صحبي، أنا مش متصل بالإنترنت دلوقتي فمقدرش أجيب نتائج المباريات الحية. بس لو عايز تعرف معلومات عامة عن الكورة أو المنتخب، أنا موجود!",
        "لو عايز نتيجة ماتش معين، انا محتاج أكون متصل بالنت عشان أجيبلك آخر الأخبار. حالياً بشتغل أوفلاين، بس لو عندك سؤال تاني أقدر أساعدك فيه!",
        "يا ريت لو كنت متصل بالنت عشان أجيبلك نتائج المباريات! حالياً بشتغل محلي بس، لكن لو عايز معلومات عامة عن الكورة أنا جاهز",
      ],
    },

    news: {
      patterns: [/(اخبار|خبر|جديد|آخر الأخبار|news|latest|recent|اليوم|امبارح|yesterday|today)/i],
      responses: [
        "آسف يا معلم، أنا مش متصل بالإنترنت حالياً فمقدرش أجيب آخر الأخبار. لكن لو عندك سؤال عام أو محتاج مساعدة في حاجة تانية، أنا موجود!",
        "للأسف مش قادر أجيبلك الأخبار الحية دلوقتي لأني بشتغل أوفلاين. بس في أي حاجة تانية تحب أساعدك فيها؟",
        "حالياً مش متاح عندي اتصال بالنت عشان أجيبلك آخر الأخبار، بس لو عايز معلومات عامة أو مساعدة في موضوع تاني، اتفضل!",
      ],
    },

    help: {
      patterns: [/(ساعدني|محتاج مساعدة|عايز مساعدة|help me|need help)/i],
      responses: [
        "اكيد يا صحبي! قولي عايز ايه وانا هساعدك",
        "انا موجود! قولي المشكلة وهنحلها سوا",
        "طبعاً يا غالي، بتاع ايه المساعدة؟",
      ],
    },

    imageGeneration: {
      patterns: [/(اعمل صورة|ولد صورة|صور|رسم|اعمل لي صورة|generate image|create image|draw)/i],
      responses: [
        "تمام! وصفلي الصورة اللي عايزها بالتفصيل وهولدها ليك",
        "ماشي يا فنان! عايز صورة ايه بالظبط؟ وصفهالي كويس",
        "جاهز! قولي عايز صورة فيها ايه وهرسمهالك",
      ],
    },

    videoGeneration: {
      patterns: [/(اعمل فيديو|ولد فيديو|generate video|create video|make video)/i],
      responses: [
        "تمام! وصفلي الفيديو اللي عايزه وهعمله ليك",
        "ماشي! عايز فيديو عن ايه؟ وصفه بالتفصيل",
        "جاهز لعمل الفيديو! قولي المحتوى اللي عايزه",
      ],
    },

    search: {
      patterns: [/(ابحث عن|دور على|معلومات عن|عايز اعرف عن)/i],
      responses: ["تمام! هدور ليك على المعلومات دي", "ماشي، لحظة واحدة هجيبلك المعلومات", "جاهز للبحث! استنى شوية"],
    },

    timeDate: {
      patterns: [/(كام الساعة|الوقت|التاريخ|اليوم|what time|date)/i],
      responses: () => {
        const now = new Date()
        const time = now.toLocaleTimeString("ar-EG")
        const date = now.toLocaleDateString("ar-EG")
        return `الساعة دلوقتي ${time}\nالتاريخ: ${date}`
      },
    },

    jokes: {
      patterns: [/(احكيلي نكتة|نكتة|ضحكني|joke)/i],
      responses: [
        "ليه الموبايل راح المستشفى؟\nعلشان بطاريته ضعيفة!",
        "واحد دخل كافيه طلب قهوة سادة\nقالوله: احنا معندناش قهوة مبسوطة!",
        "ليه المبرمج كسر النضارة بتاعته؟\nعلشان مش شايف الباجز كويس!",
      ],
    },

    programming: {
      patterns: [/(برمجة|كود|code|programming|python|javascript|java|html|css)/i],
      responses: [
        "ماشي! عايز مساعدة في البرمجة؟ قولي اللغة والمشكلة",
        "تمام! انا هنا علشان أساعدك في الكود",
        "جاهز! ايه اللغة اللي بتشتغل عليها؟",
      ],
    },

    math: {
      patterns: [/(احسب|حساب|جمع|طرح|ضرب|قسمة|calculate|math)/i],
      responses: [
        "ماشي! قولي العملية الحسابية وهحلهالك",
        "تمام! ايه الحسبة اللي عايز تعملها؟",
        "جاهز للحسابات! اكتب المسألة",
      ],
    },

    cooking: {
      patterns: [
        /(طريقة عمل|طبخ|وصفة|كيف اعمل|ازاي اعمل|recipe|cook|how to make|البيض|اللحم|الفراخ|المكرونة|الرز|الطماطم|البطاطس)/i,
      ],
      responses: [
        "وصفة حلوة! للأسف انا مش متخصص في الطبخ، بس أقدر أديك نصائح عامة. بالنسبة لطريقة العمل، غالباً محتاج تحضر المكونات الأساسية وتتبع خطوات بسيطة. لو عايز وصفة تفصيلية، انصحك تبحث على النت لأني مش متصل دلوقتي",
        "موضوع الطبخ ده جميل! بصراحة انا مش شيف محترف، بس أقدر أقولك إن معظم الوصفات بتعتمد على تحضير المكونات كويس واتباع الخطوات بالترتيب. لو محتاج تفاصيل أكتر، يفضل تدور على وصفة متخصصة لأني مش متاح ليا اتصال بالنت حالياً",
        "ماشي! الطبخ فن جميل. للأسف معرفتي بالوصفات محدودة لأني بشتغل أوفلاين دلوقتي، بس بشكل عام أي طبخة محتاج مكونات طازجة وخطوات واضحة. انصحك تبحث عن الوصفة على الإنترنت عشان تلاقي التفاصيل الكاملة",
      ],
    },
  }

  private knowledgeBase: { [key: string]: string } = {
    الذكاء_الاصطناعي: "الذكاء الاصطناعي هو محاكاة الآلات للذكاء البشري، زي التعلم والتفكير وحل المشاكل",
    البرمجة: "البرمجة هي كتابة تعليمات للكمبيوتر لتنفيذ مهام معينة باستخدام لغات البرمجة",
    الفضاء: "الفضاء هو الفراغ الشاسع خارج الغلاف الجوي للأرض ويحتوي على النجوم والكواكب",
    الشمس: "الشمس نجم قزم أصفر وهي مركز المجموعة الشمسية ومصدر الضوء والحرارة للأرض",
  }

  async generateResponse(userInput: string, conversationHistory: Message[]): Promise<string> {
    console.log("[v0] Using offline AI for response generation")

    const normalizedInput = userInput.trim().toLowerCase()

    for (const [category, config] of Object.entries(this.responsePatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(normalizedInput)) {
          console.log(`[v0] Matched pattern category: ${category}`)

          if (typeof config.responses === "function") {
            return config.responses()
          }

          const responses = config.responses as string[]
          return responses[Math.floor(Math.random() * responses.length)]
        }
      }
    }

    const contextualResponse = this.generateContextualResponse(userInput, conversationHistory)
    if (contextualResponse) {
      return contextualResponse
    }

    const knowledgeResponse = this.searchKnowledgeBase(normalizedInput)
    if (knowledgeResponse) {
      return knowledgeResponse
    }

    return this.getSmartFallback(userInput)
  }

  private searchKnowledgeBase(query: string): string | null {
    for (const [key, value] of Object.entries(this.knowledgeBase)) {
      const searchTerm = key.replace(/_/g, " ")
      if (
        query.includes(searchTerm) &&
        query.split(" ").some((word) => word === searchTerm || word.includes(searchTerm))
      ) {
        return value
      }
    }
    return null
  }

  private generateContextualResponse(userInput: string, history: Message[]): string | null {
    const input = userInput.toLowerCase()

    if (input.includes("ليه") || input.includes("لماذا") || input.includes("why")) {
      return "سؤال جميل! الموضوع ده معقد شوية، بس باختصار... محتاج تفاصيل أكتر عشان أجاوبك بدقة"
    }

    if (input.includes("ازاي") || input.includes("كيف") || input.includes("ازاي") || input.includes("how")) {
      if (
        input.includes("عمل") ||
        input.includes("طبخ") ||
        input.includes("وصفة") ||
        input.includes("بيض") ||
        input.includes("طماطم") ||
        input.includes("recipe") ||
        input.includes("cook")
      ) {
        return "للأسف انا مش متخصص في الطبخ والوصفات، بس أقدر أقولك إن أغلب الوصفات بتحتاج مكونات طازجة وخطوات واضحة. لو محتاج تفاصيل دقيقة، يفضل تدور على وصفة متخصصة على الإنترنت"
      }
      return "تمام! الطريقة بسيطة - محتاج أعرف بالظبط عايز تعمل ايه عشان أشرحلك الخطوات"
    }

    if (input.includes("فين") || input.includes("أين") || input.includes("where")) {
      return "محتاج تحدد أكتر عشان أقدر أساعدك في المكان الصح"
    }

    if (input.includes("امتى") || input.includes("متى") || input.includes("when")) {
      return "بخصوص التوقيت، محتاج معلومات أكتر عشان أحددلك بدقة"
    }

    return null
  }

  private getSmartFallback(userInput: string): string {
    const fallbacks = [
      "فهمت كلامك، بس ممكن توضح أكتر عشان أقدر أساعدك بشكل أفضل؟",
      "تمام، انا معاك! ممكن تشرحلي أكتر أو تسأل سؤال محدد؟",
      "مش متأكد فهمتك صح. ممكن تعيد السؤال بطريقة تانية؟",
      "عايز تعرف حاجة معينة؟ جرب تسألني سؤال واضح وهساعدك",
    ]

    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }

  async deepSearch(query: string): Promise<{
    answer: string
    sources: Array<{ title: string; url: string; snippet: string }>
  }> {
    console.log("[v0] Using offline deep search")

    const searchResults = this.simulateSearch(query)

    return {
      answer: searchResults.answer,
      sources: searchResults.sources,
    }
  }

  private simulateSearch(query: string): {
    answer: string
    sources: Array<{ title: string; url: string; snippet: string }>
  } {
    const q = query.toLowerCase()

    if (q.includes("ذكاء اصطناعي") || q.includes("ai") || q.includes("artificial intelligence")) {
      return {
        answer:
          "الذكاء الاصطناعي هو محاكاة عمليات الذكاء البشري بواسطة الآلات، وخاصة أنظمة الكمبيوتر. تشمل هذه العمليات التعلم والاستدلال والتصحيح الذاتي. يستخدم في مجالات متعددة زي الطب والتعليم والترفيه",
        sources: [
          {
            title: "ما هو الذكاء الاصطناعي؟",
            url: "https://www.ibm.com/topics/artificial-intelligence",
            snippet: "دليل شامل للذكاء الاصطناعي وتطبيقاته",
          },
        ],
      }
    }

    return {
      answer: `بناءً على بحثي عن "${query}"، الموضوع ده محتاج بحث متخصص أكتر. ممكن تحدد سؤالك بشكل أدق عشان أقدر أساعدك بشكل أفضل؟`,
      sources: [],
    }
  }
}

export const offlineAI = new OfflineAI()
