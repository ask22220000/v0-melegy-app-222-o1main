import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getDailyUsage,
  getMonthlyUsage,
  getEffectivePlan,
  getUserMeta,
  ensureUserMeta,
  todayEgypt,
  monthEgypt,
} from "@/lib/db"
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { awsCredentialsProvider } from "@vercel/functions/oidc"

export const runtime = "nodejs"

function getUserId(request: NextRequest): string {
  // Try header first (set by frontend), fall back to IP
  const uid = request.headers.get("x-user-id")
  if (uid) return uid
  const fwd = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
  return fwd || request.headers.get("x-real-ip") || "unknown"
}

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

// GET /api/usage — return today's usage for the calling user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const today = todayEgypt()
    const month = monthEgypt()

    const [daily, monthly, plan] = await Promise.all([
      getDailyUsage(userId, today),
      getMonthlyUsage(userId, month),
      getEffectivePlan(userId),
    ])

    const meta = await getUserMeta(userId)

    return NextResponse.json({
      usage: {
        messages: daily.messages,
        images: daily.images,
        animated_videos: daily.animated_videos,
        voice_minutes: daily.voice_minutes,
        monthly_words: monthly.monthly_words,
        monthly_images: monthly.monthly_images,
        theme: meta?.theme ?? "dark",
        plan,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/usage — update specific usage fields
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const today = todayEgypt()
    const month = monthEgypt()
    const TABLE = process.env.DYNAMODB_TABLE_NAME!
    const db = getDocClient()

    await ensureUserMeta(userId)

    // Update daily usage fields
    const dailyFields: [string, number][] = []
    if (body.messages !== undefined)        dailyFields.push(["messages", body.messages])
    if (body.images !== undefined)          dailyFields.push(["images", body.images])
    if (body.animated_videos !== undefined) dailyFields.push(["animated_videos", body.animated_videos])
    if (body.voice_minutes !== undefined)   dailyFields.push(["voice_minutes", body.voice_minutes])

    if (dailyFields.length > 0) {
      const setParts = dailyFields.map(([f]) => `#${f} = :${f}`)
      const names: Record<string, string> = {}
      const vals: Record<string, any> = { ":uid": userId, ":date": today }
      for (const [f, v] of dailyFields) { names[`#${f}`] = f; vals[`:${f}`] = v }

      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USER#${userId}`, SK: `USAGE#${today}` },
        UpdateExpression: `SET ${setParts.join(", ")}, userId = :uid, #date = :date`,
        ExpressionAttributeNames: { ...names, "#date": "date" },
        ExpressionAttributeValues: vals,
      }))
    }

    // Update monthly usage fields
    const monthlyFields: [string, number][] = []
    if (body.monthly_words !== undefined)  monthlyFields.push(["monthly_words", body.monthly_words])
    if (body.monthly_images !== undefined) monthlyFields.push(["monthly_images", body.monthly_images])

    if (monthlyFields.length > 0) {
      const setParts = monthlyFields.map(([f]) => `#${f} = :${f}`)
      const names: Record<string, string> = {}
      const vals: Record<string, any> = { ":uid": userId, ":ym": month }
      for (const [f, v] of monthlyFields) { names[`#${f}`] = f; vals[`:${f}`] = v }

      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USER#${userId}`, SK: `USAGE_MONTHLY#${month}` },
        UpdateExpression: `SET ${setParts.join(", ")}, userId = :uid, yearMonth = :ym`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: vals,
      }))
    }

    // Update theme if provided
    if (body.theme !== undefined) {
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USER#${userId}`, SK: "META" },
        UpdateExpression: "SET theme = :t, updatedAt = :now",
        ExpressionAttributeValues: { ":t": body.theme, ":now": new Date().toISOString() },
      }))
    }

    // Re-read updated values
    const [daily, monthly, plan] = await Promise.all([
      getDailyUsage(userId, today),
      getMonthlyUsage(userId, month),
      getEffectivePlan(userId),
    ])
    const meta = await getUserMeta(userId)

    return NextResponse.json({
      usage: {
        messages: daily.messages,
        images: daily.images,
        animated_videos: daily.animated_videos,
        voice_minutes: daily.voice_minutes,
        monthly_words: monthly.monthly_words,
        monthly_images: monthly.monthly_images,
        theme: meta?.theme ?? "dark",
        plan,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
