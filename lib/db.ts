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

const REGION = process.env.AWS_REGION ?? "us-east-1"
const TABLE  = process.env.DYNAMODB_TABLE_NAME ?? "melegy-app"

// ─── Client (lazy singleton) ─────────────────────────────────────────────────

let _docClient: DynamoDBDocumentClient | null = null

function getClient(): DynamoDBDocumentClient {
  if (_docClient) return _docClient
  const raw = new DynamoDBClient({
    region: REGION,
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: REGION },
    }),
  })
  _docClient = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  })
  return _docClient
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserMeta {
  userId:        string
  plan:          string
  planExpiresAt: string | null
  theme:         string
  createdAt:     string
  updatedAt:     string
}

export interface DailyUsage {
  messages:        number
  images:          number
  animated_videos: number
  voice_minutes:   number
  image_edits:     number
}

export interface ConversationItem {
  id:        string
  SK:        string
  userId:    string
  title:     string
  date:      string
  createdAt: string
  messages:  any[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayEgypt(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }))
    .toISOString().slice(0, 10)
}

export function monthEgypt(): string {
  return todayEgypt().slice(0, 7)
}

// ─── User Meta ────────────────────────────────────────────────────────────────

export async function getUserMeta(userId: string): Promise<UserMeta | null> {
  try {
    const res = await getClient().send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: "META" },
    }))
    if (!res.Item) return null
    return {
      userId:        res.Item.userId        ?? userId,
      plan:          res.Item.plan          ?? "free",
      planExpiresAt: res.Item.planExpiresAt ?? null,
      theme:         res.Item.theme         ?? "dark",
      createdAt:     res.Item.createdAt     ?? "",
      updatedAt:     res.Item.updatedAt     ?? "",
    }
  } catch { return null }
}

export async function ensureUserMeta(userId: string): Promise<void> {
  const existing = await getUserMeta(userId)
  if (existing) return
  await getClient().send(new PutCommand({
    TableName:           TABLE,
    Item:                { PK: `USER#${userId}`, SK: "META", userId, plan: "free", planExpiresAt: null, theme: "dark", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ConditionExpression: "attribute_not_exists(PK)",
  })).catch(() => {})
}

export async function upsertUserMeta(userId: string, fields: Partial<UserMeta>): Promise<void> {
  const sets: string[] = []
  const names: Record<string,string> = {}
  const vals: Record<string,any>    = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue
    sets.push(`#${k} = :${k}`)
    names[`#${k}`] = k
    vals[`:${k}`]  = v
  }
  if (!sets.length) return
  await getClient().send(new UpdateCommand({
    TableName:                 TABLE,
    Key:                       { PK: `USER#${userId}`, SK: "META" },
    UpdateExpression:          `SET ${sets.join(", ")}`,
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: vals,
  }))
}

// ─── Effective Plan ───────────────────────────────────────────────────────────

export async function getEffectivePlan(userId: string): Promise<string> {
  try {
    const meta = await getUserMeta(userId)
    if (!meta || meta.plan === "free") return "free"
    if (meta.planExpiresAt && new Date(meta.planExpiresAt) < new Date()) {
      await upsertUserMeta(userId, { plan: "free", planExpiresAt: null, updatedAt: new Date().toISOString() })
      return "free"
    }
    return meta.plan
  } catch { return "free" }
}

// ─── Daily Usage ──────────────────────────────────────────────────────────────

export async function getDailyUsage(userId: string, date: string): Promise<DailyUsage> {
  try {
    const res = await getClient().send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: `USAGE#${date}` },
    }))
    return {
      messages:        res.Item?.messages        ?? 0,
      images:          res.Item?.images          ?? 0,
      animated_videos: res.Item?.animated_videos ?? 0,
      voice_minutes:   res.Item?.voice_minutes   ?? 0,
      image_edits:     res.Item?.image_edits     ?? 0,
    }
  } catch { return { messages: 0, images: 0, animated_videos: 0, voice_minutes: 0, image_edits: 0 } }
}

export async function incrementDailyUsage(
  userId: string,
  field: keyof DailyUsage,
  amount = 1,
  date   = todayEgypt(),
): Promise<void> {
  try {
    await getClient().send(new UpdateCommand({
      TableName:                 TABLE,
      Key:                       { PK: `USER#${userId}`, SK: `USAGE#${date}` },
      UpdateExpression:          "SET #f = if_not_exists(#f, :z) + :a, userId = :uid",
      ExpressionAttributeNames:  { "#f": field },
      ExpressionAttributeValues: { ":z": 0, ":a": amount, ":uid": userId },
    }))
  } catch {}
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function setUserSubscription(userId: string, plan: string, durationDays: number): Promise<void> {
  await ensureUserMeta(userId)
  const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString()
  await upsertUserMeta(userId, { plan, planExpiresAt: expiresAt, updatedAt: new Date().toISOString() })
}

export async function incrementPlanCount(plan: string, amount = 1): Promise<void> {
  try {
    await getClient().send(new UpdateCommand({
      TableName:                 TABLE,
      Key:                       { PK: "GLOBAL#STATS", SK: `PLAN#${plan}` },
      UpdateExpression:          "SET #cnt = if_not_exists(#cnt, :z) + :a",
      ExpressionAttributeNames:  { "#cnt": "count" },
      ExpressionAttributeValues: { ":z": 0, ":a": amount },
    }))
  } catch {}
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function saveConversation(
  userId: string,
  id: string,
  title: string,
  messages: any[],
): Promise<void> {
  const now = new Date().toISOString()
  const ts  = now
  await getClient().send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK:        `USER#${userId}`,
      SK:        `CHAT#${ts}#${id}`,
      id, userId, title,
      messages:  JSON.stringify(messages),
      date:      todayEgypt(),
      createdAt: now,
    },
  }))
}

export async function getUserConversations(userId: string): Promise<ConversationItem[]> {
  try {
    const res = await getClient().send(new QueryCommand({
      TableName:                 TABLE,
      KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "CHAT#" },
      ScanIndexForward:          false,
    }))
    return (res.Items ?? []).map(item => ({
      id:        item.id        ?? "",
      SK:        item.SK        ?? "",
      userId:    item.userId    ?? userId,
      title:     item.title     ?? "",
      date:      item.date      ?? "",
      createdAt: item.createdAt ?? "",
      messages:  (() => { try { return JSON.parse(item.messages ?? "[]") } catch { return [] } })(),
    }))
  } catch { return [] }
}

export async function deleteConversation(userId: string, sk: string): Promise<void> {
  await getClient().send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: sk },
  }))
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsGlobal {
  totalMessages:     number
  totalImages:       number
  totalVideos:       number
  totalVoiceMinutes: number
  totalUsers:        number
  totalChats:        number
  planCounts:        Record<string, number>
  recentUsage:       Array<{ userId: string; date: string; requests: number }>
}

export async function getAnalytics(): Promise<AnalyticsGlobal> {
  try {
    let items: any[] = []
    let lastKey: any = undefined
    do {
      const res = await getClient().send(new ScanCommand({
        TableName:         TABLE,
        ExclusiveStartKey: lastKey,
      }))
      items   = items.concat(res.Items ?? [])
      lastKey = res.LastEvaluatedKey
    } while (lastKey)

    const metaItems  = items.filter(i => i.SK === "META")
    const chatItems  = items.filter(i => typeof i.SK === "string" && i.SK.startsWith("CHAT#"))
    const usageItems = items.filter(i => typeof i.SK === "string" && i.SK.startsWith("USAGE#"))

    const planCounts: Record<string, number> = {}
    for (const m of metaItems) {
      const p = m.plan ?? "free"
      planCounts[p] = (planCounts[p] ?? 0) + 1
    }

    let totalMessages = 0, totalImages = 0, totalVideos = 0, totalVoiceMinutes = 0
    for (const u of usageItems) {
      totalMessages     += Number(u.messages        ?? 0)
      totalImages       += Number(u.images          ?? 0)
      totalVideos       += Number(u.animated_videos ?? 0)
      totalVoiceMinutes += Number(u.voice_minutes   ?? 0)
    }

    const recentUsage = usageItems
      .sort((a, b) => (b.SK > a.SK ? 1 : -1))
      .slice(0, 20)
      .map(u => ({
        userId:   String(u.PK ?? "").replace("USER#", ""),
        date:     String(u.SK ?? "").replace("USAGE#", ""),
        requests: Number(u.messages ?? 0) + Number(u.images ?? 0) + Number(u.voice_minutes ?? 0),
      }))

    return { totalMessages, totalImages, totalVideos, totalVoiceMinutes, totalUsers: metaItems.length, totalChats: chatItems.length, planCounts, recentUsage }
  } catch {
    return { totalMessages: 0, totalImages: 0, totalVideos: 0, totalVoiceMinutes: 0, totalUsers: 0, totalChats: 0, planCounts: {}, recentUsage: [] }
  }
}

export async function countUsersByPlan(): Promise<Record<string, number>> {
  const { planCounts } = await getAnalytics()
  return planCounts
}

export async function scanAllUsers(): Promise<UserMeta[]> {
  try {
    const res = await getClient().send(new ScanCommand({
      TableName:        TABLE,
      FilterExpression: "SK = :meta",
      ExpressionAttributeValues: { ":meta": "META" },
    }))
    return (res.Items ?? []).map(u => ({
      userId:        u.userId        ?? String(u.PK ?? "").replace("USER#", ""),
      plan:          u.plan          ?? "free",
      planExpiresAt: u.planExpiresAt ?? null,
      theme:         u.theme         ?? "dark",
      createdAt:     u.createdAt     ?? "",
      updatedAt:     u.updatedAt     ?? "",
    }))
  } catch { return [] }
}

export async function scanRecentChats(sinceDaysAgo: number): Promise<ConversationItem[]> {
  try {
    const since = new Date(Date.now() - sinceDaysAgo * 86_400_000).toISOString()
    const res = await getClient().send(new ScanCommand({
      TableName:                 TABLE,
      FilterExpression:          "begins_with(SK, :prefix) AND createdAt >= :since",
      ExpressionAttributeValues: { ":prefix": "CHAT#", ":since": since },
    }))
    return (res.Items ?? []).map(u => ({
      id:        u.id        ?? "",
      SK:        u.SK        ?? "",
      userId:    u.userId    ?? "",
      title:     u.title     ?? "",
      date:      u.date      ?? "",
      createdAt: u.createdAt ?? "",
      messages:  (() => { try { return JSON.parse(u.messages ?? "[]") } catch { return [] } })(),
    }))
  } catch { return [] }
}
