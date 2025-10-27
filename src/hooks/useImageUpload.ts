/**
 * Custom hook for optimized image uploads with progress tracking
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { optimizeImage, generateUniqueFilename, validateImageFile, OptimizedImage } from '@/lib/image-utils'

export interface UploadProgress {
  stage: 'validating' | 'optimizing' | 'uploading' | 'complete' | 'error'
  progress: number
  message: string
}

export interface UploadResult {
  url: string
  optimizedImage: OptimizedImage
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'complete',
    progress: 0,
    message: ''
  })

  const uploadImage = useCallback(async (
    file: File,
    userId: string,
    bucket: string = 'menu_items',
    options?: { quality?: number; format?: 'jpeg' | 'webp' }
  ): Promise<UploadResult> => {
    setUploading(true)
    
    try {
      // Stage 1: Validation
      setProgress({
        stage: 'validating',
        progress: 10,
        message: 'Validating image...'
      })

      const validation = validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Stage 2: Optimization
      setProgress({
        stage: 'optimizing',
        progress: 30,
        message: 'Optimizing image...'
      })

      const optimizedImage = await optimizeImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: options?.quality || 0.75,
        maxFileSize: 7,
        format: options?.format || 'webp'
      })

      // Stage 3: Upload
      setProgress({
        stage: 'uploading',
        progress: 50,
        message: 'Uploading to cloud...'
      })

      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const fileName = generateUniqueFilename(file.name, userId)
      
      // Upload with progress tracking
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, optimizedImage.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      })

      return {
        url: urlData.publicUrl,
        optimizedImage
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage
      })
      
      throw error
    } finally {
      setUploading(false)
    }
  }, [])

  const resetProgress = useCallback(() => {
    setProgress({
      stage: 'complete',
      progress: 0,
      message: ''
    })
  }, [])

  return {
    uploading,
    progress,
    uploadImage,
    resetProgress
  }
}
