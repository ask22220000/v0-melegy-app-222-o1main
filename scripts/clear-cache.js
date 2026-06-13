import { rmSync, existsSync } from "fs"
import { join } from "path"

const cacheDir = join(process.cwd(), ".next")
if (existsSync(cacheDir)) {
  rmSync(cacheDir, { recursive: true, force: true })
  console.log("Cleared .next cache successfully")
} else {
  console.log("No .next cache found")
}
