'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Search, Loader2 } from 'lucide-react'

interface LiveInfoResponse {
  success: boolean
  content: string
  query: string
  timestamp: string
  error?: string
}

export function LiveInfoFetcher() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<LiveInfoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async () => {
    if (!query.trim()) {
      setError('الرجاء إدخال سؤال أو استعلام')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/fetch-live-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!response.ok) {
        throw new Error('فشل جلب المعلومات')
      }

      const data: LiveInfoResponse = await response.json()
      if (data.success) {
        setResult(data)
        setQuery('')
      } else {
        setError(data.error || 'حدث خطأ أثناء جلب المعلومات')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleFetch()
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Input Section */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="اسأل عن أي معلومة محدثة..."
          disabled={isLoading}
          className="flex-1 text-right"
          dir="rtl"
        />
        <Button
          onClick={handleFetch}
          disabled={isLoading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري الجلب...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 ml-2" />
              بحث
            </>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-500/50 bg-red-500/10">
          <div className="flex gap-3 items-center">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600 text-right">{error}</p>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="p-4 border-green-500/50 bg-green-500/10">
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-right">
                <p className="text-xs text-muted-foreground mb-2">
                  {new Date(result.timestamp).toLocaleString('ar-SA')}
                </p>
                <p className="text-sm font-semibold text-foreground mb-3">
                  {result.query}
                </p>
                <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {result.content}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
