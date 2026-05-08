/**
 * 压缩图片到指定宽度并返回 base64 字符串
 */
export function compressImageToBase64(file: File | Blob, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(maxWidth / img.width, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export interface ImageItem {
  name: string
  data: string // base64
}

export function parseImages(raw: string | undefined): ImageItem[] {
  try { return raw ? JSON.parse(raw) : [] } catch { return [] }
}

export function imagesToBase64(items: ImageItem[]): string {
  return JSON.stringify(items)
}

/**
 * 从剪贴板或文件输入获取图片 base64 数组
 */
export async function handleImagePaste(
  e: ClipboardEvent | Event,
  existing: ImageItem[]
): Promise<{ images: ImageItem[]; files?: FileList }> {
  if ('clipboardData' in e && e.clipboardData) {
    const items = e.clipboardData.items
    const newImages: ImageItem[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile()
        if (blob) {
          const data = await compressImageToBase64(blob)
          newImages.push({ name: `paste-${Date.now()}.jpg`, data })
        }
      }
    }
    return { images: [...existing, ...newImages] }
  }
  return { images: existing }
}

export async function handleImageFiles(
  files: FileList,
  existing: ImageItem[]
): Promise<ImageItem[]> {
  const newImages: ImageItem[] = []
  for (let i = 0; i < files.length; i++) {
    if (files[i].type.startsWith('image/')) {
      const data = await compressImageToBase64(files[i])
      newImages.push({ name: files[i].name, data })
    }
  }
  return [...existing, ...newImages]
}
