/**
 * lib/db.ts — DynamoDB client + all CRUD operations
 * Uses AWS IAM auth via @vercel/functions/oidc (zero API keys needed)
 *
 * Tables used (all in the single DYNAMODB_TABLE_NAME with a GSI):
 *   PK=USER#{userId}   SK=META              → user profile + subscription
 *   PK=USER#{userId}   SK=USAGE#{date}      → daily usage counters
 *   PK=USER#{userId}   SK=CHAT#{timestamp}#{id} → conversation
 *   PK=USER#{userId}   SK=USAGE_MONTHLY#{year-month} → monthly word usage
 *   PK=ANALYTICS       SK=GLOBAL            → aggregate analytics
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
let _docClient: DynamoDBDocumentClient | null = null

function getDocClient(): DynamoDBDocumentClient {
  if (_docClient) return _docClient

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION!,
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: process.env.AWS_REGION },
    }),
  })

  _docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  })

  return _docClient
}

const TABLE = () => process.env.DYNAMODB_TABLE_NAME!

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserMeta {
  userId: string
  plan: "free" | "startup" | "pro" | "vip"
  planExpiresAt?: string     // ISO date string — subscription expiry
  subscribedAt?: string      // ISO date string
  theme?: string
  createdAt: string
  updatedAt: string
}

export interface DailyUsage {
  userId: string
  date: string               // YYYY-MM-DD (Cairo)
  messages: number
  images: number
  animated_videos: number
  voice_minutes: number
}

export interface MonthlyUsage {
  userId: string
  yearMonth: string          // YYYY-MM
  monthly_words: number
  monthly_images: number
}

export interface Conversation {
  id: string                 // nanoid
  userId: string
  title: string
  date: string               // YYYY-MM-DD
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: number
}

export interface AnalyticsGlobal {
  totalUsers: number
  totalConversations: number
  totalMessages: number
  totalImages: number
  totalVideos: number
  totalVoiceMinutes: number
  subscriptionsByPlan: { free: number; startup: number; pro: number; vip: number }
  featureUsage: {
    textGeneration: number
    imageGeneration: number
    videoGeneration: number
    deepSearch: number
    ideaToPrompt: number
    voiceCloning: number
  }
  updatedAt: string
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function todayEgypt(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }) // YYYY-MM-DD
}
export function monthEgypt(): string {
  return todayEgypt().slice(0, 7) // YYYY-MM
}

// ─── User Meta ────────────────────────────────────────────────────────────────
export async function getUserMeta(userId: string): Promise<UserMeta | null> {
  const res = await getDocClient().send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: "META" },
    })
  )
  if (!res.Item) return null
  return res.Item as unknown as UserMeta
}

export async function putUserMeta(meta: UserMeta): Promise<void> {
  await getDocClient().send(
    new PutCommand({
      TableName: TABLE(),
      Item: {
        PK: `USER#${meta.userId}`,
        SK: "META",
        ...meta,
        updatedAt: new Date().toISOString(),
      },
    })
  )
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
  await putUserMeta(meta)
  return meta
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export async function setUserSubscription(
  userId: string,
  plan: "free" | "startup" | "pro" | "vip",
  expiryDays = 30
): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: "META" },
      UpdateExpression:
        "SET #plan = :plan, planExpiresAt = :exp, subscribedAt = :sub, updatedAt = :now",
      ExpressionAttributeNames: { "#plan": "plan" },
      ExpressionAttributeValues: {
        ":plan": plan,
        ":exp": expiresAt,
        ":sub": now.toISOString(),
        ":now": now.toISOString(),
      },
    })
  )
}

export async function getEffectivePlan(
  userId: string
): Promise<"free" | "startup" | "pro" | "vip"> {
  const meta = await getUserMeta(userId)
  if (!meta) return "free"
  if (!meta.planExpiresAt) return meta.plan
  if (new Date(meta.planExpiresAt).getTime() > Date.now()) return meta.plan
  // Expired — reset to free
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${meta.userId}`, SK: "META" },
      UpdateExpression: "SET #plan = :free, updatedAt = :now",
      ExpressionAttributeNames: { "#plan": "plan" },
      ExpressionAttributeValues: { ":free": "free", ":now": new Date().toISOString() },
    })
  )
  return "free"
}

// ─── Daily Usage ──────────────────────────────────────────────────────────────
export async function getDailyUsage(userId: string, date?: string): Promise<DailyUsage> {
  const d = date ?? todayEgypt()
  const res = await getDocClient().send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: `USAGE#${d}` },
    })
  )
  if (res.Item) return res.Item as unknown as DailyUsage
  return { userId, date: d, messages: 0, images: 0, animated_videos: 0, voice_minutes: 0 }
}

export async function incrementUsageField(
  userId: string,
  field: keyof Omit<DailyUsage, "userId" | "date">,
  amount = 1
): Promise<void> {
  const date = todayEgypt()
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: `USAGE#${date}` },
      UpdateExpression: `SET #f = if_not_exists(#f, :zero) + :inc, userId = :uid, #date = :date`,
      ExpressionAttributeNames: { "#f": field, "#date": "date" },
      ExpressionAttributeValues: {
        ":inc": amount,
        ":zero": 0,
        ":uid": userId,
        ":date": date,
      },
    })
  )
}

// ─── Monthly Usage ────────────────────────────────────────────────────────────
export async function getMonthlyUsage(userId: string, yearMonth?: string): Promise<MonthlyUsage> {
  const ym = yearMonth ?? monthEgypt()
  const res = await getDocClient().send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: `USAGE_MONTHLY#${ym}` },
    })
  )
  if (res.Item) return res.Item as unknown as MonthlyUsage
  return { userId, yearMonth: ym, monthly_words: 0, monthly_images: 0 }
}

export async function incrementMonthlyWords(userId: string, words: number): Promise<void> {
  const ym = monthEgypt()
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: `USAGE_MONTHLY#${ym}` },
      UpdateExpression: `SET monthly_words = if_not_exists(monthly_words, :zero) + :inc, userId = :uid, yearMonth = :ym`,
      ExpressionAttributeValues: { ":inc": words, ":zero": 0, ":uid": userId, ":ym": ym },
    })
  )
}

export async function incrementMonthlyImages(userId: string): Promise<void> {
  const ym = monthEgypt()
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: `USAGE_MONTHLY#${ym}` },
      UpdateExpression: `SET monthly_images = if_not_exists(monthly_images, :zero) + :inc, userId = :uid, yearMonth = :ym`,
      ExpressionAttributeValues: { ":inc": 1, ":zero": 0, ":uid": userId, ":ym": ym },
    })
  )
}

// ─── Conversations ────────────────────────────────────────────────────────────
export async function getConversations(userId: string, limit = 50): Promise<Conversation[]> {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": "CHAT#",
      },
      ScanIndexForward: false, // newest first
      Limit: limit,
    })
  )
  return (res.Items ?? []) as unknown as Conversation[]
}

export async function saveConversation(conv: Omit<Conversation, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<string> {
  const id = conv.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  const ts = now.replace(/[:.]/g, "-")

  await getDocClient().send(
    new PutCommand({
      TableName: TABLE(),
      Item: {
        PK: `USER#${conv.userId}`,
        SK: `CHAT#${ts}#${id}`,
        id,
        userId: conv.userId,
        title: conv.title,
        date: conv.date,
        messages: conv.messages,
        createdAt: now,
        updatedAt: now,
      },
    })
  )
  return id
}

export async function updateConversationMessages(
  userId: string,
  conversationSK: string,
  messages: Message[]
): Promise<void> {
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: conversationSK },
      UpdateExpression: "SET messages = :msgs, updatedAt = :now",
      ExpressionAttributeValues: {
        ":msgs": messages,
        ":now": new Date().toISOString(),
      },
    })
  )
}

export async function deleteConversation(userId: string, conversationSK: string): Promise<void> {
  await getDocClient().send(
    new DeleteCommand({
      TableName: TABLE(),
      Key: { PK: `USER#${userId}`, SK: conversationSK },
    })
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalytics(): Promise<AnalyticsGlobal> {
  const res = await getDocClient().send(
    new GetCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "GLOBAL" },
    })
  )
  if (res.Item) return res.Item as unknown as AnalyticsGlobal

  // Default empty analytics
  return {
    totalUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalImages: 0,
    totalVideos: 0,
    totalVoiceMinutes: 0,
    subscriptionsByPlan: { free: 0, startup: 0, pro: 0, vip: 0 },
    featureUsage: {
      textGeneration: 0,
      imageGeneration: 0,
      videoGeneration: 0,
      deepSearch: 0,
      ideaToPrompt: 0,
      voiceCloning: 0,
    },
    updatedAt: new Date().toISOString(),
  }
}

export async function incrementAnalytics(
  field: keyof Pick<AnalyticsGlobal, "totalUsers" | "totalConversations" | "totalMessages" | "totalImages" | "totalVideos" | "totalVoiceMinutes">,
  amount = 1
): Promise<void> {
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "GLOBAL" },
      UpdateExpression: `SET #f = if_not_exists(#f, :zero) + :inc, updatedAt = :now`,
      ExpressionAttributeNames: { "#f": field },
      ExpressionAttributeValues: {
        ":inc": amount,
        ":zero": 0,
        ":now": new Date().toISOString(),
      },
    })
  )
}

export async function incrementFeatureAnalytics(
  feature: keyof AnalyticsGlobal["featureUsage"]
): Promise<void> {
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "GLOBAL" },
      UpdateExpression: `SET featureUsage.#f = if_not_exists(featureUsage.#f, :zero) + :inc, updatedAt = :now`,
      ExpressionAttributeNames: { "#f": feature },
      ExpressionAttributeValues: {
        ":inc": 1,
        ":zero": 0,
        ":now": new Date().toISOString(),
      },
    })
  )
}

export async function incrementPlanCount(
  plan: "free" | "startup" | "pro" | "vip",
  delta: number
): Promise<void> {
  await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: "ANALYTICS", SK: "GLOBAL" },
      UpdateExpression: `SET subscriptionsByPlan.#p = if_not_exists(subscriptionsByPlan.#p, :zero) + :d, updatedAt = :now`,
      ExpressionAttributeNames: { "#p": plan },
      ExpressionAttributeValues: {
        ":d": delta,
        ":zero": 0,
        ":now": new Date().toISOString(),
      },
    })
  )
}

// ─── Scan helpers (used for analytics aggregation) ────────────────────────────
export async function countUsersByPlan(): Promise<Record<string, number>> {
  const counts: Record<string, number> = { free: 0, startup: 0, pro: 0, vip: 0 }
  let lastKey: Record<string, any> | undefined

  do {
    const res = await getDocClient().send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "SK = :meta",
        ExpressionAttributeValues: { ":meta": "META" },
        ProjectionExpression: "#p, planExpiresAt",
        ExpressionAttributeNames: { "#p": "plan" },
        ExclusiveStartKey: lastKey,
      })
    )
    for (const item of res.Items ?? []) {
      const plan = item.plan ?? "free"
      const expired = item.planExpiresAt && new Date(item.planExpiresAt).getTime() < Date.now()
      counts[expired ? "free" : plan] = (counts[expired ? "free" : plan] ?? 0) + 1
    }
    lastKey = res.LastEvaluatedKey
  } while (lastKey)

  return counts
}
