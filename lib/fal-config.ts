import { fal } from "@fal-ai/client"

const FAL_KEY = process.env.FAL_KEY || "a39c63bd-f0c0-434e-a097-3b2db83e10d6:b4690234c50913962db3917c022cffc2"

// Configure global fal client for image/video generation routes
fal.config({ credentials: FAL_KEY })

export { fal }
export { FAL_KEY }
