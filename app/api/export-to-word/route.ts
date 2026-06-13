import { NextRequest, NextResponse } from "next/server"
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx"

export async function POST(req: NextRequest) {
  try {
    const { content, title } = await req.json()

    if (!content) {
      return NextResponse.json({ error: "لا يوجد محتوى للتصدير" }, { status: 400 })
    }

    // Parse content into paragraphs
    const lines = content.split("\n").filter((line: string) => line.trim())

    const children = lines.map((line: string) => {
      // Check if it's a heading (starts with # or bold markers)
      if (line.startsWith("##") || line.startsWith("**")) {
        return new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(line.replace(/[#*]/g, "").trim())],
        })
      }
      
      return new Paragraph({
        children: [new TextRun(line)],
        spacing: { after: 200 },
      })
    })

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(title || "مستند ميليجي")],
            spacing: { after: 400 },
          }),
          ...children,
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${title || "melegy-document"}.docx"`,
      },
    })

  } catch (error) {
    console.error("Export to Word error:", error)
    return NextResponse.json({ error: "فشل التصدير إلى Word" }, { status: 500 })
  }
}
