import { execSync } from "child_process"
import { existsSync } from "fs"

console.log("[setup] Installing AWS SDK packages...")

try {
  execSync("npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @vercel/functions --save", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
  })
  console.log("[setup] Packages installed successfully.")
} catch (e) {
  console.error("[setup] npm install failed:", e.message)
}

// Verify packages are present
const paths = [
  "/vercel/share/v0-project/node_modules/@aws-sdk/client-dynamodb",
  "/vercel/share/v0-project/node_modules/@aws-sdk/lib-dynamodb",
  "/vercel/share/v0-project/node_modules/@vercel/functions",
]
for (const p of paths) {
  console.log(`[setup] ${p}: ${existsSync(p) ? "EXISTS" : "MISSING"}`)
}
