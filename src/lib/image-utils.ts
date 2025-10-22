/**
 * Image optimization utilities for faster uploads and better UX
 */

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxFileSize?: number // in MB
}

export interface OptimizedImage {
  file: File
  preview: string
  originalSize: number
  optimizedSize: number
  compressionRatio: number
}

/**
 * Compress and optimize image before upload
 */
export async function optimizeImage(
  file: File, 
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxFileSize = 5 // 5MB max
  } = options

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file')
  }

  // Check file size
  if (file.size > maxFileSize * 1024 * 1024) {
    throw new Error(`Image must be smaller than ${maxFileSize}MB`)
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress image
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Create optimized file
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Always convert to JPEG for better compression
              lastModified: Date.now()
            })

            // Create preview
            const preview = canvas.toDataURL('image/jpeg', 0.7)

            resolve({
              file: optimizedFile,
              preview,
              originalSize: file.size,
              optimizedSize: optimizedFile.size,
              compressionRatio: Math.round((1 - optimizedFile.size / file.size) * 100)
            })
          },
          'image/jpeg',
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Generate a unique filename for uploads
 */
export function generateUniqueFilename(originalName: string, userId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop() || 'jpg'
  return `${userId}/${timestamp}-${random}.${extension}`
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type with MIME type validation
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, or WebP)'
    }
  }

  // Additional security: Check file extension
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (!validExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: 'Invalid file extension. Please use JPEG, PNG, or WebP files.'
    }
  }

  // Check file size (5MB max for better performance)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image must be smaller than 5MB'
    }
  }

  // Check for suspicious file names
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid file name'
    }
  }

  return { valid: true }
}

/**
 * Create a thumbnail for quick preview
 */
export function createThumbnail(file: File, size: number = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate thumbnail dimensions
      const { width, height } = img
      const ratio = Math.min(size / width, size / height)
      const newWidth = width * ratio
      const newHeight = height * ratio

      canvas.width = newWidth
      canvas.height = newHeight

      // Draw thumbnail
      ctx?.drawImage(img, 0, 0, newWidth, newHeight)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }

    img.onerror = () => reject(new Error('Failed to create thumbnail'))
    img.src = URL.createObjectURL(file)
  })
}
