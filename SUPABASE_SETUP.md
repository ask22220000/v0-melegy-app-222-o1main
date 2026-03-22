# 🔐 استخراج بيانات Supabase

اتبع الخطوات التالية لاستخراج المعلومات المطلوبة من حسابك:

## 1️⃣ Project URL و Keys

اذهب إلى: **Supabase Dashboard → Project Settings → API**

ستجد:
- ✅ **Project URL** → نسخها هنا: `NEXT_PUBLIC_SUPABASE_URL`
- ✅ **anon public (ANON KEY)** → نسخها هنا: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ **Service Role (SECRET)** → نسخها هنا: `SUPABASE_SERVICE_ROLE_KEY`

مثال:
```
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...abc123
SUPABASE_SERVICE_ROLE_KEY=eyJ...xyz789
```

## 2️⃣ JWT Secret (اختياري)

```
JWT_SECRET=your-random-secret-key-here
```

يمكنك توليد random key بأي طريقة (مثلاً: `openssl rand -base64 32`)

---

## الخطوة التالية:

أعطيني:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `JWT_SECRET` (أو أي secret تفضله)

وبعدين أنا هحطهم في Vercel مباشرة لك! ✅
