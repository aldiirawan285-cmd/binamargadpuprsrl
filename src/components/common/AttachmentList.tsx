import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signedUrls, type Bucket } from '@/lib/storage'
import { fmtBytes } from '@/lib/format'

export interface AttachmentItem {
  key: string
  path: string
  name: string
  mime?: string | null
  size?: number | null
}

/** Daftar lampiran tersimpan dengan tautan buka/unduh (signed URL) */
export function AttachmentList({
  bucket, items, onDelete, thumbs,
}: {
  bucket: Bucket
  items: AttachmentItem[]
  onDelete?: (item: AttachmentItem) => void
  thumbs?: boolean
}) {
  const { data: urls = {} } = useQuery({
    queryKey: ['signed', bucket, items.map((i) => i.path)],
    queryFn: () => signedUrls(bucket, items.map((i) => i.path)),
    enabled: items.length > 0,
    staleTime: 30 * 60_000,
  })
  if (!items.length) return <p className="text-sm text-muted-foreground">Tidak ada lampiran</p>

  if (thumbs)
    return (
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((it) => (
          <li key={it.key} className="relative overflow-hidden rounded-md border bg-muted">
            <a href={urls[it.path]} target="_blank" rel="noreferrer">
              {urls[it.path] ? <img src={urls[it.path]} alt={it.name} className="aspect-square w-full object-cover" loading="lazy" /> : <div className="aspect-square" />}
            </a>
            {onDelete && (
              <button type="button" onClick={() => onDelete(it)} aria-label="Hapus file"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-destructive cursor-pointer">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    )

  return (
    <ul className="divide-y rounded-md border">
      {items.map((it) => {
        const isImg = it.mime?.startsWith('image/') ?? /\.(jpe?g|png|webp)$/i.test(it.name)
        return (
          <li key={it.key} className="flex items-center gap-2 px-3 py-2 text-sm">
            {isImg ? <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <a href={urls[it.path]} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-primary hover:underline">
              {it.name}
            </a>
            {it.size ? <span className="text-xs text-muted-foreground">{fmtBytes(it.size)}</span> : null}
            <Button asChild variant="ghost" size="icon" disabled={!urls[it.path]}>
              <a href={urls[it.path]} download={it.name} aria-label={`Unduh ${it.name}`}>
                <Download />
              </a>
            </Button>
            {onDelete && (
              <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(it)} aria-label="Hapus lampiran">
                <Trash2 />
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
