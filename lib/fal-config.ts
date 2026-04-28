export const FAL_KEY = process.env.FAL_KEY || "ee4132e8-fae7-4efe-8d2b-9d0d59e834a2:a1c4b8f6300ac015ba99fe9682ca8d71"

/**
 * Call any fal.ai model via direct REST API - bypasses SDK auth issues.
 */
export async function falRun(modelId: string, input: Record<string, any>): Promise<any> {
  const res = await fetch(`https://fal.run/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fal error ${res.status}: ${err}`)
  }

  return res.json()
}
