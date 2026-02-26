import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security Headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), interest-cohort=()'
  )

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://checkouts.kashier.io https://www.paypal.com https://www.paypalobjects.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https://api.perplexity.ai https://api.groq.com https://api.elevenlabs.io https://checkouts.kashier.io https://image.pollinations.ai https://va.vercel-scripts.com wss: https:",
    "frame-src 'self' https://www.paypal.com https://checkouts.kashier.io",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "form-action 'self' https://checkouts.kashier.io",
    "base-uri 'self'",
    "manifest-src 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|icons|manifest.json|register-sw.js|sw.js).*)',
  ],
}
