import { NextRequest, NextResponse } from "next/server"
import { getModel, dataUrlToInlinePart } from "@/lib/gemini"
import pdfParse from "pdf-parse"
import mammoth from "mammoth"
import * as XLSX from "xlsx"

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "مفتاح API غير متاح" }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const userPrompt = (formData.get("prompt") as string) || "قم بتحليل هذا الملف"

    if (!file) {
      return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 })
    }

    const fileType = file.type
    const fileName = file.name
    const docSystemPrompt = "أنت مساعد ذكي متخصص في معالجة وتحليل المستندات. تتحدث بالعربية المصرية بشكل ودود واحترافي."
    const model = getModel("gemini-2.0-flash", docSystemPrompt)

    // Images — use vision directly
    if (fileType.startsWith("image/")) {
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")
      const imagePart = { inlineData: { mimeType: fileType, data: base64 } }

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }, imagePart] }],
        generationConfig: { maxOutputTokens: 2000 },
      })

      return NextResponse.json({ success: true, content: result.response.text(), fileType: "image", fileName })
    }

    // Audio — use Gemini audio capability
    if (fileType.startsWith("audio/")) {
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")
      const audioPart = { inlineData: { mimeType: fileType, data: base64 } }

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: "قم بتفريغ هذا الملف الصوتي وتحويله إلى نص مكتوب بدقة" },
            audioPart,
          ],
        }],
        generationConfig: { maxOutputTokens: 2000 },
      })

      return NextResponse.json({ success: true, content: result.response.text(), fileType: "audio", fileName })
    }

    // Extract text from documents
    let extractedContent = ""

    if (fileType === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer())
      const pdfData = await pdfParse(buffer)
      extractedContent = pdfData.text
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const buffer = Buffer.from(await file.arrayBuffer())
      const res = await mammoth.extractRawText({ buffer })
      extractedContent = res.value
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileType === "application/vnd.ms-excel"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const workbook = XLSX.read(buffer, { type: "buffer" })
      extractedContent = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name]
        return `\n--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`
      }).join("\n")
    } else {
      return NextResponse.json({
        error: "نوع الملف غير مدعوم. يُرجى رفع PDF, Word, Excel, صور أو MP3"
      }, { status: 400 })
    }

    if (!extractedContent) {
      return NextResponse.json({ error: "فشل استخراج المحتوى" }, { status: 500 })
    }

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: `${userPrompt}\n\nمحتوى الملف (${fileName}):\n\n${extractedContent}` }],
      }],
      generationConfig: { maxOutputTokens: 2000 },
    })

    return NextResponse.json({
      success: true,
      content: result.response.text(),
      extractedText: extractedContent.substring(0, 1000),
      fileType,
      fileName,
    })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة الملف" }, { status: 500 })
  }
}
