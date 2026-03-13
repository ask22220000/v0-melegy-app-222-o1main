"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

const sections = [
  { id: "introduction", ar: "المقدمة", en: "Introduction" },
  { id: "data-collection", ar: "البيانات التي نجمعها", en: "Data We Collect" },
  { id: "data-use", ar: "كيف نستخدم بياناتك", en: "How We Use Your Data" },
  { id: "data-sharing", ar: "مشاركة البيانات", en: "Data Sharing" },
  { id: "data-retention", ar: "الاحتفاظ بالبيانات", en: "Data Retention" },
  { id: "user-rights", ar: "حقوقك", en: "Your Rights" },
  { id: "cookies", ar: "ملفات تعريف الارتباط", en: "Cookies" },
  { id: "security", ar: "الأمان", en: "Security" },
  { id: "children", ar: "خصوصية الأطفال", en: "Children's Privacy" },
  { id: "changes", ar: "تغييرات السياسة", en: "Policy Changes" },
  { id: "contact", ar: "تواصل معنا", en: "Contact Us" },
]

type Lang = "ar" | "en"

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("introduction")
  const [lang, setLang] = useState<Lang>("ar")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: "-30% 0px -60% 0px" }
    )

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setSidebarOpen(false)
  }

  const isRTL = lang === "ar"

  return (
    <div
      className="min-h-screen bg-[#0d0d0f] text-gray-100"
      style={{ fontFamily: "Cairo, sans-serif", direction: isRTL ? "rtl" : "ltr" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0d0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            <span className="text-sm font-medium">{isRTL ? "العودة للرئيسية" : "Back to Home"}</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex items-center rounded-full border border-white/20 bg-white/5 p-1">
              <button
                onClick={() => setLang("ar")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  lang === "ar" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => setLang("en")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  lang === "en" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                English
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-all lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="mx-auto flex max-w-7xl gap-0">
        {/* Sidebar */}
        <aside
          className={`fixed top-[57px] z-40 h-[calc(100vh-57px)] w-64 overflow-y-auto border-e border-white/10 bg-[#111114] transition-transform duration-300 lg:sticky lg:top-[57px] lg:block lg:translate-x-0 ${
            sidebarOpen
              ? isRTL ? "translate-x-0 right-0" : "translate-x-0 left-0"
              : isRTL ? "translate-x-full right-0" : "-translate-x-full left-0"
          } lg:translate-x-0`}
          style={{ direction: isRTL ? "rtl" : "ltr" }}
        >
          <div className="p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-purple-400">
              {isRTL ? "المحتويات" : "Contents"}
            </p>
            <nav className="space-y-1">
              {sections.map(({ id, ar, en }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`w-full rounded-lg px-3 py-2 text-right text-sm transition-all ${
                    activeSection === id
                      ? "bg-purple-600/20 text-purple-300 font-medium"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                  style={{ textAlign: isRTL ? "right" : "left" }}
                >
                  {isRTL ? ar : en}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-6 py-12 lg:px-12">
          {/* Hero */}
          <div className="mb-16 border-b border-white/10 pb-12">
            <span className="mb-4 inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-xs font-medium text-purple-400">
              {isRTL ? "سياسة الخصوصية" : "Privacy Policy"}
            </span>
            <h1 className="mb-4 text-4xl font-bold leading-tight text-white lg:text-5xl text-balance">
              {isRTL ? "خصوصيتك تهمنا" : "Your Privacy Matters"}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
              {isRTL
                ? "نحن في Melegy نلتزم بحماية خصوصيتك وبياناتك الشخصية. هذه السياسة توضح كيف نجمع ونستخدم ونحمي معلوماتك."
                : "At Melegy, we are committed to protecting your privacy and personal data. This policy explains how we collect, use, and protect your information."}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              {isRTL ? "آخر تحديث: مارس 2026" : "Last updated: March 2026"}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-16">

            {/* 1. Introduction */}
            <section id="introduction" className="scroll-mt-20">
              <SectionHeader num="01" ar="المقدمة" en="Introduction" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>مرحباً بك في Melegy، منصة الذكاء الاصطناعي المتقدمة. نحن نأخذ خصوصية مستخدمينا على محمل الجد ونلتزم بأعلى معايير حماية البيانات.</p>
                    <p>تنطبق هذه السياسة على جميع خدمات Melegy، بما في ذلك تطبيق الويب وتطبيق الجوال وجميع واجهات برمجة التطبيقات المرتبطة.</p>
                    <p>باستخدام خدماتنا، فإنك توافق على الشروط الواردة في هذه السياسة. إذا كنت لا توافق على أي جزء منها، يرجى التوقف عن استخدام الخدمات.</p>
                  </>
                ) : (
                  <>
                    <p>Welcome to Melegy, the advanced AI platform. We take user privacy seriously and commit to the highest standards of data protection.</p>
                    <p>This policy applies to all Melegy services, including the web application, mobile app, and all associated APIs.</p>
                    <p>By using our services, you agree to the terms outlined in this policy. If you do not agree with any part of it, please discontinue use of the services.</p>
                  </>
                )}
              </div>
            </section>

            {/* 2. Data Collection */}
            <section id="data-collection" className="scroll-mt-20">
              <SectionHeader num="02" ar="البيانات التي نجمعها" en="Data We Collect" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>نجمع أنواعاً مختلفة من البيانات لتقديم وتحسين خدماتنا:</p>
                    <InfoCard
                      icon="👤"
                      title="بيانات الحساب"
                      items={["الاسم والبريد الإلكتروني", "كلمة المرور (مشفرة)", "رقم الهاتف (اختياري)", "صورة الملف الشخصي (اختياري)"]}
                    />
                    <InfoCard
                      icon="💬"
                      title="بيانات الاستخدام"
                      items={["المحادثات والرسائل مع الذكاء الاصطناعي", "الصور والملفات المرفوعة", "تفضيلات الإعدادات", "سجل التفاعلات"]}
                    />
                    <InfoCard
                      icon="📊"
                      title="البيانات التقنية"
                      items={["عنوان IP ونوع الجهاز", "المتصفح ونظام التشغيل", "بيانات الأداء والأخطاء", "الطوابع الزمنية للجلسات"]}
                    />
                  </>
                ) : (
                  <>
                    <p>We collect different types of data to provide and improve our services:</p>
                    <InfoCard
                      icon="👤"
                      title="Account Data"
                      items={["Name and email address", "Password (encrypted)", "Phone number (optional)", "Profile picture (optional)"]}
                    />
                    <InfoCard
                      icon="💬"
                      title="Usage Data"
                      items={["AI conversations and messages", "Uploaded images and files", "Settings preferences", "Interaction history"]}
                    />
                    <InfoCard
                      icon="📊"
                      title="Technical Data"
                      items={["IP address and device type", "Browser and operating system", "Performance and error data", "Session timestamps"]}
                    />
                  </>
                )}
              </div>
            </section>

            {/* 3. Data Use */}
            <section id="data-use" className="scroll-mt-20">
              <SectionHeader num="03" ar="كيف نستخدم بياناتك" en="How We Use Your Data" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>نستخدم بياناتك للأغراض التالية حصراً:</p>
                    <ul>
                      <li>تقديم خدمات الذكاء الاصطناعي وتخصيص تجربتك</li>
                      <li>معالجة المدفوعات وإدارة الاشتراكات</li>
                      <li>تحسين جودة النماذج والخدمات</li>
                      <li>إرسال الإشعارات المتعلقة بالحساب</li>
                      <li>الامتثال للمتطلبات القانونية والتنظيمية</li>
                      <li>الكشف عن الاحتيال وضمان أمان المنصة</li>
                    </ul>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <p className="text-sm text-amber-300">
                        <strong>ملاحظة مهمة:</strong> لا نستخدم بياناتك لأغراض تسويقية لأطراف ثالثة دون موافقتك الصريحة.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>We use your data exclusively for the following purposes:</p>
                    <ul>
                      <li>Providing AI services and personalizing your experience</li>
                      <li>Processing payments and managing subscriptions</li>
                      <li>Improving model quality and services</li>
                      <li>Sending account-related notifications</li>
                      <li>Complying with legal and regulatory requirements</li>
                      <li>Detecting fraud and ensuring platform security</li>
                    </ul>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <p className="text-sm text-amber-300">
                        <strong>Important:</strong> We do not use your data for third-party marketing without your explicit consent.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 4. Data Sharing */}
            <section id="data-sharing" className="scroll-mt-20">
              <SectionHeader num="04" ar="مشاركة البيانات" en="Data Sharing" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>لا نبيع بياناتك الشخصية أبداً. قد نشارك بيانات محدودة مع:</p>
                    <ul>
                      <li><strong>مزودي الخدمة:</strong> مثل Vercel وSupabase لاستضافة الخدمات (بموجب اتفاقيات صارمة)</li>
                      <li><strong>نماذج الذكاء الاصطناعي:</strong> مثل Groq وfal.ai لمعالجة طلباتك فقط</li>
                      <li><strong>معالجات الدفع:</strong> مثل Stripe لإتمام المعاملات المالية</li>
                      <li><strong>الجهات القانونية:</strong> عند الاقتضاء القانوني أو الأمر القضائي</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>We never sell your personal data. We may share limited data with:</p>
                    <ul>
                      <li><strong>Service Providers:</strong> Such as Vercel and Supabase for service hosting (under strict agreements)</li>
                      <li><strong>AI Models:</strong> Such as Groq and fal.ai solely to process your requests</li>
                      <li><strong>Payment Processors:</strong> Such as Stripe to complete financial transactions</li>
                      <li><strong>Legal Authorities:</strong> When legally required or by court order</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 5. Data Retention */}
            <section id="data-retention" className="scroll-mt-20">
              <SectionHeader num="05" ar="الاحتفاظ بالبيانات" en="Data Retention" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>نحتفظ ببياناتك للمدد التالية:</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "بيانات الحساب", value: "طوال فترة الاشتراك + 30 يوم" },
                        { label: "سجل المحادثات", value: "90 يوم من آخر نشاط" },
                        { label: "الصور والملفات", value: "30 يوم ثم تُحذف تلقائياً" },
                        { label: "بيانات الدفع", value: "7 سنوات (متطلبات قانونية)" },
                        { label: "بيانات الأداء", value: "14 يوم فقط" },
                        { label: "السجلات الأمنية", value: "180 يوم" },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm font-semibold text-white">{label}</p>
                          <p className="mt-1 text-sm text-purple-400">{value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p>We retain your data for the following periods:</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Account Data", value: "Throughout subscription + 30 days" },
                        { label: "Chat History", value: "90 days from last activity" },
                        { label: "Images & Files", value: "30 days then auto-deleted" },
                        { label: "Payment Data", value: "7 years (legal requirement)" },
                        { label: "Performance Data", value: "14 days only" },
                        { label: "Security Logs", value: "180 days" },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm font-semibold text-white">{label}</p>
                          <p className="mt-1 text-sm text-purple-400">{value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 6. User Rights */}
            <section id="user-rights" className="scroll-mt-20">
              <SectionHeader num="06" ar="حقوقك" en="Your Rights" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>وفقاً للوائح حماية البيانات الدولية (GDPR وغيرها)، لديك الحقوق التالية:</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { icon: "🔍", title: "حق الوصول", desc: "طلب نسخة من بياناتك الشخصية" },
                        { icon: "✏️", title: "حق التصحيح", desc: "تصحيح بياناتك غير الدقيقة" },
                        { icon: "🗑️", title: "حق الحذف", desc: "طلب حذف بياناتك نهائياً" },
                        { icon: "⛔", title: "حق الاعتراض", desc: "الاعتراض على معالجة بياناتك" },
                        { icon: "📦", title: "حق النقل", desc: "استلام بياناتك بتنسيق قابل للنقل" },
                        { icon: "🔒", title: "حق التقييد", desc: "تقييد معالجة بياناتك في حالات معينة" },
                      ].map(({ icon, title, desc }) => (
                        <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <p className="font-semibold text-white text-sm">{title}</p>
                            <p className="mt-1 text-xs text-gray-400">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-400">لممارسة أي من هذه الحقوق، تواصل معنا عبر البريد الإلكتروني: <span className="text-purple-400">privacy@melegy.app</span></p>
                  </>
                ) : (
                  <>
                    <p>Under international data protection regulations (GDPR and others), you have the following rights:</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { icon: "🔍", title: "Right of Access", desc: "Request a copy of your personal data" },
                        { icon: "✏️", title: "Right to Rectification", desc: "Correct inaccurate data about you" },
                        { icon: "🗑️", title: "Right to Erasure", desc: "Request permanent deletion of your data" },
                        { icon: "⛔", title: "Right to Object", desc: "Object to the processing of your data" },
                        { icon: "📦", title: "Right to Portability", desc: "Receive your data in a portable format" },
                        { icon: "🔒", title: "Right to Restriction", desc: "Restrict processing in certain cases" },
                      ].map(({ icon, title, desc }) => (
                        <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <p className="font-semibold text-white text-sm">{title}</p>
                            <p className="mt-1 text-xs text-gray-400">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-400">To exercise any of these rights, contact us at: <span className="text-purple-400">privacy@melegy.app</span></p>
                  </>
                )}
              </div>
            </section>

            {/* 7. Cookies */}
            <section id="cookies" className="scroll-mt-20">
              <SectionHeader num="07" ar="ملفات تعريف الارتباط" en="Cookies" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>نستخدم ملفات تعريف الارتباط للأغراض التالية:</p>
                    <ul>
                      <li><strong>الضرورية:</strong> للمصادقة وإبقائك مسجل الدخول</li>
                      <li><strong>الوظيفية:</strong> حفظ تفضيلاتك وإعداداتك</li>
                      <li><strong>التحليلية:</strong> فهم كيفية استخدام الخدمة لتحسينها</li>
                    </ul>
                    <p>يمكنك التحكم في ملفات تعريف الارتباط من إعدادات متصفحك في أي وقت.</p>
                  </>
                ) : (
                  <>
                    <p>We use cookies for the following purposes:</p>
                    <ul>
                      <li><strong>Essential:</strong> For authentication and keeping you logged in</li>
                      <li><strong>Functional:</strong> Saving your preferences and settings</li>
                      <li><strong>Analytical:</strong> Understanding how the service is used for improvement</li>
                    </ul>
                    <p>You can control cookies through your browser settings at any time.</p>
                  </>
                )}
              </div>
            </section>

            {/* 8. Security */}
            <section id="security" className="scroll-mt-20">
              <SectionHeader num="08" ar="الأمان" en="Security" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>نتخذ إجراءات أمنية متعددة لحماية بياناتك:</p>
                    <ul>
                      <li>تشفير TLS/SSL لجميع الاتصالات</li>
                      <li>تشفير كلمات المرور باستخدام bcrypt</li>
                      <li>مراقبة مستمرة للأنشطة المشبوهة</li>
                      <li>نسخ احتياطية منتظمة ومشفرة</li>
                      <li>صلاحيات وصول محدودة للموظفين</li>
                      <li>اختبارات اختراق دورية</li>
                    </ul>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="text-sm text-emerald-300">
                        في حالة اكتشاف أي خرق للبيانات، سنُخطرك خلال 72 ساعة وفقاً لمتطلبات GDPR.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>We take multiple security measures to protect your data:</p>
                    <ul>
                      <li>TLS/SSL encryption for all communications</li>
                      <li>Password encryption using bcrypt</li>
                      <li>Continuous monitoring for suspicious activities</li>
                      <li>Regular encrypted backups</li>
                      <li>Limited employee access permissions</li>
                      <li>Periodic penetration testing</li>
                    </ul>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="text-sm text-emerald-300">
                        In the event of a data breach, we will notify you within 72 hours in accordance with GDPR requirements.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 9. Children */}
            <section id="children" className="scroll-mt-20">
              <SectionHeader num="09" ar="خصوصية الأطفال" en="Children's Privacy" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>خدمات Melegy مخصصة للمستخدمين الذين تجاوزوا <strong>18 عاماً</strong>.</p>
                    <p>لا نجمع بيانات من الأطفال دون سن 18 عن قصد. إذا علمنا بذلك، سنحذف البيانات فوراً. إذا كنت تعتقد أن طفلك قدّم بيانات لنا، تواصل معنا على: <span className="text-purple-400">privacy@melegy.app</span></p>
                  </>
                ) : (
                  <>
                    <p>Melegy services are intended for users who are <strong>18 years of age or older</strong>.</p>
                    <p>We do not knowingly collect data from children under 18. If we become aware of this, we will delete the data immediately. If you believe your child has provided data to us, contact us at: <span className="text-purple-400">privacy@melegy.app</span></p>
                  </>
                )}
              </div>
            </section>

            {/* 10. Changes */}
            <section id="changes" className="scroll-mt-20">
              <SectionHeader num="10" ar="تغييرات السياسة" en="Policy Changes" lang={lang} />
              <div className="prose-content">
                {isRTL ? (
                  <>
                    <p>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر.</p>
                    <p>في حالة إجراء تغييرات جوهرية، سنُخطرك عبر:</p>
                    <ul>
                      <li>إشعار بارز داخل التطبيق</li>
                      <li>بريد إلكتروني على عنوانك المسجل</li>
                      <li>تحديث تاريخ "آخر تعديل" أعلى هذه الصفحة</li>
                    </ul>
                    <p>استمرارك في استخدام الخدمة بعد التغييرات يُعدّ موافقةً على السياسة المحدّثة.</p>
                  </>
                ) : (
                  <>
                    <p>We may update this privacy policy from time to time.</p>
                    <p>In the event of material changes, we will notify you through:</p>
                    <ul>
                      <li>A prominent notice within the application</li>
                      <li>An email to your registered address</li>
                      <li>Updating the "Last modified" date at the top of this page</li>
                    </ul>
                    <p>Continued use of the service after changes constitutes acceptance of the updated policy.</p>
                  </>
                )}
              </div>
            </section>

            {/* 11. Contact */}
            <section id="contact" className="scroll-mt-20">
              <SectionHeader num="11" ar="تواصل معنا" en="Contact Us" lang={lang} />
              <div className="prose-content">
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-8">
                  <p className="mb-6 text-gray-300">
                    {isRTL
                      ? "إذا كان لديك أي أسئلة أو مخاوف بشأن سياسة الخصوصية أو بياناتك، يسعدنا مساعدتك:"
                      : "If you have any questions or concerns about this privacy policy or your data, we're happy to help:"}
                  </p>
                  <div className="space-y-4">
                    <ContactRow
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      }
                      label={isRTL ? "البريد الإلكتروني" : "Email"}
                      value="privacy@melegy.app"
                      href="mailto:privacy@melegy.app"
                    />
                    <ContactRow
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      }
                      label={isRTL ? "الموقع الإلكتروني" : "Website"}
                      value="melegy.app"
                      href="https://melegy.app"
                    />
                  </div>
                  <p className="mt-6 text-xs text-gray-500">
                    {isRTL
                      ? "سنرد على جميع الاستفسارات خلال 48 ساعة عمل."
                      : "We will respond to all inquiries within 48 business hours."}
                  </p>
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <footer className="mt-20 border-t border-white/10 pt-8 text-center">
            <p className="text-sm text-gray-500">
              {isRTL
                ? "© 2026 Melegy. جميع الحقوق محفوظة."
                : "© 2026 Melegy. All rights reserved."}
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600">
              <Link href="/privacy" className="hover:text-purple-400 transition-colors">
                {isRTL ? "سياسة الخصوصية" : "Privacy Policy"}
              </Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-purple-400 transition-colors">
                {isRTL ? "شروط الاستخدام" : "Terms of Use"}
              </Link>
            </div>
          </footer>
        </main>
      </div>

      <style jsx global>{`
        .prose-content p {
          color: #9ca3af;
          line-height: 1.8;
          margin-bottom: 1rem;
          font-size: 0.9375rem;
        }
        .prose-content ul {
          color: #9ca3af;
          list-style: none;
          margin: 1rem 0 1.5rem;
          padding: 0;
          space-y: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .prose-content ul li {
          padding-inline-start: 1.25rem;
          position: relative;
          line-height: 1.7;
          font-size: 0.9375rem;
        }
        .prose-content ul li::before {
          content: "—";
          position: absolute;
          inset-inline-start: 0;
          color: #7c3aed;
          font-weight: bold;
        }
        .prose-content strong {
          color: #e5e7eb;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}

function SectionHeader({ num, ar, en, lang }: { num: string; ar: string; en: string; lang: Lang }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="text-xs font-mono text-purple-500 opacity-60">{num}</span>
      <h2 className="text-xl font-bold text-white lg:text-2xl">{lang === "ar" ? ar : en}</h2>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  )
}

function InfoCard({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-1 w-1 rounded-full bg-purple-500 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm transition-all hover:border-purple-500/40 hover:bg-purple-500/5"
    >
      <span className="text-purple-400">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </a>
  )
}
