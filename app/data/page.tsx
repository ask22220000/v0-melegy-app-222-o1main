"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  Activity, MessageSquare, Users, Zap, Clock, Crown,
  Star, Sparkles, TrendingUp, RefreshCw, Image, Video, Mic,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  activeUsersNow: number
  totalUsers: number
  subscriptionsByPlan: { free: number; starter: number; pro: number; advanced: number }
  totalConversations: number
  totalMessages: number
  messagesPerMinute: number
  averageResponseTime: number
  activeUsers: number
  featureUsage: {
    textGeneration: number
    imageGeneration: number
    videoGeneration: number
    deepSearch: number
    ideaToPrompt: number
    voiceCloning: number
  }
  responseTypes: { text: number; search: number; creative: number; technical: number }
  userSatisfaction: { positive: number; neutral: number; negative: number }
  systemHealth: { apiResponseTime: number; uptime: number; errorRate: number }
  topQueries: { query: string; count: number }[]
  hourlyActivity: { hour: number; messages: number }[]
  lastUpdated: string
}

// ── Color palette (no CSS vars — recharts needs real values) ──────────────────
const COLORS = {
  blue:   "#3b82f6",
  cyan:   "#06b6d4",
  green:  "#22c55e",
  purple: "#a855f7",
  amber:  "#f59e0b",
  red:    "#ef4444",
  slate:  "#64748b",
  card:   "#0d1b35",
  border: "#1e3a5f",
}

const PLAN_COLORS = [COLORS.slate, COLORS.blue, COLORS.purple, COLORS.amber]
const FEATURE_COLORS = [COLORS.blue, COLORS.cyan, COLORS.purple, COLORS.green, COLORS.amber, COLORS.red]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString("ar-EG") }

function pct(value: number, total: number) {
  if (!total) return "0.0"
  return ((value / total) * 100).toFixed(1)
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, accent, pulse,
}: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: string; pulse?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={pulse ? "animate-pulse" : ""} style={{ color: accent }}>{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white leading-none">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">{children}</h2>
  )
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-6 ${className}`}
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      {children}
    </div>
  )
}

// ── Custom Recharts Tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: "#0a1628", borderColor: COLORS.border }}>
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "نظرة عامة" },
  { id: "features",  label: "المميزات" },
  { id: "plans",     label: "الخطط" },
  { id: "activity",  label: "النشاط" },
]

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DataPage() {
  const [data, setData]       = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState("overview")
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics")
      if (res.ok) {
        setData(await res.json())
        setLastRefresh(new Date())
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="animate-spin text-blue-400 h-8 w-8" />
            <p className="text-slate-400 text-sm">جاري تحميل التقارير...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-400">تعذّر تحميل البيانات. حاول مرة أخرى.</p>
        </div>
      </div>
    )
  }

  const totalPlans = data.subscriptionsByPlan.free + data.subscriptionsByPlan.starter +
    data.subscriptionsByPlan.pro + data.subscriptionsByPlan.advanced

  const planPieData = [
    { name: "مجاني",    value: data.subscriptionsByPlan.free },
    { name: "Starter",  value: data.subscriptionsByPlan.starter },
    { name: "Pro",      value: data.subscriptionsByPlan.pro },
    { name: "Advanced", value: data.subscriptionsByPlan.advanced },
  ]

  const featureBarData = [
    { name: "نصوص",       value: data.featureUsage.textGeneration,  fill: COLORS.blue },
    { name: "صور",         value: data.featureUsage.imageGeneration,  fill: COLORS.cyan },
    { name: "فيديو",       value: data.featureUsage.videoGeneration,  fill: COLORS.purple },
    { name: "بحث عميق",   value: data.featureUsage.deepSearch,        fill: COLORS.green },
    { name: "أفكار",       value: data.featureUsage.ideaToPrompt,      fill: COLORS.amber },
    { name: "صوت",         value: data.featureUsage.voiceCloning,       fill: COLORS.red },
  ]

  const satisfactionTotal = data.userSatisfaction.positive + data.userSatisfaction.neutral + data.userSatisfaction.negative
  const satisfactionPie = [
    { name: "إيجابي", value: data.userSatisfaction.positive },
    { name: "محايد",  value: data.userSatisfaction.neutral },
    { name: "سلبي",   value: data.userSatisfaction.negative },
  ]
  const satColors = [COLORS.green, COLORS.amber, COLORS.red]

  const hourlyData = data.hourlyActivity.map((h) => ({
    name: `${h.hour}:00`,
    رسائل: h.messages,
  }))

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      <main className="container mx-auto px-4 py-10 max-w-7xl">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">تقارير الاستخدام</h1>
            <p className="text-slate-400 text-sm mt-1">
              {lastRefresh
                ? `آخر تحديث: ${lastRefresh.toLocaleTimeString("ar-EG")}`
                : "يتجدد كل 30 ثانية"}
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-slate-300 border border-slate-700 rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث الآن
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard label="نشط الآن"           value={fmt(data.activeUsersNow)}      sub="مستخدم متصل"          icon={<Users className="h-5 w-5" />}          accent={COLORS.green}  pulse />
          <KpiCard label="إجمالي المستخدمين"  value={fmt(data.totalUsers)}           sub="منذ الإطلاق"           icon={<TrendingUp className="h-5 w-5" />}      accent={COLORS.blue} />
          <KpiCard label="إجمالي الرسائل"     value={fmt(data.totalMessages)}        sub="كل الأوقات"            icon={<MessageSquare className="h-5 w-5" />}   accent={COLORS.cyan} />
          <KpiCard label="إجمالي المحادثات"   value={fmt(data.totalConversations)}   sub="محادثة محفوظة"         icon={<Activity className="h-5 w-5" />}        accent={COLORS.purple} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              style={tab === t.id ? { background: COLORS.blue } : { background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Second KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="نشط اليوم"              value={fmt(data.activeUsers)}                sub="آخر 24 ساعة"      icon={<Clock className="h-5 w-5" />}          accent={COLORS.amber} />
              <KpiCard label="رسائل / دقيقة"          value={String(data.messagesPerMinute)}       sub="الساعة الأخيرة"   icon={<Zap className="h-5 w-5" />}             accent={COLORS.cyan} />
              <KpiCard label="وقت الاستجابة"          value={`${data.averageResponseTime.toFixed(2)} ث`} sub="متوسط"       icon={<Activity className="h-5 w-5" />}        accent={COLORS.green} />
              <KpiCard label="إجمالي المشتركين"       value={fmt(totalPlans)}                      sub="في كل الخطط"      icon={<Crown className="h-5 w-5" />}           accent={COLORS.purple} />
            </div>

            {/* Hourly chart + Satisfaction */}
            <div className="grid md:grid-cols-2 gap-6">
              <Panel>
                <SectionTitle><Activity className="h-5 w-5 text-blue-400" />النشاط بالساعة (آخر 24 ساعة)</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} interval={3} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="رسائل" stroke={COLORS.blue} fill="url(#blueGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>

              <Panel>
                <SectionTitle>رضا المستخدمين</SectionTitle>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={satisfactionPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {satisfactionPie.map((_, i) => <Cell key={i} fill={satColors[i]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex-1">
                    {satisfactionPie.map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-2 text-slate-300">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: satColors[i] }} />
                            {item.name}
                          </span>
                          <span className="text-white font-semibold">{pct(item.value, satisfactionTotal)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct(item.value, satisfactionTotal)}%`, background: satColors[i] }} />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-slate-500 pt-1">من {fmt(satisfactionTotal)} تقييم</p>
                  </div>
                </div>
              </Panel>
            </div>

            {/* System health */}
            <Panel>
              <SectionTitle>صحة النظام</SectionTitle>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { label: "وقت استجابة API", value: `${data.systemHealth.apiResponseTime.toFixed(2)} ث`, pct: Math.min((data.systemHealth.apiResponseTime / 5) * 100, 100), color: COLORS.blue },
                  { label: "وقت التشغيل",      value: `${data.systemHealth.uptime.toFixed(1)}%`,             pct: data.systemHealth.uptime,                                    color: COLORS.green },
                  { label: "معدل الأخطاء",     value: `${(data.systemHealth.errorRate * 100).toFixed(2)}%`,  pct: data.systemHealth.errorRate * 100,                           color: COLORS.red },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">{m.label}</span>
                      <span className="text-white font-semibold">{m.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── Tab: Features ─────────────────────────────────────────────────── */}
        {tab === "features" && (
          <div className="space-y-6">
            <Panel>
              <SectionTitle><Zap className="h-5 w-5 text-amber-400" />استخدام المميزات</SectionTitle>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={featureBarData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 13 }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="الاستخدام" radius={[0, 6, 6, 0]}>
                    {featureBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "توليد النصوص",   value: data.featureUsage.textGeneration,  icon: <MessageSquare className="h-5 w-5" />,  color: COLORS.blue },
                { label: "توليد الصور",     value: data.featureUsage.imageGeneration,  icon: <Image className="h-5 w-5" />,          color: COLORS.cyan },
                { label: "توليد الفيديو",   value: data.featureUsage.videoGeneration,  icon: <Video className="h-5 w-5" />,          color: COLORS.purple },
                { label: "البحث العميق",    value: data.featureUsage.deepSearch,        icon: <Activity className="h-5 w-5" />,       color: COLORS.green },
                { label: "تحويل الأفكار",  value: data.featureUsage.ideaToPrompt,      icon: <Sparkles className="h-5 w-5" />,       color: COLORS.amber },
                { label: "الدردشة الصوتية",value: data.featureUsage.voiceCloning,       icon: <Mic className="h-5 w-5" />,           color: COLORS.red },
              ].map((f, i) => (
                <KpiCard key={i} label={f.label} value={fmt(f.value)} sub="عملية" icon={f.icon} accent={f.color} />
              ))}
            </div>

            {/* Top queries */}
            {data.topQueries.length > 0 && (
              <Panel>
                <SectionTitle>أكثر الاستفسارات شيوعاً (آخر 7 أيام)</SectionTitle>
                <div className="space-y-2">
                  {data.topQueries.map((q, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: COLORS.border }}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0" style={{ background: COLORS.blue }}>
                        {i + 1}
                      </span>
                      <span className="text-slate-300 text-sm flex-1 truncate">{q.query}</span>
                      <span className="text-blue-400 font-bold text-sm">{fmt(q.count)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── Tab: Plans ────────────────────────────────────────────────────── */}
        {tab === "plans" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "مجاني",    value: data.subscriptionsByPlan.free,      icon: <Users className="h-5 w-5" />,     color: COLORS.slate },
                { label: "Starter",  value: data.subscriptionsByPlan.starter,   icon: <Star className="h-5 w-5" />,      color: COLORS.blue },
                { label: "Pro",      value: data.subscriptionsByPlan.pro,       icon: <Sparkles className="h-5 w-5" />,  color: COLORS.purple },
                { label: "Advanced", value: data.subscriptionsByPlan.advanced,  icon: <Crown className="h-5 w-5" />,     color: COLORS.amber },
              ].map((p, i) => (
                <KpiCard key={i} label={p.label} value={fmt(p.value)} sub={`${pct(p.value, totalPlans)}% من الكل`} icon={p.icon} accent={p.color} />
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Panel>
                <SectionTitle>توزيع الخطط</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={planPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" paddingAngle={4} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {planPieData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => <span style={{ color: "#94a3b8" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>

              <Panel>
                <SectionTitle>مقارنة الخطط</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={planPieData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="المشتركين" radius={[6, 6, 0, 0]}>
                      {planPieData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
          </div>
        )}

        {/* ── Tab: Activity ─────────────────────────────────────────────────── */}
        {tab === "activity" && (
          <div className="space-y-6">
            <Panel>
              <SectionTitle><Activity className="h-5 w-5 text-blue-400" />الرسائل بالساعة (آخر 24 ساعة)</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} interval={2} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="رسائل" stroke={COLORS.cyan} fill="url(#cyanGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <div className="grid md:grid-cols-2 gap-6">
              <Panel>
                <SectionTitle>أنواع الردود</SectionTitle>
                <div className="space-y-4">
                  {[
                    { label: "نصوص",   value: data.responseTypes.text,      color: COLORS.blue },
                    { label: "بحث",    value: data.responseTypes.search,    color: COLORS.green },
                    { label: "إبداعي", value: data.responseTypes.creative,  color: COLORS.purple },
                    { label: "تقني",   value: data.responseTypes.technical, color: COLORS.amber },
                  ].map((r, i) => {
                    const total = Object.values(data.responseTypes).reduce((a, b) => a + b, 0)
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">{r.label}</span>
                          <span className="text-white font-semibold">{fmt(r.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct(r.value, total)}%`, background: r.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>

              <Panel>
                <SectionTitle>ملخص الاستخدام</SectionTitle>
                <div className="space-y-4">
                  {[
                    { label: "إجمالي المستخدمين",  value: fmt(data.totalUsers) },
                    { label: "نشط اليوم",          value: fmt(data.activeUsers) },
                    { label: "نشط الآن",            value: fmt(data.activeUsersNow) },
                    { label: "إجمالي المحادثات",   value: fmt(data.totalConversations) },
                    { label: "إجمالي الرسائل",     value: fmt(data.totalMessages) },
                    { label: "رسائل / دقيقة",      value: String(data.messagesPerMinute) },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between border-b pb-2" style={{ borderColor: COLORS.border }}>
                      <span className="text-slate-400 text-sm">{s.label}</span>
                      <span className="text-white font-semibold text-sm">{s.value}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
