import { createFalClient } from "@fal-ai/client"

const FAL_KEY = process.env.FAL_KEY ?? "a39c63bd-f0c0-434e-a097-3b2db83e10d6:b4690234c50913962db3917c022cffc2"

export const fal = createFalClient({ credentials: FAL_KEY })
