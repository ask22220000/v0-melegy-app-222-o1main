const API_KEYS: string[] = (process.env.GEMINI_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean)

const ROTATION_INTERVAL = 8 * 60 * 60 * 1000 // 8 hours

interface ApiKeyState {
  currentIndex: number
  lastRotation: number
  errorCount: number
  failedKeys: Set<number>
}

class ApiKeyManager {
  private state: ApiKeyState

  constructor() {
    this.state = {
      currentIndex: 0,
      lastRotation: Date.now(),
      errorCount: 0,
      failedKeys: new Set(),
    }
  }

  private rotateKey(): void {
    const startIndex = this.state.currentIndex
    let attempts = 0

    do {
      this.state.currentIndex = (this.state.currentIndex + 1) % API_KEYS.length
      attempts++

      // If all keys have been tried, clear failed keys and start over
      if (attempts >= API_KEYS.length) {
        console.log("🔄 All keys tried, resetting failed keys list")
        this.state.failedKeys.clear()
        break
      }
    } while (this.state.failedKeys.has(this.state.currentIndex))

    this.state.lastRotation = Date.now()
    this.state.errorCount = 0

    console.log(`🔄 API Key rotated to index ${this.state.currentIndex + 1}/${API_KEYS.length}`)
  }

  public getCurrentKey(): string {
    const now = Date.now()
    const timeSinceLastRotation = now - this.state.lastRotation

    if (timeSinceLastRotation >= ROTATION_INTERVAL) {
      this.rotateKey()
    }

    return API_KEYS[this.state.currentIndex]
  }

  public reportError(statusCode?: number): void {
    // If quota exceeded (429), immediately mark key as failed and rotate
    if (statusCode === 429) {
      console.error("❌ Quota exceeded (429), rotating API key immediately")
      this.state.failedKeys.add(this.state.currentIndex)
      this.rotateKey()
      return
    }

    this.state.errorCount++
    console.warn(`⚠️ API Key error count: ${this.state.errorCount}`)

    if (this.state.errorCount >= 1) {
      console.error("❌ Error detected, rotating to next API key")
      this.state.failedKeys.add(this.state.currentIndex)
      this.rotateKey()
    }
  }

  public reportSuccess(): void {
    if (this.state.errorCount > 0) {
      this.state.errorCount = 0
    }
  }

  public forceRotate(): void {
    console.log("🔄 Forcing API key rotation")
    this.rotateKey()
  }

  public getKeyInfo(): { index: number; totalKeys: number; timeUntilRotation: number } {
    const now = Date.now()
    const timeSinceLastRotation = now - this.state.lastRotation
    const timeUntilRotation = ROTATION_INTERVAL - timeSinceLastRotation

    return {
      index: this.state.currentIndex + 1,
      totalKeys: API_KEYS.length,
      timeUntilRotation: Math.max(0, timeUntilRotation),
    }
  }

  public resetKeyStatus(index: number): void {
    this.state.failedKeys.delete(index)
    console.log(`✅ Key ${index + 1} status reset`)
  }
}

export const apiKeyManager = new ApiKeyManager()
