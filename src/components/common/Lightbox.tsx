import { useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

export interface LightboxImage {
  url: string
  caption?: string
}

export function Lightbox({
  images, index, onIndexChange, onClose,
}: {
  images: LightboxImage[]
  index: number | null
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const open = index != null && images[index] != null
  const prev = useCallback(() => index != null && onIndexChange((index - 1 + images.length) % images.length), [index, images.length, onIndexChange])
  const next = useCallback(() => index != null && onIndexChange((index + 1) % images.length), [index, images.length, onIndexChange])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, prev, next])

  if (!open) return null
  const img = images[index!]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent hideClose className="max-w-5xl border-0 bg-black/95 p-2 text-white sm:p-3">
        <DialogTitle className="sr-only">Foto</DialogTitle>
        <DialogDescription className="sr-only">{img.caption ?? 'Pratinjau foto'}</DialogDescription>
        <div className="relative flex items-center justify-center">
          <img src={img.url} alt={img.caption ?? ''} className="max-h-[78dvh] w-auto max-w-full rounded object-contain" />
          {images.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-1 rounded-full bg-black/60 p-2 hover:bg-black/80 cursor-pointer" aria-label="Sebelumnya">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={next} className="absolute right-1 rounded-full bg-black/60 p-2 hover:bg-black/80 cursor-pointer" aria-label="Berikutnya">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 px-1 text-sm">
          <span className="truncate">{img.caption}</span>
          <span className="ml-auto tabular text-white/70">{index! + 1} / {images.length}</span>
          <a href={img.url} target="_blank" rel="noreferrer" download className="rounded p-1.5 hover:bg-white/10" aria-label="Unduh foto">
            <Download className="h-4 w-4" />
          </a>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-white/10 cursor-pointer" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
