import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Redirect to /api/chat
  const body = await request.json()
  
  const response = await fetch(new URL("/api/chat", request.url).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
