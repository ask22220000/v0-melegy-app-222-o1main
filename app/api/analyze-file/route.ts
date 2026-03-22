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
        const { Workbook } = await import("exceljs")
        const workbook = new Workbook()
        await workbook.xlsx.load(buffer)
        const worksheet = workbook.worksheets[0]
        const data: any[][] = []
        worksheet?.eachRow((row) => {
          data.push(row.values as any[])
        })

        analyses.push(
          `تحليل ملف ${file.name}\n` +
            `عدد الأعمدة: ${(data[0] as any[])?.length || 0}\n` +
            `عدد الصفوف: ${data.length}\n` +
            `البيانات: ${JSON.stringify(data.slice(0, 5))}`,
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
                      text: "حلل الصورة دي بالتفصيل واوصفها بالعربي المصري كنص عادي متصل بدون نجوم أو عناوين أو رموز أو تنسيق. قول إيه اللي في الصورة، الألوان، الأشخاص لو موجودين، الأماكن، وأي تفاصيل مهمة.",
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
            `تحليل الصورة: ${file.name}\n` +
              `الحجم: ${(file.size / 1024).toFixed(2)} KB\n\n` +
              `${visionResult}`,
          )
        } catch (visionError) {
          analyses.push(
            `صورة: ${file.name}\n` +
              `الحجم: ${(file.size / 1024).toFixed(2)} KB\n` +
              `تم استلام الصورة بنجاح. لو عايز تحليل مفصل اسألني عنها.`,
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
