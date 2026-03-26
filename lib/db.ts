/**
 * lib/db.ts — DynamoDB via @aws-sdk + OIDC (@vercel/functions/oidc)
 *
 * Single-table design:
 *   PK               SK                     Purpose
 *   USER#{userId}    META                   User profile & plan info
 *   USER#{userId}    USAGE#{date}           Daily usage counters
 *   USER#{userId}    CHAT#{ts}#{id}         Conversation record
 *   ANALYTICS        GLOBAL                 Global counters
 *   ANALYTICS        PLAN_COUNTS            Per-plan subscriber counts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb"
import { awsCredentialsProvider } from "@vercel/functions/oidc"

// ─── Client (lazy singleton) ─────────────────────────────────────────────────
let _client: DynamoDBDocumentClient | null = null

function getClient(): DynamoDBDocumentClient {
  if (_client) return _client
  const raw = new DynamoDBClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
    }),
  })
  _client = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  })
  return _client
}

const TABLE = () => process.env.DYNAMODB_TABLE_NAME!

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserMeta {
  userId: string
  plan: "free" | "startup" | "pro" | "vip"
  planExpiresAt?: string
  theme?: string
  createdAt: string
  updatedAt: string
}

export interface DailyUsage {
  userId: string
  date: string
  messages: number
  images: number
  animated_videos: number
  voice_minutes: number
}

export interface ConversationItem {
  id: string
  SK: string
  userId: string
  title: string
  date: string
  createdAt: string
  messages: Array<{
    role: "user" | "assistant"
    content: string
    timestamp: number
    imageUrl?: string
    videoUrl?: string
  }>
}

export interface AnalyticsGlobal {
  totalMessages: number
  totalImages: number
  totalVideos: number
  totalVoiceMinutes: number
  totalUsers: number
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function todayEgypt(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }))
    .toISOString()
    .slice(0, 10)
}
export function monthEgypt(): string {
  return todayEgypt().slice(0, 7)
}

// ─── User Meta ────────────────────────────────────────────────────────────────
export async function getUserMeta(userId: string): Promise<UserMeta | null> {
  const db = getClient()
  const res = await db.send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: "META" },
    })
  )
  return (res.Item as UserMeta) ?? null
}

export async function ensureUserMeta(userId: string): Promise<UserMeta> {
  const existing = await getUserMeta(userId)
  if (existing) return existing

  const now = new Date().toISOString()
  const meta: UserMeta = {
    userId,
    plan: "free",
    theme: "dark",
    createdAt: now,
    updatedAt: now,
  }

  const db = getClient()
  await db.send(
    new PutCommand({
      TableName: TABLE(),
      Item: { PK: `USER#${userId}`, SK: "META", ...meta },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  ).catch(() => {/* already exists */})

  return meta
}

export async function getEffectivePlan(
  userId: string
): Promise<"free" | "startup" | "pro" | "vip"> {
  const meta = await getUserMeta(userId)
  if (!meta) return "free"
  if (meta.plan === "free") return "free"
  if (meta.planExpiresAt && new Date(meta.planExpiresAt) < new Date()) {
    const db = getClient()
    await db.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { PK: `USER#${userId}`, SK: "META" },
        UpdateExpression: "SET #plan = :free, updatedAt = :now",
        ExpressionAttributeNames: { "#plan": "plan" },
        ExpressionAttributeValues: { ":free": "free", ":now": new Date().toISOString() },
      })
    )
    return "free"
  }
  return meta.plan
}

export async function setUserSubscription(
  userId: string,
  plan: "free" | "startup" | "pro" | "vip",
  durationDays: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString()
  const db = getClient()
  // Ensure the item exists first
  await ensureUserMeta(userId)
  await db.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: "META" },
      UpdateExpression: "SET #plan = :plan, planExpiresAt = :exp, updatedAt = :now",
      ExpressionAttributeNames: { "#plan": "plan" },
      ExpressionAttributeValues: {
        ":plan": plan,
        ":exp": expiresAt,
        ":now": new Date().toISOString(),
      },
    })
  )
}

// ─── Daily Usage ──────────────────────────────────────────────────────────────
export async function getDailyUsage(userId: string, date: string): Promise<DailyUsage> {
  const db = getClient()
  const res = await db.send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: `USAGE#${date}` },
    })
  )
  return (res.Item as DailyUsage) ?? {
    userId,
    date,
    messages: 0,
    images: 0,
    animated_videos: 0,
    voice_minutes: 0,
  }
}

export async function incrementDailyUsage(
  userId: string,
  date: string,
  field: "messages" | "images" | "animated_videos" | "voice_minutes",
  amount = 1
): Promise<void> {
  const db = getClient()
  await db.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: `USAGE#${date}` },
      UpdateExpression:
        "SET #f = if_not_exists(#f, :zero) + :amount, userId = :uid, #date = :date",
      ExpressionAttributeNames: { "#f": field, "#date": "date" },
      ExpressionAttributeValues: {
        ":zero": 0,
        ":amount": amount,
        ":uid": userId,
        ":date": date,
      },
    })
  )
}

// ─── Conversations ────────────────────────────────────────────────────────────
export async function getConversations(
  userId: string,
  limit = 100
): Promise<ConversationItem[]> {
  const db = getClient()
  const res = await db.send(
    new QueryCommand({
      TableName: TABLE(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": "CHAT#",
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  )
  return (res.Items ?? []) as ConversationItem[]
}

export async function saveConversation(data: {
  userId: string
  title: string
  date: string
  messages: ConversationItem["messages"]
}): Promise<string> {
  const ts = Date.now()
  const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`
  const SK = `CHAT#${ts}#${id}`
  const db = getClient()

  await db.send(
    new PutCommand({
      TableName: TABLE(),
      Item: {
        PK: `USER#${data.userId}`,
        SK,
        id,
        userId: data.userId,
        title: data.title,
        date: data.date,
        createdAt: new Date().toISOString(),
        messages: data.messages,
      },
    })
  )
  return id
}

export async function updateConversationMessages(
  userId: string,
  SK: string,
  messages: ConversationItem["messages"]
): Promise<void> {
  const db = getClient()
  await db.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK },
      UpdateExpression: "SET messages = :msgs, updatedAt = :now",
      ExpressionAttributeValues: {
        ":msgs": messages,
        ":now": new Date().toISOString(),
      },
    })
  )
}

export async function deleteConversation(userId: string, SK: string): Promise<void> {
  const db = getClient()
  await db.send(
    new DeleteCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK },
    })
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalytics(): Promise<AnalyticsGlobal> {
  const db = getClient()
  const res = await db.send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "GLOBAL" },
    })
  )
  return (res.Item as AnalyticsGlobal) ?? {
    totalMessages: 0,
    totalImages: 0,
    totalVideos: 0,
    totalVoiceMinutes: 0,
    totalUsers: 0,
  }
}

export async function incrementAnalytics(
  field: keyof AnalyticsGlobal,
  amount = 1
): Promise<void> {
  const db = getClient()
  await db.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "GLOBAL" },
      UpdateExpression: "SET #f = if_not_exists(#f, :zero) + :amount",
      ExpressionAttributeNames: { "#f": field as string },
      ExpressionAttributeValues: { ":zero": 0, ":amount": amount },
    })
  )
}

export async function countUsersByPlan(): Promise<Record<string, number>> {
  const db = getClient()
  const res = await db.send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "PLAN_COUNTS" },
    })
  )
  return (res.Item as Record<string, number>) ?? {}
}

export async function incrementPlanCount(plan: string, delta: number): Promise<void> {
  const db = getClient()
  await db.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "PLAN_COUNTS" },
      UpdateExpression: "SET #plan = if_not_exists(#plan, :zero) + :delta",
      ExpressionAttributeNames: { "#plan": plan },
      ExpressionAttributeValues: { ":zero": 0, ":delta": delta },
    })
  )
}

// ─── Scan helpers (for /data analytics page) ─────────────────────────────────
export async function scanAllUsers(): Promise<UserMeta[]> {
  const db = getClient()
  const results: UserMeta[] = []
  let lastKey: Record<string, any> | undefined

  do {
    const res = await db.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "SK = :meta",
        ExpressionAttributeValues: { ":meta": "META" },
        ExclusiveStartKey: lastKey,
      })
    )
    results.push(...((res.Items ?? []) as UserMeta[]))
    lastKey = res.LastEvaluatedKey as Record<string, any> | undefined
  } while (lastKey)

  return results
}

export async function scanRecentChats(sinceDaysAgo: number): Promise<ConversationItem[]> {
  const since = new Date(Date.now() - sinceDaysAgo * 86_400_000).toISOString()
  const db = getClient()
  const results: ConversationItem[] = []
  let lastKey: Record<string, any> | undefined

  do {
    const res = await db.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "begins_with(SK, :prefix) AND createdAt >= :since",
        ExpressionAttributeValues: {
          ":prefix": "CHAT#",
          ":since": since,
        },
        ExclusiveStartKey: lastKey,
      })
    )
    results.push(...((res.Items ?? []) as ConversationItem[]))
    lastKey = res.LastEvaluatedKey as Record<string, any> | undefined
  } while (lastKey)

  return results
}
