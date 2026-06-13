/**
 * setup-dynamodb.mjs
 * Creates the Melegy DynamoDB table if it doesn't exist.
 * Run once: node scripts/setup-dynamodb.mjs
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb"

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME

if (!TABLE_NAME) {
  console.error("DYNAMODB_TABLE_NAME env var is required")
  process.exit(1)
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })

async function tableExists() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }))
    return true
  } catch {
    return false
  }
}

async function main() {
  if (await tableExists()) {
    console.log(`Table "${TABLE_NAME}" already exists — nothing to do.`)
    return
  }

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      BillingMode: "PAY_PER_REQUEST",
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

  console.log(`Table "${TABLE_NAME}" created successfully.`)
}

main().catch((e) => {
  console.error("Setup failed:", e.message)
  process.exit(1)
})
