import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    const analyses: string[] = []

    for (const file of files) {
      const fileType = file.name.split(".").pop()?.toLowerCase()
      const buffer = await file.arrayBuffer()

      if (fileType === "xlsx" || fileType === "xls" || fileType === "csv") {
        const XLSX = await import("xlsx")
        const workbook = XLSX.read(buffer, { type: "buffer" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        analyses.push(
          `📊 تحليل ملف Excel: ${file.name}\n` +
            `- عدد الأعمدة: ${(data[0] as any[])?.length || 0}\n` +
            `- عدد الصفوف: ${data.length}\n` +
            `- البيانات: ${JSON.stringify(data.slice(0, 5))}`,
        )
      } else if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileType || "")) {
        try {
          const base64Image = Buffer.from(buffer).toString("base64")
          const dataUrl = `data:${file.type};base64,${base64Image}`

          const visionResponse = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "حلل الصورة دي بالتفصيل واوصفها بالعربي المصري. قول إيه اللي في الصورة، الألوان، الأشخاص لو موجودين، الأماكن، وأي تفاصيل مهمة.",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: dataUrl,
                      },
                    },
                  ],
                },
              ],
              model: "openai",
              seed: 42,
              jsonMode: false,
            }),
          })

          if (!visionResponse.ok) {
            throw new Error(`Vision API error: ${visionResponse.status}`)
          }

          const visionResult = await visionResponse.text()

          analyses.push(
            `🖼️ تحليل الصورة: ${file.name}\n` +
              `- الحجم: ${(file.size / 1024).toFixed(2)} KB\n` +
              `- النوع: ${file.type}\n\n` +
              `📝 الوصف:\n${visionResult}`,
          )
        } catch (visionError) {
          console.error("[v0] Vision analysis error:", visionError)
          analyses.push(
            `🖼️ صورة: ${file.name}\n` +
              `- الحجم: ${(file.size / 1024).toFixed(2)} KB\n` +
              `- النوع: ${file.type}\n` +
              `- تم استلام الصورة بنجاح! لو عايز تحليل مفصل، اسألني عنها.`,
          )
        }
      }
    }

    const analysis = analyses.join("\n\n")

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("File analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze files" }, { status: 500 })
  }
}
