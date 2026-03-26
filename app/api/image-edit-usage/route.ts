import { type NextRequest, NextResponse } from "next/server"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb"
import { awsCredentialsProvider } from "@vercel/functions/oidc"

export const runtime = "nodejs"

// Plan limits for image editing
const PLAN_LIMITS = {
  free:     3,  // 3 times total (trial)
  starter:  5,  // 5 times per month
  pro:     20,  // 20 times per month
  advanced: 50, // 50 times per month
}

const TOKENS_PER_PURCHASE   = 20
const EDITS_PER_TOKEN_PURCHASE = 25

function getDocClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION!,
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: process.env.AWS_REGION },
    }),
  })
  return DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })
}

const TABLE = () => process.env.DYNAMODB_TABLE_NAME!

function getMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`
}

function getCurrentMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

// Count items with SK beginning with a prefix (optionally since a date)
async function countFeatureItems(
  db: DynamoDBDocumentClient,
  userId: string,
  skPrefix: string,
  sinceISO?: string
): Promise<number> {
  let count = 0
  let lastKey: Record<string, any> | undefined

  do {
    const res = await db.send(
      new QueryCommand({
        TableName: TABLE(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        FilterExpression: sinceISO ? "#usedAt >= :since" : undefined,
        ExpressionAttributeNames: sinceISO ? { "#usedAt": "usedAt" } : undefined,
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":prefix": skPrefix,
          ...(sinceISO ? { ":since": sinceISO } : {}),
        },
        Select: "COUNT",
        ExclusiveStartKey: lastKey,
      })
    )
    count += res.Count ?? 0
    lastKey = res.LastEvaluatedKey
  } while (lastKey)

  return count
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get("visitorId")
    const planType  = searchParams.get("planType") || "free"

    if (!visitorId) {
      return NextResponse.json({ error: "visitorId required" }, { status: 400 })
    }

    const db    = getDocClient()
    const limit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || 3

    // Count this month's image edits
    const sinceMonth = planType !== "free" ? getMonthStart() : undefined
    const usageCount = await countFeatureItems(
      db, visitorId,
      `FEATURE#image_edit_${planType}#`,
      sinceMonth
    )

    const remaining = Math.max(0, limit - usageCount)

    // Count token purchases and token usages
    const [purchasedCount, usedTokenCount] = await Promise.all([
      countFeatureItems(db, visitorId, "FEATURE#token_purchase#"),
      countFeatureItems(db, visitorId, "FEATURE#token_used#"),
    ])

    const totalPurchased       = purchasedCount * TOKENS_PER_PURCHASE
    const availableTokens      = Math.max(0, totalPurchased - usedTokenCount)
    const tokenEditsRemaining  = Math.floor(availableTokens * (EDITS_PER_TOKEN_PURCHASE / TOKENS_PER_PURCHASE))

    return NextResponse.json({
      usageCount,
      limit,
      remaining,
      canUse:           remaining > 0 || tokenEditsRemaining > 0,
      planType,
      availableTokens,
      tokenEditsRemaining,
      isUsingTokens:    remaining <= 0 && tokenEditsRemaining > 0,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error"
    console.error("[image-edit-usage] GET error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body     = await request.json()
    const { visitorId, planType = "free", action } = body

    if (!visitorId) {
      return NextResponse.json({ error: "visitorId required" }, { status: 400 })
    }

    const db    = getDocClient()
    const limit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || 3
    const now   = new Date().toISOString()

    if (action === "increment") {
      const sinceMonth = planType !== "free" ? getMonthStart() : undefined
      const usageCount = await countFeatureItems(
        db, visitorId,
        `FEATURE#image_edit_${planType}#`,
        sinceMonth
      )

      if (usageCount >= limit) {
        // Try tokens
        const [purchasedCount, usedTokenCount] = await Promise.all([
          countFeatureItems(db, visitorId, "FEATURE#token_purchase#"),
          countFeatureItems(db, visitorId, "FEATURE#token_used#"),
        ])
        const availableTokens = purchasedCount * TOKENS_PER_PURCHASE - usedTokenCount

        if (availableTokens > 0) {
          await db.send(new PutCommand({
            TableName: TABLE(),
            Item: {
              PK: `USER#${visitorId}`,
              SK: `FEATURE#token_used#${now}`,
              usedAt: now,
            },
          }))
          return NextResponse.json({ success: true, usedTokens: true, newUsageCount: usageCount })
        }

        return NextResponse.json({ success: false, limitReached: true, usageCount, limit })
      }

      const month = getCurrentMonthYear()
      await db.send(new PutCommand({
        TableName: TABLE(),
        Item: {
          PK: `USER#${visitorId}`,
          SK: `FEATURE#image_edit_${planType}#${month}#${now}`,
          usedAt: now,
          planType,
        },
      }))

      return NextResponse.json({
        success: true,
        newUsageCount: usageCount + 1,
        remaining: limit - (usageCount + 1),
      })
    }

    if (action === "addTokens") {
      await db.send(new PutCommand({
        TableName: TABLE(),
        Item: {
          PK: `USER#${visitorId}`,
          SK: `FEATURE#token_purchase#${now}`,
          usedAt: now,
          tokens: TOKENS_PER_PURCHASE,
        },
      }))
      return NextResponse.json({
        success: true,
        tokensAdded: TOKENS_PER_PURCHASE,
        editsAdded:  EDITS_PER_TOKEN_PURCHASE,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error"
    console.error("[image-edit-usage] POST error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
