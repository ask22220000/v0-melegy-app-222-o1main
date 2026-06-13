// خدمة الذكاء العاطفي لميليجي
import { getServiceRoleClient } from "./supabase/server"

// Lazy getter — avoids top-level instantiation during build (env vars not available at build time)
function getSupabase() {
  return getServiceRoleClient()
}

// قاموس المشاعر العربي والمصري
const emotionKeywords: Record<string, string[]> = {
  happy: [
    "مبسوط",
    "فرحان",
    "سعيد",
    "تمام",
    "حلو",
    "جميل",
    "رائع",
    "ممتاز",
    "عظيم",
    "هايل",
    "خطير",
    "جامد",
    "حبيت",
    "عجبني",
    "فرحتني",
    "بحبك",
    "شكرا",
    "الحمدلله",
    "يسلمو",
    "تسلم",
    "نورت",
    "احلى",
    "افضل",
    "زي الفل",
    "ولا اروع",
    "مية مية",
  ],
  sad: [
    "زعلان",
    "حزين",
    "مش كويس",
    "تعبان",
    "مخنوق",
    "ضايق",
    "مكتئب",
    "وحيد",
    "مش طايق",
    "مش قادر",
    "صعب",
    "الم",
    "وجع",
    "بكاء",
    "دموع",
    "قلبي",
    "ماليش",
    "زهقت",
    "مليت",
    "تعبت",
    "خلاص",
    "كفاية",
    "مش عايز",
    "سايبني",
  ],
  angry: [
    "زعلان",
    "متنرفز",
    "غضبان",
    "مجنن",
    "مش طايق",
    "بضرب",
    "هموت",
    "اقتل",
    "غلط",
    "ظلم",
    "مش عدل",
    "كذب",
    "خاين",
    "واطي",
    "حقير",
    "قرفان",
    "طفشني",
    "جنني",
    "نرفزني",
    "ضايقني",
    "كرهت",
    "مش هسيب",
  ],
  anxious: [
    "قلقان",
    "خايف",
    "متوتر",
    "مش مرتاح",
    "مش مطمن",
    "خوف",
    "رعب",
    "قلق",
    "مش عارف",
    "محتار",
    "تايه",
    "ضايع",
    "مش فاهم",
    "صعب علي",
    "مش قادر افكر",
    "امتحان",
    "مقابلة",
    "شغل",
    "فلوس",
    "صحة",
    "مستقبل",
  ],
  excited: [
    "متحمس",
    "مستني",
    "نفسي",
    "عايز",
    "بتمنى",
    "حلم",
    "هدف",
    "طموح",
    "جاهز",
    "مستعد",
    "هعمل",
    "هحقق",
    "قادر",
    "واثق",
    "متفائل",
    "ان شاء الله",
  ],
  grateful: [
    "شكرا",
    "ممنون",
    "متشكر",
    "جزاك الله",
    "ربنا يخليك",
    "ربنا يباركلك",
    "ساعدتني",
    "فدتني",
    "نفعتني",
    "احسن",
    "افضل حاجة",
  ],
  confused: [
    "مش فاهم",
    "ازاي",
    "ليه",
    "ايه ده",
    "غريب",
    "عجيب",
    "مش منطقي",
    "محتار",
    "تايه",
    "مش عارف",
    "صعب",
    "معقد",
    "مش واضح",
  ],
}

// تحليل المشاعر من النص
export function analyzeSentiment(text: string): {
  emotion: string
  score: number
  keywords: string[]
} {
  const lowerText = text.toLowerCase()
  const foundEmotions: { emotion: string; count: number; keywords: string[] }[] = []

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    const found = keywords.filter((k) => lowerText.includes(k))
    if (found.length > 0) {
      foundEmotions.push({ emotion, count: found.length, keywords: found })
    }
  }

  if (foundEmotions.length === 0) {
    return { emotion: "neutral", score: 0.5, keywords: [] }
  }

  // اختار المشاعر الأقوى
  foundEmotions.sort((a, b) => b.count - a.count)
  const dominant = foundEmotions[0]

  const score = Math.min(dominant.count / 3, 1)

  return {
    emotion: dominant.emotion,
    score: score,
    keywords: dominant.keywords,
  }
}

// توليد أسلوب الرد بناءً على المشاعر
export function getResponseStyle(emotion: string): {
  tone: string
  greeting: string
  empathy: string
  closing: string
} {
  const styles: Record<string, { tone: string; greeting: string; empathy: string; closing: string }> = {
    happy: {
      tone: "مرح وإيجابي",
      greeting: "أيوه كده! حلو أوي إنك مبسوط",
      empathy: "فرحتك فرحتي والله",
      closing: "ابقى فرحني دايماً بأخبارك الحلوة",
    },
    sad: {
      tone: "متعاطف وداعم",
      greeting: "معلش يا صاحبي، أنا هنا عشانك",
      empathy: "فاهم إحساسك وعارف إن ده صعب عليك",
      closing: "لو محتاج حد يسمعك، أنا موجود دايماً",
    },
    angry: {
      tone: "هادئ ومتفهم",
      greeting: "أنا فاهم إنك متضايق، وحقك",
      empathy: "من حقك تزعل، بس خلينا نفكر سوا",
      closing: "خد نفس عميق، وأنا هنا لو عايز تتكلم",
    },
    anxious: {
      tone: "مطمئن وهادئ",
      greeting: "متقلقش، كل حاجة هتبقى تمام",
      empathy: "طبيعي تحس كده، بس انت أقوى من كده",
      closing: "ثق في نفسك، وأنا معاك",
    },
    excited: {
      tone: "متحمس ومشجع",
      greeting: "يا سلام! حماسك ده جميل",
      empathy: "عجبني طموحك وحماسك",
      closing: "يلا نحقق اللي عايزه!",
    },
    grateful: {
      tone: "ودود ومقدر",
      greeting: "العفو يا صاحبي، ده واجبي",
      empathy: "بشكرك على كلامك الحلو ده",
      closing: "دايماً في خدمتك",
    },
    confused: {
      tone: "صبور وموضح",
      greeting: "مفيش حاجة اسمها سؤال غبي، اسأل براحتك",
      empathy: "طبيعي تستغرب، خليني أوضحلك",
      closing: "لو لسه مش واضح، قولي وهفهمك أكتر",
    },
    neutral: {
      tone: "ودود وطبيعي",
      greeting: "أهلاً بيك",
      empathy: "",
      closing: "تحت أمرك في أي وقت",
    },
  }

  return styles[emotion] || styles.neutral
}

// حفظ ذاكرة المستخدم
export async function saveUserMemory(
  visitorId: string,
  data: {
    userName?: string
    interest?: string
    topic?: string
    emotion?: string
    note?: string
  },
): Promise<void> {
  try {
    // جلب الذاكرة الحالية
    const { data: existing } = await getSupabase().from("user_memory").select("*").eq("visitor_id", visitorId).maybeSingle()

    if (existing) {
      // تحديث الذاكرة الموجودة
      const updates: any = {
        last_seen_at: new Date().toISOString(),
        total_conversations: (existing.total_conversations || 0) + 1,
      }

      if (data.userName) updates.user_name = data.userName
      if (data.emotion) updates.last_mood = data.emotion

      if (data.interest) {
        const interests = existing.interests || []
        if (!interests.includes(data.interest)) {
          interests.push(data.interest)
          updates.interests = interests
        }
      }

      if (data.topic) {
        const topics = existing.conversation_topics || []
        topics.push({ topic: data.topic, date: new Date().toISOString() })
        updates.conversation_topics = topics.slice(-20) // آخر 20 موضوع
      }

      if (data.emotion) {
        const emotions = existing.emotional_history || []
        emotions.push({ emotion: data.emotion, date: new Date().toISOString() })
        updates.emotional_history = emotions.slice(-50) // آخر 50 مشاعر
      }

      await getSupabase().from("user_memory").update(updates).eq("visitor_id", visitorId)
    } else {
      // إنشاء ذاكرة جديدة
      await getSupabase().from("user_memory").insert({
        visitor_id: visitorId,
        user_name: data.userName,
        interests: data.interest ? [data.interest] : [],
        conversation_topics: data.topic ? [{ topic: data.topic, date: new Date().toISOString() }] : [],
        emotional_history: data.emotion ? [{ emotion: data.emotion, date: new Date().toISOString() }] : [],
        last_mood: data.emotion,
        total_conversations: 1,
      })
    }
  } catch (error) {
    console.error("Error saving user memory:", error)
  }
}

// جلب ذاكرة المستخدم
export async function getUserMemory(visitorId: string): Promise<{
  userName?: string
  interests: string[]
  recentTopics: string[]
  lastMood?: string
  totalConversations: number
  isReturningUser: boolean
} | null> {
  try {
    const { data } = await getSupabase().from("user_memory").select("*").eq("visitor_id", visitorId).maybeSingle()

    if (!data) return null

    return {
      userName: data.user_name,
      interests: data.interests || [],
      recentTopics: (data.conversation_topics || []).slice(-5).map((t: any) => t.topic),
      lastMood: data.last_mood,
      totalConversations: data.total_conversations || 0,
      isReturningUser: (data.total_conversations || 0) > 1,
    }
  } catch (error) {
    console.error("Error getting user memory:", error)
    return null
  }
}

// استخراج اسم المستخدم من الرسالة
export function extractUserName(text: string): string | null {
  const patterns = [
    /اسمي\s+([^\s,.!?]+)/i,
    /انا\s+([^\s,.!?]+)/i,
    /أنا\s+([^\s,.!?]+)/i,
    /اسم[يى]\s+([^\s,.!?]+)/i,
    /بيسموني\s+([^\s,.!?]+)/i,
    /نادوني\s+([^\s,.!?]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      // تأكد إنه اسم مش كلمة عادية
      if (name.length > 1 && name.length < 20) {
        return name
      }
    }
  }

  return null
}

// توليد تحية شخصية
export function generatePersonalGreeting(memory: {
  userName?: string
  isReturningUser: boolean
  lastMood?: string
  totalConversations: number
}): string {
  const greetings = {
    newUser: ["أهلاً بيك! أنا ميليجي، نورت", "مرحباً! أنا ميليجي، تشرفت بيك"],
    returningUser: ["أهلاً! وحشتني والله", "نورت تاني! إزيك؟", "رجعتلي! مبسوط إنك هنا"],
    withName: ["أهلاً يا {name}! وحشتني", "نورت يا {name}! إزيك النهارده؟", "{name}! مبسوط إنك رجعت"],
  }

  if (memory.userName && memory.isReturningUser) {
    const greeting = greetings.withName[Math.floor(Math.random() * greetings.withName.length)]
    return greeting.replace("{name}", memory.userName)
  } else if (memory.isReturningUser) {
    return greetings.returningUser[Math.floor(Math.random() * greetings.returningUser.length)]
  } else {
    return greetings.newUser[Math.floor(Math.random() * greetings.newUser.length)]
  }
}
