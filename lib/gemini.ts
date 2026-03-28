import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY!

export const genAI = new GoogleGenerativeAI(apiKey)

export const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

export function getModel(modelName = "gemini-2.0-flash") {
  return genAI.getGenerativeModel({ model: modelName, safetySettings })
}

/** Convert a data URL (data:mime;base64,...) to a Gemini InlinePart */
export function dataUrlToInlinePart(dataUrl: string) {
  const [meta, data] = dataUrl.split(",")
  const mimeType = meta.replace("data:", "").replace(";base64", "")
  return { inlineData: { mimeType, data } }
}

/** Convert a remote image URL to base64 InlinePart */
export async function urlToInlinePart(url: string) {
  const res = await fetch(url)
  const mime = res.headers.get("content-type") || "image/jpeg"
  const buf  = Buffer.from(await res.arrayBuffer())
  return { inlineData: { mimeType: mime, data: buf.toString("base64") } }
}

/** Strip markdown formatting from AI text */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^[\s]*[-*•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
