/**
 * Compress an image file to reduce size while maintaining quality
 * Useful for mobile uploads where images can be very large
 */
export async function compressImage(file: File, maxSizeMB: number = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onerror = () => reject(new Error("فشل قراءة الصورة"))
    
    reader.onload = (event) => {
      const img = new Image()
      
      img.onerror = () => reject(new Error("فشل تحميل الصورة"))
      
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error("فشل إنشاء canvas"))
          return
        }
        
        // Calculate new dimensions (max 2048px on longest side for mobile)
        let width = img.width
        let height = img.height
        const maxDimension = 2048
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw image with high quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        
        // Try different quality levels to meet size requirement
        let quality = 0.85
        const targetSizeBytes = maxSizeMB * 1024 * 1024
        
        const tryCompress = () => {
          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          const base64Size = dataUrl.length * 0.75 // Approximate size in bytes
          
          console.log(`[v0] Compressed to quality ${quality.toFixed(2)}: ${(base64Size / 1024 / 1024).toFixed(2)} MB`)
          
          if (base64Size <= targetSizeBytes || quality <= 0.5) {
            resolve(dataUrl)
          } else {
            // Reduce quality and try again
            quality -= 0.1
            tryCompress()
          }
        }
        
        tryCompress()
      }
      
      img.src = event.target?.result as string
    }
    
    reader.readAsDataURL(file)
  })
}
