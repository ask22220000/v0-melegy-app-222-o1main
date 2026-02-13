export interface CreativeSolution {
  approach: string
  description: string
  steps: string[]
  pros: string[]
  cons: string[]
}

export interface CreativeProblemSolvingResult {
  success: boolean
  solutions?: CreativeSolution[]
  html?: string
  error?: string
}

export function analyzeCreativeProblem(problem: string, language: "ar" | "en" = "ar"): CreativeProblemSolvingResult {
  try {
    const approaches =
      language === "ar"
        ? [
            {
              approach: "التفكير التصميمي (Design Thinking)",
              description: "نهج يركز على فهم المستخدم والتعاطف معه لإيجاد حلول مبتكرة",
              icon: "🎨",
              color: "from-pink-500 to-rose-500",
            },
            {
              approach: "العصف الذهني العكسي (Reverse Brainstorming)",
              description: "التفكير في كيفية جعل المشكلة أسوأ ثم عكس الأفكار",
              icon: "🔄",
              color: "from-purple-500 to-indigo-500",
            },
            {
              approach: "تقنية SCAMPER",
              description: "استبدل، ادمج، تكيّف، عدّل، استخدم لغرض آخر، احذف، اعكس",
              icon: "🔧",
              color: "from-blue-500 to-cyan-500",
            },
            {
              approach: "التفكير الجانبي (Lateral Thinking)",
              description: "النظر للمشكلة من زوايا غير تقليدية وإيجاد حلول غير متوقعة",
              icon: "🌟",
              color: "from-yellow-500 to-orange-500",
            },
            {
              approach: "تحليل الأسباب الجذرية (Root Cause Analysis)",
              description: "حفر عميق للوصول للسبب الحقيقي وراء المشكلة",
              icon: "🌳",
              color: "from-green-500 to-emerald-500",
            },
            {
              approach: "القبعات الست للتفكير (Six Thinking Hats)",
              description: "النظر للمشكلة من 6 وجهات نظر مختلفة",
              icon: "🎩",
              color: "from-red-500 to-pink-500",
            },
          ]
        : [
            {
              approach: "Design Thinking",
              description: "User-focused approach emphasizing empathy",
              icon: "🎨",
              color: "from-pink-500 to-rose-500",
            },
            {
              approach: "Reverse Brainstorming",
              description: "Think how to make problem worse, then reverse ideas",
              icon: "🔄",
              color: "from-purple-500 to-indigo-500",
            },
            {
              approach: "SCAMPER Technique",
              description: "Substitute, Combine, Adapt, Modify, Put to use, Eliminate, Reverse",
              icon: "🔧",
              color: "from-blue-500 to-cyan-500",
            },
            {
              approach: "Lateral Thinking",
              description: "Look at problem from unconventional angles",
              icon: "🌟",
              color: "from-yellow-500 to-orange-500",
            },
            {
              approach: "Root Cause Analysis",
              description: "Dig deep to find real reason behind problem",
              icon: "🌳",
              color: "from-green-500 to-emerald-500",
            },
            {
              approach: "Six Thinking Hats",
              description: "View problem from 6 different perspectives",
              icon: "🎩",
              color: "from-red-500 to-pink-500",
            },
          ]

    const html = `
      <div class="creative-problem-solving space-y-6 p-6 rounded-2xl bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700">
        <div class="text-center mb-6">
          <h3 class="text-2xl font-bold text-white mb-2">💡 ${language === "ar" ? "حل المشاكل الإبداعي" : "Creative Problem Solving"}</h3>
          <p class="text-gray-300">${language === "ar" ? "منهجيات متعددة لحل المشكلة" : "Multiple Approaches"}</p>
        </div>

        <div class="mb-6 p-4 rounded-xl bg-blue-500/20 border border-blue-400/30">
          <h4 class="font-bold text-lg mb-2 text-white">
            ${language === "ar" ? "🎯 المشكلة" : "🎯 Problem"}
          </h4>
          <p class="text-gray-200">${problem}</p>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          ${approaches
            .map(
              (approach, index) => `
            <div class="p-5 rounded-xl bg-gray-800/50 border border-gray-600 hover:border-gray-500 transition-all duration-300">
              <div class="flex items-start gap-3 mb-3">
                <div class="text-3xl">${approach.icon}</div>
                <div class="flex-1">
                  <h5 class="font-bold text-base mb-1 text-white">${approach.approach}</h5>
                  <p class="text-sm text-gray-300">${approach.description}</p>
                </div>
              </div>
              <div class="mt-3 pt-3 border-t border-gray-700">
                <span class="inline-block px-3 py-1 rounded-lg bg-gradient-to-r ${approach.color} text-white text-xs font-semibold">
                  ${language === "ar" ? "نهج مبتكر" : "Innovative Approach"}
                </span>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>

        <div class="mt-6 p-4 rounded-xl bg-green-500/20 border border-green-400/30">
          <h4 class="font-bold mb-2 text-white">
            💡 ${language === "ar" ? "نصيحة للتطبيق" : "Implementation Tip"}
          </h4>
          <p class="text-sm text-gray-200">
            ${
              language === "ar"
                ? "يمكنك الجمع بين عدة منهجيات للحصول على حلول أكثر شمولية."
                : "You can combine multiple methodologies for more comprehensive solutions."
            }
          </p>
        </div>
      </div>
    `

    return {
      success: true,
      html,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze problem",
    }
  }
}

export function shouldUseCreativeProblemSolving(input: string): boolean {
  const keywords = [
    "creative solution",
    "حل إبداعي",
    "حل المشكلة",
    "solve creatively",
    "innovative solution",
    "حل مبتكر",
    "طرق إبداعية",
    "creative approach",
  ]

  return keywords.some((keyword) => input.toLowerCase().includes(keyword.toLowerCase()))
}
