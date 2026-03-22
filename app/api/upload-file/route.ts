import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import pdfParse from "pdf-parse"
import mammoth from "mammoth"
import ExcelJS from "exceljs"

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const userPrompt = formData.get("prompt") as string || "قم بتحليل هذا الملف"

    if (!file) {
      return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 })
    }

    if (!AI_GATEWAY_API_KEY) {
      return NextResponse.json({ error: "مفتاح API غير متاح" }, { status: 500 })
    }

    const fileType = file.type
    const fileName = file.name
    let extractedContent = ""

    // Extract content based on file type
    if (fileType === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer())
      const pdfData = await pdfParse(buffer)
      extractedContent = pdfData.text
    } 
    else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer })
      extractedContent = result.value
    }
    else if (
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileType === "application/vnd.ms-excel"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      const sheets: string[] = []
      workbook.eachSheet((worksheet) => {
        const rows: string[] = []
        worksheet.eachRow((row) => {
          const values = (row.values as ExcelJS.CellValue[]).slice(1)
          rows.push(values.map((v) => (v === null || v === undefined ? "" : String(v))).join(","))
        })
        sheets.push(`\n--- Sheet: ${worksheet.name} ---\n${rows.join("\n")}`)
      })
      extractedContent = sheets.join("\n")
    }
    else if (fileType.startsWith("image/")) {
      // For images, use Gemini Vision
      const base64Image = Buffer.from(await file.arrayBuffer()).toString("base64")
      const dataUrl = `data:${fileType};base64,${base64Image}`

      const result = await generateText({
        model: "google/gemini-3-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image", image: dataUrl }
            ]
          }
        ],
        maxTokens: 2000,
      })

      return NextResponse.json({
        success: true,
        content: result.text,
        fileType: "image",
        fileName,
      })
    }
    else if (fileType.startsWith("audio/")) {
      // For audio files (MP3), use Gemini audio transcription
      const base64Audio = Buffer.from(await file.arrayBuffer()).toString("base64")
      const dataUrl = `data:${fileType};base64,${base64Audio}`

      const result = await generateText({
        model: "google/gemini-3-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "قم بتفريغ هذا الملف الصوتي وتحويله إلى نص مكتوب بدقة" },
            ]
          }
        ],
        maxTokens: 2000,
      })

      return NextResponse.json({
        success: true,
        content: result.text,
        fileType: "audio",
        fileName,
      })
    }
    else {
      return NextResponse.json({ 
        error: "نوع الملف غير مدعوم. يُرجى رفع PDF, Word, Excel, صور أو MP3" 
      }, { status: 400 })
    }

    // Process extracted text content with Gemini
    if (extractedContent) {
      const result = await generateText({
        model: "google/gemini-3-flash",
        messages: [
          {
            role: "system",
            content: "أنت مساعد ذكي متخصص في معالجة وتحليل المستندات. تتحدث بالعربية المصرية بشكل ودود واحترافي."
          },
          {
            role: "user",
            content: `${userPrompt}\n\nمحتوى الملف (${fileName}):\n\n${extractedContent}`
          }
        ],
        maxTokens: 2000,
      })

      return NextResponse.json({
        success: true,
        content: result.text,
        extractedText: extractedContent.substring(0, 1000), // First 1000 chars for preview
        fileType,
        fileName,
      })
    }

    return NextResponse.json({ error: "فشل استخراج المحتوى" }, { status: 500 })

  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ 
      error: "حدث خطأ أثناء معالجة الملف" 
    }, { status: 500 })
  }
}
