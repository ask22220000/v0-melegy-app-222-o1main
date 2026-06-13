export const FAL_KEY = process.env.FAL_KEY || "a39c63bd-f0c0-434e-a097-3b2db83e10d6:b4690234c50913962db3917c022cffc2"

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
