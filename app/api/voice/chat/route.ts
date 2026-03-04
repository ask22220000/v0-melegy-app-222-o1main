export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json()

    if (!text) {
      return Response.json({ error: "No text provided" }, { status: 400 })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      return Response.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    const messages = [
      {
        role: "system",
        content:
          "أنت ميليجي، مساعد ذكاء اصطناعي مصري ذكي وودود. لازم دايمًا تتكلم باللهجة المصرية العامية بشكل طبيعي جداً زي ما المصريين بيتكلموا مع بعض. ردودك قصيرة ومباشرة لأنها هتتقرأ بصوت عالي. متستخدمش رموز markdown أو نجوم أو أي تنسيق. كلم المستخدم بطريقة مريحة وعفوية باللهجة المصرية.",
      },
      ...(history || []),
      { role: "user", content: text },
    ]

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 120,
        temperature: 0.7,
        stream: false,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Groq chat error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || ""
    return Response.json({ reply })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
