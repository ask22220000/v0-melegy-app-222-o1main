/**
 * lib/db.ts — DynamoDB via pure fetch + Node.js crypto (zero external packages).
 * AWS Signature V4 implemented manually.
 * Supports both static credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
 * and the Vercel OIDC role via AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE.
 */
import crypto from "crypto"

const REGION = process.env.AWS_REGION ?? "us-east-1"
const TABLE  = process.env.DYNAMODB_TABLE_NAME ?? "melegy-app"
const ENDPOINT = `https://dynamodb.${REGION}.amazonaws.com`

// ─── AWS Signature V4 ─────────────────────────────────────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest()
}
function hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

async function getCredentials() {
  const keyId     = process.env.AWS_ACCESS_KEY_ID
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY
  const token     = process.env.AWS_SESSION_TOKEN

  if (keyId && secretKey) {
    return { accessKeyId: keyId, secretAccessKey: secretKey, sessionToken: token }
  }

  // Vercel OIDC — exchange web identity token for temporary credentials
  const tokenFile = process.env.AWS_WEB_IDENTITY_TOKEN_FILE
  const roleArn   = process.env.AWS_ROLE_ARN
  if (tokenFile && roleArn) {
    const fs = await import("fs")
    const webToken = fs.readFileSync(tokenFile, "utf8").trim()
    const stsUrl = `https://sts.amazonaws.com/?Action=AssumeRoleWithWebIdentity` +
      `&RoleArn=${encodeURIComponent(roleArn)}` +
      `&RoleSessionName=vercel-oidc` +
      `&WebIdentityToken=${encodeURIComponent(webToken)}` +
      `&Version=2011-06-15`
    const res  = await fetch(stsUrl)
    const text = await res.text()
    const get  = (tag: string) => text.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] ?? ""
    return {
      accessKeyId:     get("AccessKeyId"),
      secretAccessKey: get("SecretAccessKey"),
      sessionToken:    get("SessionToken"),
    }
  }

  throw new Error("No AWS credentials found")
}

async function dynamoRequest(action: string, body: Record<string, any>): Promise<any> {
  const creds     = await getCredentials()
  const now       = new Date()
  const amzDate   = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")
  const dateStamp = amzDate.slice(0, 8)
  const payload   = JSON.stringify(body)
  const payloadHash = hash(payload)

  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-date":   amzDate,
    "x-amz-target": `DynamoDB_20120810.${action}`,
    host:           `dynamodb.${REGION}.amazonaws.com`,
  }
  if (creds.sessionToken) headers["x-amz-security-token"] = creds.sessionToken

  const sortedHeaders = Object.keys(headers).sort()
  const canonicalHeaders = sortedHeaders.map(k => `${k}:${headers[k]}\n`).join("")
  const signedHeaders    = sortedHeaders.join(";")

  const canonicalRequest = [
    "POST", "/", "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const credentialScope = `${dateStamp}/${REGION}/dynamodb/aws4_request`
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n")

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${creds.secretAccessKey}`, dateStamp), REGION), "dynamodb"),
    "aws4_request",
  )
  const signature = hmac(signingKey, stringToSign).toString("hex")

  const authHeader = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(ENDPOINT, {
    method:  "POST",
    headers: { ...headers, Authorization: authHeader },
    body:    payload,
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`DynamoDB ${action} failed (${res.status}): ${text}`)
  return text ? JSON.parse(text) : {}
}

// ─── DynamoDB type helpers ────────────────────────────────────────────────────

function marshalValue(v: any): any {
  if (v === null || v === undefined) return { NULL: true }
  if (typeof v === "boolean") return { BOOL: v }
  if (typeof v === "number") return { N: String(v) }
  if (typeof v === "string") return { S: v }
  if (Array.isArray(v)) return { L: v.map(marshalValue) }
  if (typeof v === "object") return { M: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, marshalValue(val)])) }
  return { S: String(v) }
}

function unmarshalValue(v: any): any {
  if (!v) return null
  if ("NULL" in v) return null
  if ("BOOL" in v) return v.BOOL
  if ("N"    in v) return Number(v.N)
  if ("S"    in v) return v.S
  if ("L"    in v) return (v.L as any[]).map(unmarshalValue)
  if ("M"    in v) return Object.fromEntries(Object.entries(v.M).map(([k, val]) => [k, unmarshalValue(val)]))
  return null
}

function marshal(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([,v]) => v !== undefined).map(([k, v]) => [k, marshalValue(v)]))
}

function unmarshal(item: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, unmarshalValue(v)]))
}

function unmarshalList(items: any[]): Record<string, any>[] {
  return items.map(unmarshal)
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
    const res = await dynamoRequest("GetItem", {
      TableName: TABLE,
      Key: marshal({ PK: `USER#${userId}`, SK: "META" }),
    })
    if (!res.Item) return null
    const item = unmarshal(res.Item)
    return {
      userId:        item.userId        ?? userId,
      plan:          item.plan          ?? "free",
      planExpiresAt: item.planExpiresAt ?? null,
      theme:         item.theme         ?? "dark",
      createdAt:     item.createdAt     ?? "",
      updatedAt:     item.updatedAt     ?? "",
    }
  } catch { return null }
}

export async function ensureUserMeta(userId: string): Promise<UserMeta> {
  const existing = await getUserMeta(userId)
  if (existing) return existing
  const now = new Date().toISOString()
  const newMeta: UserMeta = {
    userId,
    plan:          "free",
    planExpiresAt: null,
    theme:         "dark",
    createdAt:     now,
    updatedAt:     now,
  }
  await dynamoRequest("PutItem", {
    TableName:           TABLE,
    Item:                marshal({ PK: `USER#${userId}`, SK: "META", ...newMeta }),
    ConditionExpression: "attribute_not_exists(PK)",
  }).catch(() => {})
  return newMeta
}

export async function upsertUserMeta(userId: string, fields: Partial<UserMeta & Record<string,any>>): Promise<void> {
  const sets: string[] = []
  const names: Record<string,string> = {}
  const vals:  Record<string,any>    = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue
    sets.push(`#${k} = :${k}`)
    names[`#${k}`] = k
    vals[`:${k}`]  = marshalValue(v)
  }
  if (!sets.length) return
  await dynamoRequest("UpdateItem", {
    TableName:                 TABLE,
    Key:                       marshal({ PK: `USER#${userId}`, SK: "META" }),
    UpdateExpression:          `SET ${sets.join(", ")}`,
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: vals,
  })
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
    const res = await dynamoRequest("GetItem", {
      TableName: TABLE,
      Key: marshal({ PK: `USER#${userId}`, SK: `USAGE#${date}` }),
    })
    if (!res.Item) return { messages: 0, images: 0, animated_videos: 0, voice_minutes: 0, image_edits: 0 }
    const item = unmarshal(res.Item)
    return {
      messages:        item.messages        ?? 0,
      images:          item.images          ?? 0,
      animated_videos: item.animated_videos ?? 0,
      voice_minutes:   item.voice_minutes   ?? 0,
      image_edits:     item.image_edits     ?? 0,
    }
  } catch { return { messages: 0, images: 0, animated_videos: 0, voice_minutes: 0, image_edits: 0 } }
}

export async function incrementDailyUsage(
  userId: string,
  field:  keyof DailyUsage,
  amount = 1,
  date   = todayEgypt(),
): Promise<void> {
  try {
    await dynamoRequest("UpdateItem", {
      TableName:                 TABLE,
      Key:                       marshal({ PK: `USER#${userId}`, SK: `USAGE#${date}` }),
      UpdateExpression:          "SET #f = if_not_exists(#f, :z) + :a, userId = :uid",
      ExpressionAttributeNames:  { "#f": field },
      ExpressionAttributeValues: { ":z": { N: "0" }, ":a": { N: String(amount) }, ":uid": { S: userId } },
    })
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
    await dynamoRequest("UpdateItem", {
      TableName:                 TABLE,
      Key:                       marshal({ PK: "GLOBAL#STATS", SK: `PLAN#${plan}` }),
      UpdateExpression:          "SET #cnt = if_not_exists(#cnt, :z) + :a",
      ExpressionAttributeNames:  { "#cnt": "count" },
      ExpressionAttributeValues: { ":z": { N: "0" }, ":a": { N: String(amount) } },
    })
  } catch {}
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function saveConversation(userId: string, id: string, title: string, messages: any[]): Promise<void> {
  const now = new Date().toISOString()
  await dynamoRequest("PutItem", {
    TableName: TABLE,
    Item: marshal({
      PK: `USER#${userId}`, SK: `CHAT#${now}#${id}`,
      id, userId, title,
      messages:  JSON.stringify(messages),
      date:      todayEgypt(),
      createdAt: now,
    }),
  })
}

export async function getUserConversations(userId: string): Promise<ConversationItem[]> {
  try {
    const res = await dynamoRequest("Query", {
      TableName:                 TABLE,
      KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: marshal({ ":pk": `USER#${userId}`, ":prefix": "CHAT#" }),
      ScanIndexForward:          false,
    })
    return unmarshalList(res.Items ?? []).map((item: any) => ({
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
  await dynamoRequest("DeleteItem", {
    TableName: TABLE,
    Key: marshal({ PK: `USER#${userId}`, SK: sk }),
  })
}

// Alias used by some routes
export const getConversations = getUserConversations

export async function updateConversationMessages(userId: string, skOrId: string, messages: any[]): Promise<void> {
  try {
    // Find the conversation SK if an ID was passed instead of SK
    const convs = await getUserConversations(userId)
    const match = convs.find(c => c.SK === skOrId || c.id === skOrId)
    if (!match) return
    await dynamoRequest("UpdateItem", {
      TableName:                 TABLE,
      Key:                       marshal({ PK: `USER#${userId}`, SK: match.SK }),
      UpdateExpression:          "SET messages = :m, updatedAt = :u",
      ExpressionAttributeValues: {
        ":m": marshalValue(JSON.stringify(messages)),
        ":u": marshalValue(new Date().toISOString()),
      },
    })
  } catch {}
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsGlobal> {
  try {
    let items: any[] = []
    let lastKey: any = undefined
    do {
      const body: any = { TableName: TABLE }
      if (lastKey) body.ExclusiveStartKey = lastKey
      const res = await dynamoRequest("Scan", body)
      items   = items.concat(unmarshalList(res.Items ?? []))
      lastKey = res.LastEvaluatedKey
    } while (lastKey)

    const metaItems  = items.filter(i => i.SK === "META")
    const chatItems  = items.filter(i => typeof i.SK === "string" && i.SK.startsWith("CHAT#"))
    const usageItems = items.filter(i => typeof i.SK === "string" && i.SK.startsWith("USAGE#"))

    // Build plan counts from all user meta records
    const planCounts: Record<string, number> = {}
    for (const m of metaItems) {
      const p = m.plan ?? "free"
      planCounts[p] = (planCounts[p] ?? 0) + 1
    }

    // Sum all usage metrics across all users and dates
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
      totalChats:  chatItems.length,   // full count, not just recent
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

export async function scanAllUsers(): Promise<UserMeta[]> {
  try {
    let items: any[] = []
    let lastKey: any = undefined
    do {
      const body: any = {
        TableName:                 TABLE,
        FilterExpression:          "SK = :meta",
        ExpressionAttributeValues: marshal({ ":meta": "META" }),
      }
      if (lastKey) body.ExclusiveStartKey = lastKey
      const res = await dynamoRequest("Scan", body)
      items   = items.concat(unmarshalList(res.Items ?? []))
      lastKey = res.LastEvaluatedKey
    } while (lastKey)

    return items.map((u: any) => ({
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
    let items: any[] = []
    let lastKey: any = undefined
    do {
      const body: any = {
        TableName:                 TABLE,
        FilterExpression:          "begins_with(SK, :prefix) AND createdAt >= :since",
        ExpressionAttributeValues: marshal({ ":prefix": "CHAT#", ":since": since }),
      }
      if (lastKey) body.ExclusiveStartKey = lastKey
      const res = await dynamoRequest("Scan", body)
      items   = items.concat(unmarshalList(res.Items ?? []))
      lastKey = res.LastEvaluatedKey
    } while (lastKey)

    return items.map((u: any) => ({
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
