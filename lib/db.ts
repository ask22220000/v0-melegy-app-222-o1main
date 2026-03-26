// @v0-recompile-2026-03-26
/**
 * lib/db.ts — DynamoDB using ONLY Node.js built-ins (crypto + fetch).
 * Zero external packages. AWS Signature V4 implemented manually.
 *
 * Single-table design:
 *   PK=USER#{userId}  SK=META              → user plan & subscription
 *   PK=USER#{userId}  SK=USAGE#{date}      → daily usage counters
 *   PK=USER#{userId}  SK=CHAT#{ts}#{id}    → conversation record
 */
import { createHmac, createHash } from "crypto"

const REGION = process.env.AWS_REGION ?? "us-east-1"
const TABLE  = process.env.DYNAMODB_TABLE_NAME ?? "melegy-app"

// ─── AWS SigV4 ───────────────────────────────────────────────────────────────

function sha256hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex")
}
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest()
}
function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmacSha256(hmacSha256(hmacSha256(hmacSha256("AWS4" + secret, date), region), service), "aws4_request")
}

async function getCredentials(): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string }> {
  // 1. Static keys (local dev / CI)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken:    process.env.AWS_SESSION_TOKEN,
    }
  }
  // 2. ECS task-role / Vercel DynamoDB OIDC
  const relUri = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
  if (relUri) {
    const r = await fetch(`http://169.254.170.2${relUri}`)
    const j = await r.json() as any
    return { accessKeyId: j.AccessKeyId, secretAccessKey: j.SecretAccessKey, sessionToken: j.Token }
  }
  const fullUri = process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI
  if (fullUri) {
    const token = process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN ?? ""
    const r = await fetch(fullUri, { headers: token ? { Authorization: token } : {} })
    const j = await r.json() as any
    return { accessKeyId: j.AccessKeyId, secretAccessKey: j.SecretAccessKey, sessionToken: j.Token }
  }
  throw new Error("No AWS credentials found. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or use Vercel DynamoDB integration.")
}

async function dynamoRequest(action: string, body: object): Promise<any> {
  const creds      = await getCredentials()
  const host       = `dynamodb.${REGION}.amazonaws.com`
  const endpoint   = `https://${host}`
  const now        = new Date()
  const amzDate    = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z"
  const dateStamp  = amzDate.slice(0, 8)
  const bodyStr    = JSON.stringify(body)
  const bodyHash   = sha256hex(bodyStr)

  const hdrMap: Record<string, string> = {
    "content-type":  "application/x-amz-json-1.0",
    "host":          host,
    "x-amz-date":    amzDate,
    "x-amz-target":  `DynamoDB_20120810.${action}`,
  }
  if (creds.sessionToken) hdrMap["x-amz-security-token"] = creds.sessionToken

  const signedKeys     = Object.keys(hdrMap).sort()
  const signedHeaders  = signedKeys.join(";")
  const canonHeaders   = signedKeys.map(k => `${k}:${hdrMap[k]}\n`).join("")
  const canonRequest   = `POST\n/\n\n${canonHeaders}\n${signedHeaders}\n${bodyHash}`
  const credScope      = `${dateStamp}/${REGION}/dynamodb/aws4_request`
  const stringToSign   = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${sha256hex(canonRequest)}`
  const sig            = hmacSha256(signingKey(creds.secretAccessKey, dateStamp, REGION, "dynamodb"), stringToSign).toString("hex")
  const authorization  = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`

  const res = await fetch(endpoint, {
    method:  "POST",
    headers: { ...hdrMap, Authorization: authorization },
    body:    bodyStr,
  })
  const text = await res.text()
  if (!res.ok) {
    let err: any = {}
    try { err = JSON.parse(text) } catch {}
    if (err.__type?.includes("ResourceInUseException")) return {}
    throw new Error(`DynamoDB ${action} error (${res.status}): ${text}`)
  }
  return text ? JSON.parse(text) : {}
}

// ─── Marshalling ─────────────────────────────────────────────────────────────

function m(v: any): any {
  if (v === null || v === undefined)    return { NULL: true }
  if (typeof v === "string")            return { S: v }
  if (typeof v === "number")            return { N: String(v) }
  if (typeof v === "boolean")           return { BOOL: v }
  if (Array.isArray(v) || typeof v === "object") return { S: JSON.stringify(v) }
  return { S: String(v) }
}
function marshal(obj: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) r[k] = m(v)
  }
  return r
}
function unmarshal(item: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(item)) {
    if      ("S"    in v) r[k] = v.S
    else if ("N"    in v) r[k] = Number(v.N)
    else if ("BOOL" in v) r[k] = v.BOOL
    else if ("NULL" in v) r[k] = null
  }
  return r
}
function unmarshalList(items: any[]): any[] {
  return (items ?? []).map(unmarshal)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayEgypt(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }))
    .toISOString().slice(0, 10)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserMeta {
  userId:         string
  plan:           string
  planExpiresAt?: string | null
  theme?:         string
  createdAt:      string
  updatedAt:      string
}

export interface DailyUsage {
  messages:        number
  images:          number
  animated_videos: number
  voice_minutes:   number
  image_edits:     number
  plan:            string
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

// ─── User Meta ────────────────────────────────────────────────────────────────

export async function getUserMeta(userId: string): Promise<UserMeta | null> {
  try {
    const res = await dynamoRequest("GetItem", {
      TableName: TABLE,
      Key: { PK: { S: `USER#${userId}` }, SK: { S: "META" } },
    })
    if (!res.Item) return null
    const u = unmarshal(res.Item)
    return {
      userId:         u.userId        ?? userId,
      plan:           u.plan          ?? "free",
      planExpiresAt:  u.planExpiresAt ?? null,
      theme:          u.theme         ?? "dark",
      createdAt:      u.createdAt     ?? new Date().toISOString(),
      updatedAt:      u.updatedAt     ?? new Date().toISOString(),
    }
  } catch { return null }
}

export async function ensureUserMeta(userId: string): Promise<UserMeta> {
  const existing = await getUserMeta(userId)
  if (existing) return existing
  const now = new Date().toISOString()
  const meta: UserMeta = { userId, plan: "free", theme: "dark", createdAt: now, updatedAt: now }
  try {
    await dynamoRequest("PutItem", {
      TableName:           TABLE,
      Item:                marshal({ PK: `USER#${userId}`, SK: "META", ...meta }),
      ConditionExpression: "attribute_not_exists(PK)",
    })
  } catch {}
  return meta
}

export async function getEffectivePlan(userId: string): Promise<string> {
  try {
    const meta = await getUserMeta(userId)
    if (!meta) return "free"
    if (meta.plan !== "free" && meta.planExpiresAt && new Date(meta.planExpiresAt) < new Date()) {
      await upsertUserMeta(userId, { plan: "free", planExpiresAt: null })
      return "free"
    }
    return meta.plan ?? "free"
  } catch { return "free" }
}

export async function upsertUserMeta(userId: string, updates: Partial<Omit<UserMeta, "userId">>): Promise<void> {
  try {
    const sets:   string[]                    = []
    const names:  Record<string, string>      = {}
    const values: Record<string, any>         = {}
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) continue
      sets.push(`#${k} = :${k}`)
      names[`#${k}`] = k
      values[`:${k}`] = m(v)
    }
    if (sets.length === 0) return
    await dynamoRequest("UpdateItem", {
      TableName:                TABLE,
      Key:                      { PK: { S: `USER#${userId}` }, SK: { S: "META" } },
      UpdateExpression:         `SET ${sets.join(", ")}`,
      ExpressionAttributeNames:  names,
      ExpressionAttributeValues: values,
    })
  } catch {}
}

export async function setUserSubscription(userId: string, plan: string, durationDays: number): Promise<void> {
  await ensureUserMeta(userId)
  const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString()
  await upsertUserMeta(userId, { plan, planExpiresAt: expiresAt, updatedAt: new Date().toISOString() })
}

// ─── Daily Usage ──────────────────────────────────────────────────────────────

export async function getDailyUsage(userId: string, date: string): Promise<DailyUsage> {
  try {
    const res = await dynamoRequest("GetItem", {
      TableName: TABLE,
      Key: { PK: { S: `USER#${userId}` }, SK: { S: `USAGE#${date}` } },
    })
    if (!res.Item) return { messages: 0, images: 0, animated_videos: 0, voice_minutes: 0, image_edits: 0, plan: "free" }
    const u = unmarshal(res.Item)
    return {
      messages:        Number(u.messages        ?? 0),
      images:          Number(u.images          ?? 0),
      animated_videos: Number(u.animated_videos ?? 0),
      voice_minutes:   Number(u.voice_minutes   ?? 0),
      image_edits:     Number(u.image_edits     ?? 0),
      plan:            u.plan ?? "free",
    }
  } catch { return { messages: 0, images: 0, animated_videos: 0, voice_minutes: 0, image_edits: 0, plan: "free" } }
}

export async function incrementDailyUsage(
  userId: string,
  date: string,
  field: keyof Omit<DailyUsage, "plan">,
  amount = 1
): Promise<void> {
  try {
    await dynamoRequest("UpdateItem", {
      TableName:                TABLE,
      Key:                      { PK: { S: `USER#${userId}` }, SK: { S: `USAGE#${date}` } },
      UpdateExpression:         "SET #f = if_not_exists(#f, :z) + :a, userId = :uid, #date = :date",
      ExpressionAttributeNames:  { "#f": field, "#date": "date" },
      ExpressionAttributeValues: {
        ":z":    { N: "0" },
        ":a":    { N: String(amount) },
        ":uid":  { S: userId },
        ":date": { S: date },
      },
    })
  } catch {}
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function getConversations(userId: string, limit = 100): Promise<ConversationItem[]> {
  try {
    const res = await dynamoRequest("Query", {
      TableName:                TABLE,
      KeyConditionExpression:   "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk":     { S: `USER#${userId}` },
        ":prefix": { S: "CHAT#" },
      },
      ScanIndexForward: false,
      Limit:            limit,
    })
    return unmarshalList(res.Items ?? []).map(u => ({
      id:        u.id        ?? "",
      SK:        u.SK        ?? "",
      userId:    u.userId    ?? userId,
      title:     u.title     ?? "محادثة جديدة",
      date:      u.date      ?? "",
      createdAt: u.createdAt ?? "",
      messages:  (() => { try { return Array.isArray(u.messages) ? u.messages : JSON.parse(u.messages ?? "[]") } catch { return [] } })(),
    }))
  } catch { return [] }
}

export async function saveConversation(data: {
  userId: string
  title: string
  date: string
  messages: any[]
}): Promise<string> {
  const ts = Date.now()
  const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`
  const SK = `CHAT#${ts}#${id}`
  await dynamoRequest("PutItem", {
    TableName: TABLE,
    Item:      marshal({
      PK:        `USER#${data.userId}`,
      SK,
      id,
      userId:    data.userId,
      title:     data.title,
      date:      data.date,
      createdAt: new Date().toISOString(),
      messages:  data.messages,
    }),
  })
  return id
}

export async function updateConversationMessages(userId: string, SK: string, messages: any[]): Promise<void> {
  try {
    await dynamoRequest("UpdateItem", {
      TableName:                TABLE,
      Key:                      { PK: { S: `USER#${userId}` }, SK: { S: SK } },
      UpdateExpression:         "SET messages = :msgs, updatedAt = :now",
      ExpressionAttributeValues: {
        ":msgs": { S: JSON.stringify(messages) },
        ":now":  { S: new Date().toISOString() },
      },
    })
  } catch {}
}

export async function deleteConversation(userId: string, SK: string): Promise<void> {
  try {
    await dynamoRequest("DeleteItem", {
      TableName: TABLE,
      Key:       { PK: { S: `USER#${userId}` }, SK: { S: SK } },
    })
  } catch {}
}

// ─── Analytics (/data page) ───────────────────────────────────────────────────

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
      const body: any = { TableName: TABLE }
      if (lastKey) body.ExclusiveStartKey = lastKey
      const res = await dynamoRequest("Scan", body)
      items     = items.concat(unmarshalList(res.Items ?? []))
      lastKey   = res.LastEvaluatedKey
    } while (lastKey)

    const metaItems  = items.filter(i => i.SK === "META")
    const chatItems  = items.filter(i => typeof i.SK === "string" && i.SK.startsWith("CHAT#"))
    const usageItems = items.filter(i => typeof i.SK === "string" && i.SK.startsWith("USAGE#"))

    const planCounts: Record<string, number> = {}
    for (const item of metaItems) {
      const p = item.plan ?? "free"
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

    return {
      totalMessages,
      totalImages,
      totalVideos,
      totalVoiceMinutes,
      totalUsers:  metaItems.length,
      totalChats:  chatItems.length,
      planCounts,
      recentUsage,
    }
  } catch {
    return { totalMessages: 0, totalImages: 0, totalVideos: 0, totalVoiceMinutes: 0, totalUsers: 0, totalChats: 0, planCounts: {}, recentUsage: [] }
  }
}

export async function countUsersByPlan(): Promise<Record<string, number>> {
  const { planCounts } = await getAnalytics()
  return planCounts
}

// ─── Scan helpers (for /data analytics page) ─────────────────────────────────

export async function scanAllUsers(): Promise<UserMeta[]> {
  try {
    const results: UserMeta[] = []
    let lastKey: any = undefined
    do {
      const body: any = {
        TableName:                TABLE,
        FilterExpression:         "SK = :meta",
        ExpressionAttributeValues: { ":meta": { S: "META" } },
      }
      if (lastKey) body.ExclusiveStartKey = lastKey
      const res = await dynamoRequest("Scan", body)
      unmarshalList(res.Items ?? []).forEach(u => {
        results.push({
          userId:         u.userId        ?? String(u.PK ?? "").replace("USER#", ""),
          plan:           u.plan          ?? "free",
          planExpiresAt:  u.planExpiresAt ?? null,
          theme:          u.theme         ?? "dark",
          createdAt:      u.createdAt     ?? "",
          updatedAt:      u.updatedAt     ?? "",
        })
      })
      lastKey = res.LastEvaluatedKey
    } while (lastKey)
    return results
  } catch { return [] }
}

export async function scanRecentChats(sinceDaysAgo: number): Promise<ConversationItem[]> {
  try {
    const since = new Date(Date.now() - sinceDaysAgo * 86_400_000).toISOString()
    const results: ConversationItem[] = []
    let lastKey: any = undefined
    do {
      const body: any = {
        TableName:                TABLE,
        FilterExpression:         "begins_with(SK, :prefix) AND createdAt >= :since",
        ExpressionAttributeValues: {
          ":prefix": { S: "CHAT#" },
          ":since":  { S: since },
        },
      }
      if (lastKey) body.ExclusiveStartKey = lastKey
      const res = await dynamoRequest("Scan", body)
      unmarshalList(res.Items ?? []).forEach(u => {
        results.push({
          id:        u.id        ?? "",
          SK:        u.SK        ?? "",
          userId:    u.userId    ?? "",
          title:     u.title     ?? "",
          date:      u.date      ?? "",
          createdAt: u.createdAt ?? "",
          messages:  (() => { try { return Array.isArray(u.messages) ? u.messages : JSON.parse(u.messages ?? "[]") } catch { return [] } })(),
        })
      })
      lastKey = res.LastEvaluatedKey
    } while (lastKey)
    return results
  } catch { return [] }
}
