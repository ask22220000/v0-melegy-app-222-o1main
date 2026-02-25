"use client"

import React, { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, X, FileText, File, Image as ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AttachedFile {
  id: string
  file: File
  preview?: string
  type: "image" | "document" | "audio"
}

interface RichTextInputProps {
  value: string
  onChange: (value: string) => void
  onFilesAttached?: (files: AttachedFile[]) => void
  attachedFiles?: AttachedFile[]
  onRemoveFile?: (fileId: string) => void
  isLoading?: boolean
  placeholder?: string
  maxHeight?: string
}

export const RichTextInput = React.forwardRef<
  HTMLTextAreaElement,
  RichTextInputProps
>(
  (
    {
      value,
      onChange,
      onFilesAttached,
      attachedFiles = [],
      onRemoveFile,
      isLoading = false,
      placeholder = "اكتب رسالتك هنا...",
      maxHeight = "120px",
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)
    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const { toast } = useToast()

    // Use the provided ref or internal ref
    const finalRef = (ref as React.RefObject<HTMLTextAreaElement>) || textAreaRef

    const SUPPORTED_TYPES = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
      document: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/plain",
      ],
      audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"],
    }

    const getFileType = (file: File): "image" | "document" | "audio" | null => {
      if (SUPPORTED_TYPES.image.includes(file.type)) return "image"
      if (SUPPORTED_TYPES.document.includes(file.type)) return "document"
      if (SUPPORTED_TYPES.audio.includes(file.type)) return "audio"
      return null
    }

    const createFilePreview = async (file: File): Promise<string | undefined> => {
      if (!file.type.startsWith("image/")) return undefined

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      })
    }

    const processFiles = useCallback(
      async (files: FileList | File[]) => {
        const newFiles: AttachedFile[] = []

        for (const file of files) {
          const fileType = getFileType(file)

          if (!fileType) {
            toast({
              title: "نوع ملف غير مدعوم",
              description: `الملف "${file.name}" غير مدعوم. يرجى استخدام: صور، PDF، Word، Excel أو ملفات صوتية`,
              variant: "destructive",
            })
            continue
          }

          // File size limit: 50MB
          if (file.size > 50 * 1024 * 1024) {
            toast({
              title: "حجم الملف كبير جداً",
              description: `الملف "${file.name}" أكبر من 50 ميجابايت`,
              variant: "destructive",
            })
            continue
          }

          const preview = await createFilePreview(file)

          newFiles.push({
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview,
            type: fileType,
          })
        }

        if (newFiles.length > 0) {
          onFilesAttached?.([...attachedFiles, ...newFiles])
        }
      },
      [attachedFiles, onFilesAttached, toast]
    )

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }, [])

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
          processFiles(files)
        }
      },
      [processFiles]
    )

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items

        if (!items) return

        const files: File[] = []

        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === "file") {
            const file = items[i].getAsFile()
            if (file) {
              files.push(file)
            }
          }
        }

        if (files.length > 0) {
          e.preventDefault()
          processFiles(files)
        }
      },
      [processFiles]
    )

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Allow Shift+Enter for new lines
        if (e.key === "Enter" && !e.shiftKey) {
          // Don't prevent default - let the parent handle it
          // This allows for natural Enter behavior
        }
      },
      []
    )

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }

    const handleRemoveFile = (fileId: string) => {
      onRemoveFile?.(fileId)
    }

    const getFileIcon = (file: AttachedFile) => {
      switch (file.type) {
        case "image":
          return <ImageIcon className="w-4 h-4" />
        case "audio":
          return <FileText className="w-4 h-4" />
        default:
          return <File className="w-4 h-4" />
      }
    }

    return (
      <div className="w-full space-y-2">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((attachment) => (
              <div
                key={attachment.id}
                className="relative bg-secondary rounded-lg p-2 group"
              >
                {attachment.type === "image" && attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.file.name}
                    className="h-16 w-16 object-cover rounded"
                  />
                ) : (
                  <div className="h-16 w-16 flex items-center justify-center bg-muted rounded">
                    {getFileIcon(attachment)}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveFile(attachment.id)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>

                <div className="absolute bottom-0 right-0 left-0 bg-black/70 text-white text-xs truncate rounded-b opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  {attachment.file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop Zone and Text Area */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 rounded-lg transition-all ${
            isDragging
              ? "border-primary bg-primary/10 scale-105"
              : "border-input hover:border-primary/50"
          }`}
        >
          <textarea
            ref={finalRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full bg-background text-foreground placeholder:text-muted-foreground p-3 rounded-md focus:outline-none resize-none"
            style={{ maxHeight, minHeight: "48px" }}
          />

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.mp3,.wav,.ogg,.txt"
          />

          {/* Drag & Drop Hint */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/5 rounded-lg pointer-events-none">
              <div className="text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-primary font-medium">أفلت الملفات هنا</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Paperclip className="w-4 h-4" />
            إرفق ملف
          </Button>

          <div className="text-xs text-muted-foreground self-center">
            أو اسحب ملف / اضغط Ctrl+V
          </div>
        </div>
      </div>
    )
  }
)

RichTextInput.displayName = "RichTextInput"
