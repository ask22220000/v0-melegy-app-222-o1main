/**
 * scripts/setup-dynamodb.mjs
 * Creates the single DynamoDB table for the Melegy app.
 *
 * Run: node scripts/setup-dynamodb.mjs
 *
 * Required env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DYNAMODB_TABLE_NAME
 */

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb"

const region = process.env.AWS_REGION || "us-east-1"
const tableName = process.env.DYNAMODB_TABLE_NAME

if (!tableName) {
  console.error("ERROR: DYNAMODB_TABLE_NAME env var is required")
  process.exit(1)
}

const client = new DynamoDBClient({ region })

async function tableExists(name) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }))
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log(`[setup] Checking table: ${tableName} in region: ${region}`)

  if (await tableExists(tableName)) {
    console.log(`[setup] Table "${tableName}" already exists — skipping creation.`)
    return
  }

  console.log(`[setup] Creating table "${tableName}"...`)

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: "PAY_PER_REQUEST", // On-demand — no capacity planning needed
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
    })
  )

  console.log(`[setup] Table "${tableName}" created successfully.`)
  console.log("[setup] Schema:")
  console.log("  PK=USER#{userId}  SK=META                    → user profile + plan")
  console.log("  PK=USER#{userId}  SK=USAGE#{YYYY-MM-DD}      → daily usage counters")
  console.log("  PK=USER#{userId}  SK=USAGE_MONTHLY#{YYYY-MM} → monthly words/images")
  console.log("  PK=USER#{userId}  SK=CHAT#{ts}#{id}           → conversation")
  console.log("  PK=ANALYTICS      SK=GLOBAL                  → aggregate stats")
}

main().catch((err) => {
  console.error("[setup] Error:", err.message)
  process.exit(1)
})
