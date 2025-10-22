/**
 * Enhanced image upload component with optimization and progress tracking
 */

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'
import { validateImageFile, createThumbnail } from '@/lib/image-utils'

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void
  onImageRemove: () => void
  selectedFile?: File | null
  preview?: string
  disabled?: boolean
  className?: string
}

export function ImageUpload({
  onImageSelect,
  onImageRemove,
  selectedFile,
  preview,
  disabled = false,
  className = ''
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [thumbnail, setThumbnail] = useState<string>('')
  const { uploading, progress } = useImageUpload()

  const handleFileSelect = async (file: File) => {
    if (disabled || uploading) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    // Create thumbnail for immediate preview
    try {
      const thumb = await createThumbnail(file, 200)
      setThumbnail(thumb)
    } catch (error) {
      console.error('Failed to create thumbnail:', error)
    }

    // Create preview for form
    const reader = new FileReader()
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string
      onImageSelect(file, previewUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
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
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemove = () => {
    onImageRemove()
    setThumbnail('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {!selectedFile && (
        <Card
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${uploading ? 'opacity-75 cursor-wait' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Upload className="h-8 w-8 text-gray-600" />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {uploading ? 'Processing...' : 'Upload Image'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop or click to select
              </p>
              <p className="text-xs text-gray-400 mt-2">
                JPEG, PNG, WebP up to 10MB
              </p>
            </div>

            {uploading && (
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Selected Image Preview */}
      {selectedFile && (
        <Card className="p-4">
          <div className="flex items-start space-x-4">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-xs text-green-600 mt-1">
                Ready to upload
              </p>
            </div>

            {/* Remove Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {progress.stage === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {progress.message}
              </p>
              {progress.stage !== 'error' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
