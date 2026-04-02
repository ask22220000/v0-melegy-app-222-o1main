import { NextResponse } from "next/server"
 v0/visionaieg-2041-978f6390
import { falChat } from "@/lib/fal-chat"

import { generateWithFalRouter } from "@/lib/falRouterService"
 main

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "يجب تقديم نص الطلب" }, { status: 400 })
    }

    const excelData = await generateExcelDataWithAI(prompt)

    return NextResponse.json({
      excelData,
      message: "تم إنشاء الشيت بنجاح! 📊",
    })
  } catch (error: any) {
    console.error("[API] Excel generation error:", error)
    return NextResponse.json(
      { error: "معلش حصل خطأ في إنشاء الشيت، جرب تاني 😅" },
      { status: 500 }
    )
  }
}

async function generateExcelDataWithAI(
  prompt: string
): Promise<{ headers: string[]; rows: any[][] }> {
  const systemPrompt = `أنت مساعد ذكي متخصص في إنشاء جداول Excel بدقة عالية.

تعليمات مهمة:
1. افهم بالضبط البيانات المطلوبة من المستخدم
2. إذا طلب بيانات محددة - ابحث عنها واستخدمها
3. إذا أعطاك المستخدم بيانات مباشرة - نظمها في الجدول
4. إذا طلب توليد بيانات - ولّدها بشكل واقعي ودقيق
5. اجعل الأعمدة واضحة ومنطقية
6. أضف 10-30 صف على الأقل من البيانات الحقيقية

يجب أن يكون الرد JSON فقط بهذا الشكل:
{"headers": ["العمود1", "العمود2", "العمود3"], "rows": [["قيمة1", "قيمة2", "قيمة3"], ["قيمة4", "قيمة5", "قيمة6"]]}

لا تكتب أي شيء قبل أو بعد الـ JSON.`

 v0/visionaieg-2041-978f6390
  const text = await falChat(prompt, [], {
    model: "google/gemini-2.0-flash",
    systemPrompt,
    maxTokens: 4000,
    temperature: 0.3,
  })

  let jsonText = text.trim().replace(/```json\s*/g, "").replace(/```\s*/g, "")

  const jsonMatch = jsonText.match(/\{[\s\S]*?"headers"[\s\S]*?"rows"[\s\S]*?\}/s)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    if (
      parsed.headers && Array.isArray(parsed.headers) &&
      parsed.rows && Array.isArray(parsed.rows) &&
      parsed.headers.length > 0 && parsed.rows.length > 0
    ) {
      return parsed

    const result = await generateWithFalRouter(
      systemPrompt,
      [{ role: "user", content: prompt }],
      { maxTokens: 4000, temperature: 0.3 }
    )

    // Extract JSON from response
    let jsonText = result.trim()
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "")
    
    // Try to find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*?"headers"[\s\S]*?"rows"[\s\S]*?\}/s)
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      if (
        parsed.headers &&
        Array.isArray(parsed.headers) &&
        parsed.rows &&
        Array.isArray(parsed.rows) &&
        parsed.headers.length > 0 &&
        parsed.rows.length > 0
      ) {
        return parsed
      }
 main
    }
  }

  throw new Error("Failed to parse AI response")
}
