import React, { useState, useRef } from 'react'
import clsx from 'clsx'
import { Upload, X } from 'lucide-react'

export interface FileUploadProps {
  label?: string
  accept?: string
  maxSize?: number // in bytes
  preview?: boolean
  currentFile?: string
  onChange: (file: File | null) => void
  error?: string
  disabled?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  preview = true,
  currentFile,
  onChange,
  error,
  disabled = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFile || null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update preview URL when currentFile changes (e.g., after loading user data)
  React.useEffect(() => {
    if (currentFile) {
      setPreviewUrl(currentFile)
    }
  }, [currentFile])

  const handleFile = (file: File | null) => {
    if (!file) {
      setPreviewUrl(null)
      onChange(null)
      return
    }

    // Validate file size
    if (maxSize && file.size > maxSize) {
      onChange(null)
      return
    }

    // Create preview for images
    if (preview && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }

    onChange(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    onChange(null)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : error
            ? 'border-red-500'
            : 'border-gray-300 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="mx-auto h-32 w-32 object-cover rounded-full"
              onError={(e) => {
                // If image fails to load, hide the broken image
                console.error('Failed to load avatar image:', previewUrl)
                setPreviewUrl(null)
              }}
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm text-gray-600 dark:text-gray-400">
              <label
                htmlFor="file-upload"
                className={clsx(
                  'relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500',
                  'focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500',
                  disabled && 'cursor-not-allowed'
                )}
              >
                <span>Upload a file</span>
                <input
                  ref={inputRef}
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept={accept}
                  onChange={handleChange}
                  disabled={disabled}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {accept.includes('image') ? 'PNG, JPG up to ' : ''}
              {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
