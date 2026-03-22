# 🔧 Melegy App - Environment Variables

## متغيرات البيئة المطلوبة لـ Vercel

لكي يعمل المشروع بشكل صحيح على Vercel، يجب إضافة المتغيرات التالية في **Settings → Environment Variables**:

### 1. Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Authentication
```env
JWT_SECRET=your-jwt-secret-key
```

### 3. AI Services (اختياري)
```env
GROQ_API_KEY=your-groq-key
NEXT_PUBLIC_FAL_KEY=your-fal-key
ELEVENLABS_API_KEY=your-elevenlabs-key
PERPLEXITY_API_KEY=your-perplexity-key
```

### 4. عملات الدفع (Payment) - اختياري
```env
KASHIER_API_KEY=your-kashier-key
NEXT_PAYPAL_CLIENT_ID=your-paypal-id
```

## الخطوات:

1. اذهب إلى https://vercel.com
2. اختر المشروع: `v0-melegy-app-222-o1main`
3. اذهب إلى **Settings → Environment Variables**
4. أضف المتغيرات أعلاه (على الأقل Supabase و JWT_SECRET)
5. أعد النشر:
   ```
   git push origin main
   ```

## التحقق من عمل المشروع:

بعد إضافة المتغيرات:
- ✅ الـ Build سيعمل بدون أخطاء
- ✅ ستتمكن من التسجيل في `/register`
- ✅ ستتمكن من تسجيل الدخول في `/login`
- ✅ جميع الخصائص ستعمل بشكل صحيح

في الوقت الحالي بدون هذه المتغيرات، قد ترى رسالة خطأ "Server not configured properly".

---

**ملاحظة:** متغيرات التطوير في `.env.local` لا تُرسل إلى Vercel، لذا يجب إضافة المتغيرات الحقيقية في لوحة التحكم.
