import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("authToken")?.value
  const { pathname } = request.nextUrl

  // List of protected routes
  const protectedRoutes = ["/chat", "/chat-starter", "/chat-pro", "/chat-advanced", "/data"]

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // If no token and trying to access protected route, redirect to login
  if (!authToken && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If user has token and trying to access auth pages, redirect to chat
  if (authToken && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/chat", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/chat/:path*", "/chat-starter/:path*", "/chat-pro/:path*", "/chat-advanced/:path*", "/data/:path*", "/login", "/register"],
}
