import { useEffect, useMemo } from 'react'
import { useDropzone, type Accept } from 'react-dropzone'
import { FileText, ImagePlus, X } from 'lucide-react'
import { fmtBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

export const ACCEPT_IMAGES: Accept = { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/heic': [], 'image/heif': [] }
export const ACCEPT_DOCS: Accept = { 'application/pdf': ['.pdf'], 'image/jpeg': [], 'image/png': [], 'image/webp': [] }

/** Pilih banyak file (drag & drop / kamera HP), tampilkan thumbnail, bisa dihapus sebelum disimpan */
export function FileDropzone({
  files, onChange, accept = ACCEPT_IMAGES, label = 'Seret foto ke sini atau ketuk untuk memilih', maxSizeMB = 20, disabled, compact,
}: {
  files: File[]
  onChange: (files: File[]) => void
  accept?: Accept
  label?: string
  maxSizeMB?: number
  disabled?: boolean
  compact?: boolean
}) {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept,
    multiple: true,
    disabled,
    maxSize: maxSizeMB * 1024 * 1024,
    onDrop: (accepted) => onChange([...files, ...accepted]),
  })

  const previews = useMemo(
    () => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
    [files],
  )
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews])

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-3 text-center text-sm text-muted-foreground transition-colors',
          compact ? 'py-3' : 'py-5',
          isDragActive ? 'border-primary bg-accent' : 'border-input hover:bg-muted/50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="h-5 w-5" />
        <span>{isDragActive ? 'Lepaskan file di sini…' : label}</span>
      </div>
      {fileRejections.length > 0 && (
        <p className="text-xs text-destructive">
          {fileRejections.length} file ditolak (format tidak didukung atau ukuran &gt; {maxSizeMB} MB)
        </p>
      )}
      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="group relative overflow-hidden rounded-md border bg-muted">
              {previews[i] ? (
                <img src={previews[i]!} alt={f.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center gap-1 p-1 text-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <span className="line-clamp-2 text-[10px]">{f.name}</span>
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 text-[10px] text-white">{fmtBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 cursor-pointer"
                aria-label={`Hapus ${f.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
