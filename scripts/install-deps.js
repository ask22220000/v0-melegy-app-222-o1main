const { execSync } = require("child_process")
const path = require("path")

const root = path.resolve(__dirname, "..")

console.log("Installing @aws-sdk packages and @vercel/functions...")
execSync(
  "npm install @aws-sdk/client-dynamodb@3.810.0 @aws-sdk/lib-dynamodb@3.810.0 @vercel/functions@2.4.4 --save",
  { cwd: root, stdio: "inherit" }
)
console.log("Done!")
