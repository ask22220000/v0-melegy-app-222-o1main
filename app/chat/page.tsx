"use client"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect, useRef } from "react"
import { useApp } from "@/lib/contexts/AppContext"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { DesignViewer } from "@/components/design-viewer"

export default function ChatComponent() {
  const { user } = useAuth()
  const { state } = useApp()
  const { toast } = useToast()
  const supabase = createClient()

  const [input, setInput] = useState("")
  const scrollRef = useRef(null)

  return (
    <Card className="p-4">
      <DesignViewer />
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
      />
      <Button onClick={() => toast({ title: "Success!" })}>
        Send
      </Button>
      <Toaster />
    </Card>
  )
}