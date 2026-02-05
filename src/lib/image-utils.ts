/**
 * Image optimization utilities for faster uploads and better UX
 */

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxFileSize?: number // in MB
  format?: 'jpeg' | 'webp' // Image format
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
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.75,
    maxFileSize = 7, // 7MB max
    format = 'jpeg'
  } = options

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file')
  }

  // Check file size
  if (file.size > maxFileSize * 1024 * 1024) {
    throw new Error(`Image must be smaller than ${maxFileSize}MB`)
  }

  // Determine output format
  const outputMimeType = format === 'webp' ? 'image/webp' : 'image/jpeg'
  const outputFormat = format === 'webp' ? 'webp' : 'jpeg'

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

        // Create file name with correct extension
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        const fileName = `${baseName}.${outputFormat}`

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Create optimized file
            const optimizedFile = new File([blob], fileName, {
              type: outputMimeType,
              lastModified: Date.now()
            })

            // Create preview
            const preview = canvas.toDataURL(outputMimeType, 0.7)

            resolve({
              file: optimizedFile,
              preview,
              originalSize: file.size,
              optimizedSize: optimizedFile.size,
              compressionRatio: Math.round((1 - optimizedFile.size / file.size) * 100)
            })
          },
          outputMimeType,
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

  // Check file size (7MB max for modern cameras)
  const maxSize = 7 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image must be smaller than 7MB'
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

/**
 * Verify that an image URL is accessible
 * Used for async post-upload verification
 */
export async function verifyImageUrl(
  url: string,
  options: { timeout?: number } = {}
): Promise<{ accessible: boolean; error?: string }> {
  const { timeout = 10000 } = options

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { accessible: true }
    }

    return {
      accessible: false,
      error: `Image returned status ${response.status}: ${response.statusText}`,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        accessible: false,
        error: 'Image verification timed out',
      }
    }

    return {
      accessible: false,
      error: error instanceof Error ? error.message : 'Failed to verify image',
    }
  }
}

/**
 * Verify an uploaded image asynchronously and call back with result
 * Includes menu item name in error messages
 */
export async function verifyUploadedImage(
  imageUrl: string,
  menuItemName: string,
  onError: (errorMessage: string) => void,
  options: { delay?: number; retries?: number } = {}
): Promise<void> {
  const { delay = 1000, retries = 2 } = options

  // Wait a bit for Supabase to process the upload
  await new Promise((resolve) => setTimeout(resolve, delay))

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await verifyImageUrl(imageUrl)

    if (result.accessible) {
      return // Image is good!
    }

    // If we have more retries, wait and try again
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      continue
    }

    // Final failure - notify with menu item name
    onError(`Image upload failed for "${menuItemName}": ${result.error}. Please try re-uploading the image.`)
  }
}
