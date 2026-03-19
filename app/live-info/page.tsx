import { LiveInfoFetcher } from '@/components/live-info-fetcher'
import { Card } from '@/components/ui/card'

export const metadata = {
  metadataBase: new URL("https://melegy.app"),
  title: 'جلب المعلومات المحدثة - ميليجي',
  description: 'احصل على معلومات محدثة من الإنترنت باستخدام الذكاء الاصطناعي',
}

export default function LiveInfoPage() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            جلب المعلومات المحدثة
          </h1>
          <p className="text-muted-foreground">
            احصل على أحدث المعلومات من الإنترنت باستخدام الذكاء الاصطناعي
          </p>
        </div>

        {/* Main Card */}
        <Card className="p-6 md:p-8">
          <LiveInfoFetcher />
        </Card>

        {/* Info */}
        <Card className="p-4 bg-blue-500/10 border-blue-500/30">
          <div className="space-y-3 text-right">
            <h3 className="font-semibold text-foreground">معلومات مهمة:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• استخدم الأسئلة الواضحة والمحددة للحصول على أفضل النتائج</li>
              <li>• المعلومات تُجلب مباشرة باستخدام نموذج Gemini من Google</li>
              <li>• يمكنك الاستعلام عن أي موضوع: طقس، أخبار، معلومات عامة، وغيرها</li>
              <li>• الإجابات تُقدم باللغة العربية إذا كان السؤال بالعربية</li>
            </ul>
          </div>
        </Card>
      </div>
    </main>
  )
}
